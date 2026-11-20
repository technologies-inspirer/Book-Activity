"""Activities for Stemford English 5+ (Prep): publisher videos, tap-the-picture games and write-and-colour pages.

Run from the repository root after import_english5.py and link_english5_videos.py (the QR Watch-this videos):
    PYTHONPATH=tools python tools/make_english5.py
No AI stories: each topic page gets the publisher's YouTube video, picture pages get a Play game, and every
exercise page can be written on and coloured in the reader.
"""
import json
import make_maths4 as m4

BOOK = 'stemford-english-5'
m4.BOOK = BOOK          # reuse the blank-paper button placement of Maths 4+ on this book's pages
ROOT = m4.ROOT

# Topic page (from the book's contents) -> the publisher's video for that topic.
VIDEOS = {
    4: ('Alphabet', 'JiRu-zpu2Co'), 5: ('Vowels and Consonants', 'UArYR2ztqjU'), 6: ('CVC Words', 'qCFDE_xeojA'),
    7: ('Sight Words', '1ecmbUhlrG4'), 8: ('Short Sound a', 'QIbnn7HI4GE'), 10: ('Short Sound e', 'NlVG3OvL86s'),
    12: ('Short Sound i', 'NqKVoRRDGJM'), 14: ('Short Sound o', 'NXO8AHdUAXM'), 16: ('Short Sound u', 'eI9GzRWp6oo'),
    20: ('Long Sound a', 'tHnlugU5tFg'), 22: ('Long Sound e', 'MZjOw_ItglA'), 24: ('Long Sound i', 'gCNBTNgZi8s'),
    26: ('Long Sound o', 'VBbK7wkM40o'), 28: ('Long Sound u', 'HRf-uURP3t8'), 30: ('Blending', 'qEg3vG-iKMQ'),
    33: ('Digraphs', 'aI_vkOaYlRs'), 35: ('Trigraphs', 'yvGhxCLhnkQ'), 37: ('Double Consonants', 'cv4SPERLfA8'),
    38: ('Magic e Rule', 'M1aLjkf4hy0'), 40: ('Two Vowels Together Rule', '4TaMzocRf5Y'), 41: ('Silent Letters', 'wAE83oWmAnE'),
    42: ("Use of 'a' and 'an'", 'YzW_P64sa58'), 44: ('Naming Words', '-5a6sZHJdh0'),
    48: ("Use of 'This is a/an' and 'That is a/an'", 'BU2EUicNajo'), 50: ("Use of 'These are' and 'Those are'", 'bmi9xQXq0ck'),
    52: ("Use of 'It' and 'Its'", '5Ca72kVImxs'), 53: ("Use of 'I' and 'My'", 'cZQlv0-8hgE'),
    54: ("Use of 'He/His' and 'She/Her'", '8n25Pg77MAw'),
    # 56 They/Their and We/Our: the supplied link is the same video as 'These are / Those are' (page 50), so it waits for its own link
    63: ("Use of 'Where' and 'When'", '7Q3KgjMRwrc'), 64: ("Use of 'Yes' and 'No'", 'Xx2I9LF5DF0'),
    65: ('Opposite Words', 'bS3hf5M0P6g'), 67: ('Position Words', 'mXWc501-6vc'), 68: ('Sentence', 'YusfUPebRS8'),
    73: ('Story Time', '0uOV35lGOX0'),
}
FIRST_PAGE = 4   # pages 1-3 are the credits, contents and about-the-book pages

def row(names, y, h, x0=5, x1=95):
    """Equal picture cells across a row, each with its printed word underneath."""
    w = (x1 - x0) / len(names)
    return [(n, x0 + i * w + .5, y, w - 1, h) for i, n in enumerate(names)]

def box(name, cx, cy, w, h):
    return [(name, cx - w / 2, cy - h / 2, w, h)]

