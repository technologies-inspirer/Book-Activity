"""Activities for Stemford Urdu 5+ (Prep): tap-the-picture games and write-and-colour pages. No AI stories.

Run from the repository root after import_urdu5.py and link_urdu5_videos.py (the QR Watch-this videos):
    PYTHONPATH=tools python tools/make_urdu5.py
The exercise questions of the practice pages are in books/questions.js.
"""
import json
import make_maths4 as m4

BOOK = 'stemford-urdu-5'
m4.BOOK = BOOK          # reuse the blank-paper button placement on this book's pages
ROOT = m4.ROOT
FIRST_PAGE = 4          # pages 1-3: title, about the book, contents

def row(names, y, h, x0, x1):
    """Equal picture cells across a row (names from right to left, as the book reads)."""
    w = (x1 - x0) / len(names)
    return [(n, x1 - (i + 1) * w + .5, y, w - 1, h) for i, n in enumerate(names)]

def box(name, x0, y0, x1, y1):
    return [(name, x0, y0, x1 - x0, y1 - y0)]

# Tap-the-picture games (positions in % of the page, measured on a grid of each page).
GAMES = {
    29: ('تصویر پہچانیں', row(['کان', 'شاخ', 'ناک', 'ڈاک', 'ہار'], 24.5, 14, 6, 93)),
    34: ('تصویر پہچانیں', row(['حوض', 'ووٹ', 'ڈول', 'چوٹ', 'مور'], 24.5, 14, 6, 94)),
    39: ('تصویر پہچانیں', row(['گوبھی', 'پانی', 'مالی', 'روٹی', 'بالی'], 24.5, 14, 6, 94)),
    44: ('تصویر پہچانیں', box('چائے', 6, 66, 24, 77.5) + box('گائے', 27, 66, 45, 77.5) + box('پائے', 48, 66, 66, 77.5) + box('رضائی', 69, 66, 87, 77.5)),
    53: ('تصویر پہچانیں', box('جھولا', 19, 51, 45, 66) + box('صابن', 55, 51, 82, 66) + box('کرسی', 19, 69, 45, 86) + box('مرغی', 55, 68, 82, 86)),
    56: ('تصویر پہچانیں', box('کوا', 7, 49.5, 30, 61.5) + box('بچہ', 34, 49.5, 58, 61.5) + box('بلی', 62, 49.5, 87, 61.5)),
    58: ('تصویر پہچانیں', box('دانت', 6, 49.5, 30, 62) + box('سانپ', 34, 49.5, 58, 62) + box('آنکھ', 62, 49.5, 87, 62)),
    64: ('واحد اور جمع', box('غبارہ', 77, 17.5, 92, 29) + box('غبارے', 9, 17.5, 30, 29) + box('مالٹا', 77, 30, 92, 41.5) + box('مالٹے', 9, 30, 30, 41.5)
         + box('بستہ', 77, 42.5, 92, 53) + box('بستے', 7, 42.5, 33, 53) + box('چوزہ', 77, 54, 92, 65.5) + box('چوزے', 9, 54, 31, 65.5)
         + box('پنسل', 77, 66, 92, 77.5) + box('پنسلیں', 9, 66, 31, 77.5) + box('گاڑی', 77, 78.5, 92, 89) + box('گاڑیاں', 5, 78.5, 31, 89)),
    65: ('مذکر اور مؤنث', box('دادا', 78, 17, 92, 29) + box('دادی', 11, 17, 24, 29) + box('ابو', 78, 29.5, 92, 41) + box('امی', 11, 29.5, 24, 41)
         + box('مرغا', 78, 41.5, 92, 52.5) + box('مرغی', 11, 41.5, 24, 52.5) + box('راجا', 78, 53, 92, 64.5) + box('رانی', 11, 53, 24, 64.5)
         + box('چڑا', 78, 65, 92, 76.5) + box('چڑیا', 11, 65, 24, 76.5) + box('لڑکا', 78, 78, 92, 90) + box('لڑکی', 11, 78, 24, 90)),
    66: ('متضاد الفاظ', box('دن', 70, 17, 91, 30) + box('رات', 7, 17, 28, 30) + box('کم', 70, 31, 91, 44.5) + box('زیادہ', 7, 31, 28, 44.5)
         + box('پتلا', 70, 45, 91, 59.5) + box('موٹا', 7, 45, 28, 59.5) + box('نرم', 70, 60, 91, 73.5) + box('سخت', 7, 60, 28, 73.5)
         + box('اندر', 70, 74, 91, 88) + box('باہر', 7, 74, 28, 88)),
    67: ('پھل اور سبزیاں', box('انار', 2, 17, 17, 23.5) + box('آڑو', 2, 23.5, 17, 29) + box('تربوز', 2, 29, 17, 35) + box('کیلا', 2, 35, 17, 41)
         + box('آم', 2, 41, 17, 47) + box('بینگن', 2, 57, 17, 63) + box('ٹماٹر', 2, 63, 17, 69) + box('مٹر', 2, 69, 17, 75)
         + box('پالک', 2, 75, 17, 81) + box('لہسن', 2, 81, 17, 87)),
    68: ('یہ اور وہ', box('گائے', 0.5, 17, 20, 33) + box('بطخ', 52, 23.5, 70, 33) + box('بندر', 2, 42, 16, 55) + box('پنکھا', 51, 47, 67, 62)
         + box('چاند', 4, 73.5, 22, 88) + box('کوا', 55, 71.5, 70, 88)),
    70: ('یہ اور وہ', box('پنسلیں', 17, 24, 34, 33.5) + box('گھوڑا', 61, 16, 74, 35.5) + box('پھول', 3, 43, 20, 57) + box('گاڑی', 55, 45, 73, 57)
         + box('غبارے', 4, 68.5, 21, 81) + box('زیبرا', 57, 69, 74, 86)),
}

