"""Page-reviewed Urdu 4+ activities. Run after import_urdu4.py from the repo root.

Coordinates are percentages of the actual PDF pages, never Urdu 3+ coordinates.
Tracing masks come from this book's printed dotted letters, ordered right to left.
No recordings or videos are attributed to this book unless supplied separately.
"""
import json
from pathlib import Path
import cv2
import numpy as np
from ink import make_ink
from urdu_alif import alif_ink as written_alif
from book_colours import page_colours

BOOK = 'stemford-urdu-4'
ROOT = Path(__file__).resolve().parents[1]
# Picture page, character, spoken name, vocabulary pictures from RIGHT to LEFT.
LESSONS = [
    (4, 'ا', 'الف', ['اخروٹ', 'امرود', 'انار']),
    (6, 'آ', 'الف مد', ['آڑو', 'آری', 'آم']),
    (8, 'ب', 'بے', ['بطخ', 'بادشاہ', 'بوتل']),
    (10, 'پ', 'پے', ['پرندہ', 'پنکھا', 'پنسل']),
    (12, 'ت', 'تے', ['تربوز', 'تتلی', 'تاج']),
    (14, 'ٹ', 'ٹے', ['ٹماٹر', 'ٹوکری', 'ٹرک']),
    (16, 'ث', 'ثے', ['ثاقب', 'ثابت', 'ثمر']),
    (20, 'ج', 'جیم', ['جہاز', 'جیپ', 'جلیبی']),
    (22, 'چ', 'چے', ['چڑیا', 'چابی', 'چوزہ']),
    (24, 'ح', 'بڑی حے', ['حلوا', 'حلوائی', 'حوض']),
    (26, 'خ', 'خے', ['خرگوش', 'خط', 'خربوزہ']),
    (28, 'د', 'دال', ['درخت', 'دانت', 'دوات']),
    (30, 'ڈ', 'ڈال', ['ڈول', 'ڈبا', 'ڈاکٹر']),
    (32, 'ذ', 'ذال', ['ذائقہ', 'ذخیرہ', 'ذرات']),
    (34, 'ر', 'رے', ['روٹی', 'رکشا', 'ریچھ']),
    (36, 'ڑ', 'ڑے', ['گاڑی', 'گڑیا', 'پہاڑ']),
    (38, 'ز', 'زے', ['زیور', 'زردی', 'زنجیر']),
    (40, 'ژ', 'ژے', ['ژالہ باری', 'اژدہا', 'ٹیلی ویژن']),
    (44, 'س', 'سین', ['سکول', 'سورج', 'سیب']),
    (46, 'ش', 'شین', ['شیر', 'شلجم', 'شربت']),
    (48, 'ص', 'صاد', ['صفحہ', 'صندوق', 'صوفہ']),
    (50, 'ض', 'ضاد', ['ضرب', 'ضیافت', 'ضعیف']),
    (52, 'ط', 'طوئے', ['طشتری', 'طوطا', 'طیارہ']),
    (54, 'ظ', 'ظوئے', ['ظریف', 'ظروف', 'ظل']),
    (58, 'ع', 'عین', ['عقاب', 'عورت', 'عینک']),
    (60, 'غ', 'غین', ['غالیچہ', 'غار', 'غبارہ']),
    (62, 'ف', 'فے', ['فراک', 'فوارہ', 'فوجی']),
    (64, 'ق', 'قاف', ['قرآن', 'قلم', 'قمیص']),
    (66, 'ک', 'کاف', ['کشتی', 'کیلا', 'کوا']),
    (68, 'گ', 'گاف', ['گائے', 'گیند', 'گاجر']),
    (70, 'ل', 'لام', ['لومڑی', 'لیموں', 'لٹو']),
    (72, 'م', 'میم', ['مگرمچھ', 'مور', 'مرغی']),
    (74, 'ن', 'نون', ['ناریل', 'نل', 'ناشپاتی']),
    (76, 'و', 'واؤ', ['وادی', 'ویگن', 'ورق']),
    (78, 'ہ', 'ہے', ['ہار', 'ہاتھی', 'ہرن']),
    (80, 'ء', 'ہمزہ', ['مٹھائی', 'گائے', 'آئینہ']),
    (82, 'ی، ے', 'چھوٹی یے اور بڑی یے', ['یاقوت', 'یاک', 'یکہ']),
]

