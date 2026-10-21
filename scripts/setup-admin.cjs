/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
if (process.argv.includes('--rotate-password')) { console.error('Edit ADMIN_PASSWORD in .env.local directly, then restart the server.'); process.exit(1); }
const envPath = path.join(root, '.env.local');
let env = fs.readFileSync(envPath, 'utf8');
const get = name => env.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]?.trim();
const set = (name, value) => { const re = new RegExp(`^${name}=.*$`, 'm'); env = re.test(env) ? env.replace(re, `${name}=${value}`) : `${env.trimEnd()}\n${name}=${value}\n`; };
let gateway = get('ADMIN_GATEWAY_SECRET');
if (!gateway) { gateway = crypto.randomBytes(32).toString('hex'); set('ADMIN_GATEWAY_SECRET', gateway); }
fs.writeFileSync(envPath, env, { mode: 0o600 });
const hash = crypto.createHash('sha256').update(gateway).digest('hex');
fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
fs.writeFileSync(path.join(root, 'artifacts', 'admin-gateway.sql'), `insert into private.admin_config(id, token_hash) values(true, '${hash}') on conflict(id) do update set token_hash=excluded.token_hash;\n`);
console.log('Gateway configuration ready: artifacts/admin-gateway.sql. Set ADMIN_PASSWORD in .env.local before logging in.');
