import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, copyFile, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { passwordHash } from '../auth.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const password = () => crypto.randomBytes(24).toString('base64url');
let nextPort = 3200;
async function fixture(t, production = false) {
  const folder = await mkdtemp(path.join(tmpdir(), 'boda-admin-test-'));
  await mkdir(path.join(folder, 'data')); await mkdir(path.join(folder, 'assets'));
  for (const name of ['server.mjs', 'auth.mjs', 'seating.mjs', 'admin.html', 'index.html']) await copyFile(path.join(root, name), path.join(folder, name));
  for (const name of ['admin-login.html', 'admin-login.js', 'admin-login.css']) await copyFile(path.join(root, 'assets', name), path.join(folder, 'assets', name));
  await copyFile(path.join(root, 'data/content.json'), path.join(folder, 'data/content.json'));
  const secret = password();
  if (production) await writeFile(path.join(folder, 'data/admin-auth.json'), JSON.stringify({ username: 'admin', ...await passwordHash(secret) }));
  const port = nextPort++, base = 'http://127.0.0.1:' + port;
  const origin = production ? 'https://boda.example' : base;
  let log = '';
  const child = spawn(process.execPath, ['server.mjs'], { cwd: folder, env: { ...process.env, PORT: String(port), NODE_ENV: production ? 'production' : 'test', APP_ORIGIN: production ? origin : '', DATA_DIR: path.join(folder, 'data'), UPLOAD_DIR: path.join(folder, 'assets') }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', data => { log += data; }); child.stderr.on('data', data => { log += data; });
  t.after(async () => {
    if (child.exitCode === null) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); }
    // Only delete the exact newly created test directory inside the OS temp directory.
    assert.equal(path.dirname(folder), path.resolve(tmpdir()));
    assert.ok(path.basename(folder).startsWith('boda-admin-test-'));
    await rm(folder, { recursive: true, force: true });
  });
  let cookie = '', csrf = '';
  async function request(url, { method = 'GET', data, auth = false, headers = {}, raw, redirect = 'manual' } = {}) {
    const requestHeaders = { ...(production ? { Host: 'boda.example' } : {}), ...(method !== 'GET' && method !== 'HEAD' ? { Origin: origin, 'Content-Type': 'application/json', 'X-Boda-Request': '1' } : {}), ...(auth ? { Cookie: cookie, 'X-CSRF-Token': csrf } : {}), ...headers };
    const payload = raw || (data === undefined ? undefined : JSON.stringify(data));
    if (production) return new Promise((resolve, reject) => {
      const request = http.request(base + url, { method, headers: requestHeaders }, response => {
        const chunks = []; response.on('data', bytes => chunks.push(bytes)); response.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: response.statusCode, headers: response.headers })));
      });
      request.on('error', reject); request.end(payload);
    });
    return fetch(base + url, { method, headers: requestHeaders, body: payload, redirect });
  }
  let ready = false;
  for (let i = 0; i < 50; i++) {
    if (child.exitCode !== null) throw new Error('Test server exited: ' + log);
    try { if ((await request('/api/content')).status === 200) { ready = true; break; } } catch {}
    await delay(100);
  }
  assert.ok(ready, 'Server did not start: ' + log);
  async function login(route = production ? 'login' : 'setup', value = secret, auth = false) {
    const response = await request('/api/auth/' + route, { method: 'POST', data: { username: 'admin', password: value }, auth });
    assert.equal(response.status, 200);
    const session = await response.json();
    cookie = response.headers.get('set-cookie').split(';')[0]; csrf = session.csrf;
    return response;
  }
  return { request, login, folder, secret, origin, cookie: () => cookie, csrf: () => csrf };
}