# Publisher's YouTube videos per letter: (story, vocabulary, formation). Letters without videos are left out.
VIDEOS = {
    'ا': ('p890xf02Sdw', 'ApONzwuN4jQ', 'U84ZPPlDU_o'),
    'ب': ('zwJQirFa9iA', '-clmWFDSMGI', 'q21C5FGSBzk'),
    'پ': ('c7TjPpzGNyE', 'qrN42NMMr9E', 'oE3BJGfmE9w'),
    'ت': ('WDzGAVDDJMY', 'VBuCRb1uY9k', 'MHr7xTBwjhU'),
    'ٹ': ('KMxw8lWbkSI', 'KU8gThAZ4SE', 'xFUZepzODkE'),
    'ث': ('hz7mpvnBA8M', 'L_IZawGubO4', 'rxj0PxL-JzM'),
    'ج': ('43D7rNlJhGM', 'SC5VMk2-S1Q', 'uTVfpgnQyiU'),
    'چ': ('rIe5J9RIR_s', '2R90mQFr22U', 'ekcXj3ZtOWs'),
    'ح': ('RkeOtYjO7O0', '5unj1t0_URI', 'j335OrUfaZM'),
    'خ': ('L0Tn4o_WrP4', '07yEbN-WAhc', 'TknwzTUubVw'),
    'د': ('AM6n-vyqMns', 'GolipZTvyFs', 'uE5ED3y1Jvg'),
    'ذ': ('-Hysfqzxs9Q', 'AY-rODlnT_w', 'Ymvf1XjKWos'),
    'ر': ('O17gklFfvz8', '1BF4hnqaLt8', 'sxJp3BJ5lBE'),
    'ژ': ('se1KfoVGRGE', 'WY_JFX_LorI', 'JKkY8PjsWOs'),
    'س': ('vD_ZkW-bxgo', 'AIfORr510fQ', 'IBg7cDztEfs'),
    'ش': ('PtjQXUV8zks', 'UxKqYx06UdI', 'Ja5K3-sesEM'),
    'ص': ('iZWrnQayshY', 'ZSB-dinBevI', 'o0TBHdyRNQA'),
    'ض': ('5RnfvuX-1uc', 'm3xjrwM1Gzc', '0mxkIxjeYxQ'),
    'ط': ('SH8nHVUTB9Q', 'bv9XQFSUN30', 'XtdEyCYZupg'),
    'ظ': ('o17nojyaW5U', 'trvNteMGYP4', 'ooJMVeWJH9E'),
    'ع': ('ZPeEt9RER2Q', 'o5qv7kocUvY', '3mHr28TG-YA'),
    'غ': ('PG_1t7cSIBw', None, None),
    'ف': ('6xphuRx2OuE', 'X0OQClqt71Q', '_ETgCf6Zlks'),
    'ق': ('f_RcxiSmVs4', 'A-gdUFEwrt0', 'EEjqDMyQfxo'),
    'ک': ('yprkkiLIx00', 't3b3CUrE_08', 'Qu5xaOB7R4w'),
    'گ': ('kfFdqOYPnDo', 'gJyq89bB9Jc', '-C-kWcofpUY'),
    'ل': ('yv-g92r0nfQ', 'IwTTZf604Jw', '6AlD-aoEqI4'),
    'م': ('X4aJCPrshcE', 'snrObn-OCIE', 'UXVkw0bC56U'),
    'ن': ('mMMqEMUczPE', None, None),
    'و': ('PRfd1P3LFug', '8bjq7pRpnM0', 'yEszu4a1hao'),
    'ہ': ('uniPXUfy9FY', '_106fyzQSXY', '-hMoADTZSw4'),
    'ء': ('bQeh-ibmJ7A', 'kb5z4hSP_U0', 'wnLwvApseok'),
    'ی، ے': ('A42ILLwPM6s', 'Tk75DfX9GIw', '3KE0FXCWbeM'),
}

