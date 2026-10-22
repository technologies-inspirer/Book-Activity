"""Build the activities for Maxford Global Qaida 3+ English, letters a to z. Writes books/activities-maxford.js.

On each "Sound" page: a "Learn" animation that reads the book's own phonic poem, and a find-the-picture game
(or the publisher's own videos, once they are put in videos/maxford-qaida-3/ named like "Story of Letter a.mp4").
On each "Trace and say the sound" page: "Show me how", where the pencil writes the two big letters and the three
rows of dotted letters, then colours the sketch at the bottom.

    python tools/make_maxford.py
"""
import json
import os

import cv2
import numpy as np

from ink import PAD, make_ink
from make_english3 import HOW

BOOK = 'maxford-global-qaida-3-english'
VIDEO_DIR = 'videos/maxford-qaida-3/'

LETTER_PAGE = dict(zip('abcdefghijklmnopqrstuvwxyz',
                       [11, 15, 19, 23, 31, 35, 39, 43, 49, 53, 57, 61, 69, 73, 77, 81, 87, 91, 95, 99, 107, 111, 115,
                        119, 125, 129]))

# The phonic poem printed on each Sound page: the three words with their lines, then the closing line.
POEM = {
    'a': [('apple', 'red and bright'), ('ant', 'so small and light'), ('alligator', 'big and wide'), 'is the sound we say with pride!'],
    'b': [('banana', 'yellow and sweet'), ('ball', 'bouncing at your feet'), ('bear', 'furry and strong'), 'is the sound we say all day long!'],
    'c': [('car', 'drives down the street'), ('cap', 'looks nice and neat'), ('cat', 'soft and small'), 'is the sound we hear in them all!'],
    'd': [('dog', 'runs with the deer'), ('duck', 'swims very near'), ('deer', 'runs by the tree'), 'is the sound, say it with me!'],
    'e': [('envelope', 'ready to send'), ('egg', 'a tasty friend'), ('elephant', 'big and strong'), 'is the sound that sings along!'],
    'f': [('fan', 'goes round and round'), ('frog', 'jumps on the ground'), ('fish', 'swims in the sea'), 'is the sound, say it with me!'],
    'g': [('grapes', 'juicy and sweet'), ('goat', 'with little feet'), ('guava', 'fresh and round'), 'is the sound that we have found!'],
    'h': [('hen', 'pecks on the ground'), ('hat', 'brown and round'), ('house', 'cosy and small'), 'is the sound we hear in them all!'],
    'i': [('inkpot', 'blue and round'), ('insect', 'crawls on the ground'), ('igloo', 'snowy and white'), 'is the sound we say just right!'],
    'j': [('jar', 'with jam inside'), ('jug', 'is by its side'), ('jet', 'flies far away'), 'is the sound we love to say!'],
    'k': [('kitten', 'soft and small'), ('key', 'hangs on the wall'), ('kettle', 'shiny and bright'), 'is the sound we say just right!'],
    'l': [('lion', 'loud and strong'), ('leaf', 'floats along'), ('lemon', 'yellow and bright'), 'is the sound we say just right!'],
    'm': [('monkey', 'jumps with cheer'), ('map', 'shows the way clear'), ('mango', 'yellow and sweet'), 'is the sound we love to repeat!'],
    'n': [('newspaper', 'nice and neat'), ('nuts', 'a crunchy treat'), ('nest', 'up in the tree'), 'is the sound, say it with me!'],
    'o': [('orange', 'juicy and sweet'), ('octopus', 'eight arms so neat'), ('ostrich', 'running to see'), 'is the sound, say it with me!'],
    'p': [('parrot', 'up in the tree'), ('peacock', 'pretty to see'), ('pear', 'juicy and sweet'), 'is the sound we love to repeat!'],
    'q': [('quill', 'soft and light'), ('quilt', 'warm and bright'), ('quail', 'quiet and small'), 'is the sound we hear in them all!'],
    'r': [('racket', 'ready to play'), ('rabbit', 'hops all day'), ('ring', 'shiny and bright'), 'is the sound we say just right!'],
    's': [('snake', 'slides on the ground'), ('sun', 'shines all around'), ('sunflower', 'tall and bright'), 'is the sound we say just right!'],
    't': [('tiger', 'under the tree'), ('turtle', 'slow as can be'), ('tomato', 'red and round'), 'is the sound we have found!'],
    'u': [('umpire', 'ready to play'), ('umbrella', 'keeps rain away'), ('urn', 'pretty and small'), 'The umpire holds an umbrella, standing tall!'],
    'v': [('van', 'moving fast'), ('valley', 'wide and vast'), ('vest', 'fits just right'), 'The van moves through the valley, a lovely sight!'],
    'w': [('watch', 'tells the time'), ('well', 'looks just fine'), ('wood', 'on the ground'), 'is the sound we have found!'],
    'x': [('xylophone', 'plays a song'), ('Christmas tree', 'tall and strong'), ('X-ray', 'bones we see'), 'is the sound, say it with me!'],
    'y': [('yarn', 'soft and long'), ('yo-yo', 'goes up and down'), ('yak', 'big and strong'), 'is the sound we hear all around!'],
    'z': [('zebra', 'black and white'), ('zip', 'close it tight'), ('zoo', 'where animals stay'), 'The zebra at the zoo is out to play!'],
}

