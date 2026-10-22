"""Build the activities for Stemford Maths 3+, numbers 0 to 20. Writes books/activities-maths3.js.

On each number's picture page: a "Learn" animation (the number, then the picture counted aloud), or the
publisher's own videos once they are put in videos/stemford-maths-3/<number>/ (story.mp4, vocabulary.mp4,
phonic poem.mp4). On each "Trace and write" page: "Show me how", where the pencil writes the big numbers and
the first two rows of dotted numbers, then the child does it; a formation video there if one is given.

    python tools/make_maths3.py
"""
import glob
import json
import os

import cv2
import numpy as np

from ink import PAD, make_ink
from make_maxford import fill_ink as _fill_ink
import make_maxford

BOOK = 'stemford-maths-3'
VIDEO_DIR = 'videos/stemford-maths-3/'

# number: (picture page, trace page, what the picture shows)
NUMBERS = {
    1: (6, 7, 'cat'), 2: (9, 10, 'giraffes'), 3: (12, 13, 'fish'), 4: (15, 16, 'monkeys'), 5: (20, 21, 'birds'),
    6: (24, 25, 'chicks'), 7: (28, 29, 'ducks'), 8: (31, 32, 'pears'), 9: (34, 35, 'apples'), 0: (40, 41, None),
    10: (42, 43, 'bees'), 11: (46, 47, 'eggs'), 12: (48, 49, 'socks'), 13: (50, 51, 'spoons'),
    14: (52, 53, 'umbrellas'), 15: (54, 55, 'tomatoes'), 16: (58, 59, 'cups'), 17: (60, 61, 'hot air balloons'),
    18: (62, 63, 'bananas'), 19: (64, 65, 'balls'), 20: (66, 67, 'pencils'),
}
WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
        'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
HOW = {
    '0': 'Start at the top and go round, all the way back to the top.',
    '1': 'Start at the top and go straight down.',
    '2': 'Go round the top, slide down, then go straight across.',
    '3': 'Go round to the middle, then round again.',
    '4': 'Go down, go across, then a long line down.',
    '5': 'Go across the top, down, then round like a big tummy.',
    '6': 'Come down round the side, and make a little circle.',
    '7': 'Go across the top, then slide down.',
    '8': 'Make an S, then come back up to the top.',
    '9': 'Make a little circle, then a line straight down.',
}

LESSON_VIDEOS = [('Story', ['story.mp4']), ('Phonic Poem', ['phonic poem.mp4', 'poem.mp4']),
                 ('Vocabulary', ['vocabulary.mp4'])]
VIDEO_BUTTONS = {'Story': ('📖', 18), 'Phonic Poem': ('🎵', 23), 'Vocabulary': ('🔤', 28)}


def page_img(p):
    return cv2.imread('books/%s/p%03d.jpg' % (BOOK, p))


def lines(mask, axis, share):
    """Positions where a grid line runs across: rows (axis=1) or columns (axis=0) mostly covered by the mask."""
    hits = np.nonzero(mask.mean(axis=axis) > share)[0]
    out = []
    for v in hits:
        if not out or v - out[-1][-1] > 3:
            out.append([v])
        else:
            out[-1].append(v)
    return [int(np.mean(g)) for g in out]


def grid(im):
    """The rows of the trace-and-write grid, each a list of cell boxes (x0, y0, x1, y1) in pixels."""
    H, W = im.shape[:2]
    ink = (im.min(axis=2) < 225) & (im.max(axis=2).astype(int) - im.min(axis=2) > 25)    # coloured grid lines
    ys = [y for y in lines(ink, 1, .6) if y > H * .12]
    rows = []
    for y0, y1 in zip(ys, ys[1:]):
        if y1 - y0 < H * .04:
            continue
        band = ink[y0 + 4:y1 - 4]
        xs = lines(band, 0, .95)
        cells = [(a, y0, b, y1) for a, b in zip(xs, xs[1:]) if b - a > W * .05]
        if cells:
            rows.append(cells)
    return rows


def digit_boxes(im, cell, n):
    """The boxes of the n digits drawn in one cell, as [x, y, w, h] in % of the page."""
    H, W = im.shape[:2]
    x0, y0, x1, y1 = cell
    m = int((x1 - x0) * .06)
    crop = im[y0 + m:y1 - m, x0 + m:x1 - m]
    b, g, r = [crop[..., k].astype(int) for k in range(3)]
    red_dot = (r > 150) & (r - g > 60) & (r - b > 40)
    mark = (crop.min(axis=2) < 200) & ~red_dot
    cols = np.nonzero(mark.sum(axis=0) > 1)[0]
    if not len(cols):
        return []
    groups, s, pv = [], cols[0], cols[0]
    for c in cols[1:]:
        if c - pv > W * .008:
            groups.append((s, pv)); s = c
        pv = c
    groups.append((s, pv))
    groups = sorted(sorted(groups, key=lambda g: -mark[:, g[0]:g[1] + 1].sum())[:n])
    out = []
    for a, bb in groups:
        ys = np.nonzero(mark[:, a:bb + 1].any(axis=1))[0]
        X0, X1, Y0, Y1 = x0 + m + a, x0 + m + bb + 1, y0 + m + ys.min(), y0 + m + ys.max() + 1
        out.append([round(X0 / W * 100, 2), round(Y0 / H * 100, 2), round((X1 - X0) / W * 100, 2), round((Y1 - Y0) / H * 100, 2)])
    return out


