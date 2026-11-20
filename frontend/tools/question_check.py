"""Pictures for measuring and checking exercise questions (books/questions.js). Output: tmp/question-check/.

  python tools/question_check.py sheet BOOK P1 P2 ...      small pictures of pages, to find the exercise pages
  python tools/question_check.py grid BOOK PAGE [Y0 Y1]    a page with a % grid (x across, y down), to measure
  python tools/question_check.py overlay BOOK              every question of the book drawn on its page:
        crop (coloured frame), button (red block), match dots (orange, with id), choose options (green = correct,
        red = wrong), writing lines (blue), colour parts (yellow), hint (black star)
  python tools/question_check.py masks BOOK                every colour part's shape as the reader computes it
        (box less the paper round the outline). A shape that is empty or the whole box is printed as CHECK.

BOOK is a book id (e.g. stemford-maths-3). Open the pictures and look at them; do not trust numbers alone.
"""
import json
import subprocess
import sys
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tmp/question-check'

def page(book, p):
    im = cv2.imread(str(ROOT / f'books/{book}/p{int(p):03}.jpg'))
    if im is None:
        sys.exit(f'no page picture books/{book}/p{int(p):03}.jpg')
    return im

def questions(book):
    script = "global.window={};require('./books/questions.js');console.log(JSON.stringify(window.BOOK_QUESTIONS[process.argv[1]]||{}))"
    out = subprocess.run(['node', '-e', script, book], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    if out.returncode:
        sys.exit(out.stderr)
    return json.loads(out.stdout)

def save(name, im):
    OUT.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(OUT / name), im, [cv2.IMWRITE_JPEG_QUALITY, 82])
    print(OUT / name)

def sheet(book, pages):
    tiles = []
    for p in pages:
        im = cv2.resize(page(book, p), (300, 415))
        cv2.putText(im, str(p), (5, 30), 0, 1.1, (0, 0, 255), 3)
        tiles.append(im)
    while len(tiles) % 6:
        tiles.append(np.full((415, 300, 3), 255, np.uint8))
    for i in range(0, len(tiles), 6):
        save(f'sheet-{book}-{i // 6}.jpg', cv2.hconcat(tiles[i:i + 6]))

def grid(book, p, y0=0.0, y1=100.0, width=900):
    im = page(book, p)
    h, w = im.shape[:2]
    cut = im[int(y0 / 100 * h):int(y1 / 100 * h)]
    s = width / w
    cut = cv2.resize(cut, (width, int(cut.shape[0] * s)))
    for k in range(0, 101):
        x = int(k / 100 * width)
        if k % 5 == 0:
            colour = (0, 0, 255) if k % 10 == 0 else (255, 170, 0)
            cv2.line(cut, (x, 0), (x, cut.shape[0]), colour, 1)
            if k % 10 == 0:
                cv2.putText(cut, str(k), (x + 2, 12), 0, .4, (0, 0, 255), 1)
    for k in range(int(y0), int(y1) + 1):
        if k % 5:
            continue
        y = int((k - y0) / 100 * h * s)
        colour = (0, 0, 255) if k % 10 == 0 else (255, 170, 0)
        cv2.line(cut, (0, y), (width, y), colour, 1)
        cv2.putText(cut, str(k), (2, max(10, y - 2)), 0, .4, (0, 0, 255), 1)
    save(f'grid-{book}-p{p}.jpg', cut)

