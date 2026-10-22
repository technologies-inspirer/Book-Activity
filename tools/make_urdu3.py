"""Build the activities for Stemford Urdu 3+, alif to yay. Writes books/activities-urdu3.js.

On each letter's picture page: a "Learn" animation in Urdu (the letter, the book's sentence, the three words),
a find-the-picture game in Urdu, or the publisher's own videos once they are put in
videos/stemford-urdu-3/<NN name>/ (story.mp4, vocabulary.mp4, phonic poem.mp4).
On each trace page: "Show me how", where the pen fills the two big letters and the dotted rows, right to left.

    python tools/make_urdu3.py
"""
import glob
import json
import os

import cv2
import numpy as np

from ink import PAD, make_ink

BOOK = 'stemford-urdu-3'
VIDEO_DIR = 'videos/stemford-urdu-3/'

# picture page, letter, its name, folder name, the book's sentence, the three pictures from right to left,
# and whether those words begin with the letter
LETTERS = [
    (5, 'ا', 'الف', '01 alif', 'اسما نے انگور اور انار کھائے۔', ['انار', 'انڈا', 'انگور'], True),
    (7, 'آ', 'الف مد', '02 alif madd', 'آمنہ آم اور آڑو کھا رہی ہے۔', ['آم', 'آڑو', 'آلو'], True),
    (11, 'ب', 'بے', '03 bay', 'بلال نے بکری کو چارا کھلایا۔', ['بطخ', 'بستہ', 'بکری'], True),
    (13, 'پ', 'پے', '04 pay', 'پاکیزہ پانی پی رہی ہے۔', ['پنکھا', 'پانی', 'پتا'], True),
    (15, 'ت', 'تے', '05 tay', 'تتلی تربوز پر بیٹھی ہے۔', ['تتلی', 'تربوز', 'تسبیح'], True),
    (17, 'ٹ', 'ٹے', '06 ttay', 'ٹوکری میں ٹماٹر ہیں۔', ['ٹوکری', 'ٹماٹر', 'ٹرک'], True),
    (19, 'ث', 'ثے', '07 say', 'ثنا نے ٹوکری میں ثمر سجایا۔', ['ثنا', 'ثمر', 'ثابت انڈا'], True),
    (23, 'ج', 'جیم', '08 jeem', 'جویریہ اور جاوید نے جہاز کو دیکھا۔', ['جہاز', 'جگ', 'جلیبی'], True),
    (25, 'چ', 'چے', '09 chay', 'چاند کے پاس چوزہ اور چابی ہے۔', ['چوزہ', 'چابی', 'چائے'], True),
    (27, 'ح', 'بڑی حے', '10 bari hay', 'حلوائی نے حلوا پکایا۔', ['حلوائی', 'حلوا', 'حجام'], True),
    (29, 'خ', 'خے', '11 khay', 'خرگوش نے خربوزہ کھایا۔', ['خط', 'خربوزہ', 'خرگوش'], True),
    (33, 'د', 'دال', '12 daal', 'دانیہ نے دادا جان کو دلیہ دیا۔', ['درزی', 'دلیہ', 'درخت'], True),
    (35, 'ڈ', 'ڈال', '13 ddaal', 'ڈاکیا ڈاک خانے سے ڈاک لایا۔', ['ڈاکیا', 'ڈول', 'ڈبہ'], True),
    (37, 'ذ', 'ذال', '14 zaal', 'ذرار ذخیرہ سے ذرات دیکھ رہا ہے۔', ['ذرات', 'ذخیرہ'], True),
    (39, 'ر', 'رے', '15 ray', 'ریل گاڑی رکشا سے تیز چلی۔', ['رکشا', 'رسی', 'رومال'], True),
    (41, 'ڑ', 'ڑے', '16 rray', 'گاڑی چلی پہاڑوں کے درمیان۔', ['چڑیا', 'گاڑی', 'پہاڑ'], False),
    (43, 'ز', 'زے', '17 zay', 'زرافہ زیبرا سے لمبا ہے۔', ['زنجیر', 'زیور', 'زیبرا'], True),
    (45, 'ژ', 'ژے', '18 zhay', 'اژدھا بچ گیا ژالہ باری سے۔', ['ٹیلی ویژن', 'ژالہ باری'], False),
    (49, 'س', 'سین', '19 seen', 'سائیکل پر سیب رکھے ہیں۔', ['سیب', 'سورج', 'سائیکل'], True),
    (51, 'ش', 'شین', '20 sheen', 'شیر شہد کھا رہا ہے۔', ['شہد', 'شلجم', 'شیر'], True),
    (53, 'ص', 'صاد', '21 suad', 'صراحی کے پاس صابن پڑا ہے۔', ['صراحی', 'صابن', 'صندوق'], True),
    (55, 'ض', 'ضاد', '22 zuad', 'ضعیف ضیافت کھا رہے ہیں۔', ['ضعیف', 'ضیافت', 'ضرب'], True),
    (59, 'ط', 'طوئے', '23 toay', 'طاہر طیارے کے پاس کھڑا ہے۔', ['طالب علم', 'طیارہ', 'طوطا'], True),
    (61, 'ظ', 'ظوئے', '24 zoay', 'ظریف ظروف لینے گیا۔', ['ظریف', 'ظروف'], True),
    (63, 'ع', 'عین', '25 ain', 'عورت عمارت کے پاس کھڑی ہے۔', ['عورت', 'عینک', 'عقاب'], True),
    (65, 'غ', 'غین', '26 ghain', 'غلیل سے غبارے کو نشانہ لگایا۔', ['غبارہ', 'غلیل', 'غالیچہ'], True),
    (69, 'ف', 'فے', '27 fay', 'فاطمہ فاختہ کے ساتھ کھیل رہی ہے۔', ['فراک', 'فاختہ', 'فصل'], True),
    (71, 'ق', 'قاف', '28 qaaf', 'قندیل قلم سے لکھ رہی ہے۔', ['قلم', 'قلفی', 'قلعہ'], True),
    (73, 'ک', 'کاف', '29 kaaf', 'کرن کتاب پڑھ رہی ہے۔', ['کیلا', 'کشتی', 'کنگھی'], True),
    (75, 'گ', 'گاف', '30 gaaf', 'گائے نے گاجر کھائی۔', ['گاجر', 'گلاب', 'گیند'], True),
    (77, 'ل', 'لام', '31 laam', 'لیاقت لالٹین کے پاس بیٹھا لڈو کھا رہا ہے۔', ['لڈو', 'لٹو', 'لیموں'], True),
    (79, 'م', 'میم', '32 meem', 'مور نے مچھلی کو دیکھا۔', ['مرغی', 'مچھلی', 'موم بتی'], True),
    (83, 'ن', 'نون', '33 noon', 'بھائی نے ناشپاتی اور ناریل خریدے۔', ['ناشپاتی', 'ناریل', 'نلکا'], True),
    (85, 'و', 'واؤ', '34 wao', 'ویگن میں وادی کی سیر کی۔', ['وین', 'ورق', 'وردی'], True),
    (87, 'ہ', 'ہے', '35 hay', 'ہرن اور ہاتھی اچھے دوست ہیں۔', ['ہرن', 'ہار', 'ہاکی'], True),
    (89, 'ء', 'ہمزہ', '36 hamza', 'بھائی آئس کریم لائے اور ہم نے مٹھائی کھائی۔', ['گائے', 'مٹھائی', 'رضائی'], False),
    (91, 'ی', 'چھوٹی یے، بڑی یے', '37 yay', 'یاور نے یکہ کی سواری کی۔', ['یاسمین', 'یکہ', 'یادگار'], True),
]

