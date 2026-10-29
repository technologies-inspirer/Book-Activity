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

## Frontend login and portals

The public library homepage has been removed. Opening `#/` or the site root shows the shared login; signed-in accounts return to their own dashboard. You can also open http://localhost:5173/Book-Activity/#/login directly. The default fictional reader has access to all eight existing books through the dashboard's Explore Books option. The portals use the existing React + Vite setup, logo, covers and fonts, with no new dependencies or authentication services.

| Fictional account | Email | Demo password |
| --- | --- | --- |
| Admin | `admin@javed.example` | `AdminDemo!2026` |
| User | `reader@javed.example` | `ReaderDemo!2026` |

These are fictional examples, not real credentials. Do not enter a real password. This is a **frontend demo only — real authentication is not connected**. UI access filtering does not securely protect routes or book files. Existing reader/series hash links show the demo login when signed out and resume the requested page after signing in with an account assigned that book.

- `#/admin` opens Dashboard. The sidebar contains Dashboard, Users & Access, Series & Books, Add New Series, Add New Subject, Assign Subject to Classes, Resource Materials and My Profile. Dashboard counts are labelled sample data and update with local demo changes. Add New Series (`#/admin/series`) uses publisher/name filters, Search/Reset and a paginated table. Its + Add button opens a dialog for a unique name and optional description. Created series appear in the user library above subjects and in the admin book filter; they start empty. Custom series are saved to localStorage in this browser and survive refresh, but are not shared between devices or published to GitHub. Add New Subject (`#/admin/subjects-books`) uses publisher/series/subject/class filters, Search/Reset and a paginated table of original and custom subjects with current class badges. Its + Add button opens the series/class/name creation dialog. Both pages follow the Assign Subject to Classes layout and retain the existing theme and storage behaviour. Custom subjects appear as user subject cards, start without books, and persist in this browser alongside custom series. Duplicate names are rejected within the same class and series, including original subjects. Assign Subject to Classes (`#/admin/assign-subject-to-classes`) provides publisher/series/subject/class filters, Search and Reset, a paginated assignments table with class badges, and Add/Edit dialogs with class checkboxes. Assignments update the user subject selection and persist in this browser. Clearing all classes unassigns a subject; original book data and direct reader URLs stay unchanged, and assigning a subject to a new class does not copy its books. Resource Materials remains a placeholder page; PDF upload and per-page activity authoring are available under PDF & Activities; see the draft workflow below.
- Users & Access creates in-memory users, generates temporary passwords, assigns all or selected real books, edits access/expiry, searches accounts, resets passwords and disables/enables accounts. Save the temporary password before creating a user; the form clears it after creation. No password reset email is sent.
- Sign out, then use a newly created user's email and temporary password **without refreshing the page** to try that user's assigned bookshelf. The same applies after resetting a password.
- `#/user` shows a single **Explore Books** entry instead of the full book grid. It opens `#/user/library`: select a class, choose the series above the subject cards, select a subject, then open its books. `src/data/learningCatalog.js` maps the original book IDs to classes and subjects without changing book data. As confirmed by the publisher, 3+ books belong to **Play Group**; Computer Book 0 is also in Play Group, while the three Book 1 titles are in Class 1. Prep, Nursery and Classes 2–8 are selectable but show honest empty states until books exist. Only assigned books appear. Selection is kept in the hash URL, browser back/forward works, and the reader's Library button returns to the current selection. Continue Reading retains the latest page for the account in memory. Admin Series & Books remains unchanged; no paper-generation feature is added.
- The user sidebar contains **Dashboard**, **School Profile** and **Sign Out**. It starts hidden on desktop and mobile; the top-bar menu button opens it. Close it with the close button, Escape, a navigation link, or the backdrop on mobile. `#/user/school` follows the school form template: Name, Description, Email, Address, Country, State and City, a right-aligned Update button, and a separate logo panel with Upload/Remove controls. PNG, JPG and WebP logos up to 2 MB are previewed and kept in account memory only; invalid images are rejected, and pending reads are cancelled when leaving the page. Saved details and logos belong only to the current demo account, remain available while switching pages and reset on refresh. Resources and personal Profile remain available in the top bar.
- Dropbox, Paper Maker Software and Resources App appear below the activity-books entry and on the user Resources page. They are non-clickable frontend placeholders until real URLs are added to `src/data/resourceLinks.js`. No external services are connected yet. User Resources displays these same resource cards. Profile edits details and changes the current demo password after checking the previous password and confirmation. Admin My Profile edits the sample administrator's details locally.
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


PDF & Activities (`#/admin/pdf-activities`) converts a local PDF into JPEG pages, offers individual page selection and downloads, and applies existing stories, videos/phonics/vocabulary, games, tracing/colouring and Urdu audio recordings to each page using a searchable source-book/activity picker. Drafts stay in memory while navigating. Download a draft ZIP before refresh; Import Draft ZIP restores its images and uploaded activities. Uploads are not automatically published to readers. See [PDF authoring](docs/pdf-authoring.md) for file limits, formats and previews. Use **Node 22.13 or newer** with the install/development/build commands above.

PDF editor changes stay pending until **Update**, which saves a session version and downloads an updated ZIP. **Cancel** restores the last update (or clears an unsaved first upload). **Delete Page** removes a page and its activities from the working copy after confirmation; Update commits the deletion. **Download Saved ZIP** always exports the last updated version. There is no server upload or automatic reader publishing.

The PDF activity editor now offers **existing activities only**: select the uploaded page, choose a source book/type/activity, Preview, then Apply Activity. New activity-file upload fields are removed. Original game/story/drawing engines and assets are reused, and source content stays unchanged. Update/Cancel/Delete Page continue to work; older draft uploads remain readable.