# How the voice says each letter's sound (it reads "/a/" as the letter's name otherwise).
SOUND = dict(a='ah', b='buh', c='kuh', d='duh', e='eh', f='fff', g='guh', h='huh', i='ih', j='juh', k='kuh', l='lll',
             m='mmm', n='nnn', o='o', p='puh', q='kwuh', r='rrr', s='sss', t='tuh', u='uh', v='vvv', w='wuh', x='ks',
             y='yuh', z='zzz')

# the sketch to colour at the bottom of each trace page: name, colour word, colour
COLOUR = {
    'a': ('apple', 'red', '#e63946'), 'c': ('cap', 'blue', '#4aa3df'), 'd': ('duck', 'yellow', '#f9c74f'),
    'e': ('elephant', 'grey', '#9aa5b1'), 'g': ('grapes', 'green', '#7bc043'), 'i': ('igloo', 'blue', '#90e0ef'),
    'j': ('jug', 'blue', '#4aa3df'), 'k': ('kangaroo', 'brown', '#c68642'), 'l': ('leaf', 'green', '#43aa8b'),
    'm': ('monkey', 'brown', '#a0522d'), 'n': ('nest', 'brown', '#b07d48'), 'o': ('orange', 'orange', '#ff9f1c'),
    'p': ('parrot', 'green', '#43aa8b'), 'q': ('quail', 'brown', '#b5835a'), 'r': ('rabbit', 'light brown', '#d4a373'),
    's': ('snake', 'green', '#90be6d'), 't': ('turtle', 'green', '#52b788'), 'u': ('umbrella', 'red', '#e63946'),
    'v': ('vase', 'orange', '#f4a261'), 'w': ('window', 'blue', '#a2d2ff'), 'x': ('xylophone', 'orange', '#f4a261'),
}

# The colours each trace page's sketch needs: only these show in "Colour & write". A letter that is not listed
# (the book says "use different colours", or there is nothing to colour) keeps the usual choice.
INK_COLOURS = {'red': '#e63946', 'green': '#43aa8b', 'brown': '#8d5524', 'light brown': '#d4a373', 'yellow': '#f9c74f',
               'orange': '#f4a261', 'grey': '#9aa5b1', 'blue': '#4aa3df', 'light blue': '#90e0ef', 'pink': '#ff8fab',
               'black': '#222222'}
