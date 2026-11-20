"""Activities for Stemford Urdu 1 (Class 1): tap-the-picture games and write-and-colour pages. No AI stories.

Run from the repository root after import_urdu1.py and link_urdu1_videos.py (the QR Watch-this videos):
    PYTHONPATH=tools python tools/make_urdu1.py
As in Urdu 5+: every lesson page can be written on and coloured in; pages that print pictures with their
names get a "تصویر پہچانیں" game (the child hears a name and taps its picture).
"""
import json
import make_maths4 as m4

BOOK = 'stemford-urdu-1'
m4.BOOK = BOOK          # reuse the blank-paper button placement on this book's pages
ROOT = m4.ROOT
FIRST_PAGE = 4          # pages 1-3: title and contents


def box(name, x0, y0, x1, y1):
    return [(name, x0, y0, x1 - x0, y1 - y0)]


def boxes(*items):
    return [cell for item in items for cell in box(*item)]


# Pictures printed with their names (positions in % of the page, measured on a grid of each page).
GAMES = {
    4: ('تصویر پہچانیں', boxes(('آم', 13, 30.5, 27, 40), ('انگور', 57, 30, 71, 40), ('پنکھا', 14, 43, 26, 54), ('بکری', 59, 42, 71, 54),
                               ('ٹماٹر', 13, 56.5, 26, 65), ('تتلی', 57, 55, 70, 65.5), ('جہاز', 11, 68.5, 28, 77), ('ثمر', 55, 68, 72, 77),
                               ('حلوائی', 13, 79, 27, 89), ('چابی', 60, 79, 70, 89))),
    5: ('تصویر پہچانیں', boxes(('دوات', 11, 6, 22, 16), ('خرگوش', 57, 5, 67, 17), ('ذخیرہ', 9, 19, 26, 30), ('ڈاکیا', 58, 18.5, 68, 31),
                               ('آڑو', 11, 33, 22, 40.5), ('ریل گاڑی', 51, 31, 69, 41), ('ژالہ باری', 10, 44, 25, 55), ('زیبرا', 56, 43.5, 68, 55),
                               ('شیر', 9, 57, 26, 69), ('سیب', 56, 57.5, 67, 67), ('ضعیف', 10, 70, 25, 82), ('صابن', 54, 71.5, 70, 79.5),
                               ('ظریف', 11, 84, 24, 95), ('طوطا', 54, 83, 72, 94))),
    6: ('تصویر پہچانیں', boxes(('غلیل', 11, 5.5, 24, 17), ('عینک', 55, 7.5, 75, 14.5), ('قینچی', 11, 19, 27, 30), ('فاختہ', 56, 19, 71, 30),
                               ('گیند', 12, 34, 24, 42), ('کبوتر', 55, 32, 69, 40), ('مور', 11, 44.5, 24, 55.5), ('لٹو', 57, 45.5, 69, 54.5),
                               ('ویگن', 11, 58, 27, 68), ('نلکا', 55, 58, 69, 69), ('گائے', 8, 70, 29, 79), ('ہاتھی', 55, 70, 70, 81),
                               ('یکہ', 9, 85, 27, 95), ('یاسمین', 56, 87, 71, 94))),
    7: ('تصویر پہچانیں', boxes(('تھیلا', 8, 15, 24, 27), ('پھل', 38, 14.5, 55, 27), ('بھیڑ', 67, 14.5, 83, 27.5),
                               ('چھلنی', 8, 32, 24, 42), ('جھنڈا', 38, 31, 54, 43), ('ٹھیلا', 67, 33, 85, 42),
                               ('سرہانہ', 8, 46, 23, 57), ('ڈھول', 37, 46, 55, 57), ('دھاگا', 70, 47, 82, 56),
                               ('گھونسلا', 7, 62, 24, 72), ('کھجور', 37, 63, 55, 73), ('سیڑھی', 67, 61, 84, 74.5),
                               ('ننھا', 5, 79, 26, 88), ('کمہار', 37, 77, 55, 90), ('چولہا', 66, 80, 83, 90))),
    28: ('تصویر پہچانیں', boxes(('مور', 6, 33, 21, 44), ('تتلی', 24, 34, 36, 42.5), ('بستہ', 41, 34, 52, 42.5), ('جہاز', 55, 35, 71, 42.5),
                                ('ٹماٹر', 75, 35, 85, 41.5))),
}


