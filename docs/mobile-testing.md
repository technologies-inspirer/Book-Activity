# Mobile layout verification

The green, ivory and gold theme, existing data, assets and hash routes are preserved. No new packages, native app or deployment was added.

## Layout and navigation

- Admin and reader drawers use the same focus handling, Escape/backdrop dismissal and body scroll lock. The closed admin drawer is inert. Drawer listeners and scroll locks are restored on close/unmount.
- Compact headers stay visible, with a menu toggle and account links. Safe-area spacing supports devices with notches. Phone form text is 16px to avoid focus zoom; main actions have at least 44px touch targets.
- School Register, Add New Series, Add New Subject and Assign Subject to Classes reuse one responsive table component. Desktop tables become labelled phone cards. Search, paging, select-all, school actions and dialogs remain available.
- Login shows the sign-in form before the introductory artwork on phones. School forms, organization profile, user profile, library cards and resources stack to fit the viewport.
- Original reader spreads and page markers are preserved. A large scrollable page-action toolbar provides writing/colouring, Listen and the actual videos, stories, games and linked activities on the current pages. Drawing refits after rotation; closing or leaving the reader removes its resize listeners. Story artwork responds to stage-size changes.

## Browser checks completed

| Area | Checks |
| --- | --- |
| Admin | 11 pages at widths 320, 390, 768, 1024 and 1440px; no document horizontal overflow |
| User | Dashboard, resources, profile, school profile and library navigation at the same five widths; no document horizontal overflow |
| Drawers | Open, Escape, navigation close, focus restoration, background inertness and body scroll lock |
| School Register | Labelled mobile cards, visible select-all control, bulk selection and action-menu positioning |
| Landscape | School list, Add School, class assignment and organization profile at 844 x 390px |
| Reader | Portrait/landscape, updated page actions after page turns, game modal, uploaded-PDF preview and writing |
| Drawing | Touch-emulated strokes create ink; Clear removes it; orientation changes refit the page; resize listener count returns to baseline after Close |

Tests use desktop Chrome with emulated mobile viewports/touch. They are not physical-device certification.

## Before publishing

Try current iPhone Safari and Android Chrome on a real phone: open/close both drawers, scroll long school lists, type into forms with the keyboard open, upload a logo/PDF, turn pages, rotate while writing and try representative audio/video/story/game activities. Confirm safe areas, browser toolbar resizing and touch accuracy. Verify pinch zoom remains usable. Not every original activity has been individually tested. YouTube playback and all language voices depend on browser/network support; eight optional original local lesson-video files are absent in this checkout.
