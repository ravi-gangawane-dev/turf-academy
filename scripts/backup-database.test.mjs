import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createBackup, runCommand } from './backup-database.mjs';

function fixture(t, body) {
  const root = mkdtempSync(join(tmpdir(), 'academy backup test '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'supabase', '.temp'), { recursive: true });
  writeFileSync(join(root, 'supabase', '.temp', 'project-ref'), 'ttuigbkaluozglzgepsh');
  const script = join(root, 'fake cli.mjs');
  writeFileSync(script, body);
  return { root, cli: [process.execPath, script], docker: [process.execPath, '-e', 'process.exit(0)', '--'], quiet: true };
}

test('hung process fails within the timeout', async () => {
  await assert.rejects(runCommand(process.execPath, ['-e', 'setInterval(()=>{},1000)'],
    { timeoutMs: 200, quiet: true }), /timed out/);
});

test('unavailable Docker creates no backup artifacts', async t => {
  const options = fixture(t, 'throw new Error("CLI must not run")');
  options.docker = [process.execPath, '-e', 'process.exit(1)', '--'];
  await assert.rejects(createBackup(options), /Docker is unavailable/);
  assert.equal(existsSync(join(options.root, 'backups')), false);
});

test('empty successful dump remains incomplete', async t => {
  const options = fixture(t, "import {writeFileSync} from 'node:fs'; writeFileSync(process.argv[process.argv.indexOf('-f')+1], '');");
  await assert.rejects(createBackup(options), /Empty or missing dump/);
  const directory = join(options.root, 'backups', readdirSync(join(options.root, 'backups'))[0]);
  const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json')));
  assert.equal(manifest.status, 'incomplete');
  assert.equal(manifest.restoreVerified, false);
  assert.equal(existsSync(join(directory, 'roles.sql')), false);
});

test('complete backup handles spaced paths and records matching hashes', async t => {
  const options = fixture(t, "import {writeFileSync} from 'node:fs'; writeFileSync(process.argv[process.argv.indexOf('-f')+1], '-- fixture SQL\\n');");
  const directory = await createBackup(options);
  const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json')));
  assert.equal(manifest.status, 'complete');
  assert.equal(manifest.restoreVerified, false);
  assert.deepEqual(manifest.files.map(f => f.file), ['roles.sql', 'schema.sql', 'data.sql', 'migration-schema.sql', 'migration-data.sql']);
  for (const file of manifest.files) {
    assert.equal(file.sha256, createHash('sha256').update(readFileSync(join(directory, file.file))).digest('hex'));
    assert.ok(file.bytes > 0);
  }
});

test('dump failure preserves completed files but never completes manifest', async t => {
  const options = fixture(t, "import {writeFileSync} from 'node:fs'; if (!process.argv.includes('--role-only')) process.exit(7); writeFileSync(process.argv[process.argv.indexOf('-f')+1], '-- roles');");
  await assert.rejects(createBackup(options), /code 7/);
  const directory = join(options.root, 'backups', readdirSync(join(options.root, 'backups'))[0]);
  const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json')));
  assert.equal(manifest.status, 'incomplete');
  assert.equal(manifest.files.length, 1);
});
