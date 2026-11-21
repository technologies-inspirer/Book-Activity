# Javed Publishers — Interactive Books

Books that open like real ones: pages read aloud, play videos, teach with animations and games, and let children trace and colour.

## Requirements

Install Node.js 20 or newer (npm is included).

## Install and run locally

From the repository's `frontend/` folder, run:

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

The production files are written to `dist/`. Vite is configured with the `/Book-Activity/` base path for GitHub Pages project-site deployment. `app.html` is the editable Vite HTML entry; the development server serves it at the normal root URL. Root `index.html` is the generated GitHub Pages entry.
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

Existing `#/series/<id>`, `#/book/<id>`, `#/book/<id>/read/<page>` and `/video/<zoneId>` hash links keep working, including `video/page` QR links. Book IDs and data files have not been renamed. `src/theme.css` provides the shared ivory/teal/gold palette for login, portals, series, book previews, the reader and activity overlays. Original logos, covers, printed pages and drawing colours are preserved without a second source asset folder.

## Login and portals

The frontend now uses the Express backend and PostgreSQL for authentication and account management. Run `npm run dev` from the repository root (or double-click either `start.bat`). The shared launcher starts/checks PostgreSQL, waits for Express to be connected, and then starts Vite. Keep the terminal open.

The first administrator is created with `npm --prefix backend run admin:create`. The generated credentials are kept locally in `backend/.local/admin-account.txt`, which is ignored by Git. The previous fictional demo credentials no longer authenticate in the application. `demoStore.js` remains only for legacy regression tests and shared access helpers; `portalStore.js` is the runtime account store.

- School Register creates permanent user accounts, imports Excel account lists, edits school/principal details, resets passwords, controls book access, and activates/deactivates accounts. There is no public signup. Principal records are contacts, not separate logins.
- Accounts, expiry settings, profile changes, and the last reading position survive reloads. Session cookies are HttpOnly and backed by PostgreSQL. Disabling an account or resetting its password revokes its existing sessions.
- The admin sidebar contains Dashboard, School Register, Add Series, Assign Classes, Assign Subjects, PDF & Activities, Series & Books, and My Profile. Catalog assignments and published book projects are shared through PostgreSQL.
- All active users initially receive all existing books. Features allows the administrator to restrict books. User-facing class/subject navigation still organizes the existing library; it does not require admin assignment.
- Sign out removes the server session. Users can change their own passwords from My Profile; an administrator can reset user passwords through School Register. Reset emails are not sent.
- Authentication and account/progress state are verified through the backend integration tests, including `portal-store.test.js`, which exercises the actual frontend store against PostgreSQL.

The original drawing/colouring engine and its local browser storage remain unchanged. Last reading position is saved on the server; drawing strokes are not migrated to PostgreSQL in this step.

Vite proxies `/api` and book/media requests to Express during development. The production build must be served by Express at `/Book-Activity/` to enforce authentication on raw book files. Static-only GitHub Pages and Vite preview do not provide this access protection.

## PDF authoring workflow

The PDF & Activities editor includes a Customize Page action in the uploaded-book reader. It opens page thumbnails, book title/class/series/subject settings, page narration, and per-page activity management. Admins can upload audio, video, tracing/colouring images and game JSON, add YouTube or HTTP(S) resource links, and reuse bundled activities. Added activities can be previewed, edited or removed; detected video links can be edited or removed. Save Changes saves the converted pages, media and template settings in PostgreSQL. Permitted school accounts can open the published book from the selected series, class and subject. Download Saved ZIP exports a backup.

Run the build, check and preview commands above, then test:

- Both series, shelf scrolling, the logo/resources links, book previews and cover opening/closing.
- English and Urdu page turns using buttons, arrow keys, the slider and phone swipes; browser back/forward and refreshing a saved reader/QR URL.
- Games, story playback, worked demonstrations, tracing/colouring, erasing, clearing and returning to a drawing during the same session. Leave during an animation and confirm no overlay or sound remains.
- Recorded Urdu audio, browser speech, pause/resume, YouTube/QR videos and locally supplied lesson videos, including switching video choices and closing playback.
- Mobile portrait/landscape layout, touch drawing and fullscreen on your actual devices.