# where the pictures under the sentence sit (x from, x to, in % of the page), right to left
SPOTS = {3: [(64, 97), (36, 64), (3, 36)], 2: [(52, 97), (3, 52)]}
LESSON_VIDEOS = [('Story', ['story.mp4']), ('Phonic Poem', ['phonic poem.mp4', 'poem.mp4']),
                 ('Vocabulary', ['vocabulary.mp4', 'activity.mp4'])]   # activity.mp4 (pay) is the picture page's lesson
# other names a letter's folder may have, besides "01 alif": the letter itself, or how it is said
ALIASES = {'03 bay': ['ba', 'be'], '04 pay': ['pa', 'pe'], '05 tay': ['ta', 'te'], '06 ttay': ['tta', 'tte']}
# buttons sit in the sky at the top left of the big picture: icon and top (%)
VIDEO_BUTTONS = {'Story': ('📖', 33), 'Phonic Poem': ('🎵', 38), 'Vocabulary': ('🔤', 43)}


# The colours each trace page's picture needs, shown in "Colour & write" (the book's own colour hint first,
# like the green fingerprint on the grapes). Page 88 has no picture, so it keeps the usual choice.
INK = {'red': '#e63946', 'green': '#43aa8b', 'dark green': '#2d6a4f', 'purple': '#7b5ea7', 'brown': '#8d5524',
       'light brown': '#d4a373', 'yellow': '#f9c74f', 'orange': '#f4a261', 'blue': '#4aa3df', 'light blue': '#90e0ef',
       'pink': '#ff8fab', 'grey': '#9aa5b1', 'black': '#222222'}
