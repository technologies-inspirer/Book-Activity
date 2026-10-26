# Javed Publishers — Interactive Books

Books that open like real ones: pages read aloud, play videos, teach with animations and games, and let children trace and colour.

## Requirements

Install Node.js 20 or newer (npm is included).

## Install and run locally

From the project folder, run:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173/Book-Activity/). On Windows, you can also double-click `start.bat`; it installs dependencies if needed and starts Vite.

If PowerShell blocks `npm.ps1`, use `npm.cmd` instead of `npm` in every command below (for example, `npm.cmd install` and `npm.cmd run dev`). There is no need to change your execution policy. For a clean install using the committed lockfile, use `npm ci`.

To make and preview a production build:

```sh
npm run build
npm run check
npm run preview
```

The production files are written to `dist/`. Vite is configured with the `/Book-Activity/` base path for GitHub Pages project-site deployment.
The preview URL is normally http://localhost:4173/Book-Activity/. Open the HTTP URL rather than double-clicking `index.html`.

`npm run check` requires a completed build. It checks preserved book IDs, page counts, activity and zone data, QR links, and the presence of referenced assets in both the source and build. Missing optional local videos are reported separately.

Run the demo account/access regression tests with Node's built-in test runner:

```sh
npm test
```

No additional test dependencies or lint framework are configured.

## Folders

- `src/` — React entry point and reusable library, series, book-preview and reader-host components
- `app.js`, `data.js`, `styles.css` — existing reader/activity engine, book data and design; React mounts and cleans up the reader when its route opens/closes
- `books/` — each book's page pictures, QR videos (`library.js`) and activities (`activities-*.js`)
- `assets/` — logo; `sounds/` — page-turn sounds
- `tools/` — scripts that import a PDF and build a book's activities
- `videos/` — the publisher's lesson videos. **Not in this repository** (too large for GitHub);
  copy them into the same folders on each PC. Any files you supply here are copied into the production build at their existing URLs. Large local videos still require suitable hosting before they can work on the live site.

Book, logo and sound assets remain in their existing folders. `npm run build` copies those folders into the generated `dist/` directory; do not commit `dist/`.

## React and existing activities

React owns the hash routing, header, library, series shelf, 3D book preview and reader host. `BookReader` mounts the existing reader/activity engine in its own DOM container and runs its cleanup when unmounted. This keeps the existing page animations, drawing canvases, recordings and activity definitions intact. Reader cleanup removes global listeners, cancels timers and speech, stops audio/video, destroys YouTube players, and removes overlays. Drawings remain available for the current browser session; publisher zones retain the existing local-storage keys.

Existing `#/series/<id>`, `#/book/<id>`, `#/book/<id>/read/<page>` and `/video/<zoneId>` hash links keep working, including `video/page` QR links. Book IDs and data files have not been renamed. The navy/gold stylesheet and original logo/covers are reused without a second source asset folder.

## Frontend login and portals

The original public library remains at `#/`. Choose **Sign in** or open http://localhost:5173/Book-Activity/#/login to try the shared login. The portals use the existing React + Vite setup, logo, covers and fonts, with no new dependencies or authentication services.

| Fictional account | Email | Demo password |
| --- | --- | --- |
| Admin | `admin@javed.example` | `AdminDemo!2026` |
| User | `reader@javed.example` | `ReaderDemo!2026` |

These are fictional examples, not real credentials. Do not enter a real password. This is a **frontend demo only — real authentication is not connected**. UI access filtering does not securely protect routes or book files; the public reader links remain available.

- `#/admin` opens Dashboard. The sidebar contains Dashboard, Users & Access, Series & Books, Add Series, Subjects / Books, Assign Subject to Classes, Resource Materials and My Profile. Dashboard counts are labelled sample data and update with local demo changes. Add Series, Subjects / Books, Assign Subject to Classes and Resource Materials are placeholder pages with a small publisher heading; PDF upload is not implemented yet.
- Users & Access creates in-memory users, generates temporary passwords, assigns all or selected real books, edits access/expiry, searches accounts, resets passwords and disables/enables accounts. Save the temporary password before creating a user; the form clears it after creation. No password reset email is sent.
- Sign out, then use a newly created user's email and temporary password **without refreshing the page** to try that user's assigned bookshelf. The same applies after resetting a password.
- `#/user` shows My Books and series filtered by assignments. Book cards open the existing reader and activities. Continue Reading records the latest page for that account in memory during the current page session.
- User Resources displays the existing resources empty state. Profile edits details and changes the current demo password after checking the previous password and confirmation. Admin My Profile edits the sample administrator's details locally.
- Optional expiry dates are inclusive: an account expires after the selected day in the browser's local time. Past dates and disabled accounts prevent demo sign in. Selecting no books produces an empty user bookshelf.
- Sign Out clears only the current demo session and returns to login. It preserves in-memory users so another demo account can sign in, and does not delete reader preferences, drawings or unrelated browser data.
- A full refresh resets all demo accounts/edits/password changes, reading progress and the current login. Passwords stay in memory only and are not written to local/session storage, logs or network requests. Browser storage used by the original reader is unchanged.

New code lives in `src/portal/`: reusable login/form/modal components, admin and user screens, scoped styles and the in-memory account store. Existing React routing integrates the portals. The reader's only new integration is a page-position callback for Continue Reading; its activity logic remains separate.

Demo checks cover credential validation, user creation, assignments, disable/enable, reset/change password, profile changes, account-specific reading progress and refresh reset. Browser checks also cover desktop/mobile layout and menus, search, book filters, reader navigation, game scoring, tracing/colouring, cleanup and preservation of unrelated browser storage.

## Before updating the live website

Run the build, check and preview commands above, then test:

- Both series, shelf scrolling, the logo/resources links, book previews and cover opening/closing.
- English and Urdu page turns using buttons, arrow keys, the slider and phone swipes; browser back/forward and refreshing a saved reader/QR URL.
- Games, story playback, worked demonstrations, tracing/colouring, erasing, clearing and returning to a drawing during the same session. Leave during an animation and confirm no overlay or sound remains.
- Recorded Urdu audio, browser speech, pause/resume, YouTube/QR videos and locally supplied lesson videos, including switching video choices and closing playback.
- Mobile portrait/landscape layout, touch drawing and fullscreen on your actual devices.

Local production-preview checks covered navigation, page turns, game scoring, demonstration rendering, drawing retention, stories, Urdu reader layout, QR modal routing, hash reloads and cleanup. Actual audible playback, external YouTube playback, missing local videos, device touch/fullscreen behaviour and the live GitHub Pages site still need manual verification. Google Fonts and YouTube requests were blocked in the test environment.

GitHub Pages must serve the **built contents of `dist/`** at `/Book-Activity/`; serving this React source directory directly will not run the app. Review the existing Pages publishing settings before any future update. No deployment or push is performed by these commands.
