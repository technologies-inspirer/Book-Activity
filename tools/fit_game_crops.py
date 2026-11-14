"""Move each game's crop edges off half-cut words and pictures.

A game shows only its crop of the page. When an edge of the crop runs through a printed line of
text or a picture, the child sees half a word (the "/a/ as in..." strip, an Urdu label, the next
exercise). For every edge that cuts through print, this finds the nearest clean line of the page,
either a little outside (to show the whole thing) or inside (to leave it out), and never inside a
picture the child has to tap. The result goes to books/game-crops.js, which the reader applies over
the generated activity files, so re-running a book's generator does not undo it.

Run from the repository root:  python tools/fit_game_crops.py
"""
import json
import subprocess
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
FILES = ['activities', 'activities-english3', 'activities-english4', 'activities-english5', 'activities-maths3', 'activities-maths4',
         'activities-urdu3', 'activities-urdu4', 'activities-computer0', 'activities-maxford', 'activities-urdu5']
OUTSIDE, INSIDE, MARGIN = 4.0, 40.0, 1.5     # how far (% of the page) an edge may move out, or in (never past the tapped pictures)

def cells(*rows):
    return [{'name': n, 'x': x, 'y': y, 'w': w, 'h': h, 'say': n + '.'} for n, x, y, w, h in rows]

# Games on crowded pages set by hand (% of the page, measured on a grid of the page): their crop could not be
# found from the page, and their tapped boxes were off the pictures, so the boxes are set here too.
TIGHT = {
    ('stemford-maths-4', 17): {'crop': {'x': 4, 'y': 8.3, 'w': 91, 'h': 26.7}, 'targets': cells(
        ('4 butterflies', 7, 9, 26, 17.5), ('5 spiders', 37, 17.5, 25, 16), ('3 ladybirds', 66, 9, 25, 17.5))},
    ('stemford-maths-4', 32): {'crop': {'x': 4, 'y': 11, 'w': 92, 'h': 38.5}, 'targets': cells(
        ('5 ladybirds', 5.5, 13, 34.5, 11.5), ('8 pencils', 60.5, 13, 34, 11.5), ('0 objects', 5.5, 25.3, 34.5, 11),
        ('2 bees', 60.5, 25.3, 34, 11), ('7 skittles', 5.5, 37.3, 34.5, 11.3), ('9 fish', 60.5, 37.3, 34, 11.3))},
    # the 'ten units make one ten' panel beside the last bead frame is not part of the game
    ('stemford-maths-4', 34): {'crop': {'x': 6, 'y': 11, 'w': 88, 'h': 81}, 'hide': [{'x': 30, 'y': 65.5, 'w': 66, 'h': 25}]},
    ('stemford-maths-4', 47): {'crop': {'x': 5, 'y': 10, 'w': 91, 'h': 77}, 'targets': cells(
        ('few fish', 12, 11, 35, 35), ('many fish', 49, 11, 37, 35), ('many ice creams', 49, 52.5, 45, 14), ('few objects', 50, 71.5, 44, 14))},
    ('stemford-english-4', 15): {'crop': {'x': 4, 'y': 7, 'w': 92, 'h': 40}, 'targets': cells(
        ('axe', 11, 7, 22, 8.5), ('bear', 11, 16, 22, 11.5), ('cup', 11, 28.5, 22, 7), ('alligator', 11, 35.5, 22, 9),
        ('dolphin', 40, 7.5, 24, 9), ('butterfly', 40, 17, 24, 9.5), ('cake', 40, 26.5, 24, 9), ('bus', 40, 35.5, 24, 9.5),
        ('cap', 69, 9.5, 22, 8), ('ant', 69, 18, 22, 8.5), ('balloon', 69, 26.5, 22, 9), ('cat', 69, 35.5, 22, 10))},
    ('stemford-english-4', 26): {'crop': {'x': 3, 'y': 6.8, 'w': 94, 'h': 33.2}, 'targets': cells(
        ('egg', 4, 6.8, 29, 15.2), ('grapes', 35, 6.8, 28, 15.2), ('hen', 65, 6.8, 29, 15.2),
        ('fish', 4, 23, 29, 16.5), ('fox', 35, 23, 28, 16.5), ('gift', 65, 23, 29, 16.5))},
}

