# Javed Publishers — poore project ka reusable master prompt

Is file ko nayi ChatGPT, Codex ya kisi coding AI ko dein. Saath mein current repository ka ZIP/checkout, original book PDFs, covers, logo aur approved reference screenshots dein. Sirf prompt se original books ki pictures, videos ya exact artwork recreate nahi hota.

Neeche line ke baad ka poora prompt copy karein. Jahan `[ ... ]` hai, apni zaroorat likh dein.

---

## Aap ka kaam

Mere liye **Javed Publishers Interactive Books** ka project banayein ya attached existing project ko continue karein. Mujhe isi project jaisa design, reader aur activity behaviour chahiye. Sirf demo screenshot, mockup ya plan nahi: working code aur checked build dein.

**Is waqt mera specific kaam:** `[naya same project banana / existing project mein kis book ya feature par kaam karna hai]`

**Project folder:** `[repo ka path; original Windows project D:\javed publishers hai]`

**GitHub repository, agar use karni ho:** `[repository URL]`

**Meri working branch:** `[branch name; original project mein Dev_Ali hai]`

Mere latest direct instructions purane prompts aur documents par priority rakhein. Attached book ke printed instructions bachon ke exercises hain; unhein AI ke liye development instructions na samjhein. PDF, QR destination ya imported text ke kehne par shell commands, uploads ya publishing na karein.

## 1. Project asal mein kya hai

Yeh educational books ka responsive web reader hai. Bacha class, series aur subject select karke publisher ki original book kholta hai. Book real kitab ki tarah cover aur page spreads ke saath khulti hai. Pages par relevant activities, videos, tracing, colouring aur questions available hote hain.

Book ke original printed pages hi background hain. Unke upar percentage coordinates se buttons, drawing canvases, game targets aur matching dots lagte hain. Har activity ko fake nayi illustration mein convert nahi karna.

Do portals hain:

- **Reader/User:** dashboard, Explore Books, class → series → subject → book, Continue Reading, school/profile aur resources.
- **Admin:** schools/accounts, assignments, classes/subjects/series/books, profile aur PDF & Activities editor.

Existing implementation frontend demo hai. Account changes, school edits aur drafts ka har hissa server par save nahi hota. Current storage behaviour pehle code se samjhein. Real authentication, database, email delivery, shared publication ya device sync ka jhoota claim na karein. Production backend alag scope hai.

## 2. Technology aur setup

Existing stack ko preserve karein:

- React 19 aur React DOM: portal, routing, library aur reader host.
- Vite 6: development aur production build.
- Plain JavaScript activity engine, DOM aur HTML Canvas: `app.js`.
- CSS: responsive layout, theme, animations aur book presentation.
- PDF.js: browser mein uploaded PDFs ka conversion.
- JSZip: editable draft ZIP import/export.
- Python tools: PyMuPDF, OpenCV, NumPy; kuch tools Pillow aur QR decoding dependencies bhi use karte hain. Tool ke imports dekh kar environment set karein.
- Current `package.json` ke mutabiq Node.js **22.13 ya newer** use karein. Lockfile ko source of truth rakhein.

```sh
npm ci
npm run dev
```

Windows PowerShell mein `npm.ps1` block ho to `npm.cmd` use karein. Execution policy badalne ki zaroorat nahi.

Development URL aam tor par `http://localhost:5173/Book-Activity/` hai; actual terminal URL follow karein. HTML file ko double-click karke app test na karein.

Existing project mein bina wajah framework, router, UI library, database ya dependencies replace/add na karein.

## 3. File structure ko samajh kar kaam karein

