"""Reviewed page palettes shared by every activity generator.

Page keys are image/activity numbers (p006.jpg), not the printed page labels.
"""
import json
from pathlib import Path

_DATA = json.loads((Path(__file__).resolve().parents[1] / 'books' / 'colour-palettes.json').read_text(encoding='utf-8'))


def page_colours(book, page):
    entry = _DATA['books'][book][str(page)]
    return [_DATA['colours'][name] for name in entry['colours']]
