// Activities made for the converted books: BOOK_ACTIVITIES[bookId][pageNumber].
// All x, y, w, h are % of the page.
//
// type 'fill': the page zooms in; "Show me how" plays the steps (a pencil writes each answer while
//   it is explained aloud), "I'll do it myself" gives the child the colours and pen.
//   marks: tick (x, y = centre) | write (x = left edge, y = middle of the line) | circle (x, y = centre)
// type 'story': a "Story time" button opens the story: the book's pictures pan and zoom (from -> to,
//   {cx, cy} = centre and w = width of the view, in % of the page) while each part is read aloud.
// A page may list several activities in an array.
// fill marks may also be: letter (x, y = top-left, s = width, % of page width) | scribble (colour; cx, cy, rx, ry).
// type 'game': a "Play" button on the page opens a find-the-thing game on a part of the page picture.
window.BOOK_ACTIVITIES = {
  'new-stemford-english-3': {
    5: [
      { type: 'story', label: 'Learn a', icon: '🔤', title: 'The letter a', button: { x: 47, y: 23.5 },
        scenes: [
          { page: 5, from: { cx: 20, cy: 19, w: 40 }, to: { cx: 20, cy: 19, w: 30 },
            text: 'This is the letter a. Say it with me. a, a, a!' },
          { page: 5, from: { cx: 80, cy: 18, w: 40 }, to: { cx: 85, cy: 18, w: 26 },
            text: 'Open your mouth wide and lower your jaw. a!' },
          { page: 5, from: { cx: 50, cy: 42, w: 80 }, to: { cx: 50, cy: 38, w: 50 },
            text: 'The tiny ant finds a shiny apple.' },
          { page: 5, from: { cx: 20, cy: 74, w: 36 }, to: { cx: 20, cy: 74, w: 30 },
            text: 'a for apple.' },
          { page: 5, from: { cx: 45, cy: 74, w: 36 }, to: { cx: 45, cy: 74, w: 30 },
            text: 'a for ant.' },
          { page: 5, from: { cx: 75, cy: 74, w: 40 }, to: { cx: 75, cy: 74, w: 32 },
            text: 'a for alligator. Apple, ant, alligator. They all begin with a!' }
        ] },
      { type: 'game', title: 'Find the a words!', button: { x: 32, y: 62 },
        crop: { x: 5, y: 63, w: 90, h: 21 },
        targets: [
          { name: 'apple', x: 10, y: 68, w: 16, h: 16, say: 'Apple begins with a.' },
          { name: 'ant', x: 36, y: 65, w: 17, h: 19, say: 'Ant begins with a.' },
          { name: 'alligator', x: 63, y: 64, w: 26, h: 20, say: 'Alligator begins with a.' }
        ] }
    ],
    6: {
      type: 'fill', title: 'Trace and colour',
      steps: [
        { say: 'Let us write the letter a. Start here, go round like a ball, then go up, and come down with a little tail.',
          marks: [{ letter: 'a', x: 11, y: 26.6, s: 10.5, weight: .07 }] },
        { say: 'Again! Round, up, and down.', marks: [{ letter: 'a', x: 28.2, y: 26.6, s: 10.5, weight: .07 }] },
        { say: 'Now trace the small letters. Round, up, and down.',
          marks: [{ letter: 'a', x: 10, y: 45, s: 6.2 }, { letter: 'a', x: 28.3, y: 45, s: 6.2 }, { letter: 'a', x: 46.6, y: 45, s: 6.2 }] },
        { say: 'One more line. Round, up, and down. Good job!',
          marks: [{ letter: 'a', x: 10, y: 56.6, s: 6.2 }, { letter: 'a', x: 28.3, y: 56.6, s: 6.2 }, { letter: 'a', x: 46.6, y: 56.6, s: 6.2 },
                  { letter: 'a', x: 65, y: 56.6, s: 6.2 }, { letter: 'a', x: 83.2, y: 56.6, s: 6.2 }] },
        { say: 'Now let us colour the apple. An apple is red!', marks: [{ scribble: '#e63946', cx: 73.3, cy: 32.5, rx: 19, ry: 10.3 }] },
        { say: 'And the leaf is green. Well done! Now it is your turn.', marks: [{ scribble: '#43aa8b', cx: 75.5, cy: 18.6, rx: 5.5, ry: 2.4 }] }
      ]
    }
  },
  'stemford-english-1': {
    5: {
      type: 'story', title: 'The Picnic', button: { x: 47, y: 31 },
      scenes: [
        { page: 5, from: { cx: 74, cy: 19, w: 50 }, to: { cx: 68, cy: 22, w: 40 },
          text: "It is 6 o'clock in the morning. Sana is sleeping. Sana's Dadi wakes her. She can smell yummy food. Mama is cooking biryani. Yum! Sana gives a big smile. She jumps out of bed. She gets ready." },
        { page: 5, from: { cx: 50, cy: 74, w: 80 }, to: { cx: 50, cy: 74, w: 64 },
          text: 'Mama packs the food. Papa puts the picnic basket in the car. There is a lot of food in it. Sandwiches, cutlets and biryani! Sana jumps into the car. She sits at the back. Ali, her younger brother, Dada and Dadi sit next to her. It is time to go!' },
        { page: 5, from: { cx: 36, cy: 76, w: 66 }, to: { cx: 64, cy: 74, w: 66 },
          text: 'Papa drives. Mama sings. Sana claps. Ali plays the drum. Dada taps his feet. Dadi hums.' },
        { page: 6, from: { cx: 50, cy: 63, w: 100 }, to: { cx: 70, cy: 78, w: 58 },
          text: 'They reach a river. What a pretty picnic spot! Sana sees some ducks. Quack, quack, they say.' },
        { page: 6, from: { cx: 42, cy: 52, w: 80 }, to: { cx: 46, cy: 60, w: 60 },
          text: 'Sana and Ali are playing with a ball. The ball falls into the river. Everyone laughs. Papa brings the ball back.' },
        { page: 6, from: { cx: 48, cy: 62, w: 60 }, to: { cx: 50, cy: 62, w: 96 },
          text: 'Sana jumps with joy and thanks her father. They all cheer. They watch the sunset. Sana waves goodbye to the ducks.' },
        { page: 7, from: { cx: 50, cy: 52, w: 100 }, to: { cx: 30, cy: 66, w: 60 },
          text: 'They are back home now. Sana is sleepy. She brushes her teeth. She washes her face. She gets into bed. She is excited about tomorrow! Tomorrow is the first day of school.' }
      ]
    }
  },
  'stemford-computer-book-1': {
    10: {
      type: 'game', title: 'Find the parts!', button: { x: 81, y: 30 },
      crop: { x: 19, y: 25, w: 62, h: 24 },
      targets: [
        { name: 'monitor', x: 25, y: 26.5, w: 29.5, h: 14.5, say: 'The monitor looks like a TV screen.' },
        { name: 'CPU', x: 54.4, y: 28.4, w: 19, h: 13.6, say: 'The CPU is the brain of the computer.' },
        { name: 'keyboard', x: 22.3, y: 41.8, w: 40, h: 5.5, say: 'We type letters and numbers on the keyboard.' },
        { name: 'mouse', x: 64.5, y: 42.3, w: 10.9, h: 4.7, say: 'The mouse helps us point at things on the screen.' }
      ]
    },
    14: {
      type: 'fill', title: 'Exercise',
      steps: [
        { say: 'Number one. The brain of a computer is the CPU. So we tick CPU.', marks: [{ tick: 1, x: 62.4, y: 25.0 }] },
        { say: 'Number two. A monitor looks like a TV screen. We write monitor, and tick monitor.',
          marks: [{ write: 'Monitor', x: 15, y: 30.6 }, { tick: 1, x: 36.0, y: 36.4 }] },
        { say: 'Number three. A scanner copies documents and pictures from paper to the computer. Tick scanner.', marks: [{ tick: 1, x: 62.4, y: 48.1 }] },
        { say: 'Now true or false. A monitor displays what we do on a computer. That is true, so we write T.', marks: [{ circle: 'T', x: 89.2, y: 57.8 }] },
        { say: 'There are five main parts of a computer. That is false! A computer has four main parts. So we write F.', marks: [{ circle: 'F', x: 89.2, y: 62.4 }] },
        { say: 'The printed copy on paper is called a printout or hard copy. That is true!', marks: [{ circle: 'T', x: 89.2, y: 67.1 }] },
        { say: 'Now fill in the blanks. A printer is used to take a copy of the information on a sheet of paper.', marks: [{ write: 'printer', x: 16.6, y: 76.6 }] },
        { say: 'A mouse has two or more buttons.', marks: [{ write: 'mouse', x: 16.6, y: 83.7 }] },
        { say: 'A keyboard has many buttons called keys. Well done!', marks: [{ write: 'keys', x: 14.2, y: 91.5 }] }
      ]
    }
  }
};