def overlay(book):
    qs = questions(book)
    tiles = []
    for p, items in qs.items():
        im = page(book, p)
        h, w = im.shape[:2]
        P = lambda x, y: (int(x / 100 * w), int(y / 100 * h))
        frames = [(255, 0, 0), (0, 140, 255), (200, 0, 200), (0, 160, 0)]
        for k, q in enumerate(items):
            c = q['crop']
            cv2.rectangle(im, P(c['x'], c['y']), P(c['x'] + c['w'], c['y'] + c['h']), frames[k % 4], 4)
            b = q['button']
            cv2.rectangle(im, P(b['x'], b['y']), P(b['x'] + 17, b['y'] + 4.8), (0, 0, 255), -1)
            cv2.putText(im, q['kind'][:6], (P(b['x'], b['y'])[0] + 5, P(b['x'], b['y'])[1] + 38), 0, 1.2, (255, 255, 255), 3)
            for d in q.get('dots', []):
                cv2.circle(im, P(d['x'], d['y']), 12, (0, 120, 255), -1)
                cv2.putText(im, str(d['id']).encode('ascii', 'replace').decode(), (P(d['x'], d['y'])[0] + 14, P(d['x'], d['y'])[1] + 8), 0, 1, (0, 0, 0), 2)
            for o in q.get('options', []):
                cv2.ellipse(im, P(o['x'] + o['w'] / 2, o['y'] + o['h'] / 2), (int(o['w'] / 200 * w), int(o['h'] / 200 * h)), 0, 0, 360,
                            (0, 200, 0) if o['correct'] else (0, 0, 255), 3)
            for r in q.get('lines', []):
                cv2.rectangle(im, P(r['x'], r['y']), P(r['x'] + r['w'], r['y'] + r['h']), (255, 150, 0), 3)
            for pt in q.get('parts', []):
                b2 = pt['box']
                cv2.rectangle(im, P(b2['x'], b2['y']), P(b2['x'] + b2['w'], b2['y'] + b2['h']), (0, 200, 255), 3)
            if 'hint' in q:
                cv2.drawMarker(im, P(q['hint']['x'], q['hint']['y']), (0, 0, 0), cv2.MARKER_STAR, 40, 4)
        t = cv2.resize(im, (420, int(420 * h / w)))
        cv2.putText(t, 'p' + p, (330, t.shape[0] - 12), 0, 1, (0, 0, 255), 3)
        tiles.append(t)
    if not tiles:
        sys.exit(f'no questions for {book}')
    while len(tiles) % 5:
        tiles.append(np.full_like(tiles[0], 255))
    for i in range(0, len(tiles), 5):
        save(f'overlay-{book}-{i // 5}.jpg', cv2.hconcat(tiles[i:i + 5]))

def masks(book):
    tiles = []
    for p, items in questions(book).items():
        im = page(book, p)
        h, w = im.shape[:2]
        for q in items:
            for i, pt in enumerate(q.get('parts', [])):
                b = pt['box']
                x0, y0 = int(b['x'] / 100 * w), int(b['y'] / 100 * h)
                x1, y1 = int(np.ceil((b['x'] + b['w']) / 100 * w)), int(np.ceil((b['y'] + b['h']) / 100 * h))
                sub = im[y0:y1 + 1, x0:x1 + 1]
                # the same as app.js: dark lines thickened by 2 pixels, the paper reached from the box edge is outside
                wall = cv2.dilate((sub.min(axis=2) <= 200).astype(np.uint8), np.ones((5, 5), np.uint8))
                _, lab = cv2.connectedComponents((1 - wall).astype(np.uint8), connectivity=4)
                border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
                inside = ~np.isin(lab, list(border))
                share = inside.mean()
                flag = '' if .08 < share < .92 else '   <-- CHECK: empty (open outline / box too small) or the whole box'
                print(f'p{p} {pt["part"]}: inside {share:.2f}{flag}')
                vis = sub.copy()
                vis[inside] = (vis[inside] * .4 + np.array([0, 0, 255]) * .6).astype(np.uint8)
                t = cv2.resize(vis, (200, max(1, int(200 * vis.shape[0] / vis.shape[1]))))[:185]
                pad = np.full((200, 200, 3), 255, np.uint8)
                pad[:t.shape[0]] = t
                cv2.putText(pad, f'p{p} part {i}', (2, 197), 0, .4, (0, 0, 0), 1)
                tiles.append(pad)
    if not tiles:
        sys.exit(f'no colour parts for {book}')
    while len(tiles) % 6:
        tiles.append(np.full((200, 200, 3), 255, np.uint8))
    save(f'masks-{book}.jpg', cv2.vconcat([cv2.hconcat(tiles[i:i + 6]) for i in range(0, len(tiles), 6)]))

if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    cmd, book = sys.argv[1], sys.argv[2]
    if cmd == 'sheet':
        sheet(book, sys.argv[3:])
    elif cmd == 'grid':
        grid(book, sys.argv[3], *(float(v) for v in sys.argv[4:6]))
    elif cmd == 'overlay':
        overlay(book)
    elif cmd == 'masks':
        masks(book)
    else:
        sys.exit(__doc__)
