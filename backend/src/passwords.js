import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export function validatePassword(password) {
  if (typeof password !== 'string' || password.trim().length < 8 || password.length > 128) {
    const error = new Error('Use a password between 8 and 128 characters.');
    error.status = 400;
    throw error;
  }
}
export async function hashPassword(password) {
  validatePassword(password);
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64, options);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const [algorithm, salt, key] = String(encoded).split('$');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(key)) return false;
  const actual = await derive(password, salt, 64, options);
  return timingSafeEqual(actual, Buffer.from(key, 'hex'));
}
// Equal-cost verification for unknown email addresses.
export const dummyHash = await hashPassword(randomBytes(24).toString('hex'));