PAGE_COLOURS = {
    6: ['green', 'purple', 'brown'], 8: ['yellow', 'orange', 'green'], 12: ['yellow', 'orange'],
    14: ['green', 'dark green'], 16: ['yellow', 'blue', 'pink'], 18: ['red', 'green'], 20: ['brown', 'light brown'],
    24: ['blue', 'light blue'], 26: ['yellow'], 28: ['blue', 'yellow'], 30: ['yellow', 'brown'], 34: ['green', 'brown'],
    36: ['red', 'yellow', 'blue'], 38: ['brown', 'light brown', 'yellow'], 40: ['green', 'yellow'],
    42: ['grey', 'brown', 'light blue'], 44: ['black'], 46: ['blue', 'brown', 'green'], 50: ['yellow', 'orange'],
    52: ['orange', 'yellow', 'brown'], 54: ['brown', 'orange'], 56: ['light brown', 'grey', 'blue'],
    60: ['grey', 'blue'], 62: ['grey', 'blue'], 64: ['brown', 'yellow'], 66: ['red', 'yellow'], 70: ['pink', 'purple'],
    72: ['red', 'grey'], 74: ['yellow', 'green'], 76: ['orange', 'green'], 78: ['red', 'yellow', 'blue'],
    80: ['orange', 'green'], 84: ['brown', 'light brown'], 86: ['blue', 'grey'], 90: ['brown', 'blue'],
    92: ['brown', 'grey', 'yellow'],
}


def page_colour(im):
    """The page's own colour: the big coloured letter with arrows at the top (blue bay, green alif...)."""
    H, W = im.shape[:2]
    crop = im[int(H * .03):int(H * .2), int(W * .55):int(W * .88)].reshape(-1, 3).astype(int)
    sat = crop.max(axis=1) - crop.min(axis=1)
    px = crop[(sat > 70) & (crop.max(axis=1) > 80)]
    if len(px) < 50:
        return None
    b, g, r = np.median(px, axis=0).astype(int)
    return '#%02x%02x%02x' % (r, g, b)


def palette(page, im):
    """Three colours: the picture's own (PAGE_COLOURS), and the page's colour third."""
    cols = [INK[c] for c in PAGE_COLOURS.get(page, [])][:2]
    own = page_colour(im)
    near = lambda a, b: sum(abs(int(a[k:k + 2], 16) - int(b[k:k + 2], 16)) for k in (1, 3, 5)) < 90
    if own and not any(near(own, c) for c in cols):
        cols.append(own)
    for c in [INK[c] for c in PAGE_COLOURS.get(page, [])][2:] + ['#e63946', '#f4a261', '#4aa3df']:
        if len(cols) >= 3:
            break
        if not any(near(c, x) for x in cols):
            cols.append(c)
    return cols


def page_img(p):
    return cv2.imread('books/%s/p%03d.jpg' % (BOOK, p))


