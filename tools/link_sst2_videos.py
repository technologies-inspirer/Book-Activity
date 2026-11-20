"""Attach the Social Studies 2 (Class 2) QR videos: the "Watch this" button sits on each printed QR code.

Run from the repository root after tools/import_sst2.py:  python tools/link_sst2_videos.py
Videos come from books/social-studies2-videos.json: the YouTube videos shown on the publisher pages that the
printed QR codes open. No guessed links. The QR position is measured on each page image.
"""
import json
from pathlib import Path
from PIL import Image
from pyzbar.pyzbar import decode, ZBarSymbol

ROOT = Path(__file__).resolve().parents[1]
BOOK = 'stemford-social-studies-2'


def main():
    folder = ROOT / 'books' / BOOK
    supplied = {p: v for p, v in json.loads((ROOT / 'books/social-studies2-videos.json').read_text(encoding='utf-8')).items() if not p.startswith('_')}
    pages = json.loads((folder / 'meta.json').read_text(encoding='utf-8'))['pages']
    qr = {}
    for p in range(1, pages + 1):
        with Image.open(folder / f'p{p:03}.jpg') as im:
            scale, hits = 1, decode(im, symbols=[ZBarSymbol.QRCODE])
            if not hits:
                scale, hits = 2, decode(im.resize((im.width * 2, im.height * 2)), symbols=[ZBarSymbol.QRCODE])
            if not hits:
                continue
            r = hits[0].rect
            item = {'url': hits[0].data.decode(), 'box': [round(v, 2) for v in (r.left / scale / im.width * 100, r.top / scale / im.height * 100, r.width / scale / im.width * 100, r.height / scale / im.height * 100)]}
        found = supplied.get(str(p))
        if found and found['source'] == item['url'] and found['videos']:
            item['title'] = found['title']
            item['videos'] = [{'id': v['id'], 'title': v['title']} for v in found['videos']]
        qr[str(p)] = item
    (folder / 'qr.json').write_text(json.dumps(qr, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    library = ROOT / 'books/library.js'
    raw = library.read_bytes().decode('utf-8')
    crlf = '\r\n' in raw
    head, data = raw.replace('\r\n', '\n').split('window.PDF_BOOKS = ', 1)
    books = json.loads(data.strip().removesuffix(';'))
    next(b for b in books if b['id'] == BOOK)['qr'] = {p: item for p, item in qr.items() if item.get('videos')}
    text = head + 'window.PDF_BOOKS = ' + json.dumps(books, ensure_ascii=False, indent=1) + ';\n'
    library.write_bytes((text.replace('\n', '\r\n') if crlf else text).encode('utf-8'))
    print(f'Social Studies 2: {len(qr)} printed QR codes; {sum(bool(q.get("videos")) for q in qr.values())} with videos.')


if __name__ == '__main__':
    main()