def video_buttons(char, name):
    if char not in VIDEOS:
        return []
    story_id, vocab_id = VIDEOS[char][:2]
    # Same buttons as Urdu 3+: the game first, then Story and Vocabulary.
    return [{'type': 'videos', 'label': label, 'icon': icon, 'title': f'{label}: {name}', 'button': {'x': 11.5, 'y': y},
             'videos': [{'title': label, 'src': f'https://youtu.be/{vid}'}]}
            for label, icon, y, vid in [('Story', '📖', 33, story_id), ('Vocabulary', '🔤', 38, vocab_id)] if vid]

def scene(page, text, cx=50, cy=46, width=95):
    return {'page': page, 'from': {'cx': cx, 'cy': cy, 'w': width},
            'to': {'cx': cx, 'cy': cy, 'w': round(width * .92, 2)}, 'text': text}

def story(page, title, scenes):
    return {'type': 'story', 'ur': True, 'label': 'سیکھیں', 'icon': '📖', 'title': title,
            'button': {'x': 13, 'y': 24}, 'scenes': scenes}

def game(title, targets, crop=None):
    return {'type': 'game', 'ur': True, 'label': 'کھیلیں', 'title': title,
            'button': {'x': 13, 'y': 24}, 'crop': crop or {'x': 3, 'y': 69, 'w': 94, 'h': 16},
            'targets': targets}

def target(name, x, y, w, h, say=None):
    return {'name': name, 'x': x, 'y': y, 'w': w, 'h': h, 'say': say or f'یہ {name} ہے۔'}

def picture(page, char, name, words):
    spots = [(67, 30), (35, 30), (3, 30)]
    scenes = [scene(page, f'یہ حرف {name} ہے۔ میرے ساتھ کہیں: {name}۔', 66, 10, 66),
              scene(page, 'تصویر دیکھیں۔ پھر نیچے دیے گئے الفاظ پڑھیں۔', 50, 40, 98)]
    scenes += [scene(page, f'{word}۔ اس لفظ میں حرف {name} تلاش کریں۔', x + w/2, 76, 34)
               for word, (x, w) in zip(words, spots)]
    scenes.append(scene(page, '، '.join(words) + '۔ شاباش! اب تصویروں والا کھیل کھیلیں۔', 50, 76, 98))
    videos = video_buttons(char, name)
    play = game('تصویر پہچانیں اور صحیح تصویر پر ٹیپ کریں۔',
                [target(word, x, 69.5, w, 14.5) for word, (x, w) in zip(words, spots)])
    play['button'] = {'x': 11.5, 'y': 28}
    return videos + [play, story(page, f'حرف {name} — {char}', scenes)]

def trace_rows(image):
    """Separate the three practice rows; do not include colouring art or word puzzles."""
    H, W = image.shape[:2]
    xa, xb, ya, yb = int(W*.06), int(W*.94), int(H*.36), int(H*.64)
    crop = image[ya:yb, xa:xb]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    spread = crop.max(axis=2).astype(int) - crop.min(axis=2)
    dark = ((gray < 175) & (spread < 65)).astype(np.uint8)
    # Remove printed writing baselines before grouping letters and their detached dots.
    lines = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((1, 65), np.uint8))
    dark[lines > 0] = 0
    ys = np.flatnonzero(dark.any(axis=1))
    if not len(ys):
        raise ValueError('No tracing pixels')
    bands = np.split(ys, np.where(np.diff(ys) > H*.012)[0] + 1)
    rows = []
    for band in bands:
        if len(band) < 3 or band[-1] - band[0] < H*.014:
            continue
        y0, y1 = int(band[0]), int(band[-1])+1
        pixels = dark[y0:y1]
        xs = np.flatnonzero(pixels.any(axis=0))
        groups = np.split(xs, np.where(np.diff(xs) > W*.035)[0] + 1)
        boxes = []
        for group in groups:
            x0, x1 = int(group[0]), int(group[-1])+1
            ink_y = np.flatnonzero(pixels[:, x0:x1].any(axis=1))
            top, bottom = y0 + int(ink_y[0]), y0 + int(ink_y[-1])+1
            if bottom - top < H*.014 or x1-x0 > W*.24:
                continue
            boxes.append([round((xa+x0)/W*100, 2), round((ya+top)/H*100, 2),
                          round((x1-x0)/W*100, 2), round((bottom-top)/H*100, 2)])
        if len(boxes) >= 3:
            rows.append(sorted(boxes, key=lambda box: -box[0]))
    if len(rows) != 3:
        raise ValueError(f'Expected 3 tracing rows, found {len(rows)}')
    return rows