test('Administrator access, cookie sessions, CSRF, password rotation and logout', async t => {
  const f = await fixture(t);
  for (const url of ['/admin', '/admin/', '/admin.html', '/admin%2ehtml']) {
    const response = await f.request(url); assert.equal(response.status, 303); assert.equal(response.headers.get('location'), '/admin/login');
  }
  assert.equal((await f.request('/admin/login')).status, 200);
  const first = await (await f.request('/api/auth/session')).json(); assert.equal(first.setupAllowed, true);
  for (const url of ['/api/rsvps', '/api/seating']) assert.equal((await f.request(url)).status, 401);
  assert.equal((await f.request('/api/content', { method: 'PUT', data: {} })).status, 401);
  assert.equal((await f.request('/api/upload', { method: 'POST', raw: Buffer.from('invalid') })).status, 401);
  assert.equal((await f.request('/api/auth/setup', { method: 'POST', data: { username: 'admin', password: f.secret }, headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await f.request('/api/auth/setup', { method: 'POST', data: { username: 'admin', password: 'short' } })).status, 400);
  const response = await f.login();
  assert.match(response.headers.get('set-cookie'), /HttpOnly/); assert.match(response.headers.get('set-cookie'), /SameSite=Strict/); assert.doesNotMatch(response.headers.get('set-cookie'), /; Secure/);
  const account = await readFile(path.join(f.folder, 'data/admin-auth.json'), 'utf8');
  assert.equal(account.includes(f.secret), false); assert.match(JSON.parse(account).hash, /^[a-f0-9]{128}$/);
  assert.equal((await f.request('/api/auth/setup', { method: 'POST', data: { username: 'admin', password: f.secret } })).status, 403);
  assert.equal((await f.request('/admin', { auth: true })).status, 200);
  assert.equal((await f.request('/api/rsvps', { auth: true })).status, 200);
  const content = await (await f.request('/api/content')).json();
  for (const headers of [{ 'X-CSRF-Token': '' }, { Origin: 'https://evil.example' }, { Origin: '' }]) assert.equal((await f.request('/api/content', { method: 'PUT', auth: true, data: content, headers })).status, 403);
  assert.equal((await f.request('/api/content', { method: 'PUT', auth: true, data: content })).status, 200);
  const invalid = structuredClone(content); invalid.modules[0].unknown = 'no';
  assert.equal((await f.request('/api/content', { method: 'PUT', auth: true, data: invalid })).status, 400);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8ZkAAAAASUVORK5CYII=', 'base64');
  const upload = await f.request('/api/upload', { method: 'POST', auth: true, raw: png, headers: { 'Content-Type': 'image/png' } }); assert.equal(upload.status, 201);
  const file = await upload.json(); assert.ok(Buffer.from(await (await f.request(file.url)).arrayBuffer()).equals(png));
  for (const url of ['/data/admin-auth.json', '/auth.mjs', '/data/seating.json']) assert.equal((await f.request(url, { auth: true })).status, 404);
  const oldCookie = f.cookie(), oldCsrf = f.csrf(), newPassword = password();
  const changed = await f.request('/api/auth/password', { method: 'POST', auth: true, data: { currentPassword: f.secret, password: newPassword } }); assert.equal(changed.status, 200);
  assert.equal((await f.request('/api/rsvps', { headers: { Cookie: oldCookie, 'X-CSRF-Token': oldCsrf } })).status, 401);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', data: { username: 'admin', password: f.secret } })).status, 401);
  await f.login('login', newPassword);
  assert.equal((await f.request('/api/auth/logout', { method: 'POST', auth: true, data: {} })).status, 200);
  assert.equal((await f.request('/api/rsvps', { auth: true })).status, 401);
});

test('Seating persists, expands companions, rejects conflicts and protects declined guests', async t => {
  const f = await fixture(t); await f.login();
  const guest = { name: 'Familia de prueba', attendance: 'yes', guests: 3, companions: ['  Laura Pérez  ', 'Carlos Díaz'], diet: 'Sin nueces', message: '' };
  assert.equal((await f.request('/api/rsvps', { method: 'POST', data: guest })).status, 201);
  assert.equal((await f.request('/api/rsvps', { method: 'POST', data: { ...guest, attendance: 'no', companions: [] } })).status, 201);
  assert.equal((await f.request('/api/rsvps', { method: 'POST', data: { ...guest, guests: 9 } })).status, 400);
  let state = await (await f.request('/api/seating', { auth: true })).json();
  assert.equal(state.guests.length, 3);
  assert.equal(state.guests[1].name, 'Laura Pérez'); assert.equal(state.guests[2].name, 'Carlos Díaz');
  const stored = await (await f.request('/api/rsvps', { auth: true })).json(); assert.deepEqual(stored[0].companions, ['Laura Pérez', 'Carlos Díaz']);
  for (const companions of [undefined, [], ['Solo uno'], ['Ana', ' '], ['Ana', 7], ['Ana', 'B'.repeat(101)], ['Ana', 'Luis', 'Otro']]) {
    assert.equal((await f.request('/api/rsvps', { method: 'POST', data: { ...guest, companions } })).status, 400);
  }
  assert.equal((await f.request('/api/rsvps', { method: 'POST', data: { ...guest, guests: 1, companions: [] } })).status, 201);
  const table = { id: crypto.randomUUID(), number: 1, name: 'Familia', capacity: 2 };
  const input = { ...state, tables: [table], assignments: [{ guestId: state.guests[0].id, tableId: table.id, seat: 1 }], names: { [state.guests[1].id]: 'Nombre acompañante' } };
  const save = await f.request('/api/seating', { method: 'PUT', auth: true, data: input }); assert.equal(save.status, 200);
  assert.equal((await f.request('/api/seating', { method: 'PUT', auth: true, data: input })).status, 409, 'Reject stale writes.');
  state = await (await f.request('/api/seating', { auth: true })).json(); assert.equal(state.guests[1].name, 'Nombre acompañante'); assert.equal(state.assignments.length, 1);
  for (const mutate of [
    value => value.assignments.push({ guestId: state.guests[1].id, tableId: table.id, seat: 1 }),
    value => value.assignments.push({ guestId: state.guests[0].id, tableId: table.id, seat: 2 }),
    value => { value.assignments[0].seat = 3; },
    value => { value.assignments[0].guestId = 'unknown-person'; },
    value => value.tables.push({ ...table, id: crypto.randomUUID() }),
    value => { value.tables[0].capacity = 0; },
    value => { value.tables = []; }
  ]) { const invalid = structuredClone(state); mutate(invalid); assert.equal((await f.request('/api/seating', { method: 'PUT', auth: true, data: invalid })).status, 400); }
  const secondTable = { id: crypto.randomUUID(), number: 2, name: 'Amigos', capacity: 8 };
  let next = structuredClone(state); next.tables.push(secondTable); next.assignments[0] = { ...next.assignments[0], tableId: secondTable.id, seat: 8 };
  assert.equal((await f.request('/api/seating', { method: 'PUT', auth: true, data: next })).status, 200);
  state = await (await f.request('/api/seating', { auth: true })).json(); assert.equal(state.assignments[0].seat, 8);
  next = structuredClone(state); next.assignments = []; next.tables = [secondTable];
  assert.equal((await f.request('/api/seating', { method: 'PUT', auth: true, data: next })).status, 200);
  const persisted = JSON.parse(await readFile(path.join(f.folder, 'data/seating.json'))); assert.equal(persisted.assignments.length, 0); assert.equal(persisted.tables.length, 1);
});

test('Production sessions use Secure cookies and disable initial web setup', async t => {
  const f = await fixture(t, true);
  assert.equal((await (await f.request('/api/auth/session')).json()).setupAllowed, false);
  assert.equal((await f.request('/api/auth/setup', { method: 'POST', data: { username: 'admin', password: password() } })).status, 403);
  const response = await f.login();
  assert.match(response.headers.get('set-cookie'), /__Host-boda_session=/); assert.match(response.headers.get('set-cookie'), /; Secure/);
  assert.equal((await f.request('/api/rsvps', { auth: true })).status, 200);
});

test('Login rate limiting applies before expensive password checks', async t => {
  const f = await fixture(t); await f.login();
  for (let i = 0; i < 6; i++) assert.equal((await f.request('/api/auth/login', { method: 'POST', data: { username: 'admin', password: password() } })).status, 401);
  const response = await f.request('/api/auth/login', { method: 'POST', data: { username: 'admin', password: f.secret } });
  assert.equal(response.status, 429); assert.ok(Number(response.headers.get('retry-after')) > 0);
});
