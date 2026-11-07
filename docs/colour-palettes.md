# Book activity colours

`books/colour-palettes.json` records the reviewed palettes for all 117 existing drawing activities across six books. Keys use the image/activity page number (`p006.jpg` is `6`), which can differ from the printed page number. The `picture` descriptions explain each choice.

Choose colours from the task's picture, its printed colour hints and its instructions. Include secondary parts such as an apple's leaf, a duck's beak or a monkey's face. Printed backgrounds, logos and writing guides do not supply colours for the picture. English trace pages also have a red outline letter to colour. Tasks asking for different colours, such as balloons and umbrellas, keep several choices. Writing and matching exercises use an appropriate pen colour.

The four Python activity generators use `tools/book_colours.py` to read these same palettes. To update existing generated activity files without recreating ink or changing video links:

```sh
node tools/sync-colour-palettes.mjs
npm test
npm run prepare:pages
npm run check:pages
```

Computer activities are handwritten in `books/activities.js` and `books/activities-computer0.js`; keep their `colours` fields in sync with the reviewed data. The integration tests check every existing drawing activity and ensure each demonstration uses an available swatch.

The reader treats an explicit `colours` list as complete. It does not add swatches from a page background when a child draws. Custom activities without a list retain automatic colour discovery.
