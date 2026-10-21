/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').trim().split(/\r?\n/).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }));
const base = 'http://localhost:3000';
const headers = { 'Content-Type': 'application/json', Origin: base };
const data = { shopId: '11111111-1111-4111-8111-111111111111', kind: 'review', nickname: '검증용이웃', body: '[MVP-SMOKE] 제출 제한과 공개 상태 검증입니다.', consent: true };
const rest = (path, init = {}) => fetch(env.SUPABASE_URL + '/rest/v1/' + path, { ...init, headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json', ...init.headers } });
(async () => {
  assert.equal((await fetch(base + '/api/messages', { method: 'POST', headers: { ...headers, Origin: 'https://invalid.example' }, body: JSON.stringify(data) })).status, 403);
  assert.equal((await fetch(base + '/api/messages', { method: 'POST', headers, body: JSON.stringify({ ...data, consent: false }) })).status, 400);
  assert.equal((await fetch(base + '/api/messages', { method: 'POST', headers, body: 'x'.repeat(17000) })).status, 413);
  const anonymousWrite = await rest('reviews', { method: 'POST', body: JSON.stringify({ shop_id: data.shopId, nickname: '침입검증', body: '직접 쓰기가 차단되는지 확인합니다.', status: 'approved' }) });
  assert.ok([401, 403].includes(anonymousWrite.status));
  const wrongToken = await rest('rpc/submit_message', { method: 'POST', body: JSON.stringify({ p_token: 'invalid', p_rate_key: 'a'.repeat(64), p_kind: 'letter', p_shop_id: data.shopId, p_nickname: data.nickname, p_body: data.body }) });
  assert.ok([401, 403].includes(wrongToken.status));
  for (const table of ['reviews', 'letters']) {
    const approved = await rest(table + '?select=nickname,body,status');
    const rows = await approved.json();
    assert.ok(rows.some(r => r.nickname === '검증용이웃' && r.status === 'approved'), 'approved ' + table + ' is visible');
    assert.ok(rows.every(r => r.status === 'approved'), 'pending rows are not visible');
  }
  let limited = false;
  for (let i = 0; i < 6; i++) {
    const r = await fetch(base + '/api/messages', { method: 'POST', headers, body: JSON.stringify(data) });
    if (r.status === 429) { limited = true; break; }
    assert.equal(r.status, 201, await r.text());
  }
  assert.ok(limited, 'durable rate limiter enforces maximum');
  console.log('PASS cross-origin rejection, consent validation, body size bound, direct write denial, gateway token validation, approved visibility, pending isolation, durable rate limit');
})().catch(e => { console.error(e); process.exit(1); });
