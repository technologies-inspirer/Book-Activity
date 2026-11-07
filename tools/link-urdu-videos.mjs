// Update video buttons without regenerating tracing ink, colours, games or page geometry.
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const links = JSON.parse(readFileSync(new URL('books/urdu3-videos.json', root), 'utf8'));
const generator = readFileSync(new URL('tools/make_urdu3.py', root), 'utf8');
const letters = [...generator.matchAll(/^\s+\((\d+), '([^']+)', '([^']+)', '([^']+)'/gm)]
  .map(([, page, letter, name, folder]) => ({ page: Number(page), letter, name, folder }));
const updates = new Map();
for (const entry of letters) {
  if (!links[entry.folder]) continue;
  for (const id of Object.values(links[entry.folder])) assert.match(id, /^[\w-]{11}$/);
  updates.set(entry.page, { ...entry, trace: false });
  updates.set(entry.page + 1, { ...entry, trace: true });
}
assert.equal(updates.size, Object.keys(links).length * 2);
const path = new URL('books/activities-urdu3.js', root);
let count = 0;
const updated = readFileSync(path, 'utf8').replace(/\r\n/g, '\n').replace(/(\n "(\d+)": )([\s\S]*?)(?=\n "\d+": |\n};)/g, (whole, prefix, page, body) => {
  const entry = updates.get(Number(page));
  if (!entry) return whole;
  const videos = links[entry.folder];
  if (entry.trace) {
    const video = '"video": ' + JSON.stringify({ title: 'How to write ' + entry.name, src: 'https://youtu.be/' + videos.Formation }, null, 1).replace(/\n/g, '\n  ');
    if (/"video": \{[\s\S]*?\}/.test(body)) body = body.replace(/"video": \{[\s\S]*?\}/, video);
    else body = body.replace(/\n }(,?)$/, ',\n  ' + video + '\n }$1');
  } else {
    const comma = body.trimEnd().endsWith(',') ? ',' : '';
    const previous = JSON.parse(body.trim().replace(/,$/, ''));
    const buttons = [['Story', '📖', 33], ['Vocabulary', '🔤', 43]].map(([label, icon, y]) => ({
      type: 'videos', label, icon, title: label + ': ' + entry.name, button: { x: 11.5, y },
      videos: [{ title: label, src: 'https://youtu.be/' + videos[label] }]
    }));
    const retained = previous.filter(activity => activity.type !== 'story' && !(activity.type === 'videos' && ['Story', 'Vocabulary'].includes(activity.label)));
    body = JSON.stringify([...buttons, ...retained], null, 1).replace(/\n/g, '\n ') + comma;
  }
  count++;
  return prefix + body;
});
assert.equal(count, updates.size, 'Every mapped lesson and formation page must be updated.');
writeFileSync(path, updated);
console.log(`Updated Story, Vocabulary and Formation links for ${count / 2} Urdu lessons.`);