PALETTE = {
    'a': ['red', 'green'], 'd': ['yellow', 'orange'], 'e': ['grey'], 'g': ['green', 'brown'], 'i': ['light blue'],
    'j': ['blue'], 'k': ['brown'], 'l': ['green'], 'm': ['brown', 'light brown'], 'n': ['brown', 'green'],
    'o': ['orange', 'green'], 'p': ['green', 'red'], 'q': ['brown'], 'r': ['light brown', 'pink'], 's': ['green'],
    't': ['green', 'brown'], 'v': ['orange', 'pink'], 'w': ['blue'], 'y': ['blue', 'red', 'yellow'], 'z': ['black'],
}

# where the three "as in" pictures sit on a Sound page (x from, x to), and the game's view of them
THIRDS = [(4, 33), (34, 60), (61, 98)]
LESSON_VIDEOS = [('Story', 'Story of Letter {L}.mp4'), ('Phonic Poem', 'Letter {L} Phonic Poem.mp4'),
                 ('Vocabulary', 'Letter {L} Vocabulary.mp4')]
# each video gets its own button, stacked at the top left of the big picture: icon and top (%)
VIDEO_BUTTONS = {'Story': ('📖', 20), 'Phonic Poem': ('🎵', 25), 'Vocabulary': ('🔤', 30)}


def page_img(p):
    return cv2.imread('books/%s/p%03d.jpg' % (BOOK, p))


def pct_box(x0, y0, x1, y1, W, H):
    return [round(x0 / W * 100, 2), round(y0 / H * 100, 2), round((x1 - x0) / W * 100, 2), round((y1 - y0) / H * 100, 2)]


def big_letter(im, xa, xb, ya=11, yb=25.8):
    """The hollow letter drawn in colour inside the given part of the page (in %)."""
    H, W = im.shape[:2]
    x0, x1, y0, y1 = int(W * xa / 100), int(W * xb / 100), int(H * ya / 100), int(H * yb / 100)
    m = (im[y0:y1, x0:x1].min(axis=2) < 200).astype(np.uint8)
    m[m.mean(axis=1) > .6] = 0                                   # a guide line running across
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = [i for i in range(1, n) if st[i][4] > 40]
    ys, xs = np.nonzero(np.isin(lab, keep))
    return pct_box(x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1, W, H)


def dotted_row(im, ya, yb, n=5):
    """The n dotted letters in one writing row, left to right."""
    H, W = im.shape[:2]
    y0, y1, x0, x1 = int(H * ya / 100), int(H * yb / 100), int(W * .06), int(W * .95)
    crop = im[y0:y1, x0:x1]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    spread = crop.max(axis=2).astype(int) - crop.min(axis=2)
    dark = (gray < 170) & (spread < 70)
    cols = np.nonzero(dark.sum(axis=0))[0]
    groups, start, prev = [], cols[0], cols[0]
    for c in cols[1:]:
        if c - prev > W * .02:
            groups.append((start, prev)); start = c
        prev = c
    groups.append((start, prev))
    groups = sorted(sorted(groups, key=lambda g: -dark[:, g[0]:g[1] + 1].sum())[:n])
    out = []
    for a, b in groups:
        rows = dark[:, a:b + 1].sum(axis=1)
        ys = np.nonzero(rows)[0]
        # keep the letter itself: the longest stretch of rows with ink, not a stray mark above or below it
        runs, s, pv = [], ys[0], ys[0]
        for v in ys[1:]:
            if v - pv > H * .022:
                runs.append((s, pv)); s = v
            pv = v
        runs.append((s, pv))
        top, bot = max(runs, key=lambda r: rows[r[0]:r[1] + 1].sum())
        out.append(pct_box(x0 + a, y0 + top, x0 + b + 1, y0 + bot + 1, W, H))
    return out


