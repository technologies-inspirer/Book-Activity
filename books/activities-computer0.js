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
      { type: 'fill', title: 'Encircle the A pictures', colours: ['#e63946'], steps: [
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
      { type: 'fill', title: 'Trace the letter B', colours: ['#222222'], steps: [
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
      { type: 'fill', title: 'Colour the CPU', colours: ['#9aa5b1'], steps: [
        { say: 'This is the CPU, the brain of the computer. Let us colour it grey. Now it is your turn!',
          marks: [{ scribble: '#9aa5b1', cx: 62, cy: 72.5, rx: 10, ry: 9.5 }] }
      ] }
    ],
    7: [
      ...letterPage('D', 7, [
        { name: 'desktop', cx: 16, say: 'The desktop is the first screen we see when the computer starts.' },
        { name: 'drag and drop', cx: 48, say: 'Drag and drop: we hold, move, and let go to move things.' },
        { name: 'document', cx: 81, say: 'A document is a file where we write.' }
      ]),
      { type: 'fill', title: 'Tick the D pictures', colours: ['#e63946'], steps: [
        { say: 'Which pictures begin with D? The desktop begins with D. Tick it!', marks: [{ tick: 1, x: 84, y: 69 }] },
        { say: 'The document begins with D too. Tick! The controller and Android do not begin with D. Now it is your turn!', marks: [{ tick: 1, x: 36, y: 79 }] }
      ] }
    ],
    8: { type: 'fill', title: 'Match the letters', colours: ['#e63946'], steps: [
      { say: 'Adaptor begins with A. Join big A and small a to the adaptor.', marks: [{ line: [24.5, 62, 38, 30] }, { line: [62, 30, 74.5, 30] }] },
      { say: 'Bluetooth begins with B. Join big B and small b.', marks: [{ line: [24.5, 30, 38, 46] }, { line: [62, 46, 74.5, 62] }] },
      { say: 'Browser begins with B too.', marks: [{ line: [24.5, 46, 38, 62] }, { line: [62, 62, 74.5, 78] }] },
      { say: 'Arrow keys begin with A. Well done! Now it is your turn.', marks: [{ line: [24.5, 78, 38, 78] }, { line: [62, 78, 74.5, 46] }] }
    ] },
    9: { type: 'fill', title: 'Match the same pictures', colours: ['#e63946'], steps: [
      { say: 'Find the same pictures and join them. Controller goes with controller.', marks: [{ line: [36.5, 31.5, 66.5, 61.5] }] },
      { say: 'The folders window goes with the folders window.', marks: [{ line: [36.5, 46.5, 66.5, 76.5] }] },
      { say: 'CPU goes with CPU.', marks: [{ line: [36.5, 61.5, 66.5, 31.5] }] },
      { say: 'And desktop goes with desktop. Well done! Now it is your turn.', marks: [{ line: [36.5, 76.5, 66.5, 46.5] }] }
    ] }
  };

  // The publisher's YouTube videos, as in English 3+ and 4+.
  const book = window.BOOK_ACTIVITIES['stemford-series-computer-book-0-curve'];
  const video = (label, icon, title, id, button) =>
    ({ type: 'videos', label, icon, title, button, videos: [{ title, src: 'https://youtu.be/' + id }] });
  const add = (p, ...acts) => { book[p] = [...[].concat(book[p] || []), ...acts]; };
  // Letter pages: Vocabulary and Formation sit below the magnifier, beside the monitor.
  // null: no link yet (Jj formation), or the list gave another video's link (Pp vocabulary is Oo formation).
  const LETTERS = {
    A: [4, '3gZWKnCFu5U', '-0rCSiONGag'], B: [5, 'bsn-05NVmCw', 'SyacLCHRKIM'], C: [6, 'zewbAm8qX-c', 'cS3BQ7u6zWE'],
    D: [7, 's0xT31qDpw0', 'EpOQH4P-pBM'], E: [10, '3TEABoKHj3g', 'tzoGN8jvkiQ'], F: [11, 'jEh9T4EOaBU', 'VC9UFdGpxi0'],
    G: [12, 'OU3MOt3pdh0', 'Na18EkeC_VI'], H: [13, 'QR3ha_FRc8A', 'l7ZzJZTKBu0'], I: [16, 'hqXN_2t4Ivw', 'sivmAXfeuc4'],
    J: [17, 'DYx1SJowcEI', null], K: [18, 'TS6wok-LxqY', 'z8DGfcuJH4c'], L: [19, 'U1Ae6u1OW-0', 'fs05KJOvz6w'],
    M: [22, 'W37jk_KxGHM', 'hAKcCUL6Az8'], N: [23, 'yr6_KujKI8w', 'NTR6LOxO3tg'], O: [24, 'DQTgku6LOBY', '9u2oskAsl4M'],
    P: [25, null, 'mo7ZDEQRXYM'], Q: [28, 'MmO0LgvC8KY', 'VO41enJIJNE'], R: [29, 'nHci_HMXQLU', 'l0YhtgDmx_A'],
    S: [30, 'BeCB9VDmzNQ', 'wrCJx-r_LI4'], T: [31, '9kghJNQ5z2w', 'UPGNHx56VkM'], U: [34, 'uFiAdcMbqtg', 'XMrxnuj4vk8'],
    V: [35, 'sPTlac6ys6A', '0MIFkQim-9g'], W: [36, 'WpmwtPoubmo', 'SUDlfbOlCE8'], X: [37, 'rx8tNrmQDN4', '9u2zpHZMUH8'],
    Y: [40, 'A0JICgzGkso', 'c6RWmmOz1ro'], Z: [41, 'ehdPWMpuFMs', 'r6ktPgtbHSw']
  };
  for (const [L, [p, vocab, formation]] of Object.entries(LETTERS)) {
    const l = L + L.toLowerCase();
    // the publisher's video replaces the home-made "Learn" story; the game moves under the robot
    if (book[p]) book[p] = [].concat(book[p]).filter(a => a.type !== 'story')
      .map(a => (a.type === 'game' ? { ...a, button: { x: 2, y: 33 } } : a));
    if (vocab) add(p, video('Vocabulary', '🔤', 'Vocabulary ' + l, vocab, { x: 70, y: 31 }));
    if (formation) add(p, video('Formation', '✏️', 'How to write ' + l, formation, { x: 70, y: 35.5 }));
  }
  // Revision and lesson pages: one button at the top left.
  const PAGES = [
    [8, 'Revision', 'Revision A and B', 'Hz5F3Vjv_tw'], [9, 'Revision', 'Revision C and D', '1KlyEOVoi38'],
    [20, 'Revision', 'Revision I and J', 'YmpXQEYlYpU'], [21, 'Revision', 'Revision K and L', 'OD6YylBVCbw'],
    [26, 'Revision', 'Revision M and N', 'RCWNZK4_cD8'], [27, 'Revision', 'Revision O and P', 'Cx5HSpvYPPo'],
    [32, 'Revision', 'Revision Q and R', 'kJEXYBHpPBE'], [33, 'Revision', 'Revision S and T', '_N6wc4X7kOA'],
    [38, 'Revision', 'Revision U and V', 'HjN5i17tpVU'], [39, 'Revision', 'Revision W and X', 'zogQAGqNARk'],
    [42, 'Revision', 'Revision Y and Z', 'IAEa_d5iArY'],
    [43, 'Video', 'AI and Digital Learning', 'h2pLnsTCxa0'], [44, 'Video', 'Learning Games', 'a9WQ3FETJaA'],
    [45, 'Revision', 'Revision', '-xvkKrgeFwA'], [46, 'Video', 'The World Around Us', 'qYWXlM_PfW0'],
    [47, 'Revision', 'Revision', 'SPnpAdM_OLI'], [48, 'Revision', 'Revision', 'IrbF4vmDiY4'],
    [49, 'Video', 'Machines in our World', 'S5xiQ_SskGU'], [50, 'Video', 'Machines that Run on Electricity', 'A-QrSYJWkO0'],
    // the list gave the electricity video for fuel too, so page 51 waits for its own link
    [52, 'Revision', 'Revision', 'X7jSWpj2QQU'], [53, 'Video', 'Mobile Phone', 'Ar2pGYXjyJY'],
    [54, 'Video', 'Tech Tools and Toys', 'UeM8FyrrTko'], [56, 'Revision', 'Tech Tools and Toys Revision', 'dkVfaHuRmLU'],
    [57, 'Video', 'Artificial Intelligence Devices', 'i6w7ASGf3Yw'], [58, 'Video', 'AI in Navigation and Travel', 'QJHzjSElAqA'],
    [59, 'Video', 'AI in Security and Surveillance', 'DsfYYqrSdmA'], [60, 'Video', 'Explore Computers', 'Mp4ZtHlKKNM'],
    [61, 'Video', 'Storage Devices', 'Zm6eK7Hz67Q'], [62, 'Video', 'Computer Desktop', 'Fjz0UcSREU8'],
    [63, 'Video', 'Computer Safety', 'AvY3K-vUgIY'], [64, 'Video', 'Daily Use of AI', 'jRjiVaIAj7E'],
    [65, 'Revision', 'Daily Use of AI Revision', 'GK1iGUoRpXQ']
  ];
  for (const [p, label, title, id] of PAGES) add(p, video(label, label === 'Revision' ? '🔁' : '▶️', title, id, { x: 2, y: 2 }));
})();