def fill_ink(page, box):
    make_maxford.BOOK = BOOK                  # reuse the hollow-letter filler on this book's pages
    return _fill_ink(page, box)


# The publisher's unlisted YouTube copies (same videos and lengths as the files), used before the files.
# Number 3's Formation keeps its own file: both links sent for it (8bZzeJSP2ZQ, 2mH3sS8yWrs) play other numbers
# (2 and 4), though the second is titled "Formation of Number 3".
YOUTUBE = {
    1: {'Story': 'bdWkFht01GQ', 'Formation': 'ylCwxgeAO_s'},
    2: {'Story': 'KaE4Tg0WES4', 'Formation': '8bZzeJSP2ZQ'},
    3: {'Story': 'ChqF6Y5LD-0', 'Vocabulary': 'Vm40lGrG6QY'},
    4: {'Story': 'MWLk36-Ssog', 'Vocabulary': '10g3Sr7riLo', 'Formation': 'R-niy_5dt6Y'},
}


def number_video(n, names):
    out = []
    for title, cands in names:
        if title in YOUTUBE.get(n, {}):
            out.append({'title': title, 'src': 'https://youtu.be/' + YOUTUBE[n][title]})
            continue
        for c in cands:
            path = '%s%d/%s' % (VIDEO_DIR, n, c)
            if os.path.exists(path):
                out.append({'title': title, 'src': path})
                break
    return out


# A "formation + activity" video covers the trace page and then the Activity Corner page after it. Found by
# looking through each video: (writing ends, activity starts) in seconds; in between are teacher's tips.
PARTS = {1: (50, 112), 2: (50, 50), 3: (40, 40), 4: (39, 39)}


def formation_file(n):
    if 'Formation' in YOUTUBE.get(n, {}):
        return 'https://youtu.be/' + YOUTUBE[n]['Formation']
    hits = sorted(glob.glob('%s%d/format*.mp4' % (VIDEO_DIR, n)))
    return hits[0].replace('\\', '/') if hits else None


def formation_video(n):
    f = formation_file(n)
    if not f:
        return None
    return {'title': 'How to write %d' % n, 'src': f + ('#t=0,%g' % PARTS[n][0] if n in PARTS else '')}


def activity_page(n, page):
    """A Watch button on the Activity Corner page that plays its part of the formation video."""
    f = formation_file(n)
    if not f or n not in PARTS:
        return None
    t = 'Activity Corner: number %d' % n
    return [{'type': 'videos', 'label': 'Watch', 'icon': '🎬', 'title': t, 'button': {'x': 38, 'y': 1.2},
             'videos': [{'title': t, 'src': f + '#t=%g' % PARTS[n][1]}]}]


def picture_page(n, p):
    w, thing = WORD[n], NUMBERS[n][2]
    vids = number_video(n, LESSON_VIDEOS)
    if vids:
        return [{'type': 'videos', 'label': v['title'], 'icon': VIDEO_BUTTONS[v['title']][0],
                 'title': '%s: number %d' % (v['title'], n), 'button': {'x': 30, 'y': VIDEO_BUTTONS[v['title']][1]},
                 'videos': [v]} for v in vids]
    if n == 0:
        count = 'Two birds were in the nest. Then one flew away, and the other flew away too. Now there are no birds. Zero means nothing!'
    elif n == 1:
        count = 'Look! One %s. Can you count it? One!' % thing
    else:
        count = 'Look at the %s. Let us count them. %s!' % (thing, ', '.join(str(k) for k in range(1, n + 1)))
    scenes = [
        {'page': p, 'from': {'cx': 18, 'cy': 17, 'w': 42}, 'to': {'cx': 18, 'cy': 17, 'w': 30},
         'text': 'This is the number %s. Say it with me. %s, %s, %s!' % (w, w, w, w)},
        {'page': p, 'from': {'cx': 60, 'cy': 50, 'w': 95}, 'to': {'cx': 60, 'cy': 48, 'w': 70}, 'text': count},
    ]
    if thing:
        scenes.append({'page': p, 'from': {'cx': 72, 'cy': 74, 'w': 60}, 'to': {'cx': 72, 'cy': 76, 'w': 40},
                       'text': '%s %s. The number %s!' % (w.capitalize(), thing, w)})
    scenes.append({'page': p + 1, 'from': {'cx': 50, 'cy': 45, 'w': 90}, 'to': {'cx': 50, 'cy': 45, 'w': 70},
                   'text': 'Now let us trace and write the number %s on the next page. Well done!' % w})
    return [{'type': 'story', 'label': 'Learn %d' % n, 'icon': '🔢', 'title': 'The number %s' % w,
             'button': {'x': 30, 'y': 18}, 'scenes': scenes}]


