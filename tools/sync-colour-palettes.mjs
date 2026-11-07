// Refresh reviewed palettes without regenerating ink, moving pages or changing video links.
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const data = JSON.parse(readFileSync(new URL('books/colour-palettes.json', root), 'utf8'));
for (const [file, book] of [
  ['activities-english3.js', 'new-stemford-english-3'],
  ['activities-maxford.js', 'maxford-global-qaida-3-english'],
  ['activities-urdu3.js', 'stemford-urdu-3'],
  ['activities-maths3.js', 'stemford-maths-3']
]) {
  const path = new URL(`books/${file}`, root);
  const source = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  const updated = source.replace(/(\n "(\d+)": )([\s\S]*?)(?=\n "\d+": |\n}\)?;)/g, (whole, prefix, page, body) => {
    if (!/"type": "fill"/.test(body)) return whole;
    const entry = data.books[book][page];
    if (!entry) throw new Error(`Missing reviewed palette: ${book} / ${page}`);
    const colours = entry.colours.map(name => data.colours[name]);
    const property = '"colours": ' + JSON.stringify(colours, null, 1).replace(/\n/g, '\n  ');
    if (/"colours": \[[\s\S]*?\]/.test(body)) body = body.replace(/"colours": \[[\s\S]*?\]/, property);
    else body = body.replace(/\n }(,?)$/, ',\n  ' + property + '\n }$1');
    // Demonstrations use the exact same primary swatch the child can select.
    body = body.replace(/"scribble": "#[a-fA-F0-9]{6}"/g, '"scribble": "' + colours[0] + '"');
    if (entry.picture.startsWith('vase ')) body = body.replace('make it orange', 'make it red').replace('"scribble": "#f4a261"', '"scribble": "#e63946"');
    return prefix + body;
  });
  writeFileSync(path, updated);
  console.log(`Updated ${file}`);
}
