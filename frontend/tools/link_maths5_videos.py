"""Decode this edition's printed QR locations and attach the publisher-supplied role videos.

No landing-page requests or guessed YouTube links: maths5-videos.json is the supplied list.
"""
import json
from pathlib import Path
from PIL import Image
from pyzbar.pyzbar import decode, ZBarSymbol

ROOT = Path(__file__).resolve().parents[1]
BOOK = 'stemford-maths-5'


def main():
    folder = ROOT / 'books' / BOOK
    topics = json.loads((ROOT / 'books/maths5-videos.json').read_text(encoding='utf-8'))
    by_page = {p: topic for topic in topics.values() for p in topic['pages']}
    qr = {}
    for p in range(1, 81):
        with Image.open(folder / f'p{p:03}.jpg') as im:
            hits = decode(im, symbols=[ZBarSymbol.QRCODE])
            scale = 1
            if not hits:
                scale = 2
                hits = decode(im.resize((im.width * 2, im.height * 2)), symbols=[ZBarSymbol.QRCODE])
            if not hits:
                continue
            hit = hits[0]
            r = hit.rect
            item = {'url': hit.data.decode(), 'box': [round(r.left / scale / im.width * 100, 2), round(r.top / scale / im.height * 100, 2), round(r.width / scale / im.width * 100, 2), round(r.height / scale / im.height * 100, 2)]}
            if p in by_page:
                topic = by_page[p]
                item['title'] = topic['title']
                item['videos'] = [{'id': topic[role].rsplit('/', 1)[1], 'title': role} for role in ('Student', 'Teacher', 'Parents')]
            qr[str(p)] = item
    (folder / 'qr.json').write_text(json.dumps(qr, indent=1) + '\n', encoding='utf-8')
    library = ROOT / 'books/library.js'
    head, data = library.read_text(encoding='utf-8').split('window.PDF_BOOKS = ', 1)
    books = json.loads(data.strip().removesuffix(';'))
    next(b for b in books if b['id'] == BOOK)['qr'] = {p: item for p, item in qr.items() if item.get('videos')}
    library.write_text(head + 'window.PDF_BOOKS = ' + json.dumps(books, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8')
    print(f'Maths 5+: {len(qr)} printed QR codes; {sum(bool(q.get("videos")) for q in qr.values())} lesson QR buttons.')


if __name__ == '__main__':
    main()