def load():
    script = ("global.window={BOOK_ACTIVITIES:{}};for(const f of %s)require('./books/'+f+'.js');require('./books/library.js');"
              "const dirs={};for(const b of window.PDF_BOOKS)dirs[b.id]=b.dir;console.log(JSON.stringify({dirs,acts:window.BOOK_ACTIVITIES}))") % json.dumps(FILES)
    out = subprocess.run(['node', '-e', script], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', check=True).stdout
    return json.loads(out)

def busy(strip):
    """Share of pixels in a line that differ from the line's own background (print, not paper or a plain colour band)."""
    base = np.median(strip.reshape(-1, 3), axis=0)
    return float((np.abs(strip.astype(int) - base).sum(axis=-1) > 60).mean())

def fit_edge(im, crop, side, keep, margin=MARGIN):
    """Return the best position for one edge, in % of the page."""
    h, w = im.shape[:2]
    x0, y0, x1, y1 = crop['x'], crop['y'], crop['x'] + crop['w'], crop['y'] + crop['h']
    horizontal = side in ('top', 'bottom')
    edge = {'top': y0, 'bottom': y1, 'left': x0, 'right': x1}[side]
    outward = -1 if side in ('top', 'left') else 1
    def line(pos):
        if horizontal:
            r = int(np.clip(pos / 100 * h, 0, h - 1))
            return im[r:r + 1, int(x0 / 100 * w):max(int(x0 / 100 * w) + 1, int(x1 / 100 * w))]
        c = int(np.clip(pos / 100 * w, 0, w - 1))
        return im[int(y0 / 100 * h):max(int(y0 / 100 * h) + 1, int(y1 / 100 * h)), c:c + 1]
    if busy(line(edge)) < .004:
        return edge
    # First inward, up to INSIDE but never past the tapped pictures: the half-cut print is left out
    # (a stray line of the story above a game is not part of it). Only if there is no clean line
    # there, outward up to OUTSIDE, so the whole word or picture shows.
    for direction, limit in ((-outward, INSIDE), (outward, OUTSIDE)):
        for step in range(1, int(limit * 10) + 1):
            pos = round(edge + direction * step / 10, 2)
            if not 0 <= pos <= 100:
                break
            # a target box may be trimmed by up to MARGIN where nothing is printed (the band check below)
            if direction != outward and (pos > keep + margin if outward == -1 else pos < keep - margin):
                break
            # a clean band, not one lucky row between two lines of the same letters
            if max(busy(line(pos + k / 10)) for k in range(-2, 3)) < .004:
                return pos
        if side == 'top' and direction != outward and abs(keep - edge) <= INSIDE and busy(line(keep)) < busy(line(edge)):
            # no clean line above the pictures: the top of the tapped pictures themselves (they are boxed
            # around whole pictures) leaves a stray line of the page's story out. Not below: the words
            # that name the pictures are printed under them.
            return round(keep, 2)
    return edge

def main():
    data = load()
    fitted, changed = {}, 0
    for book, pages in data['acts'].items():
        folder = data['dirs'].get(book)
        if not folder:
            continue
        for page, acts in pages.items():
            acts = acts if isinstance(acts, list) else [acts]
            for i, game in enumerate(acts):
                if game.get('type') != 'game' or any('view' in t for t in game['targets']):
                    continue
                im = cv2.imread(str(ROOT / folder / f'p{int(page):03}.jpg'))
                if im is None:
                    continue
                t = game['targets']
                keep = {'top': min(v['y'] for v in t), 'bottom': max(v['y'] + v['h'] for v in t),
                        'left': min(v['x'] for v in t), 'right': max(v['x'] + v['w'] for v in t)}
                crop = dict(game['crop'])
                if (book, int(page)) in TIGHT:
                    fix = dict(TIGHT[(book, int(page))])
                    if 'targets' in fix:   # keep each picture's own spoken words
                        said = {v['name']: v.get('say') for v in game['targets']}
                        fix['targets'] = [{**v, 'say': said.get(v['name']) or v['say']} for v in fix['targets']]
                    fitted.setdefault(book, {}).setdefault(page, {})[i] = fix
                    changed += 1
                    continue
                for side in ('top', 'bottom', 'left', 'right'):
                    pos = fit_edge(im, crop, side, keep[side])
                    if side == 'top':
                        crop['h'] += crop['y'] - pos; crop['y'] = pos
                    elif side == 'bottom':
                        crop['h'] = pos - crop['y']
                    elif side == 'left':
                        crop['w'] += crop['x'] - pos; crop['x'] = pos
                    else:
                        crop['w'] = pos - crop['x']
                crop = {k: round(v, 2) for k, v in crop.items()}
                if crop != {k: round(v, 2) for k, v in game['crop'].items()}:
                    fitted.setdefault(book, {}).setdefault(page, {})[i] = {'crop': crop}
                    changed += 1
    source = '// Generated by tools/fit_game_crops.py: game crops moved off half-cut words and pictures, and hand-set fixes.\n'
    source += 'window.GAME_FIXES = ' + json.dumps(fitted, indent=1) + ';\n'
    (ROOT / 'books/game-crops.js').write_text(source, encoding='utf-8')
    print(f'{changed} game crops fitted')

if __name__ == '__main__':
    main()