Local production-preview checks covered navigation, page turns, game scoring, demonstration rendering, drawing retention, stories, Urdu reader layout, QR modal routing, hash reloads and cleanup. Actual audible playback, external YouTube playback, missing local videos, device touch/fullscreen behaviour and the live GitHub Pages site still need manual verification. Google Fonts and YouTube requests were blocked in the test environment.

## Publishing with the existing main/root Pages setting

The repository's GitHub Pages site publishes `main` and `/ (root)`. It cannot execute raw JSX or replace Vite's `%BASE_URL%` placeholder. To support that existing setting, root `index.html` contains the built page, and `site-assets/` contains its generated JavaScript, CSS and illustration. The original `books/`, `sounds/` and `assets/` are reused directly, without duplicating the large book folders.

After changing the app, run:

```sh
npm run prepare:pages
npm run check
npm run check:pages
npm test
```

Commit the updated source files together with `index.html`, `site-assets/` and `.nojekyll`, then push to `main` when ready to publish. `prepare:pages` replaces only the generated HTML/assets locally; it does not push or change GitHub settings. Do not edit generated `index.html` or `site-assets/` manually; edit `app.html`, `src/` or the original source files instead. `npm run dev` continues to use the source entry with hot reload, and `npm run preview` serves `dist/`.

The public demo login is https://technologies-inspirer.github.io/Book-Activity/#/login. The previously prepared `gh-pages` branch is optional; changing Pages settings to use it is no longer required for this main/root setup.

The centered animated loading mascot appears during startup, visible reader-page loads, recorded audio/video buffering and school-logo reads. Fast operations skip it, reduced-motion settings are respected, and closing media or leaving the reader clears pending statuses. See [loading animation](docs/loading-animation.md) for the asset, generation prompt and verification notes.


PDF & Activities (`#/admin/pdf-activities`) converts a local PDF into JPEG pages and opens it immediately in the existing reader, with page turning, zoom, writing and extracted-text narration. Embedded lesson links provide videos; recognised original books reuse their original activities. Imported drafts retain linked activities. No series/activity-type setup picker is shown. See [PDF authoring](docs/pdf-authoring.md) for recognition rules and limits. Use **Node 22.13 or newer** with the commands above.

PDF editor changes stay pending until **Save Changes**, which persists the project in PostgreSQL. **Cancel** restores the last saved version. **Delete Page** removes a page and its activities from the working copy after confirmation; Save Changes saves the remaining pages. A published book must retain at least one page. **Download Saved ZIP** exports the last saved version. Unsaved work remains in browser memory until published.

PDF upload opens the book preview directly. Arbitrary PDFs cannot automatically supply missing games, answers, audio or story metadata. Existing content appears when recognised or already linked; original assets are reused. Update/Cancel/Delete Page remain available in the reader.

Classes & Subjects (`#/admin/classes-subjects`) shows Play Group, Prep, Nursery and Classes 1?8 as individual cards. Subject badges include their publisher and series, using the current assignments from Assign Subject to Classes, including custom subjects. Unassigned classes show an empty message.

School Register (`#/admin/schools`, with `#/admin/users` kept as an alias) replaces Users & Access. It preserves existing reader accounts and adds school name/address/city, search/city filters, page selection, bulk activation and row actions: edit, password reset, activation, expiry date/time, module labels and book access, login-prefix label, principal contacts and head-school designation. P.Count is the principal contact count. Schools use email usernames with the existing demo sign-in. Principal contacts do not create separate logins. Module labels and login prefixes are session metadata; they do not implement new authentication or services.

Import Excel accepts `.xlsx` files up to 5 MB / 500 schools. Download Template supplies School Name, Address, Username, City and Password columns. Fill Username with an email and Password with a fictional password of at least 8 characters. Preview before importing; duplicate usernames or invalid rows reject the entire import. Imported schools initially receive all books. School records, passwords and edits stay in memory and reset on refresh; no backend/database is connected. Expiry times use the device local timezone. Excel application editing/roundtrip should be manually checked before real use.