def trace_page(n, page):
    im = page_img(page)
    digits = str(n)
    rows = grid(im)
    if len(rows) < 3:
        raise SystemExit('page %d: grid not found (%d rows)' % (page, len(rows)))
    # most pages start with a row of four big hollow numbers; the zero page has only dotted rows
    big, row1, row2 = (rows[0], rows[1], rows[2]) if len(rows[0]) == 4 else ([], rows[0], rows[1])

    def write(cells, hollow):
        marks = []
        for cell in cells:
            for d, box in zip(digits, digit_boxes(im, cell, len(digits))):
                src, ib = fill_ink(page, box) if hollow else make_ink(BOOK, page, box)
                m = {'glyph': d, 'box': box}
                if cv2.imread(src, cv2.IMREAD_UNCHANGED)[..., 3].mean() > 8:
                    m['ink'] = {'src': src, 'box': ib}
                else:
                    os.remove(src)
                marks.append(m)
        return marks

    # Some big numbers have guide arrows and dots inside, which leave holes in their ink: every big number takes
    # the fullest ink found for that digit, moved to its own place.
    if big:
        bigs = [write([c], True) for c in big]
        for k in range(len(digits)):
            got = [b[k] for b in bigs if len(b) > k and 'ink' in b[k]]
            if not got:
                continue
            best = max(got, key=lambda m: cv2.imread(m['ink']['src'], cv2.IMREAD_UNCHANGED)[..., 3].mean())
            bw, bh = best['box'][2], best['box'][3]
            H, W = im.shape[:2]
            bx, by = best['box'][:2]
            tpl = (im[int(by / 100 * H):int((by + bh) / 100 * H), int(bx / 100 * W):int((bx + bw) / 100 * W)].min(axis=2) < 200).astype(np.float32)
            for cell, b in zip(big, bigs):
                if len(b) > k:
                    # where this digit really sits in its cell, found by matching the clean one (arrows ignored)
                    x0, y0, x1, y1 = cell
                    reg = (im[y0:y1, x0:x1].min(axis=2) < 200).astype(np.float32)
                    res = cv2.matchTemplate(reg, tpl, cv2.TM_CCORR_NORMED)
                    if len(digits) > 1:                 # keep to this digit's half of the cell
                        half = res.shape[1] // len(digits)
                        res[:, :k * half] = 0
                        res[:, (k + 1) * half + tpl.shape[1] // 2:] = 0
                    _, _, _, (mx, my) = cv2.minMaxLoc(res)
                    x, y = round((x0 + mx) / W * 100, 2), round((y0 + my) / H * 100, 2)
                    b[k]['box'] = [x, y, bw, bh]
                    b[k]['ink'] = {'src': best['ink']['src'],
                                   'box': [round(x - bw * PAD, 2), round(y - bh * PAD, 2)] + best['ink']['box'][2:]}
    how = ' '.join(HOW[d] for d in dict.fromkeys(digits))
    steps = [
        {'say': 'Let us write the number %s. %s' % (WORD[n], how), 'marks': bigs[0]},
        {'say': 'Again!', 'marks': [m for b in bigs[1:] for m in b]},
        {'say': 'Now trace the dotted numbers.', 'marks': write(row1, False)},
        {'say': 'One more line. Well done! Now it is your turn.', 'marks': write(row2, False)},
    ] if big else [
        {'say': 'Let us write the number %s. %s' % (WORD[n], how), 'marks': write(row1, False)},
        {'say': 'One more line. Well done! Now it is your turn.', 'marks': write(row2, False)},
    ]
    act = {'type': 'fill', 'title': 'Trace and write', 'steps': steps}
    vid = formation_video(n)
    if vid:
        act['video'] = vid
    return act


if __name__ == '__main__':
    acts = {}
    for n, (pic, trace, _) in NUMBERS.items():
        acts[pic] = picture_page(n, pic)
        acts[trace] = trace_page(n, trace)
        act = activity_page(n, trace + 1)
        if act:
            acts[trace + 1] = act
        print(n, end=' ', flush=True)
    print()
    with open('books/activities-maths3.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write('// Generated by tools/make_maths3.py: numbers 0 to 20 of Stemford Maths 3+.\n')
        f.write("window.BOOK_ACTIVITIES['%s'] = " % BOOK)
        f.write(json.dumps(acts, indent=1, ensure_ascii=False))
        f.write(';\n')
    print(len(acts), 'pages')
