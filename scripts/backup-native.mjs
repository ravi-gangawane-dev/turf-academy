/** Native PostgreSQL application backup + isolated restore rehearsal; no Docker.
 * Usage: node scripts/backup-native.mjs --pg-bin <directory containing PostgreSQL 17 tools>
 * Credentials stay in child-process environments, never in logs or the manifest.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { createInterface } from 'node:readline';

const binArg = process.argv.indexOf('--pg-bin');
if (binArg < 0 || !process.argv[binArg + 1]) throw new Error('Provide --pg-bin with native PostgreSQL 17 tools.');
const bin = resolve(process.argv[binArg + 1]);
const exe = name => join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
for (const name of ['pg_dump', 'pg_dumpall', 'pg_restore', 'psql', 'initdb', 'pg_ctl', 'createdb']) {
  if (!existsSync(exe(name))) throw new Error(`Missing PostgreSQL tool: ${name}`);
}
const cli = process.env.SUPABASE_CLI_PATH || join(dirname(process.execPath), 'node_modules/supabase/dist/supabase.js');
if (!existsSync(cli)) throw new Error('Set SUPABASE_CLI_PATH to the Supabase CLI JavaScript entrypoint.');
const projectRef = readFileSync('supabase/.temp/project-ref', 'utf8').trim();
if (!/^[a-z]{20}$/.test(projectRef)) throw new Error('Invalid linked project.');
const target = resolve('backups', 'native-' + new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(target, { recursive: true });
const manifest = { projectRef, startedAt: new Date().toISOString(), status: 'incomplete', restoreVerified: false,
  scope: ['public', 'auth', 'storage', 'supabase_migrations'],
  limits: ['Storage object bytes and hosted/provider settings are separate recovery artifacts.', 'Database-role passwords and object ownership are not restored.', 'Local PostgreSQL rehearsal does not restore hosted Supabase services.'] };
const save = () => writeFileSync(join(target, 'manifest.json'), JSON.stringify(manifest, null, 2));
save();
function run(command, args, { env = process.env, input, timeout = 180000 } = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', data => out += data);
    child.stderr.on('data', data => err += data);
    const timer = setTimeout(() => { child.kill(); reject(new Error('Command timed out: ' + command)); }, timeout);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    // On Windows the server can inherit pg_ctl's pipe handles after pg_ctl exits.
    // Wait for the launcher itself, not for the long-lived server to close them.
    child.on(command === exe('pg_ctl') ? 'exit' : 'close', code => {
      clearTimeout(timer);
      if (command === exe('pg_ctl')) {
        child.stdout.destroy();
        child.stderr.destroy();
      }
      if (code !== 0) {
        // SQL restore errors contain object definitions; keep diagnostics in the private backup directory.
        writeFileSync(join(target, 'last-command-error.log'), err);
        reject(new Error('Command failed: ' + command + '; see private backup diagnostics.'));
      } else resolveRun(out);
    });
    child.stdin.end(input);
  });
}
// Timestamp JSON must use the same timezone on the hosted and local servers.
const checksums = `SET TIME ZONE 'UTC'; SET DateStyle TO 'ISO, YMD';
SELECT coalesce(jsonb_agg(jsonb_build_object('table',n.nspname||'.'||c.relname,
  'rows',(xpath('/row/n/text()',d.doc))[1]::text::bigint,
  'digest',(xpath('/row/digest/text()',d.doc))[1]::text) ORDER BY n.nspname,c.relname),'[]')
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
CROSS JOIN LATERAL query_to_xml(format(
  'SELECT count(*) AS n, md5(coalesce(string_agg(md5(to_jsonb(t)::text), '''' ORDER BY md5(to_jsonb(t)::text)),'''')) AS digest FROM %I.%I t',
  n.nspname,c.relname),false,true,'') d(doc)
WHERE c.relkind='r' AND n.nspname IN ('public','auth','storage','supabase_migrations');`;
let session, sessionError = '', serverStarted = false;
const cluster = join(target, 'restore-cluster');
try {
  const connection = await run(process.execPath, [cli, 'db', 'dump', '--linked', '--dry-run']);
  const remote = { ...process.env, PGSSLMODE: 'require', PGCONNECT_TIMEOUT: '20' };
  for (const match of connection.matchAll(/^export (PG[A-Z]+)="([^"]*)"/gm)) remote[match[1]] = match[2];
  if (!remote.PGPASSWORD || !remote.PGHOST) throw new Error('Temporary connection details were not available.');
  session = spawn(exe('psql'), ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-f', '-'], { env: remote, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = [], waiters = [];
  session.stderr.on('data', chunk => sessionError += chunk);
  createInterface({ input: session.stdout }).on('line', line => {
    if (!line.trim()) return;
    const waiter = waiters.shift();
    if (waiter) waiter.resolve(line); else lines.push(line);
  });
  let sessionFailure;
  const failSession = error => {
    sessionFailure = error;
    for (const waiter of waiters.splice(0)) waiter.reject(error);
  };
  session.on('error', () => failSession(new Error('Snapshot process could not start.')));
  session.on('close', () => failSession(new Error('Snapshot session closed; see private backup diagnostics.')));
  const next = () => {
    if (lines.length) return Promise.resolve(lines.shift());
    if (sessionFailure) return Promise.reject(sessionFailure);
    return new Promise((resolveLine, reject) => {
      const waiter = {
        resolve: line => { clearTimeout(timer); resolveLine(line); },
        reject: error => { clearTimeout(timer); reject(error); },
      };
      const timer = setTimeout(() => {
        waiters.splice(waiters.indexOf(waiter), 1);
        reject(new Error('Snapshot session timed out.'));
      }, 60000);
      waiters.push(waiter);
    });
  };
  console.log('Opening a consistent backup snapshot.');
  session.stdin.write('SET ROLE postgres; BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT pg_export_snapshot();\n\\echo SNAPSHOT_READY\n');
  const snapshot = await next();
  if (!/^[0-9A-F]+-[0-9A-F]+-\d+$/i.test(snapshot)) throw new Error('Unexpected snapshot identifier.');
  if (await next() !== 'SNAPSHOT_READY') throw new Error('Snapshot readiness marker was missing.');
  const archive = join(target, 'application.dump');
  await run(exe('pg_dump'), ['--role=postgres', '--format=custom', '--no-owner', '--lock-wait-timeout=30000',
    '--snapshot=' + snapshot, ...manifest.scope.map(schema => '--schema=' + schema), '--file=' + archive], { env: remote });
  session.stdin.write(checksums + '\n');
  const source = JSON.parse(await next());
  session.stdin.end('ROLLBACK;\n\\q\n');
  await new Promise(resolveExit => session.on('close', resolveExit));
  if (sessionError) writeFileSync(join(target, 'snapshot-diagnostics.log'), sessionError);
  await run(exe('pg_dumpall'), ['--role=postgres', '--roles-only', '--no-role-passwords', '--file=' + join(target, 'roles.sql')], { env: remote });
  delete remote.PGPASSWORD;
  writeFileSync(join(target, 'source-checksums.json'), JSON.stringify(source, null, 2));
  await run(exe('initdb'), ['-D', cluster, '-U', 'postgres', '--auth=trust', '--encoding=UTF8', '--locale=C']);
  const port = await new Promise((resolvePort, reject) => {
    const socket = createServer(); socket.on('error', reject);
    socket.listen(0, '127.0.0.1', () => { const value = socket.address().port; socket.close(() => resolvePort(value)); });
  });
  await run(exe('pg_ctl'), ['-D', cluster, '-l', join(target, 'restore-server.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start']);
  serverStarted = true;
  const local = ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres'];
  await run(exe('createdb'), [...local, 'p0_restore']);
  const roles = [...readFileSync(join(target, 'roles.sql'), 'utf8').matchAll(/^CREATE ROLE (.+);$/gm)]
    .map(match => match[1]).filter(name => name !== 'postgres' && !name.startsWith('cli_'));
  await run(exe('psql'), [...local, '-d', 'p0_restore', '-v', 'ON_ERROR_STOP=1'], {
    input: roles.map(name => `CREATE ROLE ${name};`).join('\n') + '\nDROP SCHEMA public; CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;\n',
  });
  await run(exe('pg_restore'), [...local, '-d', 'p0_restore', '--no-owner', '--exit-on-error', '--single-transaction', archive]);
  const restored = JSON.parse(await run(exe('psql'), [...local, '-d', 'p0_restore', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', checksums]));
  writeFileSync(join(target, 'restored-checksums.json'), JSON.stringify(restored, null, 2));
  if (JSON.stringify(source) !== JSON.stringify(restored)) throw new Error('Restored table content differs from the original snapshot.');
  manifest.status = 'complete';
  manifest.restoreVerified = true;
  manifest.tablesVerified = source.length;
  manifest.rowsVerified = source.reduce((sum, table) => sum + table.rows, 0);
  manifest.archiveSha256 = createHash('sha256').update(readFileSync(archive)).digest('hex');
  manifest.completedAt = new Date().toISOString();
  save();
  console.log(JSON.stringify({ directory: target, tablesVerified: manifest.tablesVerified, rowsVerified: manifest.rowsVerified, restoreVerified: true }));
} catch (error) {
  if (sessionError) writeFileSync(join(target, 'snapshot-diagnostics.log'), sessionError);
  manifest.error = error.message; save(); process.exitCode = 1; console.error(error.message);
} finally {
  if (session && session.exitCode === null) session.kill();
  if (serverStarted) await run(exe('pg_ctl'), ['-D', cluster, '-m', 'fast', '-w', 'stop']);
}
