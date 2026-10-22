/* Demo library.
 *
 * book  = { id, title, author, tag, icon, c1, c2, ratio (page width / height), pages[] }
 * page  = { html?, pdf? (page number, set for uploaded PDFs), zones[] }
 * zone  = { id, type: 'section' | 'fill', x, y, w, h (all % of the page),
 *           title, narration, video (YouTube link), content? (demo pages only) }
 *
 * Uploaded PDFs use exactly the same shape: the PDF page is the background and
 * the publisher draws zones on top of it in Publisher mode.
 */
(() => {
  // Placeholder video — replace with the publisher's own YouTube links.
  const VIDEO = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

  const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const sec = (id, x, y, w, h, title, body, video) => ({
    id, type: 'section', x, y, w, h, title, video: video || '',
    content: `<h3>${title}</h3>${body}`,
    narration: `${title}. ${strip(body)}`
  });
  const fill = (id, x, y, w, h, title, content) => ({ id, type: 'fill', x, y, w, h, title, content: content || '' });
  const head = (kicker, title) => `<div class="pg-head"><span>${kicker}</span><h2>${title}</h2></div>`;
  const art = (top, h, svg) => `<div class="pg-art" style="top:${top}%;height:${h}%">${svg}</div>`;
  const note = (top, text) => `<p class="pg-note" style="top:${top}%">${text}</p>`;

  const crowScene = full => `
<svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice">
  <rect width="400" height="220" fill="#fde9b8"/>
  <circle cx="335" cy="48" r="28" fill="#f7b733"/>
  <rect y="172" width="400" height="48" fill="#d9a35b"/>
  <rect x="42" y="70" width="18" height="104" fill="#7a4a21"/>
  <circle cx="52" cy="58" r="48" fill="#5d9c4a"/><circle cx="92" cy="80" r="26" fill="#6aad55"/>
  <path d="M180 110h50l-6 12q26 22 14 52h-66q-12-30 14-52z" fill="#b5532a"/>
  <ellipse cx="205" cy="111" rx="24" ry="5" fill="${full ? '#4aa3df' : '#6b2c12'}"/>
  ${full
    ? '<circle cx="150" cy="178" r="6" fill="#8b8b8b"/><circle cx="136" cy="184" r="5" fill="#a3a3a3"/><circle cx="160" cy="188" r="4" fill="#777"/>'
    : '<circle cx="120" cy="182" r="6" fill="#8b8b8b"/><circle cx="136" cy="188" r="5" fill="#a3a3a3"/><circle cx="150" cy="180" r="6" fill="#777"/><circle cx="164" cy="188" r="4" fill="#999"/>'}
  <g transform="translate(284 118)">
    <ellipse cx="0" cy="20" rx="26" ry="16" fill="#222"/><circle cx="-22" cy="4" r="11" fill="#222"/>
    <path d="M-32 0l-18 ${full ? 2 : 6} 18 6z" fill="#e8a020"/><circle cx="-25" cy="1" r="2.2" fill="#fff"/>
    <path d="M20 14l28-6-22 18z" fill="#222"/><path d="M-4 36v16M8 36v16" stroke="#e8a020" stroke-width="3"/>
  </g>
</svg>`;

  const waterCycle = `
<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" font-family="Nunito,sans-serif" font-weight="800" font-size="13">
  <rect width="400" height="200" fill="#dff1fb"/>
  <path d="M230 200L310 80l90 120z" fill="#8aa37b"/><path d="M296 101l14-21 16 24-14-6z" fill="#fff"/>
  <rect y="158" width="260" height="42" fill="#4aa3df"/>
  <circle cx="52" cy="42" r="24" fill="#f7b733"/>
  <g fill="#fff"><circle cx="210" cy="46" r="20"/><circle cx="236" cy="38" r="26"/><circle cx="264" cy="48" r="20"/><rect x="204" y="46" width="66" height="22" rx="11"/></g>
  <g fill="none" stroke="#e76f51" stroke-width="3" stroke-linecap="round">
    <path d="M90 150q10-50 96-88"/><path d="M178 58l10 3-5 9"/>
  </g>
  <g stroke="#1d4e89" stroke-width="3" stroke-linecap="round"><path d="M290 78l-6 16M306 82l-6 16M322 78l-6 16"/></g>
  <text x="24" y="118" fill="#b5532a">1 Evaporation</text>
  <text x="196" y="18" fill="#1d4e89">2 Condensation</text>
  <text x="330" y="70" fill="#1d4e89">3 Rain</text>
</svg>`;

  const stars = `
<svg viewBox="0 0 400 80" preserveAspectRatio="xMidYMid slice">
  <rect width="400" height="80" fill="#1b2a4e"/>
  <g fill="#ffd166">
    <path d="M60 18l5 13h14l-11 8 4 14-12-8-12 8 4-14-11-8h14z"/>
    <path d="M200 10l7 18h19l-15 11 6 18-17-11-17 11 6-18-15-11h19z"/>
    <path d="M335 22l4 11h12l-9 7 3 12-10-7-10 7 3-12-9-7h12z"/>
  </g>
  <g fill="#fff"><circle cx="120" cy="20" r="2"/><circle cx="150" cy="56" r="1.6"/><circle cx="268" cy="24" r="2"/><circle cx="290" cy="60" r="1.6"/><circle cx="24" cy="60" r="2"/><circle cx="380" cy="64" r="2"/></g>
</svg>`;

  const fish = `
<svg viewBox="0 0 400 300" fill="none" stroke="#333" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
  <path d="M60 150Q160 40 280 150Q160 260 60 150Z" fill="#fff"/>
  <path d="M278 150l76-62-14 62 14 62z" fill="#fff"/>
  <path d="M150 92q32-44 72 6"/><path d="M146 176q22 30 50 6"/>
  <path d="M172 100q26 50 0 100M214 104q22 46 0 92"/>
  <circle cx="108" cy="134" r="10" fill="#fff"/><circle cx="106" cy="134" r="3" fill="#333"/>
  <path d="M84 166q12 10 26 4"/>
  <circle cx="42" cy="92" r="9"/><circle cx="28" cy="58" r="6"/><circle cx="52" cy="40" r="4"/>
  <path d="M16 278q20-16 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0"/>
</svg>`;

  const missingLetters = `
<div class="ml">
  <div><i>🐱</i><b>c</b><u></u><b>t</b></div>
  <div><i>🐶</i><b>d</b><u></u><b>g</b></div>
  <div><i>☀️</i><b>s</b><u></u><b>n</b></div>
  <p>Write your name:</p><hr>
</div>`;

  const brightStart = {
    id: 'bright-start-1', title: 'Bright Start English 1', author: 'Demo Publishers', tag: 'Grade 1',
    icon: '🐦', c1: '#f2994a', c2: '#c0392b', ratio: 0.75,
    pages: [
      { html: `<div class="pg-front"><span>Bright Start · English Reader 1</span><h1>Read, Listen<br>&amp; Colour</h1>
          <ol><li>The Thirsty Crow<i>2</i></li><li>The Water Cycle<i>4</i></li><li>Twinkle, Twinkle<i>5</i></li><li>Colour &amp; Write<i>6</i></li></ol></div>`,
        zones: [sec('how', 6, 66, 88, 26, 'How to use this book',
          '<p>Tap a story or a topic. You can listen to it, watch its video, or scan its QR code with a phone. On the activity pages, pick a colour and draw with your mouse or finger.</p>')] },

      { html: head('Story 1', 'The Thirsty Crow') + art(18, 33, crowScene(false)),
        zones: [sec('crow1', 6, 52, 88, 40, 'A hot summer day',
          '<p>It was a hot summer day. A crow flew over the fields looking for water. His throat was dry and his wings were tired.</p><p>At last he saw a pot under a tree. There was a little water at the bottom, but his beak could not reach it.</p>', VIDEO)] },

      { html: head('Story 1 · continued', 'A Clever Idea') + art(51, 28, crowScene(true)),
        zones: [
          sec('crow2', 6, 18, 88, 32, 'Pebble by pebble',
            '<p>The crow did not give up. He saw some pebbles on the ground. He picked up one pebble and dropped it into the pot. Then he dropped another, and another.</p><p>Slowly the water rose to the top. The clever crow drank and flew away happily.</p>', VIDEO),
          sec('moral', 6, 80, 88, 13, 'Moral', '<p>Where there is a will, there is a way.</p>')
        ] },

      { html: head('Topic 2', 'The Water Cycle') + art(39, 31, waterCycle),
        zones: [
          sec('wc1', 6, 18, 88, 20, 'Where does rain come from?',
            '<p>Water is always moving. It goes up from the sea into the sky, and it comes back down as rain. This journey is called the water cycle.</p>', VIDEO),
          sec('wc2', 6, 72, 88, 21, 'Three steps',
            '<p><b>1.</b> The sun warms the water and it rises. <b>2.</b> High up, it cools and makes clouds. <b>3.</b> The clouds grow heavy and rain falls.</p>')
        ] },

      { html: head('Poem', 'Twinkle, Twinkle') + art(64, 13, stars),
        zones: [
          sec('poem', 10, 18, 80, 44, 'Little Star',
            '<p class="poem">Twinkle, twinkle, little star,<br>How I wonder what you are!<br>Up above the world so high,<br>Like a diamond in the sky.<br>Twinkle, twinkle, little star,<br>How I wonder what you are!</p>', VIDEO),
          sec('words', 6, 79, 88, 14, 'New words', '<p><b>Twinkle</b> means to shine with a small, flashing light.</p>')
        ] },

      { html: head('Activity 1', 'Colour the Fish') + note(16.5, 'Pick a colour below, then colour the fish with your mouse or finger.'),
        zones: [fill('fish', 8, 25, 84, 62, 'Colour the fish', fish)] },

      { html: head('Activity 2', 'Missing Letters') + note(16.5, 'Write the missing letter in each box.'),
        zones: [fill('letters', 8, 23, 84, 68, 'Missing letters', missingLetters)] },

      { html: head('Activity 3', 'Draw the Crow') + note(16.5, 'Draw the clever crow drinking water from the pot.') + note(88, 'Well done! You finished the book. ⭐'),
        zones: [fill('draw', 8, 25, 84, 60, 'Draw the crow', '<div class="frame"></div>')] }
    ]
  };

  // Shorter books so the shelf is not empty: one topic per page plus a drawing page.
  const simpleBook = (id, title, author, tag, icon, c1, c2, topics) => ({
    id, title, author, tag, icon, c1, c2, ratio: 0.75,
    pages: topics.map((t, i) => ({
      html: head(`Chapter ${i + 1}`, t[0]) + `<div class="pg-emoji">${t[2]}</div>`,
      zones: [{ id: 't' + i, type: 'section', x: 6, y: 25, w: 88, h: 32, title: t[0], video: VIDEO,
                content: `<p>${t[1]}</p>`, narration: `${t[0]}. ${t[1]}` }]
    })).concat([{
      html: head('Activity', 'Draw & Colour') + note(16.5, 'Draw your favourite thing from this book.'),
      zones: [fill('draw', 8, 25, 84, 62, 'Draw & colour', '<div class="frame"></div>')]
    }])
  });

  // The demo books are kept above for reference but no longer shown: the shelf holds only the real books.
  window.DEMO_BOOKS = [];
})();