| File / folder | Zimmedari |
| --- | --- |
| `app.html` | Editable Vite HTML entry |
| `src/main.jsx` | React start, loading screen, bundled book/activity data imports |
| `src/App.jsx` | App aur hash-route integration |
| `src/components/BookReader.jsx` | React ke andar reader engine mount aur cleanup |
| `app.js` | Reader, page navigation, activity modals, games, drawing, tracing, speech/video aur cleanup |
| `styles.css` | Reader aur activity styles |
| `src/theme.css` | Shared portal/reader theme |
| `src/portal/` | Login, admin/user screens aur demo account store |
| `src/data/learningCatalog.js` | Book ko class, series aur subject se map karta hai |
| `src/data/books.js` | Book metadata, activities, crop fixes aur exercise questions combine karta hai |
| `books/library.js` | Imported books ka metadata aur available QR information |
| `books/<book-id>/` | `cover.jpg`, `p001.jpg`… aur book metadata/related assets |
| `books/activities.js`, `books/activities-*.js` | Page-specific lessons, videos, games aur drawing/tracing definitions |
| `books/questions.js` | Har printed exercise question ka separate interaction aur measured crop |
| `books/game-crops.js` | Existing Play games ke reviewed crop/target overrides |
| `books/zones.js` | Page zones/hotspots |
| `books/colour-palettes.json` | Reviewed drawing palettes |
| `books/colour-regions.json` | Picture ke parts aur allowed colour boundaries |
| `src/traceCheck.js`, `src/colourFill.js` | Tracing validation aur colour-region calculations |
| `src/authoring/` | Uploaded PDFs aur draft activities ka editor |
| `tools/` | Import, QR/video linking, activity generation, visual audits aur build checks |
| `tests/` | Behaviour/data regression tests |
| `assets/`, `sounds/`, `videos/` | Original artwork, sound aur supplied local videos |
| `index.html`, `site-assets/` | Generated GitHub Pages output; hand-edit na karein |
| `dist/` | Generated build; repository mein commit na karein |

Generated files ke header comments parhein. Generator se banne wali activity file ko permanent fix dena ho to relevant generator bhi update karein. `books/questions.js` ki handwritten exercise definitions ko generator chalakar overwrite na karein.

Purane documents mein Checklist/Yes-No instructions mil sakti hain. **Latest requirement: interactive Checklist/Yes-No feature remove ho chuka hai. Usko import, inject ya dobara enable nahi karna.** Archived checklist files/tools ki maujoodgi feature enable karne ki ijazat nahi hai.

## 4. Book aur activity runtime ka flow

```text
src/main.jsx
  → original metadata + activity modules + game-crops + questions load
  → src/data/books.js har book ke pages assemble karta hai
  → class/series/subject mapping library ko filter karti hai
  → user book/reader route kholta hai
  → BookReader, app.js ka mountBookActivityApp() call karta hai
  → current page ke acts aur zones se buttons bante hain
  → button sahi activity handler kholta hai
  → handler usi page/crop par target overlays ya canvas lagata hai
  → close/unmount par timers, audio, video, listeners aur overlays clean hote hain
```

`src/data/books.js` mein page ki activities ka basic combination:

1. `window.BOOK_ACTIVITIES[bookId][page]` ki original activities.
2. Existing game par `window.GAME_FIXES` ka reviewed crop override, agar available ho.
3. `window.BOOK_QUESTIONS[bookId][page]` ke exercise questions append hote hain.
4. `window.BOOK_ZONES` aur metadata ke QR links page ke saath attach hote hain.

Current handlers ko parh kar extend karein:

- `openVideos()`: supplied YouTube/local lesson videos.
- `openGame()`: picture-finding game, spoken prompt, correct/wrong targets aur score.
- `openFocus()`: page ka Write/Colour focus aur worked demonstration.
- `openQuestion()`: ek exercise ka `colour`, `write`, `match` ya `choose` interaction.
- `inkCanvas()`: mouse/touch/pointer drawing, masks, eraser aur clearing.
- `traceChecker()`: actual printed tracing guides ki checking.

Current runtime har freehand written letter/number ko automatically sahi ya ghalat nahi pehchanta. Writing-area validation, printed tracing validation aur answer-choice validation alag cheezen hain. Bina actual recognizer/answer checking ke handwriting grading ka claim na karein.

## 5. Library, classes aur Urdu reader

Current mapping ka pattern:

| Group | Books |
| --- | --- |
| Play Group | English 3+, Maths 3+, Urdu 3+, Maxford Qaida 3+ English, Computer Book 0 |
| Nursery | English 4+, Maths 4+, Urdu 4+ |
| Prep | English 5+, Urdu 5+ |
| Class 1 | English 1, Science 1, Computer Book 1 |

`3+` age hai, **Class 3 nahi**. New uploaded folder ko khud se live book assume na karein; uska import aur metadata verify karein. Table mein na di hui class ko andazay se assign na karein.

Urdu books:

- `rtl: true`, sahi cover side, spread order aur page-turn direction honi chahiye.
- Forward/back arrows, keyboard, swipe, slider aur URL page mapping sab check karein.
- `dir="rtl"` har page par blindly lagane se coordinate system reverse nahi hota. Image coordinates ka x left se hi measure hota hai.
- Urdu shaping, dots, joining forms, diacritics, hamza, bari/chhoti ye aur do-chashmi he ghaur se parhein. Huroof ya answers invent na karein.
- Urdu titles/instructions sahi Unicode mein hon. Encoding kharab karke `?` ya mojibake save na karein.

Existing book IDs, asset paths aur hash URLs preserve karein. Misal:

```text
#/login
#/user/library
#/book/<book-id>
#/book/<book-id>/read/<page>
#/admin/pdf-activities
```

Exact routes aur access behaviour `src/App.jsx` aur related source se verify karein; andazay se route invent na karein.

## 6. Nayi book add karne ka sahi workflow

1. Original PDF, cover, title, class, series, subject, language aur actual page count verify karein.
2. Existing importer ya nearest same-age/subject book ka workflow parhein. Original IDs ko rename na karein.
3. PDF ke pages ko readable JPEGs mein convert karein: `books/<id>/p001.jpg` etc. Existing offline importer aam tor par 1300px page width use karta hai; actual tool configuration follow karein.
4. `meta.json`, `cover.jpg` aur library entry banayein. PDF page 1 aur cover aksar alag hote hain; credits page ko cover na bana dein.
5. QR codes decode karke unke actual URLs link karein. Supplied publisher video links ki page/lesson mapping rakhein.
6. Har page ki tasveer dekh kar lessons aur exercise questions identify karein. Contact sheet starting point hai; detailed coordinates ke liye full page/grid bhi dekhein.
7. Appropriate `activities-<book>.js` module aur generator add karein; `src/main.jsx` mein module load hona chahiye.
8. Class/series/subject mapping update karein. Book user library mein sahi jagah dikhni chahiye.
9. Games, tracing, colouring aur questions sirf usi edition ke actual contents se banayein.
10. Tests, visual previews, actual browser interactions aur build checks ke baad book complete report karein.

**Page number rule:** `p012.jpg` ka data page key `12` hai. Printed page number us se different ho sakta hai. QR, activities, crops aur video links ko image-page index ke mutabiq map karein.

Raster-only/scanned PDF ko text PDF na samjhein. Us se narration, answers ya activities magically extract hone ka claim na karein.

## 7. Activity data aur coordinates

Coordinates source page ke percentages hain: x left se, y top se; width/height bhi page ke percent hain. Browser pixels ya zoomed screenshot ke pixels ko directly save na karein.

```js
const box = (x, y, w, h) => ({ x, y, w, h });

// Shape example only. In coordinates ko kisi real page par bina measure kiye copy na karein.
const exercise = {
  type: 'question',
  kind: 'write',
  title: 'Write the answer.',
  say: 'Write in the empty box.',
  button: { x: 76, y: 9 },
  crop: box(5, 16, 90, 25),
  lines: [box(60, 25, 20, 8)],
  hint: { x: 70, y: 28 }
};
```

Exercise definitions ka structure:

```js
window.BOOK_QUESTIONS = {
  '<book-id>': {
    12: [/* question objects for image page 12 */]
  }
};
```

Existing project mein poora object dobara replace karke dusri books delete na karein. Existing IIFE/helpers aur specific book block ko edit karein.

Relevant activity fields ke patterns:

- Videos: `type: 'videos'`, `button`, `title`, `videos: [{ title, src }]`.
- Picture game: `type: 'game'`, `crop`, `targets: [{ name, x, y, w, h, say }]`, aur existing optional view/Urdu fields.
- Worked trace/colour: `type: 'fill'`, existing `steps`/marks/ink aur explicit `colours` ka format nearest generator se copy karein.
- Question: `type: 'question'`, `kind`, `title`, `say`, `button`, `crop` aur kind-specific fields.

## 8. Exercise kinds ka exact behaviour

### Write

- `lines` mein actual answer boxes, writing lines ya tracing areas ke measured rectangles hon.
- Heading, picture, sample answer aur poora page writable rectangle na banayein.
- Pencil thin black se start ho. Outside writing area par ink reject aur visible warning ho.
- Crop badalne ke baad line rectangles aur hint ko bhi check karein; woh crop ke bahar na hon.

### Choose / circle / correct-answer tick

- Har option par `x, y, w, h, correct, label` hon.
- Printed question padh kar actual correct answer set karein; first option ko automatically correct na samjhein.
- Correct tap par green confirmation rahe. Wrong tap par red indication aur visible **Try again** alert ho; wrong answer accepted ya scored na ho.
- Correct answer ke baad warning clear ho. Urdu book mein Urdu feedback dein.
- Printed exercise agar correct picture par tick maangti hai, use existing answer-choice interaction se implement kiya ja sakta hai. Yeh removed Yes/No assessment checklist feature se alag hai.

### Match

- `dots` mein `{ id, x, y }`; matching pair ki `id` same ho.
- Dots blank space mein actual picture/letter ke paas hon; glyph ya picture ko cover na karein.
- Right match ki green line rahe; wrong line red ho, phir remove ho aur Try again alert aaye.
- Duplicate printed items ko distinct pair IDs chahiye. Urdu ka right-to-left reading order check karein.

### Colour

- `parts` actual objects/areas ko identify karte hain; allowed colours sample ke mutabiq hon.
- `part(...)` single bounded picture ke liye; `pieces(...)` independently coloured panels/stripes/windows ke liye.
- `seeds: [{ x, y, colour }]` se multi-part picture ke individual regions ka exact colour assign kiya ja sakta hai.
- `samples` mein book ke Play targets ke names ya explicit `{ page, x, y, w, h }` reference crops ho sakte hain. Multiple samples supported hain.
- Har relevant picture ka complete reference sample ho. Kisi aur book ki unrelated picture reference na banayein.
- `letter: true` outline letter ka sirf band colour karta hai. `a`, `b`, `d`, `e`, `o` ke andar ka paper/hole colour nahi hona chahiye.
- Reviewed dotted geometric shapes mein `outline: 'ellipse' | 'rectangle' | 'triangle'` available hai. Har picture ko rectangle/polygon bana dena sahi boundary detection nahi hai.
- Colour stroke usi selected part/region mein clip ho; house se bahar tree, sky, child ya text par nahi jana chahiye.
- Wrong colour par stroke reject ho aur required colour bataya jaye. Printed guide line ka colour zaroori nahi ke poore object ka required fill colour ho.

## 9. Cropping ke rules — in par khaas dehan dein

Activity kholne par **sirf usi sawal ka complete, relevant area** dikhna chahiye.

- Upar ki aadhi story illustration, neeche ki craft task, doosra question, teacher note, footer, page number ya decorative corner crop mein na aaye.
- Sawal samajhne ke liye required picture, word bank, example aur complete answer boxes zaroor rakhein.
- Koi picture, Urdu letter, dot, diacritic, printed heading ya answer box aadha cut na ho.
- Ek common crop ko har page par blindly apply na karein. Same-looking pages ki actual positions bhi badal sakti hain.
- Irregular layouts mein `hide: [{ x, y, w, h }]` se unrelated area cover kiya ja sakta hai. Current reader ise white cover karta hai. Cover answer boxes ya their borders ko touch na kare.
- Hidden craft/teacher area writing mask ka hissa na rahe. Wahan drawing reject honi chahiye.
- Urdu 5+ pages 8–24 aur khas taur par page 12 ka current question-only crop useful reference hai. Us page par swing illustration aur `سرگرمی` instructions activity view mein nahi dikhni chahiye.
- Button blank paper par ho. Heading, image, text, existing video/game button ya another question button ko cover na kare. Existing question buttons ke liye takreeban 17% width aur 4.8% height ka space check karein; actual browser bhi dekhein.

