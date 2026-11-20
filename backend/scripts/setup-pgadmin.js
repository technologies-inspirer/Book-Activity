import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { requiredEnv } from '../src/config.js';

const local = fileURLToPath(new URL('../.local/', import.meta.url));
const installation = join(local, 'pgsql', 'pgAdmin 4');
const data = join(local, 'pgadmin-data');
const python = join(installation, 'python', 'python.exe');
if (!existsSync(python)) throw new Error('Extract the bundled pgAdmin 4 files first.');
mkdirSync(data, { recursive: true });

const url = new URL(requiredEnv('DATABASE_URL'));
const database = decodeURIComponent(url.pathname.slice(1));
const user = decodeURIComponent(url.username);
const escapePass = value => value.replaceAll('\\', '\\\\').replaceAll(':', '\\:');
const passfile = join(data, 'database.pgpass');
writeFileSync(passfile, [url.hostname, url.port || '5432', database, user, decodeURIComponent(url.password)].map(escapePass).join(':') + '\n');

// Keep pgAdmin's settings in this project rather than changing another pgAdmin installation.
writeFileSync(join(installation, 'web', 'config_local.py'), `import os\nSERVER_MODE = False\nDATA_DIR = ${JSON.stringify(data.replaceAll('\\', '/'))}\nLOG_FILE = os.path.join(DATA_DIR, 'pgadmin4.log')\nSQLITE_PATH = os.path.join(DATA_DIR, 'pgadmin4.db')\nSESSION_DB_PATH = os.path.join(DATA_DIR, 'sessions')\nSTORAGE_DIR = os.path.join(DATA_DIR, 'storage')\nKERBEROS_CCACHE_DIR = os.path.join(DATA_DIR, 'krbccache')\nAZURE_CREDENTIAL_CACHE_DIR = os.path.join(DATA_DIR, 'azurecredentialcache')\n`);

const definition = join(data, 'servers.json');
writeFileSync(definition, JSON.stringify({ Servers: { '1': {
  Name: 'Book Activity - Local', Group: 'Book Activity', Host: url.hostname,
  Port: Number(url.port || 5432), Username: user, MaintenanceDB: database,
  DBRestriction: database,
  ConnectionParameters: { sslmode: 'prefer', connect_timeout: 5, passfile: passfile.replaceAll('\\', '/') }
} } }, null, 2));
const marker = join(data, 'connection-registered');
if (!existsSync(marker) || !existsSync(join(data, 'pgadmin4.db'))) {
  const runtime = join(installation, 'runtime');
  const bootstrap = 'import os,sys,runpy; dlls=os.add_dll_directory(sys.argv.pop(1)); sys.path.insert(0,os.path.dirname(sys.argv[1])); sys.argv=sys.argv[1:]; runpy.run_path(sys.argv[0],run_name="__main__")';
  const runSetup = args => execFileSync(python, ['-c', bootstrap, runtime, join(installation, 'web', 'setup.py'), ...args], {
    cwd: runtime, windowsHide: true, stdio: 'inherit', timeout: 120000,
    env: { ...process.env, PATH: `${runtime};${process.env.PATH || ''}` }
  });
  if (!existsSync(join(data, 'pgadmin4.db'))) runSetup(['setup-db']);
  runSetup(['load-servers', definition, '--sqlite-path', join(data, 'pgadmin4.db')]);
  if (!existsSync(join(data, 'pgadmin4.db'))) throw new Error('pgAdmin configuration database was not created.');
  writeFileSync(marker, 'Book Activity connection imported.\n');
}
console.log('pgAdmin configured with the local book_activity connection.');
