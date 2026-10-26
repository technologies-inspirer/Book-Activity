import assert from 'node:assert/strict';
import { copyFileSync, cpSync, existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist');
const publishedAssets = resolve(root, 'site-assets');
const html = readFileSync(resolve(output, 'index.html'), 'utf8');
assert.match(html, /\/Book-Activity\/site-assets\//);
assert.doesNotMatch(html, /%BASE_URL%|src\/main\.jsx/);
assert.equal(publishedAssets, resolve(root) + sep + 'site-assets');

// Only replace files in this dedicated generated-assets folder; book assets stay in place.
if (existsSync(publishedAssets)) {
  for (const entry of readdirSync(publishedAssets, { withFileTypes: true })) {
    assert.ok(entry.isFile(), 'Unexpected directory in generated site-assets; inspect before replacing it.');
  }
  for (const entry of readdirSync(publishedAssets)) unlinkSync(resolve(publishedAssets, entry));
}
cpSync(resolve(output, 'site-assets'), publishedAssets, { recursive: true });
copyFileSync(resolve(output, 'index.html'), resolve(root, 'index.html'));
writeFileSync(resolve(root, '.nojekyll'), '');
console.log('Ready for GitHub Pages main / (root): index.html, site-assets/ and .nojekyll.');
console.log('React source stays in app.html and src/. Original books, sounds and assets are reused.');