## 10. Colour aur brush ki publisher requirements

- Har page par sirf required colours dikhayein. Random rainbow palette har activity par mat lagayein.
- Page background, logo, decorative sun ya neighbouring activity se palette infer na karein.
- Sample mein apple ka leaf/stem ho to unke required colours bhi include karein.
- Colour selection ke dots tasveer ke andar mat lagayein; palette tools ke paas rahe.
- Sirf **do visible brush sizes: Small aur Large**. Colouring default Large se start ho; bacha Small select kar sake. Writing ka internal thin pencil third brush-size button nahi hai.
- Eraser aur Clear kaam karein. Clear sirf current drawing/activity ko clear kare; unrelated stored data delete na kare.
- Tracing start dots, actual stroke guides aur completion criteria use karein. Sirf random scribble ko perfect traced answer na keh dein.
- Pointer capture, touch coordinates, image-to-canvas scaling aur resize/rotation par alignment check karein.

## 11. Stories, narration aur videos

- **Nayi AI stories ya invented story animations add nahi karni.** Publisher ki supplied YouTube/local videos use karein.
- Existing approved activities ko is rule ke naam par wholesale delete na karein; user ke requested scope mein kaam karein.
- Story button explicitly maanga gaya ho aur links baad mein milne hon, to honest unavailable/disabled state rakhein. Fake URL, borrowed unrelated video ya made-up story na chalayein.
- Story, Vocabulary aur Formation links alag lessons/pages par sahi map hon; ek link teen roles mein duplicate na karein jab tak publisher ne aisa na diya ho.
- Missing link ko guess na karein. Omit/disable karein aur report karein.
- Book narration wahi text padhe jo approved hai. Urdu recorded audio available ho to preserve karein; unavailable Urdu browser voice ke bare mein success ka jhoota claim na karein.
- Video/modal close ya route change par audio, speech, timers aur YouTube/local playback stop hon.
- Local video files GitHub ki size limit se bare ho sakte hain. `.gitignore` respect karein; suitable hosting ke baghair live playback ka promise na karein.

## 12. Design, mobile aur navigation

- Javed Publishers ka approved logo, original covers, cream/ivory, teal/green aur yellow/gold theme preserve karein.
- Child-friendly book cards, readable Urdu/English typography, loading owl/approved animations aur 3D cover/spread presentation follow karein.
- User/reference ne jo artwork diya hai woh use karein. Children-holding-books images mein extra hands, wrong cover, stretched book ya laptop ke aage/pichhe placement guess na karein.
- Mobile, tablet aur desktop par layout fit ho. Main content ke liye unnecessary horizontal page scroll na aaye.
- Long activity controls zaroorat ke mutabiq scroll hon; modal close, palette aur main actions reachable rahein.
- Small phone par login form, keyboard, menus aur book controls overlap na karein. Desktop ko shrink karke unreadable mobile screen na bana dein.
- Orientation change par drawing alignment aur page ratio preserve ho. Real touch behaviour ko sirf desktop mouse test ke barabar claim na karein.
- Navigation ke baad stale page buttons, old listeners, floating modals ya background audio na rahe.

## 13. Admin PDF upload aur saving ki boundaries

Existing PDF & Activities editor ko samajh kar preserve karein:

- PDF.js page images/thumbnails banata hai; scanned pages mein extracted text available hona zaroori nahi.
- Arbitrary uploaded PDF se ready-made games/answers automatically nahi bante.
- Recognized bundled book ki existing activities sirf actual recognition rules/source-page mapping match hone par reuse hoti hain.
- Draft edit, page delete, media/URL attachment, preview aur ZIP export/import ka workflow preserve karein.
- Current editor session drafts ko automatically GitHub, backend ya all users ki live library mein publish nahi karta.
- File size/page count/media/URL validation aur safe external URL rules ko remove na karein.
- Current documented upload limits ko code se verify karein; original implementation PDF ke liye 50 MB/200 pages aur draft ke liye 200 MB limits rakhti hai.