def pct(x0, y0, x1, y1, W, H):
    return [round(x0 / W * 100, 2), round(y0 / H * 100, 2), round((x1 - x0) / W * 100, 2), round((y1 - y0) / H * 100, 2)]


def hollow_letters(im, page):
    """The two big outline letters (white inside, on a coloured band), right to left, each with its ink."""
    H, W = im.shape[:2]
    # the band starts right of the picture to colour; on page 12 the second big letter reaches further left
    y0, y1, x0, x1 = int(H * .185), int(H * .385), int(W * (.5 if page == 12 else .56)), int(W * .975)
    crop = im[y0:y1, x0:x1]
    white = (crop.min(axis=2) > 228).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(white)
    h, w = white.shape
    cand = []
    for i in range(1, n):
        x, y, cw, ch, area = st[i]
        if area < W * H * .00003 or x == 0 or y == 0 or x + cw >= w or y + ch >= h:
            continue                                    # too small, or the page's white running off the band
        cand.append(i)
    # pieces standing over each other (alif and its madd, a letter and its dots) make one letter
    slack = W * .01
    letters = []
    for i in sorted(cand, key=lambda i: st[i][0]):
        x, cw = st[i][0], st[i][2]
        for g in letters:
            if x < g['x1'] + slack and x + cw > g['x0'] - slack:
                g['ids'].append(i); g['x0'] = min(g['x0'], x); g['x1'] = max(g['x1'], x + cw); g['area'] += st[i][4]
                break
        else:
            letters.append({'ids': [i], 'x0': x, 'x1': x + cw, 'area': st[i][4]})
    letters = [g for g in letters if g['area'] > W * H * .0005]
    letters = sorted(letters, key=lambda g: -g['area'])[:2]
    letters.sort(key=lambda g: -g['x0'])                # right to left
    out = []
    for k, g in enumerate(letters):
        ys = [st[i][1] for i in g['ids']]; ye = [st[i][1] + st[i][3] for i in g['ids']]
        x, y, cw, ch = g['x0'], min(ys), g['x1'] - g['x0'], max(ye) - min(ys)
        box = pct(x0 + x, y0 + y, x0 + x + cw, y0 + y + ch, W, H)
        bx, by, bw, bh = box
        pb = [round(bx - bw * PAD, 2), round(by - bh * PAD, 2), round(bw * (1 + 2 * PAD), 2), round(bh * (1 + 2 * PAD), 2)]
        X0, Y0 = int(pb[0] / 100 * W), int(pb[1] / 100 * H)
        X1, Y1 = int((pb[0] + pb[2]) / 100 * W), int((pb[1] + pb[3]) / 100 * H)
        mask = np.zeros((H, W), np.uint8)
        mask[y0:y1, x0:x1][np.isin(lab, g['ids'])] = 1
        # grow only by the outline's own thickness, so dots close together (the three of pay) stay apart
        mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
        m = cv2.GaussianBlur(mask[Y0:Y1, X0:X1].astype(np.float32), (3, 3), 0)
        rgba = np.zeros(m.shape + (4,), np.uint8)
        rgba[..., :3] = (0x6f, 0x2f, 0xd6)
        rgba[..., 3] = np.clip(m * 255, 0, 255).astype(np.uint8)
        os.makedirs('books/%s/ink' % BOOK, exist_ok=True)
        src = 'books/%s/ink/p%03d_big%d.png' % (BOOK, page, k)
        cv2.imwrite(src, rgba)
        out.append({'glyph': 'ur', 'box': box, 'ink': {'src': src, 'box': pb}})
    return out


