import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing. Configure backend/.env first.`);
  return value;
}
