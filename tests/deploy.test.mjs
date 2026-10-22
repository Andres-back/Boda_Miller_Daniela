import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { initialize } from '../deploy/start.mjs';
const root = new URL('../', import.meta.url);
test('Deployment initializes empty volumes and preserves existing account and content', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'boda-deploy-test-'));
  t.after(async () => {
    assert.equal(path.dirname(directory), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('boda-deploy-test-'));
    await rm(directory, { recursive: true, force: true });
  });
  const authFile = path.join(directory, 'private.json');
  const firstAccount = { username: 'testadmin', salt: crypto.randomBytes(16).toString('hex'), hash: crypto.randomBytes(64).toString('hex') };
  await writeFile(authFile, JSON.stringify(firstAccount));
  const options = { dataDir: path.join(directory, 'data'), uploadDir: path.join(directory, 'uploads'), seedFile: new URL('data/content.json', root), authFile };
  await initialize(options);
  assert.deepEqual(JSON.parse(await readFile(path.join(options.dataDir, 'admin-auth.json'))), firstAccount);
  assert.equal(await readFile(path.join(options.dataDir, 'content.json'), 'utf8'), await readFile(options.seedFile, 'utf8'));
  await writeFile(path.join(options.dataDir, 'content.json'), '{"custom":"content changed by admin"}');
  await writeFile(path.join(options.uploadDir, 'upload-test.png'), 'image');
  await writeFile(authFile, '{"invalid":"changed secret"}');
  await initialize(options);
  assert.equal(await readFile(path.join(options.dataDir, 'content.json'), 'utf8'), '{"custom":"content changed by admin"}');
  assert.equal(await readFile(path.join(options.uploadDir, 'upload-test.png'), 'utf8'), 'image');
  assert.deepEqual(JSON.parse(await readFile(path.join(options.dataDir, 'admin-auth.json'))), firstAccount, 'Never reset account on container restart.');
  const emptyOptions = { ...options, dataDir: path.join(directory, 'new-data') };
  await assert.rejects(initialize(emptyOptions), /formato valido/);
  await assert.rejects(initialize({ ...emptyOptions, authFile: undefined }), /ADMIN_AUTH_FILE/);
});

test('Production source images referenced by the content are available', async () => {
  const content = JSON.parse(await readFile(new URL('data/content.json', root)));
  for (const module of content.modules) for (const value of Object.values(module)) {
    if (typeof value === 'string' && value.startsWith('/assets/')) assert.ok((await readFile(new URL(value.slice(1), root))).length > 0, value);
  }
});