def dotted_rows(im):
    """Rows of dotted letters (not the rows of start dots only), each right to left, as boxes in %."""
    H, W = im.shape[:2]
    ya, yb, xa, xb = int(H * .38), int(H * .86), int(W * .03), int(W * .97)
    crop = im[ya:yb, xa:xb]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    spread = crop.max(axis=2).astype(int) - crop.min(axis=2)
    dark = (gray < 175) & (spread < 70)
    # the picture to colour reaches down into the first row on the left: leave it out
    dark[:int(H * .1), :int(W * .32)] = False
    rows_on = np.nonzero(dark.sum(axis=1))[0]
    bands, s, pv = [], rows_on[0], rows_on[0]
    for v in rows_on[1:]:
        if v - pv > H * .012:
            bands.append((s, pv)); s = v
        pv = v
    bands.append((s, pv))
    rows = []
    for t, b in bands:
        if b - t < H * .018:
            continue                                     # a row of start dots only
        band = dark[t:b + 1]
        cols = np.nonzero(band.sum(axis=0))[0]
        groups, s, pv = [], cols[0], cols[0]
        for c in cols[1:]:
            if c - pv > W * .03:
                groups.append((s, pv)); s = c
            pv = c
        groups.append((s, pv))
        boxes = []
        for a, bb in groups:
            ys = np.nonzero(band[:, a:bb + 1].any(axis=1))[0]
            if ys.max() - ys.min() < H * .018 or (ys.max() - ys.min() < H * .03 and bb - a < W * .03):   # dots only
                continue
            boxes.append(pct(xa + a, ya + t + ys.min(), xa + bb + 1, ya + t + ys.max() + 1, W, H))
        # drop what is not one of the row's letters, like the edge of the picture reaching down beside it
        if boxes:
            mw, mt = np.median([bx[2] for bx in boxes]), np.median([bx[1] for bx in boxes])
            boxes = [bx for bx in boxes if bx[2] < mw * 1.8 and abs(bx[1] - mt) < 1.2]
        if len(boxes) >= 2:
            rows.append(sorted(boxes, key=lambda bx: -bx[0]))
    # a row much shorter than the letter rows holds only the dots of letters still to be written
    if rows:
        tall = max(np.median([bx[3] for bx in r]) for r in rows)
        rows = [r for r in rows if np.median([bx[3] for bx in r]) > tall * .5]
    return rows


def lesson_folder(folder):
    """The letter's video folder: "01 alif", "alif", the letter itself (ب), or another name in ALIASES."""
    letter = next(l for _, l, _, f, *_ in LETTERS if f == folder)
    for name in [folder, folder.split(' ', 1)[1], letter] + ALIASES.get(folder, []):
        if os.path.isdir(VIDEO_DIR + name):
            return VIDEO_DIR + name + '/'
    return VIDEO_DIR + folder + '/'


def videos(folder, names):
    out = []
    for title, cands in names:
        for c in cands:
            if os.path.exists(lesson_folder(folder) + c):
                out.append({'title': title, 'src': lesson_folder(folder) + c})
                break
    return out


def picture_page(p, letter, name, folder, sentence, words, initial):
    spots = SPOTS[len(words)]
    game = {'type': 'game', 'ur': True, 'label': 'کھیلیں', 'title': f'{name} والی چیزیں ڈھونڈیں!', 'button': {'x': 11.5, 'y': 28},
            'crop': {'x': 2, 'y': 65.5, 'w': 96, 'h': 18.5},
            'targets': [{'name': w, 'x': a, 'y': 66, 'w': b - a, 'h': 17.5, 'say': f'یہ {w} ہے۔'}
                        for (a, b), w in zip(spots, words)]}
    vids = videos(folder, LESSON_VIDEOS)
    if vids:
        return [{'type': 'videos', 'label': v['title'], 'icon': VIDEO_BUTTONS[v['title']][0], 'title': f"{v['title']}: {name}",
                 'button': {'x': 11.5, 'y': VIDEO_BUTTONS[v['title']][1]}, 'videos': [v]} for v in vids] + [game]
    tie = f'یہ سب {name} سے شروع ہوتے ہیں۔' if initial else f'ان سب میں حرف {name} آتا ہے۔'
    scenes = [
        {'page': p, 'from': {'cx': 80, 'cy': 15, 'w': 40}, 'to': {'cx': 82, 'cy': 15, 'w': 28},
         'text': f'یہ حرف {name} ہے۔ میرے ساتھ کہیں: {name}، {name}!'},
        {'page': p, 'from': {'cx': 50, 'cy': 40, 'w': 90}, 'to': {'cx': 50, 'cy': 40, 'w': 66}, 'text': sentence},
    ] + [
        {'page': p, 'from': {'cx': (a + b) / 2, 'cy': 72, 'w': 38}, 'to': {'cx': (a + b) / 2, 'cy': 72, 'w': 30},
         'text': f'{name} سے {w}۔' if initial else f'{w}۔'}
        for (a, b), w in zip(spots, words)
    ] + [
        {'page': p, 'from': {'cx': 50, 'cy': 72, 'w': 100}, 'to': {'cx': 50, 'cy': 72, 'w': 90}, 'text': '، '.join(words) + '۔ ' + tie}
    ]
    learn = {'type': 'story', 'label': 'سیکھیں ' + letter, 'icon': '🔤', 'title': 'حرف ' + name, 'button': {'x': 11.5, 'y': 23},
             'scenes': scenes}
    return [learn, game]


