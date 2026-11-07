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

## Colour limits inside each picture

`books/colour-regions.json` supplements printed colour hints on black-outline pictures. It currently contains part rules for 61 pages. All coordinates are percentages of the source image.

- `componentBox: [x, y, width, height]` identifies a closed part by the centre of its bounding box. It assigns a colour without cutting the original outline into a rectangle. Put specific parts (beak, face, shell) before the enclosing picture. Printed colour hints take priority over these assignments.
- `polygon` and `box` explicitly separate joined interiors. On both English apple pages the leaf and fruit share an open neck in the printed outline. The leaf polygon takes priority over the fruit box. Their stroke masks are disjoint, even when a stroke is dragged through the neck. These boundaries also assign the required colour.

Wrong colours reuse the existing Maths feedback: the stroke is rejected, the correct swatch is highlighted and the reader says which colour to use. Erasing remains available. Free design tasks keep their available choices unless the book gives a printed colour hint.

Browser checks with the actual English and Maxford images verify red on the leaf and green on the apple are rejected, and neither colour crosses into the other part while dragging. The Maths number 2 also rejects red and accepts green. Printed green can differ substantially from the crayon's RGB value, so matching falls back to the same named colour family instead of disabling the restriction.