def find_same(im, box, xa, xb, ya=11, yb=25.8):
    """Where the letter in box appears again inside the given part of the page (the second big letter)."""
    H, W = im.shape[:2]
    x, y, w, h = box
    tpl = (im[int(y / 100 * H):int((y + h) / 100 * H), int(x / 100 * W):int((x + w) / 100 * W)].min(axis=2) < 200).astype(np.float32)
    reg = (im[int(ya / 100 * H):int(yb / 100 * H), int(xa / 100 * W):int(xb / 100 * W)].min(axis=2) < 200).astype(np.float32)
    res = cv2.matchTemplate(reg, tpl, cv2.TM_CCORR_NORMED)
    _, _, _, (mx, my) = cv2.minMaxLoc(res)
    return [round(xa + mx / W * 100, 2), round(ya + my / H * 100, 2), w, h]


def fill_ink(page, box):
    """The inside of a hollow letter, as pink ink (same layout as tools/ink.py: the box plus a 25% margin)."""
    im = page_img(page)
    H, W = im.shape[:2]
    x, y, w, h = box
    px, py = w * PAD, h * PAD
    bx = [round(x - px, 2), round(y - py, 2), round(w + 2 * px, 2), round(h + 2 * py, 2)]
    X0, Y0 = int(bx[0] / 100 * W), int(bx[1] / 100 * H)
    X1, Y1 = int((bx[0] + bx[2]) / 100 * W), int((bx[1] + bx[3]) / 100 * H)
    crop = im[Y0:Y1, X0:X1]
    # only the letter's own box (plus a hair) counts, so labels and icons nearby are left out
    lx0, ly0 = int((x - .6) / 100 * W) - X0, int((y - .6) / 100 * H) - Y0
    lx1, ly1 = int((x + w + .6) / 100 * W) - X0, int((y + h + .6) / 100 * H) - Y0
    area = np.zeros(crop.shape[:2], bool)
    area[max(0, ly0):ly1, max(0, lx0):lx1] = True
    line = (crop.min(axis=2) < 215) & area
    line = cv2.morphologyEx(line.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)).astype(bool)
    white = ~line
    white[~area] = True
    n, lab = cv2.connectedComponents(white.astype(np.uint8))
    # depth = how many outlines lie between a white patch and the outside: odd depth is inside the letter
    depth = {lab[0, 0]: 0}
    k = max(7, int(W * .006))          # just wide enough to step over the outline, not over a thin stroke
    frontier = [lab[0, 0]]
    while frontier:
        nxt = []
        for c in frontier:
            near = cv2.dilate((lab == c).astype(np.uint8), np.ones((k, k), np.uint8)).astype(bool)
            for o in np.unique(lab[near & white]):
                if o not in depth:
                    depth[o] = depth[c] + 1
                    nxt.append(o)
        frontier = nxt
    inside = np.isin(lab, [c for c, d in depth.items() if d % 2 == 1])
    mask = (inside | line).astype(np.float32)
    mask = cv2.GaussianBlur(mask, (3, 3), 0)
    rgba = np.zeros(crop.shape[:2] + (4,), np.uint8)
    rgba[..., :3] = (0x6f, 0x2f, 0xd6)
    rgba[..., 3] = np.clip(mask * 255, 0, 255).astype(np.uint8)
    os.makedirs('books/%s/ink' % BOOK, exist_ok=True)
    name = 'books/%s/ink/p%03d_%d_%d.png' % (BOOK, page, round(x * 10), round(y * 10))
    cv2.imwrite(name, rgba)
    return name, bx


