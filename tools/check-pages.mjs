import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
assert.doesNotMatch(html, /%BASE_URL%|src\/main\.jsx/);
assert.match(html, /\/Book-Activity\/site-assets\//);
assert.equal(html, readFileSync(resolve(root, 'dist/index.html'), 'utf8'), 'Run npm run prepare:pages to publish the current build.');
assert.ok(existsSync(resolve(root, '.nojekyll')));
const built = readdirSync(resolve(root, 'dist/site-assets')).sort();
assert.deepEqual(readdirSync(resolve(root, 'site-assets')).sort(), built);
for (const file of built) {
  assert.ok(readFileSync(resolve(root, 'site-assets', file)).equals(readFileSync(resolve(root, 'dist/site-assets', file))), `Published asset differs: ${file}`);
}
console.log(`PASS: main/root serves the current production HTML and ${built.length} generated assets; no raw JSX or Vite placeholders.`);
