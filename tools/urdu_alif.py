"""The written alif the Urdu books colour in when a child traces a dotted alif.

The printed dotted alif is a thin stick, so colouring its own dots gives a "|". Instead the publisher's
written alif is used: a pointed top, full in the middle, a slight curve and a slanted foot.
"""
import cv2
import numpy as np

# Outline points (u across, v down) in the letter's own box; its width is .14 of its height.
ALIF = [(.44, 0), (.28, .06), (.12, .11), (.04, .17), (0, .22), (.04, .28), (.08, .33), (.16, .39), (.2, .44),
        (.24, .5), (.28, .56), (.36, .61), (.4, .67), (.44, .72), (.48, .78), (.52, .83), (.52, .89), (.52, .94),
        (.52, 1), (.6, 1), (.72, .94), (.84, .89), (.92, .83), (.96, .78), (1, .72), (.96, .67), (.92, .61),
        (.88, .56), (.8, .5), (.76, .44), (.72, .39), (.68, .33), (.6, .28), (.56, .22), (.52, .17), (.52, .11),
        (.52, .06), (.48, 0)]
INK = (0x6f, 0x2f, 0xd6)   # BGR of the pencil colour, as tools/ink.py


def alif_ink(src, box, ratio):
    """Write the alif over the dotted stick in box ([x, y, w, h] in % of a page whose width / height is ratio)
    to the PNG at src. Returns (letter box, ink box): the ink box is the letter box plus 25% each side."""
    x, y, w, h = box
    lw = round(h * .14 / ratio, 2)                   # letter width, from its height (page pixels are not square)
    lb = [round(x + w / 2 - lw / 2, 2), y, lw, h]
    pb = [round(lb[0] - lw * .25, 2), round(y - h * .25, 2), round(lw * 1.5, 2), round(h * 1.5, 2)]
    H = 600
    W = max(8, round(H * pb[2] * ratio / pb[3]))
    mask = np.zeros((H, W), np.uint8)
    to_px = lambda u, v: (round((lb[0] + u * lw - pb[0]) / pb[2] * W), round((lb[1] + v * h - pb[1]) / pb[3] * H))
    cv2.fillPoly(mask, [np.array([to_px(u, v) for u, v in ALIF], np.int32)], 255, cv2.LINE_AA)
    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., :3] = INK
    rgba[..., 3] = mask
    cv2.imwrite(src, rgba)
    return lb, pb
