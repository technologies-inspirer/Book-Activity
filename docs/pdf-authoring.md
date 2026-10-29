# PDF & Activities editor

Sign in as the demo admin and open **PDF & Activities** (`#/admin/pdf-activities`). The editor is a browser-side authoring draft. It does not modify existing books or publish uploads to the user library.

1. Choose **Upload PDF**. Each page converts automatically into a JPEG, with a smaller thumbnail. The upload limit is 50 MB and 200 pages; conversion runs one page at a time. Images have a maximum long edge of 1600 pixels. Use Cancel to stop conversion.
2. Optionally set the book title, series, class and subject. Subject options use current class assignments.
3. Select a page through its thumbnail, Previous/Next, or Jump to page. Download JPEG saves that page as an image.
4. In **Apply Existing Activity**, choose a source book, filter the activity type or search by name/source page, and select an existing activity card. Use Preview to run the original activity, then Apply Activity to attach it to the selected PDF page. The same activity cannot be applied twice to one page. Other pages keep their own selections. New activity-file uploads and custom activity creation are not offered.
5. Click **Update** when editing is complete. This saves the working copy as the current saved version for this app session and prepares an updated ZIP download. Changes to pages, metadata and activities stay pending until Update. A failed or cancelled update keeps the previous saved version.
6. **Cancel** discards pending changes and restores the last Update. It also clears an unsubmitted activity form. If no version has been updated yet, Cancel removes the staged upload. Working and saved copies remain available while navigating admin pages, but both reset on refresh.
7. **Delete Page** opens a confirmation dialog. Deletion removes that page and its activities from the working copy; other pages retain their images and activities and are renumbered sequentially. Original PDF page numbers remain visible when different. Click Update to save the deletion or Cancel to restore. Deleting the final page clears the working book; Update then confirms removal of the saved book.
8. Keep the ZIP before refreshing or closing the tab. **Download Saved ZIP** exports the last updated version, even while a working copy has pending edits. Import Draft ZIP stages the images and activities for review; click Update to save the imported book. Opening another PDF or ZIP replaces only the working copy after successful conversion/import. No server upload is connected.

| Existing activity | Source | Preview |
| --- | --- | --- |
| Animated Stories | Existing story scenes from the original books | Original pan/zoom story animation and narration |
| Videos / Phonics / Vocabulary | Existing video activities and QR lesson lists | Original video picker/player |
| Games | Existing find-the-object games | Original game artwork, prompts, targets and score |
| Tracing / Colouring | Existing fill/draw activities | Original Show me how, drawing tools, colours and instructions |
| Recorded Audio | Existing Urdu recordings | Audio controls using the original recording |

Activities keep their original content, artwork, audio, answers and source-page positions. Applying links a ready-made existing activity to a new PDF page; it does not automatically reinterpret unfamiliar PDF text or create new questions. Core story/game/drawing previews reuse `mountBookActivityApp`, with isolated preview drawings, owned listeners/timers and cleanup when closed. Source book data and the user's original reader drawings are preserved.

The ZIP contains `project.json`, `pages/` JPEG images/thumbnails and references to the existing activity catalogue. Original book assets are reused rather than copied into the ZIP. Older draft ZIPs containing uploaded activity files still open, retain those files and support their existing previews. Drawings made in Preview are temporary test strokes and are not included in the draft. The draft size limit is 200 MB, with at most 1,000 activities. Legacy imported media files retain the existing 50 MB limit and validation. New activities are selected from the bundled collection. Password-protected or invalid PDFs are rejected.

PDF conversion uses [Mozilla PDF.js](https://mozilla.github.io/pdf.js/examples/). Its worker, standard fonts, character maps and WASM image decoders are bundled locally under the Vite base path; no conversion server, CDN, database or cloud upload is used. PDF and ZIP libraries load separately from the main portal. Node 22.13 or newer is required for development/builds.

Before publishing, manually try a representative Urdu/scanned PDF and a larger book on the devices used by schools. Some original local lesson-video files are absent in this checkout; their playback requires supplying those original files. YouTube playback and synthesized narration depend on network/browser support. Publishing newly authored books to readers is a separate step.
