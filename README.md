# Javed Publishers — Interactive Books

Books that open like real ones: pages read aloud, play videos, teach with animations and games, and let children trace and colour.

## Run

Double-click `start.bat` (Windows). It starts a small local server and opens http://127.0.0.1:5173/.
YouTube videos only play when the site is opened through this server, not as a file.

## Folders

- `index.html`, `app.js`, `styles.css`, `data.js` — the site
- `books/` — each book's page pictures, QR videos (`library.js`) and activities (`activities-*.js`)
- `assets/` — logo; `sounds/` — page-turn sounds
- `tools/` — scripts that import a PDF and build a book's activities
- `videos/` — the publisher's lesson videos. **Not in this repository** (too large for GitHub);
  copy them into the same folders on each PC.