# Tap-the-picture games, from the pictures and words printed on each page (positions in % of the page).
GAMES = {
    6: ('Find the CVC words', row(['cat', 'hen', 'pin', 'dog', 'bun'], 36, 17) + row(['fan', 'mug', 'pup', 'fig'], 62, 23)),
    11: ('Find the short e words', row(['pen', 'veg', 'ten', 'red'], 14, 19) + row(['hen', 'pet', 'den', 'bed'], 37, 22)),
    20: ('Find the long a words', row(['rain', 'nail', 'tail', 'wait'], 21, 17) + row(['hay', 'day', 'tray', 'play'], 44, 17) + row(['snake', 'cake', 'tape', 'plate'], 66, 18)),
    22: ('Find the long e words', box('bee', 20, 29, 24, 16) + box('queen', 50, 28, 22, 18) + box('feet', 87, 30, 22, 14) + box('seed', 36, 47, 22, 13)
         + box('jeep', 67, 46, 24, 13) + box('eat', 18, 64, 26, 18) + box('pea', 50, 64, 22, 17) + box('meat', 84, 65, 26, 15) + box('leaf', 36, 80, 22, 16) + box('sea', 68, 80, 24, 15)),
    24: ('Find the long i words', row(['pie', 'tie', 'lie'], 22, 16) + row(['light', 'right', 'night'], 45, 16) + row(['bike', 'lime', 'time', 'dice'], 68, 16)),
    26: ('Find the long o words', row(['boat', 'soap', 'coat', 'road'], 22, 17) + row(['bow', 'pillow', 'yellow', 'window'], 45, 16) + row(['home', 'cone', 'rope', 'bone'], 68, 17)),
    28: ('Find the long u words', row(['blue', 'clue', 'true', 'glue'], 23, 17, 4, 98) + row(['new', 'chew', 'screw', 'dew'], 45, 17, 4, 98) + row(['cube', 'mule', 'tube', 'dune'], 68, 18, 4, 98)),
    30: ('Find the blends', row(['blanket', 'broom', 'clock', 'crab', 'dress'], 47, 19, 8, 92) + row(['frog', 'fly', 'globe', 'grass', 'play'], 69, 16, 8, 92)),
    31: ('Find the final blends', row(['insect', 'gift', 'wolf', 'milk', 'belt'], 9, 16, 7, 91) + row(['lamp', 'hand', 'ant', 'desk'], 27, 16, 5, 92)),
    34: ('Find the digraph words', row(['snail', 'tie', 'coat', 'toy'], 10.5, 17, 5, 96) + row(['jeep', 'house', 'book', 'moon'], 31, 17, 5, 96)),
    35: ('Find the trigraph words', row(['square', 'chair', 'bear', 'deer', 'right'], 35.5, 22, 8, 92)),
    42: ("Find 'a' and 'an' words", row(['a car', 'a hat', 'a parrot'], 39, 20, 2, 98) + row(['an igloo', 'an onion', 'an umbrella'], 62, 24, 2, 98)),
    43: ('Find the pictures', row(['apple', 'bat', 'cat', 'orange'], 15, 13, 3, 97) + row(['doll', 'umpire', 'balloon', 'ostrich'], 30, 14, 3, 97)
         + row(['tree', 'igloo', 'rabbit', 'iron'], 47, 14, 3, 97) + row(['owl', 'pen', 'chair', 'boat'], 63, 14, 3, 97) + row(['bed', 'eagle', 'boy', 'car'], 79, 14, 3, 97)),
    44: ('Find the naming words', row(['Ali', 'peacock', 'fan', 'Lahore'], 14.5, 22, 8, 95)),
    45: ('Find one and more than one', [(n, x, y, w, 8.5) for n, x, y, w in [('apple', 4, 58, 36), ('apples', 46, 58, 49), ('cap', 4, 67, 36), ('caps', 46, 67, 49), ('duck', 4, 75.5, 36), ('ducks', 46, 75.5, 49)]]),
    46: ('Find the boy and the girl', row(['boy', 'father', 'lion'], 17, 16, 4, 96) + row(['girl', 'mother', 'lioness'], 35, 17, 4, 96)),
    47: ('Find the action words', box('climb', 68, 20, 16, 14) + box('slide', 88, 31, 14, 12) + box('swim', 20, 37, 26, 14) + box('drink', 71, 40, 10, 10)
         + box('eat', 54, 45, 10, 12) + box('sit', 80, 47, 10, 9) + box('sleep', 53, 54, 18, 8) + box('walk', 13, 57, 14, 12) + box('skip', 38, 59, 14, 10)),
    48: ("Find 'this' and 'that'", row(['inkpot', 'iron', 'hen'], 18, 16) + row(['aeroplane', 'parrot'], 36, 15) + row(['hippo', 'vulture', 'X-ray'], 53, 16) + row(['helicopter', 'mountain'], 71, 16)),
    49: ('Find the pictures', row(['chick', 'ox', 'butterfly'], 15, 25, 2, 98) + row(['rat', 'alligator', 'sparrow'], 42, 25, 2, 98) + row(['quail', 'frying pan', 'dove'], 69, 24, 2, 98)),
    51: ("Find 'these' and 'those'", row(['turtles', 'rabbits'], 13, 20, 2, 98) + row(['ducks', 'monkeys'], 34, 21, 2, 98) + row(['oranges', 'penguins'], 56, 19, 2, 98) + row(['olives', 'peacocks'], 76, 17, 2, 98)),
    52: ("Find 'it' and 'its'", row(['parrot', 'banana', 'pigeon'], 16.5, 12.5, 2, 98) + row(['crow', 'orange', 'apple'], 32, 10, 2, 98) + row(['dog', 'flower', 'door'], 45, 11, 2, 98)),
    60: ('Find the describing words', box('a big elephant', 20, 33, 30, 22) + box('a brown cake', 48, 37, 22, 14) + box('a small bird', 72, 13, 20, 10) + box('a tall building', 86, 26, 22, 24)
         + box('a red car', 72, 41, 22, 9) + row(['boy', 'ant', 'tree'], 55, 19, 3, 97) + row(['apple', 'turtle', 'clown'], 76, 16, 3, 97)),
    61: ('Find the words', box('key', 19, 41, 20, 10) + box('chain', 39, 41, 20, 10) + box('sun', 19, 53, 20, 11) + box('flower', 39, 53, 20, 11)
         + box('rain', 19, 66, 20, 11) + box('bow', 39, 66, 20, 11) + box('butter', 19, 80, 20, 11) + box('fly', 39, 80, 20, 11)),
    67: ('Find the position words', row(['under', 'in', 'on'], 17, 29) + row(['on the bed', 'in the hat', 'in the hole'], 55, 31)),
}

