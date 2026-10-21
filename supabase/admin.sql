-- Apply after setup.sql. Shared-password administration uses a separate server gateway.
create table private.admin_config (id boolean primary key default true check(id), token_hash text not null);
create table private.admin_sessions (token_hash text primary key, password_version text not null, expires_at timestamptz not null);
create table private.admin_login_limits (key text primary key, started_at timestamptz not null, attempts integer not null);
alter table private.admin_config enable row level security;
alter table private.admin_sessions enable row level security;
alter table private.admin_login_limits enable row level security;
revoke all on private.admin_config, private.admin_sessions, private.admin_login_limits from public, anon, authenticated;
create policy "No client access" on private.admin_config for all to anon using(false) with check(false);
create policy "No client access" on private.admin_sessions for all to anon using(false) with check(false);
create policy "No client access" on private.admin_login_limits for all to anon using(false) with check(false);
create index admin_sessions_expiry_idx on private.admin_sessions(expires_at);

-- Gateway token is server-only. Opaque session token hashes are verified here for EVERY data operation.
-- No auth.uid(): shared-password sessions deliberately do not use Supabase Auth.
create function private.admin_dispatch(p_token text, p_action text, p_session text, p_version text, p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_count integer;
begin
  if p_token is null or not exists(select 1 from private.admin_config where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')) then
    raise insufficient_privilege using message='Invalid admin gateway';
  end if;
  if p_action='login_attempt' then
    if p_data->>'key' is null or p_data->>'key' !~ '^[a-f0-9]{64}$' then return jsonb_build_object('ok',false,'reason','invalid'); end if;
    perform pg_advisory_xact_lock(hashtextextended('admin:'||(p_data->>'key'),0));
    insert into private.admin_login_limits(key,started_at,attempts) values(p_data->>'key',now(),1)
      on conflict(key) do update set
      attempts=case when admin_login_limits.started_at<=now()-interval '15 minutes' then 1 else admin_login_limits.attempts+1 end,
      started_at=case when admin_login_limits.started_at<=now()-interval '15 minutes' then now() else admin_login_limits.started_at end
      returning attempts into v_count;
    delete from private.admin_login_limits where started_at < now()-interval '1 day';
    return jsonb_build_object('ok',v_count<=10,'reason',case when v_count>10 then 'rate_limit' else null end);
  end if;
  if p_action='create_session' then
    if p_session is null or p_session !~ '^[a-f0-9]{64}$' or p_version is null or p_version !~ '^[a-f0-9]{64}$' then return jsonb_build_object('ok',false,'reason','invalid'); end if;
    delete from private.admin_sessions where expires_at<=now();
    insert into private.admin_sessions(token_hash,password_version,expires_at) values(p_session,p_version,now()+interval '8 hours');
    return jsonb_build_object('ok',true);
  end if;
  if p_session is null or not exists(select 1 from private.admin_sessions where token_hash=p_session and password_version=p_version and expires_at>now()) then
    return jsonb_build_object('ok',false,'reason','unauthorized');
  end if;
  if p_action='logout' then
    delete from private.admin_sessions where token_hash=p_session;
  elsif p_action='dashboard' then
    return jsonb_build_object('ok',true,
      'shops',coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from public.shops s),'[]'),
      'stories',coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from public.stories s),'[]'));
  elsif p_action='save_shop' then
    if char_length(btrim(coalesce(p_data->>'name',''))) not between 1 and 100 or char_length(coalesce(p_data->>'slug','')) not between 1 and 100
      or coalesce(p_data->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      or coalesce(p_data->>'status','') not in ('draft','published','archived') then return jsonb_build_object('ok',false,'reason','invalid'); end if;
    v_id=nullif(p_data->>'id','')::uuid;
    if v_id is null then
      insert into public.shops(slug,name,category,region,summary,image_url,image_alt,address,hours,phone,menu,checked_at,is_sample,status)
      values(p_data->>'slug',p_data->>'name',p_data->>'category',p_data->>'region',p_data->>'summary',p_data->>'image_url',p_data->>'image_alt',p_data->>'address',p_data->>'hours',p_data->>'phone',p_data->>'menu',nullif(p_data->>'checked_at','')::date,coalesce((p_data->>'is_sample')::boolean,false),p_data->>'status') returning id into v_id;
    else
      update public.shops set slug=p_data->>'slug',name=p_data->>'name',category=p_data->>'category',region=p_data->>'region',summary=p_data->>'summary',image_url=p_data->>'image_url',image_alt=p_data->>'image_alt',address=p_data->>'address',hours=p_data->>'hours',phone=p_data->>'phone',menu=p_data->>'menu',checked_at=nullif(p_data->>'checked_at','')::date,is_sample=coalesce((p_data->>'is_sample')::boolean,false),status=p_data->>'status' where id=v_id;
      if not found then return jsonb_build_object('ok',false,'reason','not_found'); end if;
    end if;
  elsif p_action='save_story' then
    if char_length(btrim(coalesce(p_data->>'title',''))) not between 1 and 200 or char_length(coalesce(p_data->>'body',''))>20000
      or coalesce(p_data->>'status','') not in ('draft','published') then return jsonb_build_object('ok',false,'reason','invalid'); end if;
    if not exists(select 1 from public.shops where id=(p_data->>'shop_id')::uuid) then return jsonb_build_object('ok',false,'reason','not_found'); end if;
    insert into public.stories(shop_id,title,introduction,body,status) values((p_data->>'shop_id')::uuid,p_data->>'title',p_data->>'introduction',p_data->>'body',p_data->>'status')
      on conflict(shop_id) do update set title=excluded.title,introduction=excluded.introduction,body=excluded.body,status=excluded.status returning id into v_id;
  else return jsonb_build_object('ok',false,'reason','invalid');
  end if;
  return jsonb_build_object('ok',true,'id',v_id);
exception when unique_violation then return jsonb_build_object('ok',false,'reason','duplicate');
  when invalid_text_representation or check_violation or not_null_violation or datetime_field_overflow then return jsonb_build_object('ok',false,'reason','invalid');
end;
$$;
revoke all on function private.admin_dispatch(text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function private.admin_dispatch(text,text,text,text,jsonb) to anon;
create function public.admin_dispatch(p_token text,p_action text,p_session text,p_version text,p_data jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$ select private.admin_dispatch(p_token,p_action,p_session,p_version,p_data); $$;
revoke all on function public.admin_dispatch(text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_dispatch(text,text,text,text,jsonb) to anon;