RATIO = .7222   # page width / height


def alif_ink(page, box):
    """The printed alif is a thin dotted stick; colour the publisher's written alif over it instead.
    Returns (mark box, src, ink box)."""
    src = f'books/{BOOK}/ink/p{page:03d}_{round(box[0] * 10)}_{round(box[1] * 10)}.png'
    lb, pb = written_alif(str(ROOT / src), box, RATIO)
    return lb, src, pb


def tracing(page, char, name):
    image = cv2.imread(f'books/{BOOK}/p{page:03d}.jpg')
    rows = trace_rows(image)
    steps = []
    for index, row in enumerate(rows):
        marks = []
        for box in row:
            if char == 'ا':
                box, src, padded = alif_ink(page, box)
                marks.append({'glyph': 'ur', 'box': box, 'ink': {'src': src, 'box': padded}})
                continue
            src, padded = make_ink(BOOK, page, box)
            if not np.any(cv2.imread(src, cv2.IMREAD_UNCHANGED)[..., 3]):
                raise ValueError(f'Empty ink on page {page}: {box}')
            marks.append({'glyph': 'ur', 'box': box, 'ink': {'src': src, 'box': padded}})
        say = f'حرف {name} لکھیں۔ دائیں طرف سے شروع کریں اور نقطوں پر پنسل پھیریں۔' if index == 0 else 'اگلی سطر پر بھی دائیں سے بائیں لکھیں۔'
        if index == 2:
            say += ' شاباش! اب تصویر میں رنگ بھریں۔'
        steps.append({'say': say, 'marks': marks})
    act = {'type': 'fill', 'title': f'{name} لکھیں اور رنگ بھریں', 'steps': steps, 'colours': page_colours(BOOK, page)}
    if char in VIDEOS and VIDEOS[char][2]:
        act['video'] = {'title': f'How to write {name}', 'src': f'https://youtu.be/{VIDEOS[char][2]}'}
    return act

def revision(page, title, items):
    # Items are (caption, x, y, width, height), reviewed against the real page.
    scenes = [scene(page, title + '۔ غور سے دیکھیں، پڑھیں اور پہچانیں۔', 50, 48, 98)]
    scenes += [scene(page, caption + '۔', x+w/2, y+h/2, min(96, max(32, w*1.5)))
               for caption, x, y, w, h in items]
    x0 = max(0, min(item[1] for item in items)-1)
    y0 = max(0, min(item[2] for item in items)-1)
    x1 = min(100, max(item[1]+item[3] for item in items)+1)
    y1 = min(100, max(item[2]+item[4] for item in items)+1)
    targets = [target(caption, x, y, w, h, f'شاباش! {caption}۔') for caption, x, y, w, h in items]
    for item in targets:
        # Show the question's row at a readable size instead of shrinking a whole word table.
        row = [other for other in targets if abs(other['y']-item['y']) < 1]
        rx = max(0, min(other['x'] for other in row)-1)
        ry = max(0, min(other['y'] for other in row)-1)
        right = min(100, max(other['x']+other['w'] for other in row)+1)
        bottom = min(100, max(other['y']+other['h'] for other in row)+1)
        item['view'] = {'x': rx, 'y': ry, 'w': right-rx, 'h': bottom-ry}
    return [story(page, title, scenes), game('پڑھیں اور صحیح جگہ پر ٹیپ کریں۔', targets,
            {'x': x0, 'y': y0, 'w': x1-x0, 'h': y1-y0})]