def sketch(im):
    """The outline drawing to colour at the bottom of a trace page, as an ellipse (cx, cy, rx, ry in %)."""
    H, W = im.shape[:2]
    x0, x1, y0, y1 = int(W * .4), int(W * .98), int(H * .61), int(H * .97)
    crop = im[y0:y1, x0:x1]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    spread = crop.max(axis=2).astype(int) - crop.min(axis=2)
    dark = ((gray < 120) & (spread < 60)).astype(np.uint8)
    dark = cv2.dilate(dark, np.ones((7, 7), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(dark)
    i = 1 + int(np.argmax(st[1:, 4]))
    sx, sy, sw, sh = st[i][:4]
    cx, cy = (x0 + sx + sw / 2) / W * 100, (y0 + sy + sh / 2) / H * 100
    return [round(cx, 1), round(cy, 1), round(sw / W * 100 * .36, 1), round(sh / H * 100 * .36, 1)]


def videos_for(L, names):
    return [{'title': t, 'src': VIDEO_DIR + n.format(L=L)} for t, n in names if os.path.exists(VIDEO_DIR + n.format(L=L))]


def say_sound(text, L):
    return text.replace('/%s/' % L, SOUND[L])


def letter_page(L, p):
    words = [w for w, _ in POEM[L][:3]]
    s = SOUND[L]
    end = POEM[L][3]
    end = end if end[0].isupper() else f'{s} {end}'
    vids = videos_for(L, LESSON_VIDEOS)
    if vids:
        return [{'type': 'videos', 'label': v['title'], 'icon': VIDEO_BUTTONS[v['title']][0], 'title': v['title'] + ' of letter ' + L,
                 'button': {'x': 45, 'y': VIDEO_BUTTONS[v['title']][1]}, 'videos': [v]} for v in vids] + [game_for(L, words)]
    learn = {
        'type': 'story', 'label': 'Learn ' + L, 'icon': '🔤', 'title': 'The letter ' + L, 'button': {'x': 4, 'y': 34},
        'scenes': [
            {'page': p, 'from': {'cx': 23, 'cy': 25, 'w': 42}, 'to': {'cx': 23, 'cy': 25, 'w': 30},
             'text': f'This is the letter {L}. It makes the sound {s}. Say it with me. {s}, {s}, {s}!'},
            {'page': p, 'from': {'cx': 71, 'cy': 40, 'w': 62}, 'to': {'cx': 71, 'cy': 38, 'w': 46},
             'text': ' '.join(f'{s}, {s}, {w}, {d}.' for w, d in POEM[L][:3]) + ' ' + end},
        ] + [
            {'page': p, 'from': {'cx': (a + b) / 2, 'cy': 78, 'w': 38}, 'to': {'cx': (a + b) / 2, 'cy': 78, 'w': 30},
             'text': f'{s}, {s}, {w}. {w[0].upper() + w[1:]} begins with {s}.'}
            for (a, b), w in zip(THIRDS, words)
        ] + [
            {'page': p, 'from': {'cx': 50, 'cy': 78, 'w': 100}, 'to': {'cx': 50, 'cy': 76, 'w': 90},
             'text': f"{', '.join(words)}. They all begin with {s}. Say the sound together. {s}, {s}, {s}!"}
        ]}
    return [learn, game_for(L, words)]


def game_for(L, words):
    return {
        'type': 'game', 'title': f'Find the {L} words!', 'button': {'x': 30, 'y': 63},
        'crop': {'x': 2, 'y': 67, 'w': 96, 'h': 23},
        'targets': [{'name': w, 'x': a, 'y': 68, 'w': b - a, 'h': 21, 'say': f'{w[0].upper() + w[1:]} begins with {SOUND[L]}.'}
                    for (a, b), w in zip(THIRDS, words)]}


def trace_page(L, page):
    im = page_img(page)
    big1 = big_letter(im, 20.5, 42)
    # the second big letter has guide arrows and start dots on it; it is the same letter, so it is found by
    # matching the first one, and takes the first one's ink
    big2 = find_same(im, big1, 66, 99, 10, 27)
    rows = [dotted_row(im, a, b) for a, b in ((27.9, 38.2), (38.4, 50.3), (50.6, 61.6))]
    src1, ib1 = fill_ink(page, big1)
    ib2 = [round(big2[0] - big1[2] * PAD, 2), round(big2[1] - big1[3] * PAD, 2), ib1[2], ib1[3]]
    def marks(bs):
        out = []
        for b in bs:
            src, box = make_ink(BOOK, page, b)
            m = {'glyph': L, 'box': b}
            # letters printed too faint to cut out (like the small l) are simply drawn by the pencil
            if cv2.imread(src, cv2.IMREAD_UNCHANGED)[..., 3].mean() > 8:
                m['ink'] = {'src': src, 'box': box}
            else:
                os.remove(src)
            out.append(m)
        return out
    steps = [
        {'say': f'Let us write the letter {L}. {HOW[L]}', 'marks': [{'glyph': L, 'box': big1, 'ink': {'src': src1, 'box': ib1}}]},
        {'say': 'Again! ' + HOW[L], 'marks': [{'glyph': L, 'box': [big2[0], big2[1], big1[2], big1[3]], 'ink': {'src': src1, 'box': ib2}}]},
        {'say': 'Now trace the small letters.', 'marks': marks(rows[0])},
        {'say': 'Next line.', 'marks': marks(rows[1])},
        {'say': 'One more line. Good job!', 'marks': marks(rows[2])},
    ]
    if L in COLOUR:
        name, word, col = COLOUR[L]
        cx, cy, rx, ry = sketch(im)
        steps.append({'say': f'Now let us colour the {name}. Let us make it {word}! Well done! Now it is your turn.',
                      'marks': [{'scribble': col, 'cx': cx, 'cy': cy, 'rx': rx, 'ry': ry}]})
    else:
        steps[-1]['say'] = 'One more line. Well done! Now it is your turn.'
    act = {'type': 'fill', 'title': 'Trace and say the sound', 'steps': steps}
    if L in PALETTE:
        act['colours'] = [INK_COLOURS[c] for c in PALETTE[L]]
    how = videos_for(L, [('How to write ' + L, 'Letter {L} Formation.mp4')])
    if how:
        act['video'] = how[0]
    elif L in PARTS and videos_for(L, [('', PARTS_FILE)]):
        start, end = PARTS[L][0]
        act['video'] = {'title': 'How to write ' + L, 'src': part_src(L, start, end)}
    return act


# One video for the three pages after a Sound page ("Letter b Formation and Activities.mp4"): the part for each
# page, as (start, end) in seconds, found by looking through the video. end None = to the end of the video.
PARTS_FILE = 'Letter {L} Formation and Activities.mp4'
PARTS = {
    'b': [(0, 67), (67, 95), (95, None)],
}
# where the Watch button sits on the second and third page (x, y in %), and what the part shows
PART_PAGES = [('Trace, write and say {L}', (66, 22)), ('Activities for {L}', (72, 52.5))]


def part_src(L, start, end):
    return VIDEO_DIR + PARTS_FILE.format(L=L) + '#t=%g' % start + (',%g' % end if end else '')


def part_pages(L, p):
    """Watch buttons on the "Trace, write and say" page and the Activities page, each playing its own part."""
    if L not in PARTS or not videos_for(L, [('', PARTS_FILE)]):
        return {}
    out = {}
    for k, ((start, end), (title, (x, y))) in enumerate(zip(PARTS[L][1:], PART_PAGES)):
        t = title.format(L=L)
        out[p + 2 + k] = [{'type': 'videos', 'label': 'Watch', 'icon': '🎬', 'title': t, 'button': {'x': x, 'y': y},
                           'videos': [{'title': t, 'src': part_src(L, start, end)}]}]
    return out


if __name__ == '__main__':
    acts = {}
    for L, p in LETTER_PAGE.items():
        acts[p] = letter_page(L, p)
        acts[p + 1] = trace_page(L, p + 1)
        acts.update(part_pages(L, p))
        print(L, end=' ', flush=True)
    print()
    with open('books/activities-maxford.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write('// Generated by tools/make_maxford.py: letters a to z of Maxford Global Qaida 3+ English.\n')
        f.write("window.BOOK_ACTIVITIES['%s'] = " % BOOK)
        f.write(json.dumps(acts, indent=1, ensure_ascii=False))
        f.write(';\n')
    print(len(acts), 'pages')