def make_game(page, title, cells, taken):
    targets = [{'name': n, 'x': round(x, 1), 'y': round(y, 1), 'w': round(w, 1), 'h': round(h, 1), 'say': n + '.'} for n, x, y, w, h in cells]
    x0, y0 = max(0, min(t['x'] for t in targets) - 1), max(0, min(t['y'] for t in targets) - 1)
    x1, y1 = min(100, max(t['x'] + t['w'] for t in targets) + 1), min(100, max(t['y'] + t['h'] for t in targets) + 1)
    crop = {'x': round(x0, 1), 'y': round(y0, 1), 'w': round(x1 - x0, 1), 'h': round(y1 - y0, 1)}
    return {'type': 'game', 'title': title, 'button': m4.clear_spot(page, [crop[k] for k in 'xywh'], taken), 'crop': crop, 'targets': targets}

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
        if page in GAMES:
            # no button may sit on a picture the child taps in the game
            h, w = m4.cv2.imread(str(ROOT / f'books/{BOOK}/p{page:03}.jpg')).shape[:2]
            taken += [(int(x / 100 * w), int(y / 100 * h), int(bw / 100 * w), int(bh / 100 * h)) for _, x, y, bw, bh in GAMES[page][1]]
        if page in VIDEOS:
            title, vid = VIDEOS[page]
            # beside the topic heading at the top of the page, on blank paper
            entries.append({'type': 'videos', 'label': 'Lesson', 'icon': '▶️', 'title': title,
                            'button': m4.clear_spot(page, [0, 6.5, 62, 4], taken),
                            'videos': [{'title': title, 'src': 'https://youtu.be/' + vid}]})
        if page in GAMES:
            entries.append(make_game(page, *GAMES[page], taken))
        entries.append({'type': 'fill', 'title': 'Write and colour', 'colours': [palette['colours'][c] for c in names],
                        'steps': [{'say': 'Do the exercise on this page. Write your answers and colour the pictures.', 'marks': []}]})
        acts[page] = entries
    source = '// Generated by tools/make_english5.py: publisher videos, games and write-and-colour pages, no AI stories.\n'
    source += f"window.BOOK_ACTIVITIES = window.BOOK_ACTIVITIES || {{}};\nwindow.BOOK_ACTIVITIES['{BOOK}'] = " + json.dumps(acts, ensure_ascii=False, indent=1) + ';\n'
    (ROOT / 'books/activities-english5.js').write_text(source, encoding='utf-8')
    print(f'English 5+: {len(acts)} pages, {sum(len(v) for v in acts.values())} activities, {len(VIDEOS)} videos, {len(GAMES)} games.')

if __name__ == '__main__':
    main()