# The publisher's Story / Vocabulary / Formation videos of each letter family (story pages 8-24, in the book's order).
# None: no link supplied yet (Formation of ا آ and of ب پ ت ٹ ث, Vocabulary of ع غ).
VIDEOS = {
    8: ('ا آ', 'NXQwMZL4ClE', 'HK-mT3xl0rk', None),
    9: ('ب پ ت ٹ ث', 'vRx2F7aiLd8', 'u3VTaOivP0A', None),
    10: ('بھ پھ تھ ٹھ', 'bta7vKKvPXw', 'N9r7D-Ed3Vg', 'BzXnSx6j0GI'),
    11: ('ج چ ح خ', 'IeMWHGkfjuQ', 'lYqwcb0t3zA', 'OHWBlraBwZ0'),
    12: ('جھ چھ', '16ZlKrC8yfE', 'JKh9OcJFdlI', 'L6hfZAImg4Y'),
    13: ('د ڈ ذ', '_TqfWH1wSsU', '73wEqszwMCc', 'iKbgAiTzGjA'),
    14: ('دھ ڈھ رھ زھ', 'WyrmvOBK-NQ', 'AazWc2y3v90', 'xU6PINbt9O8'),
    15: ('ر ڑ ز', 'UDFe_xeXlSc', 'hM4Pw_t2jOw', 'zc7d30eZu4U'),
    16: ('س ش', 'JvHG0_lMrQg', 'nKubNFWKKSc', 'YZ6rWIiwZRQ'),
    17: ('ص ض', 'EVzax7ri19M', 'F1klw7RGjok', '7mo5TSEUdss'),
    18: ('ط ظ', 'AbZ4eKPoMYk', 'QfWxHVuiijk', 'RTD1KHaJ0nw'),
    19: ('ع غ', 'nfD84xyncYY', None, 'V4aAkFSTS1E'),
    20: ('ف ق ک گ', 'Ey2D796PtVM', '3Yzq4jDcyhE', 'diCrb9Vfhcw'),
    21: ('کھ گھ', 'i_DqdFAdOVg', '-ziFyf2XDvY', 'V_i1FDPXC8c'),
    22: ('ل م ن', 'fOMlSsq6Dbg', 'M9za8tlwtnE', 'RlRCdPXkjX0'),
    23: ('لھ مھ نھ', '0yvnzjUL7gg', 'qPjy5QmrQgM', 'iqhUu9zREBY'),
    24: ('و ھ ی ے', 'YTgDkol6pkc', 'Lk9oeIVdXX0', 'TgGzeOw8XRo'),
}

