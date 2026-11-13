// Exercise questions of the practice pages: each question opens on its own (app.js openQuestion).
// Positions are % of the page, measured on a grid of the page. Kept apart from the generated activity files,
// so re-running a book's generator does not remove them.
// kind: colour (hint: where to start, sample: a coloured picture, { word } finds it in the book's Play games)
//       | write (lines: where to write) | match (dots: the same id is a pair) | choose (options: tap and ring each correct one)
(() => {
  const box = (x, y, w, h) => ({ x, y, w, h });
  const rects = rows => rows.map(([x, y, w, h]) => box(x, y, w, h));
  const Q = (kind, title, say, button, crop, more = {}) => ({ type: 'question', kind, title, say, button: { x: button[0], y: button[1] }, crop, ...more });
  // a letter (or picture) to tap, centred at (x, y)
  const tap = (x, y, correct, label, w = 5.2, h = 4.8) => ({ x: x - w / 2, y: y - h / 2, w, h, correct, label });
  // the four letter columns and lines of English 3+ "Colour and write the given letters"
  const LETTER_LINES = rects([[7, 30.8, 21.3, 8.3], [29, 30.8, 21.3, 8.3], [50.8, 30.8, 21, 8.3], [72.8, 30.8, 21.2, 8.3]]);
  const MATCH_X = [17, 39.5, 61, 83];
  const C = { red: '#e63946', orange: '#f4a261', yellow: '#f9c74f', green: '#43aa8b', blue: '#4aa3df', purple: '#7b5ea7', pink: '#ff8fab', brown: '#8d5524', black: '#222222' };
  // a picture (or a part of one) to colour: a box round its whole outline, and the colours it may have
  // (swatches show them at dot, or at the box's corner). The part is the box less the paper round the outline.
  const part = (name, [x, y, w, h], colours, dot) => ({ part: name, box: box(x, y, w, h), colours: [].concat(colours || []), ...(dot ? { dot: { x: dot[0], y: dot[1] } } : {}) });
  // a picture made of separate pieces, each coloured on its own (a ball's stripes, an umbrella's panels, a bus's windows)
  const pieces = (...args) => ({ ...part(...args), pieces: true });
  // the four letters of a reinforcement page are coloured like their outlines: red, blue, orange, green
  const LETTER_BOXES = [[8.6, 14.2, 18.2, 14.8], [30.4, 14.2, 18.4, 14.8], [52.4, 14.2, 18.2, 14.8], [74.2, 14.2, 18.2, 14.8]];   // inside each frame
  const OUTLINE = [C.red, C.blue, C.orange, C.green];

  // English 3+ reinforcement page: colour the letters, write them, colour the picture beginning with a letter
  const colourAndWrite = (letters, button = [66, 8.6]) => [
    Q('colour', 'Colour the given letters.', `Colour inside each letter with the colour of its box.`, button, box(5, 12.8, 90, 17.7),
      { hint: { x: 17, y: 22 }, parts: letters.map((l, i) => part(l, l === 'j' ? [...LETTER_BOXES[i].slice(0, 3), 15.4] : LETTER_BOXES[i], OUTLINE[i], [LETTER_BOXES[i][0] + 3, LETTER_BOXES[i][1] + 3])) }),   // j's hook reaches lower
    Q('write', 'Write the given letters.', `Write ${letters.join(', ')} on the lines.`, [83, button[1]], box(5, 29.8, 90, 9.6),
      { hint: { x: 9, y: 33 }, lines: LETTER_LINES })
  ];
  // colour the right picture, its parts in their colours; the other picture (wrong) cannot be coloured
  // both pictures can be coloured, each in its own colours, as the small coloured pictures (samples) show
  const colourPicture = (letter, left, parts, samples, crop = box(5, 44.8, 90, 22.7), button = [2, 49]) =>
    Q('colour', `Colour the picture that begins with the letter ${letter}.`, `Which picture begins with ${letter}? Colour it with the colours of the small picture.`, button, crop,
      { hint: { x: left ? 30 : 70, y: 57 }, parts, samples });
  const MANY = [C.red, C.orange, C.yellow, C.green, C.blue, C.purple, C.pink];
  // match each letter of the top row to the same letter in the bottom row
  const sameLetters = (top, bottom, { button = [71, 67.6], crop = box(5, 71.5, 90, 24), yTop = 82.5, yBottom = 87 } = {}) =>
    Q('match', 'Match each letter to the same letter.', 'Draw a line from each letter to the same letter.', button, crop,
      { dots: [...top.map((id, i) => ({ id, x: MATCH_X[i], y: yTop })), ...bottom.map((id, i) => ({ id, x: MATCH_X[i], y: yBottom }))] });
  // match the letters (top) with the pictures beginning with them (bottom): top/bottom are [id, x, y]
  const lettersToPictures = (top, bottom, button, crop) =>
    Q('match', 'Match the letters with the pictures.', 'Draw a line from each letter to the picture that begins with it.', button, crop,
      { dots: [...top, ...bottom].map(([id, x, y]) => ({ id, x, y })) });
  const initialLetters = (button, crop, lines) =>
    Q('write', 'Look at the pictures and write the initial letter for each.', 'Say the name of each picture. Write the letter it begins with on its lines.',
      button, crop, { hint: { x: lines[0][0] + 3, y: lines[0][1] + 3 }, lines: rects(lines) });
  const circleLetter = (button, crop, options) =>
    Q('choose', 'Look at the pictures and circle the correct letter for each.', 'What does each picture begin with? Tap the right letter to circle it.',
      button, crop, { options: options.map(([x, y, correct, label]) => tap(x, y, correct, label)) });
  const encircle = (letter, button, crop, options) =>
    Q('choose', `Encircle the pictures that begin with the letter ${letter}.`, `Tap each picture that begins with ${letter}.`, button, crop,
      { options: options.map(([x, y, correct, label]) => tap(x, y, correct, label, 15, 12)) });
  const writeAndTrace = (title, button, crop, lines) =>
    Q('write', title, `${title} Write the letter, then trace the dotted picture and colour it.`, button, crop, { hint: { x: lines[0][0] + 3, y: lines[0][1] + 3 }, lines: rects(lines) });

  // Urdu books: a letter to tap is a little bigger (the letters are written larger)
  const harf = (x, y, correct, label) => tap(x, y, correct, label, 6.4, 5.8);
  const U = (kind, title, say, button, crop, more) => Q(kind, title, say, button, crop, more);
  const urduCircle = (title, button, crop, options) => U('choose', title, 'تصویر کا نام بولیں۔ جس حرف سے نام شروع ہوتا ہے، اُس پر ٹیپ کریں۔', button, crop,
    { options: options.map(([x, y, correct, label]) => harf(x, y, correct, label)) });
  const urduWrite = (title, button, crop, lines, say = 'تصویر کا نام بولیں اور خانے میں پہلا حرف لکھیں۔') =>
    U('write', title, say, button, crop, { hint: { x: lines[0][0] + 2, y: lines[0][1] + 2 }, lines: rects(lines) });
  const urduColour = (title, button, crop, parts, samples, skip = []) =>
    U('colour', title, 'تصویر میں چھوٹی تصویر جیسے رنگ بھریں۔', button, crop,
      { hint: { x: parts[0].box.x + parts[0].box.w / 2, y: parts[0].box.y + parts[0].box.h / 2 }, parts, samples, skip: rects(skip) });

  window.BOOK_QUESTIONS = {
    'new-stemford-english-3': {
      13: [...colourAndWrite(['a', 'b', 'c', 'd']),
        colourPicture('a', true, [part('stem', [24, 47, 4.6, 5], C.brown, [22.5, 46]), part('leaf', [28, 45, 12.5, 5.6], C.green, [39.5, 45.5]),
          part('apple', [17, 49.8, 25.5, 17.2], C.red, [17.5, 52]), { ...pieces('ball', [60, 47.5, 26.5, 18.5], [C.red, C.blue], [84, 47.5]),
            // the stripes alternate red and blue, as on the sample ball
            seeds: [[65.9, 52, C.red], [72.8, 49.8, C.blue], [80.5, 53.1, C.red], [64.4, 59.8, C.blue], [72.8, 60.3, C.red], [81.3, 59.2, C.blue]].map(([x, y, colour]) => ({ x, y, colour })) }], ['apple', 'ball']),
        sameLetters(['c', 'a', 'b', 'd'], ['a', 'd', 'c', 'b'])],
      14: [lettersToPictures([['a', 18, 22], ['c', 40, 22], ['b', 62, 22], ['d', 82, 22]], [['c', 18, 29], ['a', 40, 29], ['d', 62, 28.5], ['b', 83, 29]],
        [70, 4.4], box(5, 8.5, 90, 35.5)),
        initialLetters([30, 48.2], box(5, 51, 90, 46), [[23.5, 54.2, 21.5, 9.2], [67.8, 54.2, 21.8, 9.2], [23.5, 70.2, 21.5, 9], [69.8, 70.2, 19.8, 9], [22.8, 85, 22.2, 9], [67.8, 85, 21.8, 9]])],
      15: [circleLetter([22, 8.8], box(5, 11.5, 90, 22), [[15, 30.7, false, 'c'], [23.6, 30.7, true, 'a'], [32.1, 30.7, false, 'b'],
        [44.6, 30.7, false, 'c'], [53.1, 30.7, false, 'a'], [61.7, 30.7, true, 'b'], [74, 30.7, true, 'c'], [82.6, 30.7, false, 'a'], [91.1, 30.7, false, 'b']]),
        Q('choose', 'Look at the picture and circle the letter c.', 'Find every letter c in the cat. Tap each one to circle it.', [82, 31.6], box(5, 37.5, 85, 37),
          { hide: [box(5, 69, 14, 6), box(80, 70.5, 16, 5)],
            options: [[11.4, 43.6, 'c'], [18.9, 42.8, 'a'], [26, 46.4, 'c'], [29.3, 51.8, 'd'], [35, 54.1, 'a'], [42.4, 51.8, 'c'], [53, 51.8, 'c'],
              [61, 53.2, 'b'], [66.9, 48, 'a'], [77.7, 51.2, 'b'], [68, 55.2, 'a'], [77.1, 57.4, 'c'], [47.9, 56.5, 'c'], [55.1, 57.8, 'd'],
              [39.3, 58.8, 'd'], [62.6, 60, 'c'], [71.3, 61.3, 'd'], [45.9, 62.3, 'a'], [35.4, 62.8, 'b'], [31.1, 67.2, 'c'], [40.6, 66.6, 'c'],
              [52.4, 65.4, 'c'], [62.9, 66.6, 'b'], [73, 67, 'c']].map(([x, y, l]) => tap(x, y, l === 'c', l)) })],
      25: [...colourAndWrite(['e', 'f', 'g', 'h']), colourPicture('f', true, [part('fish', [12.5, 45.3, 37, 22.4], [C.blue, C.orange], [13, 46]), part('grapes', [55, 45, 31.5, 22], [C.green, C.brown], [86, 46])], ['fish', 'grapes']),
        writeAndTrace('Write h, trace and colour the hat.', [70, 67.8], box(5, 71, 90, 25.5), [[9, 79.5, 31, 11], [44, 71.5, 44, 23]])],
      26: [lettersToPictures([['h', 13.4, 21.5], ['e', 35, 21.5], ['f', 56.6, 21.5], ['g', 77.5, 21.5]], [['e', 13.5, 29.5], ['g', 35.5, 29.5], ['h', 57, 29.5], ['f', 77.5, 29.5]],
        [63, 3.8], box(5, 8, 90, 35)),
        initialLetters([58, 70.3], box(0, 47.5, 99, 23.5), [[12.5, 49.5, 16, 8.5], [41.5, 49.5, 16.5, 8.5], [71.5, 49.5, 17, 8.5], [13, 61.5, 15.5, 9], [41.5, 61.5, 16.5, 9], [71.5, 61.5, 17, 9]])],
      35: [...colourAndWrite(['i', 'j', 'k', 'l']), colourPicture('l', false, [part('jug', [14.5, 45, 34, 23], [C.blue], [10, 46]), part('lemon', [52.5, 46.5, 35, 20.5], [C.yellow, C.green], [87, 47])], ['jug', 'lemon']), sameLetters(['i', 'j', 'k', 'l'], ['l', 'k', 'i', 'j'])],
      36: [circleLetter([21, 9.4], box(5, 13, 90, 38.5), [[42.9, 17.5, false, 'l'], [42.9, 23, true, 'j'], [42.9, 29, false, 'k'],
        [88.4, 17.5, true, 'k'], [88.4, 23.5, false, 'l'], [88.4, 29, false, 'j'],
        [38.4, 36.5, false, 'i'], [38.4, 41.5, false, 'j'], [38.4, 47.5, true, 'l'], [84, 36.5, false, 'l'], [84, 42, true, 'i'], [84, 47.5, false, 'k']]),
        writeAndTrace('Write i, trace and colour the igloo.', [72, 53.3], box(5, 57, 90, 39), [[9, 61, 24, 8.5], [15, 57.5, 78, 38.5]])],
      37: [lettersToPictures([['j', 13.5, 19], ['k', 35, 19], ['i', 56, 19], ['l', 77.5, 19]], [['k', 13, 26], ['j', 35, 26], ['l', 57, 26], ['i', 77.5, 26]],
        [63, 3.8], box(5, 8, 90, 29.5)),
        initialLetters([15, 41.3], box(5, 43.5, 90, 28), [[11, 52, 16, 6.5], [41.5, 52, 17, 6.5], [69, 52, 16.5, 6.5], [11, 65.5, 16, 6], [41.5, 65.5, 17, 6], [69, 65.5, 16.5, 6]])],
      47: [...colourAndWrite(['m', 'n', 'o', 'p']), colourPicture('o', false, [part('mango', [15.5, 44.3, 28.5, 24.7], [C.yellow, C.orange, C.green], [8, 46]), part('orange', [51.5, 44.3, 39, 24.7], [C.orange, C.green, C.brown], [88, 46])], ['mango', 'orange']),
        encircle('p', [83, 66.8], box(5, 74, 90, 22), [[17, 81, false, 'orange'], [31, 89, true, 'peacock'], [49, 82, false, 'nest'], [66, 89, false, 'monkey'], [84, 82, true, 'parrot']])],
      48: [lettersToPictures([['n', 13, 19.5], ['m', 35, 19.5], ['o', 56.5, 19.5], ['p', 77.5, 19.5]], [['m', 13, 27], ['o', 36, 27], ['n', 56, 28.5], ['p', 77.5, 27]],
        [63, 3.8], box(5, 8, 90, 33)),
        initialLetters([15, 44.3], box(5, 46, 90, 25), [[19, 49.5, 15.5, 8], [48.5, 49.5, 15.5, 8], [78, 49.5, 16, 8], [19, 60.5, 15.5, 8.5], [48.5, 60.5, 15.5, 8.5], [78, 60.5, 16, 8.5]])],
      57: [...colourAndWrite(['q', 'r', 's', 't']), colourPicture('t', false, [pieces('rocket', [16, 44.3, 33.5, 21.7], [C.red, C.blue, C.yellow, C.orange], [8, 46]),
          part('leaves', [61.5, 44.2, 12, 6.5], C.green, [74.5, 44.5]), part('tomato', [56.5, 44.8, 31, 21], C.red, [88, 52])], ['tomato']), sameLetters(['r', 't', 's', 'q'], ['q', 'r', 't', 's'], { yTop: 82, yBottom: 87.5 })],
      58: [lettersToPictures([['s', 13, 21.5], ['r', 35, 21.5], ['t', 57.5, 21.5], ['q', 78, 21.5]], [['r', 13.5, 31], ['s', 35, 31], ['q', 56, 31], ['t', 77.5, 30.5]],
        [63, 4.8], box(5, 9, 90, 36)),
        initialLetters([15, 50.5], box(5, 53, 90, 43), [[23, 55.8, 22, 8.5], [69, 55.8, 21, 8.5], [23, 71.8, 22, 8], [69, 71.8, 21, 8], [23, 88, 22, 8], [69, 88, 21, 8]])],
      59: [circleLetter([21, 7.8], box(5, 10.5, 90, 22.5), [[16, 30, false, 'q'], [23, 30, true, 's'], [29.5, 30, false, 'r'],
        [42, 30, true, 'q'], [49, 30, false, 's'], [56, 30, false, 't'], [70.5, 30, true, 't'], [77, 30, false, 'q'], [83, 30, false, 'r']]),
        writeAndTrace('Write s, trace and colour the snake.', [72, 33.3], box(5, 38, 90, 33), [[17, 53.5, 26, 9], [36, 39, 42, 31]])],
      69: [...colourAndWrite(['u', 'v', 'w', 'x']), colourPicture('x', false, [pieces('umbrella', [12.5, 46, 36, 22], MANY, [5.5, 46.5]), pieces('xylophone', [57, 46, 30.5, 22], MANY, [72, 64.5])], ['umbrella', 'xylophone']),
        encircle('u', [83, 70.2], box(5, 74, 90, 22.5), [[15, 81, true, 'umbrella'], [43, 80, false, 'xylophone'], [66, 87, true, 'umpire'], [83, 81, false, 'vest'], [31, 90, false, 'van']])],
      70: [lettersToPictures([['u', 13, 18.5], ['w', 35, 18.5], ['v', 57, 18.5], ['x', 78, 18.5]], [['x', 13, 27], ['w', 35, 27], ['u', 56, 27], ['v', 78, 27]],
        [63, 3.8], box(5, 8, 90, 33)),
        initialLetters([15, 46], box(5, 48.5, 90, 23), [[13, 50.5, 18, 7.5], [46, 50.5, 17.5, 7.5], [77, 50.5, 17, 7.5], [13, 62.8, 18, 8], [46, 62.8, 17.5, 8], [77, 62.8, 17, 8]])],
      75: [Q('colour', 'Colour the given letters.', 'Colour inside each letter with the colour of its box.', [66, 7.8], box(25, 12, 50, 18),
          { hint: { x: 38, y: 20 }, parts: [part('y', [29.5, 13.5, 18.5, 14.5], C.red, [31, 15]), part('z', [51.5, 13.5, 18.5, 14.5], C.blue, [53, 15])] }),
        Q('write', 'Write the given letters.', 'Write y and z on the lines.', [83, 7.8], box(25, 29.5, 50, 9.5), { hint: { x: 30, y: 32 }, lines: rects([[27.5, 30, 21.5, 8.5], [49.5, 30, 22, 8.5]]) }),
        colourPicture('y', true, [pieces('yacht', [10.5, 45, 33, 23.2], [C.blue, C.red, C.brown, C.yellow], [27, 45.5]), pieces('bus', [53.5, 45, 37, 23.4], [C.blue, C.yellow, C.red], [53, 69.5])], [],
          box(5, 44, 90, 25.5), [2, 48.5]),
        lettersToPictures([['y', 25.5, 82], ['y', 30.5, 82], ['z', 70.5, 82], ['z', 75.5, 82]], [['z', 17, 85.5], ['y', 41, 85.5], ['y', 64, 85], ['z', 85, 85.5]],
          [70, 67.8], box(5, 71.5, 90, 24.5))],
      76: [circleLetter([15, 6.8], box(5, 9, 90, 16.5), [[39, 12.5, false, 'x'], [39, 17, true, 'y'], [39, 22, false, 'z'], [77.3, 12.5, false, 'x'], [77.3, 17, false, 'y'], [77.3, 22, true, 'z']]),
        initialLetters([15, 28.8], box(5, 31.5, 90, 15), [[24, 35.5, 20, 7], [68, 35.5, 19.5, 7]]),
        Q('write', 'Write the missing letters.', 'Write the missing letters of the alphabet in the spaces.', [53, 45.5], box(0, 50, 100, 21),
          { hint: { x: 18, y: 55 }, lines: rects([[3, 51, 94, 9.5], [3, 62, 94, 8.5]]) })],
      77: [Q('choose', 'Read and tick the correct picture.', 'Read each word. Tap the picture it names.', [72, 8.3], box(5, 11.5, 90, 28),
          { options: [[43, 17.5, false, 'grapes'], [63, 17.5, false, 'orange'], [83, 17.5, true, 'apple'], [43, 26, false, 'bus'], [63, 26, true, 'umbrella'], [83, 26, false, 'xylophone'],
            [43, 34.5, false, 'turtle'], [63, 34.5, false, 'lion'], [83, 34.5, true, 'yak']].map(([x, y, correct, label]) => tap(x, y, correct, label, 14, 7.5)) }),
        Q('choose', 'Look at each picture and circle the correct letter.', 'What does each picture begin with? Tap the right letter.', [66, 44.5], box(5, 47.5, 90, 48),
          { options: [[24.5, 52.8, true, 'a'], [24.5, 57.5, false, 'b'], [67.5, 53, true, 'd'], [67.5, 57.5, false, 'e'], [24.5, 69.5, false, 'g'], [24.5, 74.5, true, 'h'],
            [67.5, 69.5, true, 'm'], [67.5, 74, false, 'n'], [24.5, 86, true, 'q'], [24.5, 91, false, 'r'], [67.5, 86, false, 'y'], [67.5, 91, true, 'z']].map(([x, y, c, l]) => tap(x, y, c, l)) }),
        Q('write', 'Write the letter in the blank space.', 'Write the letter you circled in the blank space.', [83, 44.5], box(5, 47.5, 90, 48),
          { hint: { x: 31, y: 54 }, lines: rects([[29.5, 52, 7.5, 6], [72, 52, 7.5, 6], [29.5, 69, 7.5, 6], [72, 69, 7.5, 6], [29.5, 85, 7.5, 6], [72, 85, 7.5, 6]]) })],
      79: [Q('write', 'Write the missing letters (a-z).', 'Write the missing letters of the alphabet on the lines.', [62, 8.6], box(3, 12, 94, 78),
        { hint: { x: 30, y: 17 }, lines: rects([[3, 13, 94, 77]]) })],
      81: [Q('write', 'Help the bee find the flower by following the letters from a to z.', 'Start at a. Draw a line through the letters in order, from a to z, to the flower.',
        [33, 10.5], box(5, 13, 90, 80), { label: 'Draw', hint: { x: 21, y: 21 }, lines: rects([[5, 14, 90, 78]]) })]
    },
    // Maths 3+ practice questions, reviewed against this edition's printed pages.
    'stemford-maths-3': (() => {
      const W = (title, button, crop, lines, say = title) => Q('write', title, say, button, crop,
        { hint: { x: lines[0][0] + lines[0][2] / 2, y: lines[0][1] + lines[0][3] / 2 }, lines: rects(lines) });
      const pick = (title, say, button, crop, options) => Q('choose', title, say, button, crop,
        { options: options.map(([x, y, w, h, correct, label]) => ({ x, y, w, h, correct, label })) });
      const topCounts = (twoHands = false) => [
        W('Count and write.', [33, 1], box(5, 9.3, 46.5, 17), [[41.5, 17.7, 7, 4.8]], 'Count the coloured dots and write their number.'),
        W('Count the pointed fingers.', [78, 1], box(53.5, 5.5, 42, 23.7), [[twoHands ? 85.2 : 80.5, 17.2, 6.7, 4.5]], 'Count the pointed fingers and write their number.')
      ];
      const groupChoice = (n, button, crop, options) => pick(`Find and circle the groups of '${n}' objects.`,
        `Count each group. Tap every group with ${n} objects.`, button, crop, options);
      const cross = (n, what, top, bottom, numberBox) => W(`Trace, count and cross out '${n}' ${what}.`, [0.4, top + 3],
        box(4, top + 3.1, 91, bottom - top - 3.1), [numberBox, [17, top + 6, 74, bottom - top - 7]],
        `Trace ${n}. Count and cross out ${n} ${what}.`);
      const shapes = (page, name, colour, bounds, model, y) => [
        W(`Trace the ${name}s.`, [57, y], box(8, y + 5.3, 84, 88.5 - y - 5.3), bounds,
          `Trace each dotted ${name}, starting at the dot.`),
        Q('colour', `Colour the ${name}s ${colour === C.red ? 'red' : colour === C.blue ? 'blue' : colour === C.yellow ? 'yellow' : 'green'}.`,
          `Colour inside each ${name} like the sample.`, [77, y], box(8, y + 5.3, 84, 88.5 - y - 5.3),
          { hint: { x: bounds[0][0] + bounds[0][2] / 2, y: bounds[0][1] + bounds[0][3] / 2 },
            parts: bounds.map((b, i) => ({ ...part(`${name} ${i + 1}`, b, colour), outline: name === 'circle' ? 'ellipse' : name === 'triangle' ? 'triangle' : 'rectangle' })),
            samples: bounds.map(() => ({ page, ...model })) })
      ];
      const whatComes = (last = false) => {
        const beforeY = last ? [16.4, 25] : [16.8, 25.7];
        const afterY = last ? [39, 49.8] : [40.2, 51.1];
        const betweenY = last ? [66.7, 80.0] : [71, 84.2];
        const before = beforeY.flatMap(y => [11.5, 42.5, 74].map(x => [x, y, 5.5, 4.4]));
        const after = afterY.flatMap(y => [17.4, 51, 85.4].map(x => [x, y, 5.6, 4.2]));
        const between = betweenY.flatMap(y => [15.6, 48.2, 80.2].map(x => [x, y, 5.5, 4.2]));
        if (last) { between.pop(); between.push([72, 80.2, 5.4, 4.2], [87.7, 80.2, 5.4, 4.2]); }
        return [W('Write the number that comes before.', [78, 6], box(7, 14, 85, last ? 17 : 17.8), before),
          W('Write the number that comes after.', [78, last ? 31.5 : 33.5], box(7, last ? 36 : 37, 86, last ? 19.5 : 20), after),
          W('Write the number that comes in between.', [78, last ? 56 : 59.6], box(4, last ? 62 : 67, 92, last ? 27 : 27), between)];
      };
      const mazeRoute = [[3,1],[4,1],[4,2],[4,3],[3,3],[3,4],[2,4],[1,4],[1,5],[1,6],[2,6],[2,5],[3,5],[3,6],[4,6]];
      return {
        4: [W('Trace.', [30, 7], box(4, 13, 92, 77), [[23,20.4,52,2.4],[23,30.5,52,5],[23,43,52,5],[23,59,52,6],[23,76,52,6]],
          'Start at each animal and trace the dotted path to its home.')],
        5: [W("Write 'b' for the big and 's' for the small one.", [78, 51.2], box(9, 56, 80, 34),
          [[32.4,79.9,6.4,4.4],[80.1,73.9,6.4,4.5]])],
        8: [...topCounts(), W('Count and trace.', [76,29.5], box(8,35,79,27), [[13,45.9,9.3,6.1]], 'Count the pineapple and trace one.'),
          W('Count and write.', [76,63], box(9,67,80,27), [[76.2,78,9,6.1]], 'Count the sun and write one.')],
        11: [...topCounts(), W('Count and trace.', [76,29.5], box(8,35,79,27), [[13,45.9,9.3,6.1]], 'Count the cars and trace two.'),
          W('Count and write.', [76,63], box(9,67,80,27), [[76.2,78,9,6.1]], 'Count the trees and write their number.')],
        14: [...topCounts(), cross(3,'butterflies',32,59,[8,43.3,9,6]),
          W('Count and write.', [76,65.5], box(9,70,85,23.5), [[81.4,75.8,9.3,6.0]], 'Count the balls and write their number.')],
        17: [...topCounts(), cross(4,'birds',32,62,[7,46,9,6]),
          groupChoice(4,[0.4,68],box(5,68,90,25.5), [[20,71,10,11,false,'one chick'],[48,70,42,10,true,'four trees'],
            [8,82,31,10,true,'four doughnuts'],[56,83,30,9,false,'three balls']])],
        18: [W('Tick the long vehicle and encircle the short one.', [78,50.5], box(6,54,86,35),
          [[28,56.7,4.3,4.3],[77.6,54.3,4.3,4.3]], 'Tick the circle above the long bus, then ring the circle above the short car.')],
        19: [W("Write 't' for the tall animal and 's' for the short one.", [78,51], box(34,51,38,39),
          [[39.2,62.2,6.1,4.4],[60.5,81.9,6,4.4]])],
        22: [...topCounts(), cross(5,'balls',32,61.5,[8,47,9,6]),
          W('Count and write.', [76,64], box(10,69,82,24), [[81.1,79,9.5,6]], 'Count the pears and write their number.')],
        23: [W('Count and write.', [77,5], box(10,11,84,28), [[40.3,19.7,9.2,4.1],[83.5,19.8,9.5,4.2],[40.3,34.2,9.2,4.2],[83.5,34.4,9.5,4.1]]),
          Q('match','Count the objects and match them with the correct number.','Join each number to the group with that many objects.',
            [38,43.5],box(10,43.4,84,30),{dots:[{id:'3',x:31,y:48.5},{id:'4',x:31,y:58.5},{id:'1',x:31,y:68.5},
              {id:'1',x:69,y:49.5},{id:'3',x:69,y:59.5},{id:'4',x:69,y:69.5}]})],
        26: [...topCounts(true), groupChoice(6,[37,44],box(6,35,88,26), [[15,36,18,11,true,'six oranges'],[59,37,27,10,false,'four ice creams'],
          [15,50,18,9,false,'five strawberries'],[59,49,23,11,true,'six cupcakes']]),cross(6,'trees',65,94,[7,80.2,9,6])],
        27: shapes(27,'circle',C.red,[[13.4,74.7,17.8,12.3],[41.8,74.7,17.8,12.3],[70.3,74.7,17.8,12.3]],box(3,0,93,44),69),
        30: [...topCounts(true), W('Count and write.',[76,29.5],box(11,34,80,29),[[77.3,45,9.4,5.8]],'Count the seven chicks and write the number.'),
          groupChoice(7,[77,94],box(6,68,89,25.5),[[8,70,41,9,true,'seven biscuits'],[55,70,34,9,false,'five strawberries'],
            [8,82,29,11,false,'four oranges'],[54,81,38,12,true,'seven balls']])],
        33: [...topCounts(true),groupChoice(8,[77,94],box(6,35,88,26.8),[[10,37,36,9,false,'four doughnuts'],[54,36,39,11,true,'eight ice creams'],
          [8,50,35,10,true,'eight strawberries'],[51,50,41,10,false,'six pineapples']]),cross(8,'objects',65,94,[7,80.2,9,6])],
        36: [...topCounts(true),W('Count and write.',[76,29.5],box(11,34,80,27),[[77.2,44.8,9.5,6]],'Count the carrots and write nine.'),
          groupChoice(9,[77,94],box(6,68,89,26),[[8,70,38,10,true,'nine cupcakes'],[56,70,38,8,false,'six biscuits'],
            [9,85,39,9,false,'five balls'],[58,81,35,12,true,'nine cherries']])],
        37: [W("Write 'h' for the heavy and 'l' for the light one.",[77,55],box(4,57,89,33),[[13.2,59.7,6.2,4.4],[81.3,82.7,6,4.4]])],
        38: [pick('Tick the object that is different.','Tap the ball that is different.',[77,50],box(6,54,88,17),
          [[9,56,15,13,false,'ball one'],[26,56,15,13,true,'different ball'],[41,56,15,13,false,'ball three'],[58,54,15,13,false,'ball four'],[76,56,15,13,false,'ball five']]),
          pick('Tick the objects that are same.','Tap the two ducks that are the same.',[77,70],box(6,73,88,20),
            [[9,74,18,16,true,'first duck'],[32,75,17,15,false,'chick'],[48,74,18,16,true,'second duck'],[70,73,22,17,false,'hen']])],
        39: shapes(39,'square',C.blue,[[13.7,73.2,18.3,13.5],[39.8,73.2,18.3,13.5],[65.9,73.2,18.3,13.5]],box(3,0,93,42),66.3),
        41: [W('Trace and write.',[77,2],box(5,8,88,57),[[7.5,9.5,84,13.3],[7.5,23,84,9],[7.5,32.2,84,9],[7.5,41.5,84,9],[7.5,51,84,9]],'Trace zero and write more zeros in the empty cells.'),
          pick("Tick the basket having '0' carrot.",'Tap the empty basket with no carrots.',[77,66.2],box(7,71,85,19),
            [[9,74,25,15,false,'one carrot'],[37,74,25,15,false,'two carrots'],[65,74,25,15,true,'zero carrots']])],
        44: [pick('Count the objects and circle the correct numbers.','Count each group and tap its number.',[77,4.5],box(13,13,72,27),
          [[40.8,14.5,5,5,false,'4 apples'],[40.8,20.5,5,5,true,'6 apples'],[78.4,14.5,5,5,true,'8 pears'],[78.4,20.5,5,5,false,'10 pears'],
            [40.8,29,5,5,false,'9 stars'],[40.8,34.5,5,5,true,'7 stars'],[78.4,29,5,5,false,'5 flowers'],[78.4,34.5,5,5,true,'10 flowers']]),
          W('Count the objects in the picture and write their numbers in the boxes.',[55,43.9],box(4,47.5,90,27.3),
            [[87.3,49.1,4.9,3],[87.3,56.1,4.9,3],[87.3,62.4,4.9,3],[87.3,69.6,4.9,3]])],
        45: whatComes(),
        56: [Q('colour','Help the baby fish to reach its mother by colouring the numbers in sequence from 1 to 15.',
          'Start at one and colour the path through two, three, up to fifteen. Use yellow like the starting square.',[77,3],box(8,22,86,49.5),
          {hint:{x:19,y:43},parts:mazeRoute.map(([row,col],i)=>part(String(i+1),[13.6+(col-1)*11.76-.3,23.4+(row-1)*7.89-.3,12.36,8.49],C.yellow)),
            samples:[{page:56,...box(14,40,11,6.8)}]})],
        57: shapes(57,'rectangle',C.yellow,[[12.8,76.3,29.8,10.4],[52.1,76.3,29.8,10.4]],box(3,0,93,45),69),
        68: [pick('Count the objects and tick the relevant number.','Count the caps and bananas. Tap the correct number for each.',[77,4.5],box(9,12,81,29),
          [[15,34.3,5.1,5,false,'19 caps'],[22,34.3,5.1,5,false,'16 caps'],[29,34.3,5.1,5,true,'20 caps'],[36,34.3,5.1,5,false,'13 caps'],
            [59,34.3,5.1,5,false,'15 bananas'],[66,34.3,5.1,5,false,'17 bananas'],[73,34.3,5.1,5,true,'16 bananas'],[80,34.3,5.1,5,false,'18 bananas']]),
          W('Write the missing numbers.',[77,42],box(4,47,90,24.5),[[31.6,50.4,9.3,5.6],[61.8,50.4,9.3,5.6],[13.6,63.2,9.3,5.6],[43.6,63.2,9.3,5.6],[58.6,63.2,9.3,5.6]])],
        69: shapes(69,'triangle',C.green,[[12.8,74.1,19.7,13.8],[39.4,74.1,19.7,13.8],[65.8,74.1,19.7,13.8]],box(3,0,93,46),68.5),
        70: [Q('match','Match each object with another object of the same colour.','Join each picture to the picture of the same colour.',[77,3.5],box(7,14,88,73),
          {dots:[{id:'yellow',x:34,y:23},{id:'red',x:34,y:41},{id:'green',x:34,y:60},{id:'orange',x:34,y:79},
            {id:'red',x:69,y:23},{id:'orange',x:69,y:41},{id:'yellow',x:69,y:60},{id:'green',x:69,y:79}]})],
        71: [W('Trace and write.',[77,5.6],box(8,12,86,79),Array.from({length:10},(_,i)=>[11,12.8+i*7.92,37,6.3]).concat(Array.from({length:10},(_,i)=>[55.4,12.8+i*7.92,38,6.3])),
          'Trace the numbers from one to twenty and write each number in the empty boxes beside it.')],
        72: whatComes(true)
      };
    })(),
    'stemford-urdu-3': {
      10: [urduCircle('تصاویر کی ابتدائی آواز کے گرد دائرہ لگائیں۔', [30, 11.8], box(8, 15.5, 84, 21.5),
          [[17, 33.5, false, 'آ'], [28, 33.5, true, 'ا'], [45, 33.5, true, 'آ'], [56, 33.5, false, 'ا'], [73.5, 33.5, false, 'آ'], [84, 33.5, true, 'ا']]),
        urduColour('رنگ بھریں۔', [35, 37.3], box(4, 41.5, 92, 25),
          [part('آلو', [11, 41, 31, 19], [C.brown, C.yellow]), part('انار', [47, 41.5, 34, 21], [C.red, C.green])], ['آلو', 'انار'], [[6, 57, 12, 8.5], [82, 57, 12, 8.5]]),
        urduWrite('ابتدائی حرف لکھیں۔', [17, 37.3], box(4, 41.5, 92, 25), [[6, 57, 12, 8.5], [82, 57, 12, 8.5]])],
      22: [urduCircle('تصاویر کی ابتدائی آواز کے گرد دائرہ لگائیں۔', [26, 10.8], box(5, 15, 92, 52.5),
          [[15.3, 37.5, false, 'پ'], [25, 37.5, true, 'ب'], [45, 37.5, true, 'پ'], [54.6, 37.5, false, 'ب'], [74.6, 37.5, true, 'ت'], [84.3, 37.5, false, 'ٹ'],
            [29.2, 63.5, true, 'ث'], [39.8, 63.5, false, 'ب'], [60, 63.5, false, 'پ'], [68.4, 63.5, true, 'ٹ']])],
      32: [urduCircle('تصاویر کے پہلے حرف پر دائرہ لگائیں۔', [30, 10.8], box(5, 15, 90, 53),
          [[13.9, 37, false, 'ح'], [24.5, 37, true, 'چ'], [36.4, 37, false, 'ج'], [65.4, 37, false, 'ح'], [75.5, 37, false, 'چ'], [86.7, 37, true, 'ج'],
            [13.9, 64, false, 'ج'], [24.5, 64, false, 'چ'], [36.4, 64, true, 'خ'], [65.4, 64, true, 'ح'], [75.5, 64, false, 'خ'], [86.7, 64, false, 'چ']])],
      // each letter has a dot on both sides; a picture's dot joins the dot of its letter
      48: [U('match', 'تصاویر کو اُن کے متعلقہ حروف سے ملائیے۔', 'ہر تصویر کو اُس کے حرف سے لکیر کھینچ کر ملائیں۔', [27, 10.8], box(0, 16, 100, 52.5),
          { dots: [['ڈ', 26, 22], ['د', 74, 22], ['ز1', 26, 35], ['ذ', 74, 35], ['ر', 26, 48.3], ['ڑ', 74, 48.3], ['ژ', 26, 61.4], ['ز2', 74, 61.4],
            ...[['د', 19.6], ['ڈ', 24.4], ['ذ', 32.7], ['ز1', 37.4], ['ر', 45.9], ['ڑ', 50.7], ['ز2', 59.1], ['ژ', 63.7]].flatMap(([id, y]) => [[id, 41.8, y], [id, 57.9, y]])]
            .map(([id, x, y]) => ({ id, x, y })) })],
      58: [urduWrite('تصاویر کے نام کا پہلا حرف لکھیں۔', [35, 11], box(5, 16, 90, 22), [[12, 30.5, 11.5, 7], [33, 30.5, 11.5, 7], [55, 30.5, 11.5, 7], [77, 30.5, 11.5, 7]]),
        urduColour('تصویر میں رنگ بھریں۔', [30, 39], box(4, 42, 92, 27),
          [pieces('سائیکل', [5, 46, 22, 13], [C.red, C.blue, C.black]), pieces('صندوق', [27.5, 44.5, 22, 16], [C.brown, C.yellow]),
            pieces('ضعیف', [52.5, 42.5, 17, 20], MANY), pieces('شہد', [73, 44.5, 22, 15.5], [C.yellow, C.orange, C.brown])], ['سائیکل', 'صندوق', 'ضعیف', 'شہد'], [[6, 59.5, 19, 8.5], [29, 59.5, 19, 8.5], [52, 59.5, 19, 8.5], [75, 59.5, 19, 8.5]]),
        urduWrite('پہلا حرف لکھیں۔', [10, 39], box(4, 42, 92, 27), [[6, 59.5, 19, 8.5], [29, 59.5, 19, 8.5], [52, 59.5, 19, 8.5], [75, 59.5, 19, 8.5]])],
      68: [urduCircle('تصاویر کے نام کے درست ابتدائی حرف پر دائرہ لگائیں۔', [15, 10.8], box(5, 15.5, 90, 23.5),
          [[9.8, 27.5, true, 'ع'], [21.3, 35.5, false, 'ظ'], [31, 27.5, false, 'ج'], [40.1, 27.5, false, 'ز'], [49.2, 35.5, true, 'ط'], [60.7, 27.5, false, 'ج'],
            [69.2, 27.5, false, 'ز'], [78.2, 35.5, false, 'ظ'], [89.1, 27.5, true, 'غ']]),
        urduColour('دیے گئے خاکوں میں رنگ بھریں۔', [0.5, 38.6], box(4, 43, 93, 26),
          [pieces('طیارہ', [5, 42.5, 42, 21], [C.blue, C.red, C.yellow]), pieces('ظروف', [46.5, 45, 49, 17], MANY)], ['طیارہ', 'ظروف'], [[30, 56, 14, 7.5], [61, 61.5, 14, 7.5]]),
        urduWrite('ان کے نام کا ابتدائی حرف لکھیں۔', [17.5, 38.6], box(4, 43, 93, 26), [[30, 56, 14, 7.5], [61, 61.5, 14, 7.5]])],
      82: [urduCircle('تصاویر کے نام کے ابتدائی حرف پر دائرہ لگائیں۔', [22, 10.3], box(5, 15, 90, 35.5),
          [[13.9, 18.5, false, 'ل'], [13.9, 24, false, 'م'], [13.9, 29.5, true, 'گ'], [58.3, 18.5, true, 'ک'], [58.3, 24, false, 'گ'], [58.3, 29.5, false, 'ل'],
            [13.9, 36.5, false, 'ک'], [13.9, 42, false, 'ل'], [13.9, 47.5, true, 'ف'], [58.3, 36.5, true, 'ق'], [58.3, 42, false, 'ل'], [58.3, 47.5, false, 'ک']]),
        urduColour('دیے گئے خاکوں میں رنگ بھریں۔', [3, 51.3], box(5, 54, 92, 16.5),
          [pieces('قینچی', [20, 54.5, 27, 15], [C.red, C.blue, C.yellow]), pieces('لٹو', [48.5, 54.5, 26.5, 16], MANY)], ['لٹو'], [[8, 61, 14, 7.5], [77.5, 61, 14, 7.5]]),
        urduWrite('ان کے نام کا ابتدائی حرف لکھیں۔', [3, 56.5], box(5, 54, 92, 16.5), [[8, 61, 14, 7.5], [77.5, 61, 14, 7.5]])],
      94: [urduWrite('تصاویر سے متعلقہ حرف لکھیں۔', [40, 10.3], box(5, 16, 90, 53),
          [[10.5, 20.5, 9, 8.5], [54.5, 20.5, 9, 8.5], [10.5, 38.5, 9, 9], [54.5, 38.5, 9, 9], [10.5, 56.5, 9, 9], [54.5, 56.5, 9, 9]])],
      95: [urduWrite('پنسل پھیریں اور یاد کریں۔', [44, 9.5], box(3, 12, 94, 82), [[5, 13, 90, 80]], 'نقطوں پر پنسل پھیر کر حروفِ تہجی لکھیں۔')]
    }
  };
})();