# Game buttons placed by eye where the automatic blank-paper search lands on a letter tile (page 4)
# or beside another exercise (page 28): both go to the plain top of the page.
BUTTON_AT = {4: {'x': 80, 'y': 3}, 28: {'x': 58, 'y': 3}}


def make_game(page, title, cells, taken):
    targets = [{'name': n, 'x': round(x, 1), 'y': round(y, 1), 'w': round(w, 1), 'h': round(h, 1), 'say': n} for n, x, y, w, h in cells]
    x0, y0 = max(0, min(t['x'] for t in targets) - 1), max(0, min(t['y'] for t in targets) - 1)
    x1, y1 = min(100, max(t['x'] + t['w'] for t in targets) + 1), min(100, max(t['y'] + t['h'] for t in targets) + 1)
    crop = {'x': round(x0, 1), 'y': round(y0, 1), 'w': round(x1 - x0, 1), 'h': round(y1 - y0, 1)}
    return {'type': 'game', 'label': 'کھیلیں', 'title': title, 'ur': True, 'button': BUTTON_AT.get(page) or m4.clear_spot(page, [crop[k] for k in 'xywh'], taken), 'crop': crop, 'targets': targets}


def write_keeping_endings(path, text):
    crlf = b'\r\n' in path.read_bytes() if path.exists() else False
    path.write_bytes((text.replace('\r\n', '\n').replace('\n', '\r\n') if crlf else text).encode('utf-8'))


def main():
    meta = json.loads((ROOT / f'books/{BOOK}/meta.json').read_text(encoding='utf-8'))
    palette_path = ROOT / 'books/colour-palettes.json'
    palette = json.loads(palette_path.read_text(encoding='utf-8'))
    names = ['black', 'red', 'blue', 'green', 'yellow', 'orange', 'pink', 'brown', 'purple']
    palette['books'][BOOK] = {str(p): {'picture': 'Writing: black pencil; pictures: free colours', 'colours': ['black'] if p < FIRST_PAGE else names}
                              for p in range(1, meta['pages'] + 1)}
    write_keeping_endings(palette_path, json.dumps(palette, ensure_ascii=False, indent=2) + '\n')
    acts = {}
    for page in range(FIRST_PAGE, meta['pages'] + 1):
        entries = []
        taken = m4.qr_taken(page)   # the QR code and its Watch-this button
        if page in GAMES:
            h, w = m4.cv2.imread(str(ROOT / f'books/{BOOK}/p{page:03}.jpg')).shape[:2]
            taken += [(int(x / 100 * w), int(y / 100 * h), int(bw / 100 * w), int(bh / 100 * h)) for _, x, y, bw, bh in GAMES[page][1]]
            entries.append(make_game(page, *GAMES[page], taken))
        entries.append({'type': 'fill', 'title': 'لکھیں اور رنگ بھریں', 'colours': [palette['colours'][c] for c in names],
                        'steps': [{'say': 'اس صفحے کی مشق کریں۔ لکھیں اور تصویروں میں رنگ بھریں۔', 'marks': []}]})
        acts[page] = entries
    source = '// Generated by tools/make_urdu1.py: games and write-and-colour pages, no AI stories.\n'
    source += f"window.BOOK_ACTIVITIES = window.BOOK_ACTIVITIES || {{}};\nwindow.BOOK_ACTIVITIES['{BOOK}'] = " + json.dumps(acts, ensure_ascii=False, indent=1) + ';\n'
    (ROOT / 'books/activities-urdu1.js').write_text(source, encoding='utf-8')
    print(f'Urdu 1: {len(acts)} pages, {sum(len(v) for v in acts.values())} activities, {len(GAMES)} games.')


if __name__ == '__main__':
    main()