def trace_page(page, name, folder):
    im = page_img(page)
    big = hollow_letters(im, page)
    rows = dotted_rows(im)

    def marks(boxes):
        # The dotted letters are the same letter as the big ones, so they take the big letter's own calligraphic
        # shape, scaled to their height (cutting the dots out gives only a stiff line, which looks like a 1).
        if big:
            ref = big[0]
            rw, rh = ref['box'][2], ref['box'][3]
            out = []
            for b in boxes:
                h = b[3]
                w = rw * h / rh
                x = b[0] + b[2] / 2 - w / 2
                box = [round(x, 2), b[1], round(w, 2), h]
                pb = [round(x - w * PAD, 2), round(b[1] - h * PAD, 2), round(w * (1 + 2 * PAD), 2), round(h * (1 + 2 * PAD), 2)]
                out.append({'glyph': 'ur', 'box': box, 'ink': {'src': ref['ink']['src'], 'box': pb}})
            return out
        out = []
        for b in boxes:
            if b[0] - b[2] * PAD < 0 or b[0] + b[2] * (1 + PAD) > 100:
                continue
            src, pb = make_ink(BOOK, page, b)
            if cv2.imread(src, cv2.IMREAD_UNCHANGED)[..., 3].mean() > 6:
                out.append({'glyph': 'ur', 'box': b, 'ink': {'src': src, 'box': pb}})
            else:
                os.remove(src)
        return out

    steps = []
    if big:
        steps.append({'say': f'آئیں، حرف {name} لکھیں۔ دائیں طرف سے شروع کریں۔', 'marks': big[:1]})
        if len(big) > 1:
            steps.append({'say': 'ایک بار پھر!', 'marks': big[1:]})
    for k, r in enumerate(rows):
        steps.append({'say': 'اب نقطوں پر لکھیں۔' if k == 0 else 'اگلی لائن۔', 'marks': marks(r)})
    steps[-1]['say'] += ' شاباش! اب آپ کی باری۔'
    act = {'type': 'fill', 'title': 'لکھیں', 'steps': [s for s in steps if s['marks']]}
    act['colours'] = palette(page, im)
    hits = sorted(glob.glob(lesson_folder(folder) + 'format*.mp4'))
    if hits:
        act['video'] = {'title': 'How to write ' + name, 'src': hits[0].replace('\\', '/')}
    return act


if __name__ == '__main__':
    acts = {}
    for p, letter, name, folder, sentence, words, initial in LETTERS:
        acts[p] = picture_page(p, letter, name, folder, sentence, words, initial)
        acts[p + 1] = trace_page(p + 1, name, folder)
        print(folder.split()[0], end=' ', flush=True)
    print()
    with open('books/activities-urdu3.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write('// Generated by tools/make_urdu3.py: alif to yay of Stemford Urdu 3+.\n')
        f.write("window.BOOK_ACTIVITIES['%s'] = " % BOOK)
        f.write(json.dumps(acts, indent=1, ensure_ascii=False))
        f.write(';\n')
    print(len(acts), 'pages')
