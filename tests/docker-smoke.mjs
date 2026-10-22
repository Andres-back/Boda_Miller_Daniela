import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { passwordHash } from '../auth.mjs';

const image = process.argv[2] || 'boda-miller-daniela:test';
const id = 'boda-smoke-' + crypto.randomBytes(6).toString('hex');
const dataVolume = id + '-data', uploadVolume = id + '-uploads';
const temporary = await mkdtemp(path.join(tmpdir(), 'boda-docker-test-'));
const accountPath = path.join(temporary, 'admin-auth.json');
const password = crypto.randomBytes(24).toString('base64url');
await writeFile(accountPath, JSON.stringify({ username: 'smokeadmin', ...await passwordHash(password) }));
let containerCreated = false;
const createdVolumes = [];
function docker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8', windowsHide: true, timeout: 60000 });
  if (result.error || result.status !== 0) throw new Error('Docker ' + args[0] + ': ' + (result.error?.message || result.stderr || result.stdout));
  return result.stdout.trim();
}
let port;
function refreshPort() {
  const mapping = JSON.parse(docker(['inspect', '--format', '{{json .NetworkSettings.Ports}}', id]));
  port = Number(mapping['3000/tcp'][0].HostPort);
}
function request(url, { method = 'GET', data, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: url, method, headers: { Host: 'boda.example', ...(data === undefined ? {} : { Origin: 'https://boda.example', 'Content-Type': 'application/json', 'X-Boda-Request': '1' }), ...headers }, timeout: 5000 }, res => {
      const chunks = []; res.on('data', bytes => chunks.push(bytes)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, raw: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('HTTP timeout')));
    req.end(data === undefined ? undefined : JSON.stringify(data));
  });
}
async function ready() {
  for (let i = 0; i < 60; i++) {
    try { if ((await request('/api/content')).status === 200) return; } catch {}
    await delay(500);
  }
  throw new Error('Container failed to start: ' + docker(['logs', id]));
}
async function login() {
  const result = await request('/api/auth/login', { method: 'POST', data: { username: 'smokeadmin', password } });
  assert.equal(result.status, 200);
  const session = JSON.parse(result.raw);
  assert.match(result.headers['set-cookie'][0], /HttpOnly; SameSite=Strict.*Secure/);
  return { Cookie: result.headers['set-cookie'][0].split(';')[0], 'X-CSRF-Token': session.csrf };
}
try {
  for (const volume of [dataVolume, uploadVolume]) { docker(['volume', 'create', volume]); createdVolumes.push(volume); }
  docker(['run', '-d', '--name', id, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--pids-limit', '100', '--memory', '512m', '--tmpfs', '/tmp:size=16m,mode=1777', '-p', '127.0.0.1::3000', '-e', 'APP_ORIGIN=https://boda.example', '-e', 'ADMIN_AUTH_FILE=/run/secrets/admin_auth', '--mount', `type=bind,source=${accountPath},target=/run/secrets/admin_auth,readonly`, '--mount', `type=volume,source=${dataVolume},target=/var/lib/boda/data`, '--mount', `type=volume,source=${uploadVolume},target=/var/lib/boda/uploads`, image]);
  containerCreated = true;
  refreshPort();
  await ready();
  assert.notEqual(docker(['exec', id, 'id', '-u']), '0');
  assert.equal((await request('/')).status, 200);
  assert.equal((await request('/admin')).status, 303);
  assert.equal((await request('/api/rsvps')).status, 401);
  assert.equal((await request('/api/seating')).status, 401);
  let headers = await login();
  const original = JSON.parse((await request('/api/content')).raw);
  original.modules[0].groom = 'Docker persistence test';
  assert.equal((await request('/api/content', { method: 'PUT', data: original, headers })).status, 200);
  assert.equal((await request('/api/rsvps', { method: 'POST', data: { name: 'Smoke guest', attendance: 'yes', guests: 2, companions: ['Smoke companion'], diet: '', message: '' } })).status, 201);
  docker(['exec', id, 'node', '--input-type=module', '-e', "import {writeFile} from 'node:fs/promises';await writeFile(process.env.UPLOAD_DIR+'/upload-smoke.png', Buffer.from([137,80,78,71,13,10,26,10]));"]);
  docker(['exec', id, 'node', 'deploy/healthcheck.mjs']);
  docker(['restart', id]);
  refreshPort(); // Docker may choose a new ephemeral host port after restart.
  await ready();
  assert.equal(JSON.parse((await request('/api/content')).raw).modules[0].groom, 'Docker persistence test');
  assert.equal((await request('/api/rsvps', { headers })).status, 401, 'Restart invalidates sessions.');
  headers = await login();
  const guests = JSON.parse((await request('/api/rsvps', { headers })).raw);
  assert.equal(guests.length, 1); assert.deepEqual(guests[0].companions, ['Smoke companion']);
  const seating = JSON.parse((await request('/api/seating', { headers })).raw);
  assert.equal(seating.guests[1].name, 'Smoke companion');
  assert.equal((await request('/assets/upload-smoke.png')).status, 200);
  docker(['exec', id, 'node', 'deploy/healthcheck.mjs']);
  console.log('PASS: Docker production boot, non-root/read-only runtime, healthcheck, login, protected APIs, companions and volume persistence after restart.');
} finally {
  if (containerCreated) docker(['rm', '-f', id]);
  for (const volume of createdVolumes) docker(['volume', 'rm', volume]);
  assert.equal(path.dirname(temporary), path.resolve(tmpdir()));
  assert.ok(path.basename(temporary).startsWith('boda-docker-test-'));
  await rm(temporary, { recursive: true, force: true });
}