def extras():
    acts = {}
    acts[18] = revision(18, 'حروف کی دہرائی', [
        ('تربوز', 76, 14, 18, 12), ('ثمر', 6, 14, 20, 12),
        ('پنکھا', 78, 27, 14, 15), ('بندر', 5, 27, 22, 15),
        ('ٹماٹر', 77, 45, 16, 11), ('انگور', 6, 45, 20, 11)])
    acts[19] = revision(19, 'تصویری دہرائی', [
        ('ٹوکری', 75, 13, 20, 16), ('بوتل', 52, 13, 19, 16),
        ('پنسل', 28, 13, 20, 16), ('ثمر', 4, 13, 20, 16), ('بطخ', 9, 48, 82, 40)])
    acts[42] = revision(42, 'حروف اور تصویروں کی دہرائی', [
        ('زیبرا', 72, 15, 18, 15), ('ذخیرہ', 25, 15, 22, 15),
        ('چابی', 72, 33, 18, 14), ('ژالہ باری', 26, 33, 19, 14),
        ('پہاڑ', 71, 49, 24, 12), ('خرگوش', 28, 49, 15, 12),
        ('حجام', 71, 64, 24, 15), ('درخت', 25, 64, 24, 15),
        ('جیپ', 71, 82, 24, 12), ('روٹی', 27, 82, 19, 12)])
    acts[43] = revision(43, 'تصویر کا پہلا حرف', [
        ('ڈبا', 70, 10, 19, 11.5), ('ذرات', 48.5, 10, 19.5, 11.5), ('گاڑی', 27, 10, 20, 11.5), ('اژدہا', 6, 10, 20, 11.5),
        ('دروازہ', 70, 28, 19, 11.5), ('زیبرا', 48.5, 28, 19.5, 11.5), ('خربوزہ', 27, 28, 20, 11.5), ('ریچھ', 6, 28, 20, 11.5)])
    acts[56] = revision(56, 'حروف کی دہرائی', [
        ('سورج', 77, 12, 16, 14), ('ضعیف', 10, 12, 16, 14),
        ('طالب علم', 78, 27, 13, 15), ('ریل گاڑی', 6, 27, 22, 15),
        ('صندوق', 76, 42, 17, 14), ('ظریف', 10, 42, 16, 14),
        ('شربت', 77, 57, 15, 15), ('ژالہ باری', 8, 57, 19, 15)])
    acts[57] = revision(57, 'صحیح حرف پہچانیں', [
        (word, x, y, w, h)
        for (y, h, words) in [(11, 12, ['ظروف', 'جہاز', 'خیمہ', 'ریچھ']), (31, 15, ['ثمر', 'شیر', 'حلوا', 'پہاڑ']),
                              (52, 17, ['دانت', 'طوطا', 'ضعیف', 'ڈاکٹر']), (75, 14, ['سیب', 'ذخیرہ', 'صابون', 'شلجم'])]
        for word, (x, w) in zip(words, [(72, 22), (50, 20), (29, 20), (7, 21)])])
    # Each alphabet target covers one actual glyph. Detached dots stay with its glyph.
    rows = [(18, ['ا', 'آ'], [57, 44.5]),
            (25, ['ب', 'پ', 'ت', 'ٹ', 'ث'], [86, 70, 53, 36, 20]),
            (34, ['ج', 'چ', 'ح', 'خ'], [82, 62, 44, 25]),
            (43, ['د', 'ڈ', 'ذ', 'ر', 'ڑ', 'ز', 'ژ'], [78, 68.5, 59, 50, 41, 31.5, 23]),
            (52, ['س', 'ش', 'ص', 'ض'], [81, 63.5, 45, 26.5]),
            (61, ['ط', 'ظ', 'ع', 'غ'], [72, 63.5, 53.5, 35]),
            (70, ['ف', 'ق', 'ک', 'گ'], [80, 61.5, 44, 27]),
            (79, ['ل', 'م', 'ن', 'و', 'ہ', 'ء'], [87, 68.5, 53.5, 36.5, 28, 11.5]),
            (88, ['ی', 'ے'], [63, 44])]
    names = {char: name for _, char, name, _ in LESSONS}
    names.update({'ی': 'چھوٹی یے', 'ے': 'بڑی یے', 'ھ': 'دو چشمی ھے'})
    narrow = {43, 61, 79}   # rows where letters stand close together
    acts[84] = revision(84, 'مکمل حروف تہجی', [
        (names[char], x-(3.5 if y in narrow else 5), y-3, 7 if y in narrow else 10, 7)
        for y, chars, xs in rows for char, x in zip(chars, xs)])
    acts[85] = revision(85, 'دو چشمی ھ والے حروف', [
        ('بھالو', 70, 13, 24, 16), ('پھول', 38, 13, 24, 16), ('تھیلا', 6, 13, 24, 16),
        ('ٹھیلا', 70, 32, 24, 16), ('جھنڈا', 38, 32, 24, 16), ('چھتری', 6, 32, 24, 16),
        ('دھوبی', 70, 52, 24, 16), ('ڈھول', 38, 52, 24, 16), ('سیڑھی', 6, 52, 24, 16),
        ('کھجور', 70, 72, 24, 16), ('گھوڑا', 38, 72, 24, 16), ('چولھا', 6, 72, 24, 16)])
    acts[86] = revision(86, 'دو چشمی حروف کا مصوتوں سے ملاپ', [
        ('بھا', 57, 18, 16, 4), ('بھو', 39, 18, 16, 4), ('بھی', 21, 18, 16, 4), ('بھے', 4, 18, 16, 4),
        ('کھا', 57, 69, 16, 4), ('کھو', 39, 69, 16, 4)])
    acts[87] = revision(87, 'دو چشمی حروف سے الفاظ بنائیں', [
        ('بھاگا', 51, 11, 10, 5), ('کھانا', 6, 11, 10, 5), ('جھاڑا', 51, 18, 10, 5),
        ('بھاری', 6, 18, 10, 5), ('کھڑکی', 51, 25, 10, 5), ('دھونا', 6, 67, 10, 5)])
    for page, title in [(88, 'زبر سے الفاظ بنائیں'), (89, 'زیر سے الفاظ بنائیں'), (90, 'پیش سے الفاظ بنائیں')]:
        # Use the upper letter table for listening rather than guessing tiny word-cell geometry.
        acts[page] = story(page, title, [
            scene(page, title + '۔ پہلے آواز سنیں، پھر کتاب میں حروف پڑھیں۔', 50, 24, 98),
            scene(page, 'حروف پر لگے اعراب دیکھیں۔ دائیں طرف سے پڑھنا شروع کریں۔', 50, 41, 98),
            scene(page, 'نیچے دیے گئے حروف کو ملا کر الفاظ پڑھیں۔ پھر اپنی کاپی میں لکھیں۔', 50, 72, 98)])
    acts[91] = revision(91, 'مصوتوں کا تعارف', [
        ('الف', 73, 43, 14, 6), ('واؤ', 73, 52, 14, 6), ('چھوٹی یے', 73, 61, 14, 6), ('بڑی یے', 73, 70, 14, 6),
        ('بالٹی', 40, 43, 19, 6), ('مور', 40, 52, 19, 6), ('تیر', 40, 61, 19, 6), ('سیب', 40, 70, 19, 6)])
    word_pages = [
        (92, 'الف سے الفاظ بنائیں', [
            ['باپ', 'تاپ', 'ہار'], ['ٹاٹ', 'جار', 'چار'], ['دال', 'حال', 'خار'],
            ['رات', 'ڈال', 'نام'], ['صاف', 'سال', 'گال'], ['لات', 'کاٹ', 'شال'],
            ['وار', 'یاد', 'بات'], ['ذات', 'غار', 'لال'], ['سات', 'جال', 'چاٹ'], ['بھاگ', 'مار', 'ناک']]),
        (93, 'واؤ سے الفاظ بنائیں', [
            ['اور', 'بول', 'پول'], ['تول', 'توڑ', 'جوڑ'], ['چوٹ', 'حوض', 'خول'],
            ['دوڑ', 'ڈول', 'زور'], ['سوچ', 'شوخ', 'طور'], ['غول', 'فوج', 'کون'],
            ['گول', 'غور', 'لوگ'], ['موج', 'مور', 'نوٹ'], ['ہوش', 'یوم', 'ووٹ'], ['بور', 'توپ', 'روک']]),
        (94, 'چھوٹی یے سے الفاظ بنائیں', [
            ['چابی', 'سوتی', 'چاچی'], ['کاٹی', 'باجی', 'داغی'], ['دادی', 'تازی', 'ساری'],
            ['چوڑی', 'خاصی', 'باسی'], ['طوطی', 'باغی', 'راضی'], ['باقی', 'جاگی', 'کافی'],
            ['پانی', 'روٹی', 'مالی'], ['حامی', 'مامی', 'ساقی'], ['ڈوری', 'ہاری', 'لالی'], ['وادی', 'نیلی', 'روتی']]),
        (95, 'بڑی یے سے الفاظ بنائیں', [
            ['گاتے', 'موٹے', 'ہارے'], ['جاتے', 'کاٹے', 'چائے'], ['لوٹے', 'جاڑے', 'گائے'],
            ['سوتے', 'جاگے', 'مارے'], ['باجے', 'جالے', 'ڈالے'], ['ناچے', 'جانے', 'تالے'],
            ['تارے', 'دانے', 'صوفے'], ['بولے', 'تولے', 'کونے'], ['طوطے', 'جوتے', 'سوتے'], ['کیلا', 'میلا', 'سارے']]),
    ]
    row_y = [16, 23.5, 31.5, 39.7, 47.8, 56, 64.3, 72.5, 80.8, 89]
    for page, title, rows in word_pages:
        items = [(word, x, row_y[row], 9.5, 5.6)
                 for row, words in enumerate(rows) for word, x in zip(words, [66, 36.2, 6.5])]
        acts[page] = revision(page, title, items)
    number_names = ['ایک', 'دو', 'تین', 'چار', 'پانچ', 'چھے', 'سات', 'آٹھ', 'نو', 'دس']
    items = []
    for number, word in enumerate(number_names, 1):
        row = (number-1)//2
        x = 52 if number % 2 else 4
        items.append((word, x, 16 + row*16.2, 42, 13))
    acts[96] = revision(96, 'ایک سے دس تک گنتی', items)
    return acts

