"""Cut the exact shape of a trace letter out of the page picture, as pink "ink" the pencil reveals.

Dotted letters on white paper: the dots are joined into one smooth line.
Hollow letters on a coloured band: the white inside of the letter is filled.

    python tools/ink.py <book-id> <page> <x> <y> <w> <h>     # prints the ink file path
"""
import os
import sys

import cv2
import numpy as np

INK = (0x6f, 0x2f, 0xd6)   # BGR of the pencil colour #d62f6f
PAD = .25                   # extra room around the box, as a share of its size


def make_ink(book, page, box):
    """box = [x, y, w, h] in % of the page. Returns (file path relative to the site, padded box)."""
    im = cv2.imread('books/%s/p%03d.jpg' % (book, page))
    H, W = im.shape[:2]
    x, y, w, h = box
    px, py = w * PAD, h * PAD
    bx = [round(x - px, 2), round(y - py, 2), round(w + 2 * px, 2), round(h + 2 * py, 2)]
    x0, y0 = int(bx[0] / 100 * W), int(bx[1] / 100 * H)
    x1, y1 = int((bx[0] + bx[2]) / 100 * W), int((bx[1] + bx[3]) / 100 * H)
    crop = im[y0:y1, x0:x1]
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    spread = crop.max(axis=2).astype(int) - crop.min(axis=2)
    dark = (gray < 170) & (spread < 70)                 # black/grey dots and outlines, not coloured lines

    inner = np.zeros(gray.shape, bool)
    iy0, iy1 = int(py / 100 * H), gray.shape[0] - int(py / 100 * H)
    ix0, ix1 = int(px / 100 * W), gray.shape[1] - int(px / 100 * W)
    inner[iy0:iy1, ix0:ix1] = True
    border = np.concatenate([crop[0], crop[-1], crop[:, 0], crop[:, -1]])
    on_band = np.median(border.min(axis=1)) < 215          # coloured band behind the letter

    unit = max(3, int(W * .006))
    if on_band:
        # hollow letter: its white inside plus its own outline and dashes
        white = (crop.min(axis=2) > 222)
        mask = (white | dark) & inner
        mask = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        n, lab, stats, _ = cv2.connectedComponentsWithStats(mask)
        keep = [i for i in range(1, n) if stats[i][4] > mask.size * .01]
        mask = np.isin(lab, keep).astype(np.uint8)
    else:
        # dotted letter: join the dots into a line
        mask = (dark & inner).astype(np.uint8)
        ell = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
        mask = cv2.erode(cv2.dilate(mask, ell(unit * 2 + 1)), ell(unit))
    mask = cv2.GaussianBlur(mask.astype(np.float32), (3, 3), 0)

    rgba = np.zeros(crop.shape[:2] + (4,), np.uint8)
    rgba[..., :3] = INK
    rgba[..., 3] = np.clip(mask * 255, 0, 255).astype(np.uint8)
    os.makedirs('books/%s/ink' % book, exist_ok=True)
    name = 'books/%s/ink/p%03d_%d_%d.png' % (book, page, round(x * 10), round(y * 10))
    cv2.imwrite(name, rgba)
    return name, bx


if __name__ == '__main__':
    b, p = sys.argv[1], int(sys.argv[2])
    print(make_ink(b, p, [float(v) for v in sys.argv[3:7]]))
