"""Find the dotted trace letters on English 3+ trace pages: two big ones and two rows of small ones.

Prints boxes as [x, y, w, h] in % of the page, used for the "Show me how" pencil.
"""
import json
import sys

import cv2
import numpy as np

# (top, bottom, left, right) in % of the page, and the number of letters expected in each band
# the first small row stops before the picture, which reaches down beside it on some pages
BANDS = [(25.5, 39.5, 5, 44, 2), (42.5, 52.5, 5, 56, 3), (54, 64.5, 5, 95, 5)]


def glyphs(path):
    im = cv2.imread(path)
    h, w = im.shape[:2]
    b, g, r = [im[:, :, k].astype(int) for k in range(3)]
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    # dark dots and outlines, but not the red/pink guide marks and start dots
    dark = (gray < 140) & ~((r > 140) & (r - g > 50))
    out = []
    for top, bot, left, right, n in BANDS:
        y0, y1, x0, x1 = int(h * top / 100), int(h * bot / 100), int(w * left / 100), int(w * right / 100)
        m = dark[y0:y1, x0:x1].astype(np.uint8) * 255
        m = cv2.dilate(m, np.ones((int(h * .012), int(w * .008)), np.uint8))
        cnt, _, stats, _ = cv2.connectedComponentsWithStats(m)
        boxes = [s for s in stats[1:] if s[3] > h * .025 and s[2] > w * .012]
        boxes.sort(key=lambda s: -s[4])
        boxes = sorted(boxes[:n], key=lambda s: s[0])
        pad_x, pad_y = w * .004, h * .006   # undo the dilation
        out.append([[round((x0 + s[0] + pad_x) / w * 100, 1), round((y0 + s[1] + pad_y) / h * 100, 1),
                     round((s[2] - 2 * pad_x) / w * 100, 1), round((s[3] - 2 * pad_y) / h * 100, 1)] for s in boxes])
    return out


if __name__ == '__main__':
    res = {p: glyphs('books/new-stemford-english-3/p%03d.jpg' % int(p)) for p in sys.argv[1:]}
    print(json.dumps(res))