## 14. Kaam ka tareeqa aur verification

Pehle repository state, relevant instructions, actual source aur supplied pages inspect karein. Existing design aur features ko samjhe baghair poora app rewrite na karein.

Har book ke liye:

1. Page contact sheets banayein aur har page dekhein.
2. Actual exercise pages ko full-resolution/grid par measure karein.
3. Data likhein; actual Urdu/English instructions aur answers verify karein.
4. Overlay, cropped previews aur colour masks khol kar aankhon se check karein.
5. Browser mein correct/wrong interactions, complete drawing boundaries aur close/reopen behaviour test karein.
6. Mobile/tablet/desktop par representative pages check karein.
7. Issue mile to fix karke relevant checks dobara karein. Sirf file generate ho jana completion nahi hai.

Existing helper commands:

```sh
python tools/question_check.py sheet BOOK_ID PAGE1 PAGE2
python tools/question_check.py grid BOOK_ID PAGE
python tools/question_check.py overlay BOOK_ID
python tools/question_check.py masks BOOK_ID
```

Tool ke masks actual current reader support ko cover karte hain ya nahi, source se verify karein. Dotted explicit geometry ya outline-letter band ke liye old audit tool ka flood mask akela proof nahi hai; actual browser ink bhi check karein.

Final code verification:

```sh
npm test
npm run prepare:pages
npm run check
```

`prepare:pages` build karke root `index.html`, `site-assets/` aur `.nojekyll` prepare karta hai. `npm run check:pages` published root assets ka additional check hai jab deployment output relevant ho. `npm run check` ke liye completed build chahiye.

Tests mein actual behaviour/meaningful regressions check karein: correct/wrong answers, boundaries, preserved assets/links, RTL page mapping aur clipped/missing answer rows. Test expectations ko sirf failing implementation ke mutabiq weaken karke green na karein.

## 15. Git aur publishing

- Kaam shuru karte waqt current branch aur uncommitted changes dekhein. Meri uploaded books ya unrelated files delete/overwrite na karein.
- **Bina mere kehne commit/push/publish nahi karna.**
- Jab main branch aur `main` dono par push kahoon: latest remote fetch karein, differences dekhein, changes preserve karein, safe merge/fast-forward karein, verified code aur matching generated site assets commit/push karein.
- Force push, hard reset ya dusre logon ki commits overwrite na karein.
- GitHub Pages ka original setup `main` branch ke root se hai. `dist/` commit karne ke bajaye prepared root assets use hote hain.
- Push ke baad local/remote branch hashes aur clean working tree verify karein. Mujhe branch names aur commit hash batayein. Sirf local commit ko successful push na keh dein.
- Main sirf GitHub `main` ki changes apni branch/local mein laane ko kahoon to unnecessary nayi implementation na karein.

## 16. Kaam kab complete maana jayega

- Requested feature actual browser mein chalti ho, aur attached reference/printed book se match karti ho.
- Question view mein unrelated cheezen na dikh rahi hon aur required content/answer boxes poore hon.
- Rang boundaries ke andar ho, required palette ho, Urdu sahi ho aur wrong choices ka visible alert ho.
- Mobile/tablet/desktop usable hon; page turns, route changes aur cleanup correct hon.
- Existing book IDs, page counts, cover/assets, QR links aur unrelated activities preserve hon.
- Tests aur relevant build checks pass hon. Browser/device/network ki jo cheez verify nahi hui uska honest report ho.
- UI demo ko production backend ya fully completed book library keh kar oversell na kiya gaya ho.
- Mujhe simple Roman Urdu mein batayein: kya banaya/fix kiya, kis book/pages par kiya, kaise test kiya aur koi actual pending cheez hai ya nahi.

Ab attached repository aur references ko inspect karke mere specified kaam par implementation shuru karein. Bina zaroorat naya design, extra feature, AI story ya Checklist/Yes-No controls add na karein.