School Register ? Actions ? Edit opens `#/admin/schools/edit/<school-id>` as a full page. The School section includes name, description, email, phone, address, expiry, country/state/city and module selections. The Principal section includes name, email, phone and username contact label; its Update saves both sections atomically and keeps additional principal contacts. Its Cancel returns to the register without saving pending details. Principal usernames do not create new authentication accounts.

The Classes section has class checkboxes, subject/series badges, remove-class controls and its own Update/Cancel. Cancel restores the last saved selections. Update saves selections for that school only and intersects them with existing book permissions in the user library and direct reader access. Global assignments and other schools stay unchanged. Schools without saved selections retain existing access. These edits remain session-only.

School Register?s top-right **+ Add** opens `#/admin/schools/add`, a full-page School and Principal form using the same layout and green theme as Edit. It includes school description/contact/location/expiry/module fields, principal contact fields and a password. Save validates and creates the school, then returns to the register. Cancel/Back discard the pending form. School email + password are the session sign-in credentials; the principal username remains a contact label. Classes can be selected afterwards through Edit.

Admin My Profile (`#/admin/profile`) uses the organization-profile template: independent Logo and Letter Head image panels with upload/remove controls, followed by Name, Description, Email, Address, Country, State and City fields and Update. Text details save on Update; image controls save independently. PNG/JPG/WebP images up to 2 MB are decoded before saving. Upload readers and loading indicators are cleaned up on navigation. Organization contact details do not change admin sign-in credentials or the shared sidebar logo. Changes survive app navigation for the current session and reset on refresh. The reader profile/password page is unchanged.

Admin and user portals now use mobile navigation drawers below 1024px, compact sticky headers, touch-friendly forms and safe-area spacing. On phones, school, series, subject and assignment tables become labelled cards with the same filters, selection and actions. Login opens with the sign-in form first. Reader pages keep their original layout and add large, horizontally scrollable page activity buttons; drawing refits on orientation changes. See [mobile verification](docs/mobile-testing.md) for checks and device testing still needed.

Stemford Urdu 4+ (`stemford-urdu-4`) appears under **Nursery / StemFord Series / Urdu**. Its 96 PDF pages remain in source order; the RTL reader puts the first page on the right, advances with the left arrow, and reverses the cover animation and slider. Pages 4–96 have Urdu learning activities: 37 letter lessons with picture games, three rows of tracing per letter, revision, vowel/word-building exercises and counting. Page 85 teaches do-chashmi he combinations; pages 92–95 teach the actual alif, wao, choti ye and bari ye word tables. Tracing uses masks extracted from this book's dotted letters, in right-to-left order. Palettes are reviewed per colouring picture. As in Urdu 3+, no home-made story animations are shown; their text is used only for Listen, with available device Urdu speech. The publisher's YouTube videos are linked for 21 letters (ا to ع, without آ, ڈ, ڑ, ز): Story and Vocabulary buttons on each picture page and a Formation video on each tracing page. The links live in `VIDEOS` in `tools/make_urdu4.py`; the remaining letters get their buttons once their links are added there. The 45 printed QR codes that lead to videos (pages 4–96) also get a Watch video button with the publisher's student, teacher and parent videos, read from the PDF into `books/stemford-urdu-4/qr.json` with `tools/link_videos.py`.

To rebuild Urdu 4+, run `python tools/import_urdu4.py` then `python tools/make_urdu4.py` from the project root with PyMuPDF, OpenCV and NumPy installed. The original PDF stays at `books/steamford-urdu 4+/` and is excluded from Git and production copying; the generated page images, tracing masks and activity metadata are included. Run `npm test`, `npm run prepare:pages`, and `npm run check` before publishing.

## School Register selections

The Add/Edit form uses Pakistan-only country selection, seven province/region choices, and a searchable city/locality picker backed by an offline GeoNames index. Selecting a different province clears the old city. Existing location details are retained until edited. The index and attribution are documented in `backend/data/README.md`.

Allowed Series replaces School Modules in school forms and the Series Access action. The register shows series badges instead of Modules; Address and P.Count are removed from table columns, with address and principal contact data retained in the form/database. Series choices come from the current series registry rather than a hard-coded form list. Both client-side bookshelves and protected backend files enforce the selected series.

School and password forms accept non-empty passwords without an eight-character minimum. The backend retains a 128-character maximum.
