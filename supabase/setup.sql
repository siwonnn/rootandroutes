-- Roots & Routes MVP. Apply to an empty project's SQL editor or through migrations.
-- The private submission gateway requires a server-only token (hash stored below).
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon;

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null, category text not null default '음식점', region text not null,
  summary text not null default '', image_url text not null default '', image_alt text not null default '',
  address text not null default '', hours text not null default '', phone text not null default '', menu text not null default '',
  checked_at date, is_sample boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now()
);
create table public.stories (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null unique references public.shops(id) on delete cascade,
  title text not null, introduction text not null default '', body text not null default '',
  status text not null default 'draft' check (status in ('draft','published')), created_at timestamptz not null default now()
);
create table public.shop_images (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id) on delete cascade,
  image_url text not null, alt text not null, position integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published'))
);
create index shop_images_shop_idx on public.shop_images(shop_id, position);
create table public.reviews (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 2 and 20),
  body text not null check (char_length(btrim(body)) between 10 and 2000), visited_on date,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  consented_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.letters (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 2 and 20),
  body text not null check (char_length(btrim(body)) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  consented_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index reviews_shop_idx on public.reviews(shop_id, status, created_at desc);
create index letters_shop_idx on public.letters(shop_id, status, created_at desc);
create table private.gateway_config (id boolean primary key default true check (id), token_hash text not null);
create table private.submission_limits (key text primary key, started_at timestamptz not null, count integer not null);
alter table public.shops enable row level security;
alter table public.stories enable row level security;
alter table public.shop_images enable row level security;
alter table public.reviews enable row level security;
alter table public.letters enable row level security;
alter table private.gateway_config enable row level security;
alter table private.submission_limits enable row level security;
create policy "No client access" on private.gateway_config for all to anon using (false) with check (false);
create policy "No client access" on private.submission_limits for all to anon using (false) with check (false);
revoke all on public.shops, public.stories, public.shop_images, public.reviews, public.letters from anon, authenticated;
revoke all on private.gateway_config, private.submission_limits from public, anon, authenticated;
grant select on public.shops, public.stories, public.shop_images, public.reviews, public.letters to anon;
create policy "Published shops" on public.shops for select to anon using (status = 'published');
create policy "Published stories" on public.stories for select to anon using (status = 'published' and exists (select 1 from public.shops s where s.id = shop_id and s.status = 'published'));
create policy "Published images" on public.shop_images for select to anon using (status = 'published' and exists (select 1 from public.shops s where s.id = shop_id and s.status = 'published'));
create policy "Approved reviews" on public.reviews for select to anon using (status = 'approved' and exists (select 1 from public.shops s where s.id = shop_id and s.status = 'published'));
create policy "Approved letters" on public.letters for select to anon using (status = 'approved' and exists (select 1 from public.shops s where s.id = shop_id and s.status = 'published'));

-- Deliberately anonymous product: no auth.uid() exists. This narrowly scoped function
-- authorizes the Next.js server with a 256-bit gateway token, not the caller's identity.
-- Never expose the token in browser code. No caller-supplied status or timestamps.
create function private.submit_message(p_token text, p_rate_key text, p_kind text, p_shop_id uuid, p_nickname text, p_body text, p_visited_on date default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare limiter private.submission_limits%rowtype;
begin
  if p_token is null or not exists (select 1 from private.gateway_config where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')) then
    raise insufficient_privilege using message = 'Invalid submission gateway';
  end if;
  if p_kind is null or p_kind not in ('review','letter') or p_rate_key is null or p_rate_key !~ '^[a-f0-9]{64}$'
    or p_nickname is null or char_length(btrim(p_nickname)) not between 2 and 20
    or p_body is null or char_length(btrim(p_body)) not between 10 and 2000
    or (p_visited_on is not null and (p_visited_on > (now() at time zone 'Asia/Seoul')::date or p_visited_on < date '2000-01-01')) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_input');
  end if;
  if not exists (select 1 from public.shops where id = p_shop_id and status = 'published') then
    return jsonb_build_object('ok', false, 'reason', 'shop_unavailable');
  end if;
  -- Serialize per hashed IP, across processes and deployments. No raw IP is retained.
  perform pg_advisory_xact_lock(hashtextextended(p_rate_key, 0));
  select * into limiter from private.submission_limits where key = p_rate_key;
  if found and limiter.started_at > now() - interval '1 hour' and limiter.count >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'rate_limit');
  end if;
  insert into private.submission_limits(key, started_at, count) values (p_rate_key, now(), 1)
  on conflict (key) do update set
    count = case when submission_limits.started_at <= now() - interval '1 hour' then 1 else submission_limits.count + 1 end,
    started_at = case when submission_limits.started_at <= now() - interval '1 hour' then now() else submission_limits.started_at end;
  if p_kind = 'review' then
    insert into public.reviews(shop_id, nickname, body, visited_on) values (p_shop_id, btrim(p_nickname), btrim(p_body), p_visited_on);
  else
    insert into public.letters(shop_id, nickname, body) values (p_shop_id, btrim(p_nickname), btrim(p_body));
  end if;
  delete from private.submission_limits where started_at < now() - interval '1 day';
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function private.submit_message(text,text,text,uuid,text,text,date) from public, anon, authenticated;
grant execute on function private.submit_message(text,text,text,uuid,text,text,date) to anon;
create function public.submit_message(p_token text, p_rate_key text, p_kind text, p_shop_id uuid, p_nickname text, p_body text, p_visited_on date default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.submit_message(p_token,p_rate_key,p_kind,p_shop_id,p_nickname,p_body,p_visited_on);
$$;
revoke all on function public.submit_message(text,text,text,uuid,text,text,date) from public, anon, authenticated;
grant execute on function public.submit_message(text,text,text,uuid,text,text,date) to anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-photos','shop-photos',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
-- Dashboard uploads only. No browser upload policies are granted.