def letter_videos(page):
    """Story, Vocabulary and Formation buttons, stacked at the top left of the story picture."""
    letters, *ids = VIDEOS[page]
    out = []
    for (label, icon), vid, y in zip([('Story', '📖'), ('Vocabulary', '🔤'), ('Formation', '✏️')], ids, (9, 14, 19)):
        if vid:
            out.append({'type': 'videos', 'label': label, 'icon': icon, 'title': f'{label}: {letters}', 'button': {'x': 2, 'y': y},
                        'videos': [{'title': f'{label}: {letters}', 'src': 'https://youtu.be/' + vid}]})
    return out

WIDE = {68, 70}

def make_game(page, title, cells, taken):
    targets = [{'name': n, 'x': round(x, 1), 'y': round(y, 1), 'w': round(w, 1), 'h': round(h, 1), 'say': n} for n, x, y, w, h in cells]
    x0, y0 = max(0, min(t['x'] for t in targets) - 1), max(0, min(t['y'] for t in targets) - 1)
    x1, y1 = min(100, max(t['x'] + t['w'] for t in targets) + 1), min(100, max(t['y'] + t['h'] for t in targets) + 1)
    if page in WIDE:   # the boy pointing at each picture is part of the sentence: show the whole width
        x0, x1 = 0, 100
    crop = {'x': round(x0, 1), 'y': round(y0, 1), 'w': round(x1 - x0, 1), 'h': round(y1 - y0, 1)}
    return {'type': 'game', 'label': 'کھیلیں', 'title': title, 'ur': True, 'button': m4.clear_spot(page, [crop[k] for k in 'xywh'], taken), 'crop': crop, 'targets': targets}

def main():
    meta = json.loads((ROOT / f'books/{BOOK}/meta.json').read_text(encoding='utf-8'))
    palette = json.loads((ROOT / 'books/colour-palettes.json').read_text(encoding='utf-8'))
    names = ['black', 'red', 'blue', 'green', 'yellow', 'orange', 'pink', 'brown', 'purple']
    palette['books'][BOOK] = {str(p): {'picture': 'Writing: black pencil; pictures: free colours', 'colours': ['black'] if p < FIRST_PAGE else names}
                              for p in range(1, meta['pages'] + 1)}
    (ROOT / 'books/colour-palettes.json').write_text(json.dumps(palette, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    acts = {}
    for page in range(FIRST_PAGE, meta['pages'] + 1):
        entries = []
        taken = m4.qr_taken(page)   # the QR code and its Watch-this button
        if page in VIDEOS:
            entries += letter_videos(page)
        if page in GAMES:
            h, w = m4.cv2.imread(str(ROOT / f'books/{BOOK}/p{page:03}.jpg')).shape[:2]
            taken += [(int(x / 100 * w), int(y / 100 * h), int(bw / 100 * w), int(bh / 100 * h)) for _, x, y, bw, bh in GAMES[page][1]]
            entries.append(make_game(page, *GAMES[page], taken))
        entries.append({'type': 'fill', 'title': 'لکھیں اور رنگ بھریں', 'colours': [palette['colours'][c] for c in names],
                        'steps': [{'say': 'اس صفحے کی مشق کریں۔ لکھیں اور تصویروں میں رنگ بھریں۔', 'marks': []}]})
        acts[page] = entries
    source = '// Generated by tools/make_urdu5.py: games and write-and-colour pages, no AI stories.\n'
    source += f"window.BOOK_ACTIVITIES = window.BOOK_ACTIVITIES || {{}};\nwindow.BOOK_ACTIVITIES['{BOOK}'] = " + json.dumps(acts, ensure_ascii=False, indent=1) + ';\n'
    (ROOT / 'books/activities-urdu5.js').write_text(source, encoding='utf-8')
    print(f'Urdu 5+: {len(acts)} pages, {sum(len(v) for v in acts.values())} activities, {len(GAMES)} games.')

if __name__ == '__main__':
    main()
