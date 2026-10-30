# PDF book preview

Sign in as admin and open **PDF & Activities** (`#/admin/pdf-activities`). Choose **Upload PDF**. After conversion, the book opens immediately in the same reader as the existing books, without series or activity-type setup dropdowns.

- Turn pages, zoom and use **Write / Colour**, including pencil and eraser. **Selected page** chooses the page for deletion. **Back to upload** returns to the upload screen; **Open Book Preview** reopens it.
- **Listen** reads actual PDF text when available. Scanned image-only pages have no extracted text. Browser voices and language support vary.
- Embedded YouTube hyperlinks and recognised existing lesson URLs provide page video buttons. Arbitrary PDFs do not supply games, answers or story metadata automatically.
- An original bundled book is recognised only when at least two pages contain its known lesson hyperlinks at the correct page numbers, its page count matches, and the match is unique. Its original games, stories, videos and drawing activities are then reused. Deleted pages retain the correct source-page mapping. PDFs without these hyperlinks cannot be recognised by this method.
- Imported draft ZIPs retain previously linked activities as buttons on the corresponding page. Original assets are reused, not duplicated.

**Update** saves the working copy for this session and downloads an updated ZIP. **Cancel** restores the last update or clears the first unsaved upload. **Delete Page** requires confirmation; Update saves the deletion. **Download Saved ZIP** exports the last updated version. **Import Draft ZIP** opens the restored book directly. Keep your ZIP before refreshing: drafts survive app navigation but reset on refresh. There is no server upload, database or automatic publication to the user library.

PDF limits: 50 MB and 200 pages. Conversion runs sequentially into JPEG images and thumbnails, with a maximum image edge of 1600 pixels. Cancel stops conversion. Invalid/password-protected files are rejected. Drafts are limited to 200 MB and 1,000 explicit linked activities. Legacy draft media remains supported. Reader drawings are separate from exported draft files.

Conversion uses [Mozilla PDF.js](https://mozilla.github.io/pdf.js/examples/) with locally bundled worker, fonts, character maps and image decoders under the Vite base path. No CDN or conversion server is needed. PDF and ZIP libraries load separately from the portal. Node 22.13 or newer is required.

Before publishing, try Urdu/scanned PDFs and a larger book on school devices. Some original local lesson videos are absent from this checkout. YouTube playback and narration require suitable network/browser support.