def main():
    acts = {}
    summary = []
    for page, char, name, words in LESSONS:
        acts[page] = picture(page, char, name, words)
        acts[page+1] = tracing(page+1, char, name)
        summary.append({'picturePage': page, 'tracePage': page+1, 'letter': char, 'name': name, 'words': words,
                        'tracingMarks': sum(len(s['marks']) for s in acts[page+1]['steps'])})
        print(f'Built Urdu lesson on pages {page}/{page+1}', flush=True)
    acts.update(extras())
    assert sorted(acts) == list(range(4, 97)), 'Every instructional page must be reviewed'
    # The authored "سیکھیں" animations are not shown (as in Urdu 3+): the publisher's videos teach each letter.
    for page in list(acts):
        if isinstance(acts[page], list):
            acts[page] = [entry for entry in acts[page] if entry['type'] != 'story']
        if not acts[page] or (isinstance(acts[page], dict) and acts[page]['type'] == 'story'):
            del acts[page]
    source = '// Generated by tools/make_urdu4.py from the reviewed Urdu 4+ pages.\n'
    source += f"window.BOOK_ACTIVITIES['{BOOK}'] = " + json.dumps(dict(sorted(acts.items())), ensure_ascii=False, indent=1) + ';\n'
    (ROOT / 'books/activities-urdu4.js').write_text(source, encoding='utf-8', newline='\n')
    (ROOT / f'books/{BOOK}/lessons.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    # The PDF has no text layer and, as in Urdu 3+, no home-made narration is read aloud: no Listen button.
    texts = [[] for _ in range(96)]
    (ROOT / f'books/{BOOK}/text.json').write_text(json.dumps(texts, indent=1) + '\n', encoding='utf-8')
    print(f'{len(acts)} instructional pages; {len(LESSONS)} Urdu lessons', flush=True)

if __name__ == '__main__':
    main()
