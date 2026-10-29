import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { delimiter, dirname, join, resolve } from 'node:path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function runCommand(command, args, { cwd, timeoutMs, quiet = false } = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd, stdio: quiet ? 'ignore' : 'inherit', windowsHide: true,
      detached: process.platform !== 'win32',
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
          stdio: 'ignore', windowsHide: true, timeout: 10000,
        });
      } else {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
      }
    }, timeoutMs);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => {
      clearTimeout(timer);
      if (timedOut) reject(new Error('Command timed out after ' + timeoutMs + 'ms'));
      else if (code !== 0) reject(new Error('Command exited with code ' + code));
      else resolveRun();
    });
  });
}

function cliCommand(root) {
  const override = process.env.SUPABASE_CLI_PATH;
  if (override) {
    if (!existsSync(override) || !/\.(exe|js|mjs)$/i.test(override)) {
      throw new Error('SUPABASE_CLI_PATH must name an existing .exe, .js or .mjs CLI entrypoint.');
    }
    return /\.m?js$/i.test(override) ? [process.execPath, override] : [override];
  }
  const locations = [root, dirname(process.execPath), ...(process.env.PATH ?? '').split(delimiter)];
  for (const location of locations) {
    for (const entry of ['dist/supabase.js', 'bin/supabase']) {
      const candidate = join(location, 'node_modules', 'supabase', entry);
      if (existsSync(candidate)) return entry.endsWith('.js') ? [process.execPath, candidate] : [candidate];
    }
  }
  return ['supabase'];
}

export async function createBackup({ root = projectRoot, cli = cliCommand(root), docker = ['docker'],
  timeoutMs = 300000, preflightTimeoutMs = 15000, quiet = false } = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) throw new Error('Backup timeout must be positive.');
  const projectRef = readFileSync(join(root, 'supabase', '.temp', 'project-ref'), 'utf8').trim();
  if (!/^[a-z]{20}$/.test(projectRef)) throw new Error('Invalid linked project reference.');
  try {
    await runCommand(docker[0], [...docker.slice(1), 'version', '--format', '{{.Server.Version}}'],
      { cwd: root, timeoutMs: preflightTimeoutMs, quiet });
  } catch (error) {
    throw new Error('Docker is unavailable; no backup started. ' + error.message);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = join(root, 'backups', stamp);
  mkdirSync(target, { recursive: true });
  const manifest = { projectRef, startedAt: new Date().toISOString(), status: 'incomplete',
    restoreVerified: false, files: [],
    limits: 'Logical dumps only; no storage objects, provider secrets or hosted configuration. Managed auth/storage schema and data are not certified by this backup. Separate dumps are not a single atomic database snapshot.' };
  const saveManifest = () => writeFileSync(join(target, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  saveManifest();
  const dumps = [
    ['roles.sql', ['--role-only']],
    ['schema.sql', []],
    ['data.sql', ['--data-only']],
    ['migration-schema.sql', ['--schema', 'supabase_migrations']],
    ['migration-data.sql', ['--schema', 'supabase_migrations', '--data-only']],
  ];
  try {
    for (const [file, flags] of dumps) {
      const partial = join(target, file + '.partial');
      await runCommand(cli[0], [...cli.slice(1), 'db', 'dump', '--linked', ...flags, '-f', partial],
        { cwd: root, timeoutMs, quiet });
      if (!existsSync(partial) || statSync(partial).size === 0) throw new Error('Empty or missing dump: ' + file);
      const sha256 = createHash('sha256').update(readFileSync(partial)).digest('hex');
      renameSync(partial, join(target, file));
      manifest.files.push({ file, bytes: statSync(join(target, file)).size, sha256 });
      saveManifest();
    }
    manifest.status = 'complete';
    manifest.completedAt = new Date().toISOString();
    saveManifest();
    return target;
  } catch (error) {
    manifest.error = error.message;
    saveManifest();
    throw new Error('Backup incomplete at ' + target + ': ' + error.message);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const target = await createBackup({ timeoutMs: Number(process.env.BACKUP_TIMEOUT_MS ?? 300000) });
    console.log('Logical backup complete: ' + target);
    console.log('Restore is NOT verified. See manifest.json and docs/BACKUP_RESTORE.md for coverage limits.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
