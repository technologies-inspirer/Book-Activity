# PDF book preview

Sign in as admin and open **PDF & Activities** (`#/admin/pdf-activities`). Select **Series**, then an assigned **Class**, then an assigned **Subject**. The Upload PDF and Import Draft ZIP controls become available only after all three selections are complete. The destination is shown above the upload controls and on the uploaded book card. After conversion, the book remains in the editor; choose Open Book Preview when ready. A new PDF or imported ZIP inherits this destination.

- Turn pages, zoom and use **Write / Colour**, including pencil and eraser. **Selected page** chooses the page for deletion. **Back to upload** returns to the upload screen; **Open Book Preview** reopens it.
- **Listen** reads actual PDF text when available. Scanned image-only pages have no extracted text. Browser voices and language support vary.
- Embedded YouTube hyperlinks and recognised existing lesson URLs provide page video buttons. Arbitrary PDFs do not supply games, answers or story metadata automatically.
- An original bundled book is recognised only when at least two pages contain its known lesson hyperlinks at the correct page numbers, its page count matches, and the match is unique. Its original games, stories, videos and drawing activities are then reused. Deleted pages retain the correct source-page mapping. PDFs without these hyperlinks cannot be recognised by this method.
- Imported draft ZIPs retain previously linked activities as buttons on the corresponding page. Original assets are reused, not duplicated.

**Customize Page** opens the editor from the reader. The book already carries the upload destination; its series, class and subject can also be changed in the book settings. Use **Page Templates** for QR code, web link, audio, video, narration, question/answer, game, tracing and colouring. **Existing activities** reuses original stories, videos, exercises, games, drawings and audio. Choose a page before applying an activity.

A QR template takes a button title and HTTP(S) video/lesson URL and generates a real QR image locally. Clicking it opens the link; scanning it opens the same link. Set button colour and percentage position/size, or drag the overlay on the editor page. Arrow keys move a focused overlay precisely. Unpositioned activities use the reader toolbar. Preview before publishing.

**Publish Book / Update Book** saves the project, converted pages and media in PostgreSQL and makes it available in the chosen library selection to schools allowed that series. **Cancel** restores the last update or clears the first unsaved upload. **Delete Page** requires confirmation; Update Book saves the remaining pages (at least one page is required). **Download Saved ZIP** exports a backup. Published Books lets an admin reopen a saved book and choose Edit Book. School accounts only get the reading interface. Unsaved drafts survive app navigation but reset on refresh.

PDF limits: 50 MB and 200 pages. Conversion runs sequentially into JPEG images and thumbnails, with a maximum image edge of 1600 pixels. Cancel stops conversion. Invalid/password-protected files are rejected. Drafts are limited to 200 MB and 1,000 explicit linked activities. Legacy draft media remains supported. Reader drawings are separate from exported draft files.

Conversion uses [Mozilla PDF.js](https://mozilla.github.io/pdf.js/examples/) with locally bundled worker, fonts, character maps and image decoders under the Vite base path. No CDN or conversion server is needed. PDF and ZIP libraries load separately from the portal. Node 22.13 or newer is required.

Before publishing, try Urdu/scanned PDFs and a larger book on school devices. Some original local lesson videos are absent from this checkout. YouTube playback and narration require suitable network/browser support.
