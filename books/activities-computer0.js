// Activities for Stemford Computer Book 0 (KEYPAD). Same format as activities.js.
// Extra fill marks used here: ring (cx, cy, rx, ry: a circle drawn round a picture) and
// line ([x1, y1, x2, y2]: a matching line), all in % of the page.
(() => {
  // letter shapes cut from page 5 by tools/ink.py
  const INK = {
    '43.3,65.2': { src: 'books/stemford-series-computer-book-0-curve/ink/p005_433_652.png', box: [42.43, 64.1, 5.25, 6.6] },
    '43.3,74.4': { src: 'books/stemford-series-computer-book-0-curve/ink/p005_433_744.png', box: [42.43, 73.3, 5.25, 6.6] }
  };
  // A letter page: the letter on the monitor, then the three things in the blue strip, each explained.
  const letterPage = (L, p, items) => [
    { type: 'story', label: 'Learn ' + L, icon: '🔤', title: `The letter ${L}${L.toLowerCase()}`, button: { x: 2, y: 37 },
      scenes: [
        { page: p, from: { cx: 34, cy: 25, w: 48 }, to: { cx: 34, cy: 25, w: 36 },
          text: `This is the letter ${L}. Big ${L} and small ${L.toLowerCase()}.` },
        ...items.map(it => ({ page: p, from: { cx: it.cx, cy: 48, w: 36 }, to: { cx: it.cx, cy: 47, w: 28 }, text: it.say })),
        { page: p, from: { cx: 50, cy: 48, w: 100 }, to: { cx: 50, cy: 48, w: 92 },
          text: `${items.map(it => it.name).join(', ')}. They all begin with ${L}!` }
      ] },
    { type: 'game', title: `Find the ${L} things!`, button: { x: 66, y: 33 },
      crop: { x: 4, y: 39, w: 92, h: 18 },
      targets: items.map(it => ({ name: it.name, x: it.cx - 13, y: 40, w: 26, h: 16, say: it.say })) }
  ];

  window.BOOK_ACTIVITIES['stemford-series-computer-book-0-curve'] = {
    4: [
      ...letterPage('A', 4, [
        { name: 'adaptor', cx: 20, say: 'An adaptor gives power to our devices, like a laptop charger.' },
        { name: 'Android', cx: 49, say: 'Android helps many mobile phones work.' },
        { name: 'arrow keys', cx: 78, say: 'Arrow keys move things up, down, left and right.' }
      ]),
      { type: 'fill', title: 'Encircle the A pictures', steps: [
        { say: 'Which pictures begin with A? Android begins with A. Let us draw a circle.', marks: [{ ring: 1, cx: 17.5, cy: 71, rx: 7.5, ry: 6.5 }] },
        { say: 'Adaptor begins with A too!', marks: [{ ring: 1, cx: 37, cy: 74, rx: 8, ry: 6 }] },
        { say: 'And arrow keys begin with A. Ball, butterfly and fan do not begin with A. Now it is your turn!', marks: [{ ring: 1, cx: 66, cy: 74.5, rx: 9, ry: 5 }] }
      ] }
    ],
    5: [
      ...letterPage('B', 5, [
        { name: 'backspace key', cx: 18, say: 'The backspace key rubs out the letter before it.' },
        { name: 'Bluetooth', cx: 52, say: 'Bluetooth joins devices without any wires.' },
        { name: 'browser', cx: 81, say: 'A browser helps us visit websites on the internet.' }
      ]),
      { type: 'fill', title: 'Trace the letter B', steps: [
        { say: 'Let us trace the letter B in Bluetooth. Go down, then two bumps.', marks: [{ glyph: 'B', box: [43.3, 65.2, 3.5, 4.4], ink: INK['43.3,65.2'] }] },
        { say: 'Now trace B in Backspace. Down, then bump, bump. Well done! Now it is your turn.', marks: [{ glyph: 'B', box: [43.3, 74.4, 3.5, 4.4], ink: INK['43.3,74.4'] }] }
      ] }
    ],
    6: [
      ...letterPage('C', 6, [
        { name: 'controller', cx: 19, say: 'We use a controller to play video games.' },
        { name: 'CPU', cx: 48, say: 'The CPU is the brain of the computer.' },
        { name: 'compact disc', cx: 78, say: 'A compact disc keeps music, pictures and files.' }
      ]),
      { type: 'fill', title: 'Colour the CPU', steps: [
        { say: 'This is the CPU, the brain of the computer. Let us colour it grey. Now it is your turn!',
          marks: [{ scribble: '#8d99ae', cx: 62, cy: 72.5, rx: 10, ry: 9.5 }] }
      ] }
    ],
    7: [
      ...letterPage('D', 7, [
        { name: 'desktop', cx: 16, say: 'The desktop is the first screen we see when the computer starts.' },
        { name: 'drag and drop', cx: 48, say: 'Drag and drop: we hold, move, and let go to move things.' },
        { name: 'document', cx: 81, say: 'A document is a file where we write.' }
      ]),
      { type: 'fill', title: 'Tick the D pictures', steps: [
        { say: 'Which pictures begin with D? The desktop begins with D. Tick it!', marks: [{ tick: 1, x: 84, y: 69 }] },
        { say: 'The document begins with D too. Tick! The controller and Android do not begin with D. Now it is your turn!', marks: [{ tick: 1, x: 36, y: 79 }] }
      ] }
    ],
    8: { type: 'fill', title: 'Match the letters', steps: [
      { say: 'Adaptor begins with A. Join big A and small a to the adaptor.', marks: [{ line: [24.5, 62, 38, 30] }, { line: [62, 30, 74.5, 30] }] },
      { say: 'Bluetooth begins with B. Join big B and small b.', marks: [{ line: [24.5, 30, 38, 46] }, { line: [62, 46, 74.5, 62] }] },
      { say: 'Browser begins with B too.', marks: [{ line: [24.5, 46, 38, 62] }, { line: [62, 62, 74.5, 78] }] },
      { say: 'Arrow keys begin with A. Well done! Now it is your turn.', marks: [{ line: [24.5, 78, 38, 78] }, { line: [62, 78, 74.5, 46] }] }
    ] },
    9: { type: 'fill', title: 'Match the same pictures', steps: [
      { say: 'Find the same pictures and join them. Controller goes with controller.', marks: [{ line: [36.5, 31.5, 66.5, 61.5] }] },
      { say: 'The folders window goes with the folders window.', marks: [{ line: [36.5, 46.5, 66.5, 76.5] }] },
      { say: 'CPU goes with CPU.', marks: [{ line: [36.5, 61.5, 66.5, 31.5] }] },
      { say: 'And desktop goes with desktop. Well done! Now it is your turn.', marks: [{ line: [36.5, 76.5, 66.5, 46.5] }] }
    ] }
  };
})();
