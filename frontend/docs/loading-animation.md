# Loading mascot

`assets/loading-owl.png` is a transparent cutout based on the publisher's supplied blue reading mascot. It was produced with the built-in imagegen tool; no external API key was used. The screenshot border and background were removed. The original generated file was preserved outside the repository.

Final image prompt:

> Edit target: the most recent user image, the blue baby owl/bird mascot reading a gray open book with a yellow spine, orange tiny feet, huge dark blue eyes, and small yellow light bulb at upper left. Background extraction only. Preserve the exact character identity, illustration style, posture, blue/orange/yellow/gray colors, facial expression, proportions, book and light bulb. Remove ALL surrounding screenshot background, dark border, white rectangular card and rounded card outline. Output ONLY the single mascot reading the book plus the original light bulb, on a genuinely transparent background, tightly and symmetrically framed with a little padding. No new text, no new objects, no redesign, no drop shadow, no border, no white rectangle. This is a transparent UI loading-animation asset.

`src/loading/loading.css` animates a gentle reading sway, bulb glow, shadow and dots. It honours reduced motion. `app.html` shows the same centered status before JavaScript loads. React uses `LoadingScreen` at startup and `GlobalLoader` for delayed work; quick operations do not flash an overlay.

Reader scopes track visible page images, PDF rendering, recorded narration, native video load/wait events, and YouTube connection/buffering events. Completion, errors, pause, closing media and reader unmount release the matching task. Concurrent tasks cannot dismiss one another. The overlay lets pointer and keyboard input through so readers can close a slow video or navigate away. School-logo reads also use the status.

Verification: throttle app/page requests to see the real status, release them to check dismissal, close a pending YouTube connection, and leave a pending reader. Check mobile centering and reduced motion. Native media waiting/error events can be simulated for deterministic coverage; live YouTube playback depends on network access, and the optional local lesson videos must be supplied separately.

The card is up to 420px wide and the mascot stage up to 290px, shrinking to fit mobile screens. Startup lasts at least 1.5 seconds. Once a delayed loading status becomes visible, it stays for at least 1.2 seconds; tasks that finish before the 200ms threshold remain invisible. Closing tracked content or leaving the reader cancels the scope immediately.
