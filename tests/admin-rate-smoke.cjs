/* eslint-disable @typescript-eslint/no-require-imports */
// Local development only. Clear the exact local test rate key after checking.
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
(async () => {
  const env = fs.readFileSync('.env.local', 'utf8');
  const secret = env.match(/^ADMIN_GATEWAY_SECRET=(.+)$/m)[1].trim();
  const key = crypto.createHmac('sha256', secret).update('login:127.0.0.1').digest('hex');
  fs.writeFileSync('artifacts/admin-rate-test.json', JSON.stringify({ key }));
  let limited = false;
  for (let i = 0; i < 11; i++) {
    const response = await fetch('http://localhost:3000/api/admin/login', { method: 'POST', headers: { origin: 'http://localhost:3000', 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'deliberately-incorrect-for-rate-test' }) });
    if (response.status === 429) { limited = true; break; }
    assert.equal(response.status, 401);
  }
  assert.ok(limited, 'login attempts must be limited');
  console.log('PASS: repeated incorrect passwords receive HTTP 429.');
})().catch(e => { console.error(e); process.exitCode = 1; });
