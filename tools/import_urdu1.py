"""Import the supplied 120-page Stemford Urdu 1 PDF (Class 1) without changing other books.

Run from the repository root: python tools/import_urdu1.py [path/to/Stemford Urdu 1 Final.pdf]
The source PDF stays in its upload folder (books/class 1/); the reader uses the generated JPEGs.
Page 1 is the book's title page and serves as the cover. The printed QR codes link to
publisher pages that currently carry no videos, so no video links are invented here.
"""
import json
import sys
from pathlib import Path
import pymupdf
from import_pdf import cover_colours, PAGE_WIDTH, COVER_WIDTH

ROOT = Path(__file__).resolve().parents[1]
BOOK = 'stemford-urdu-1'


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else next((ROOT / 'books/class 1').glob('*Urdu 1*.pdf'))
    out = ROOT / 'books' / BOOK
    out.mkdir(exist_ok=True)
    with pymupdf.open(source) as doc:
        for index, page in enumerate(doc):
            zoom = PAGE_WIDTH / page.rect.width
            page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False).save(out / f'p{index+1:03d}.jpg', jpg_quality=82)
            if (index + 1) % 20 == 0:
                print(f'Imported {index+1}/{len(doc)} Urdu 1 pages', flush=True)
        first = doc[0]
        zoom = COVER_WIDTH / first.rect.width
        # the publisher's own front cover (cover.jpg, from "Urdu Book 1 Front.png") is kept; page 1 is the title page
        if not (out / 'cover.jpg').exists():
            first.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False).save(out / 'cover.jpg', jpg_quality=85)
        c1, c2 = cover_colours(first)
        meta = {'id': BOOK, 'title': 'Stemford Urdu 1', 'author': 'Javed Publishers',
                'dir': f'books/{BOOK}', 'pages': len(doc),
                'ratio': round(first.rect.width / first.rect.height, 4), 'c1': c1, 'c2': c2, 'rtl': True, 'frontCover': True}
    (out / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    library = ROOT / 'books/library.js'
    header, data = library.read_text(encoding='utf-8').split('window.PDF_BOOKS = ', 1)
    books = [book for book in json.loads(data.strip().removesuffix(';')) if book['id'] != BOOK]
    books.append(meta)
    library.write_text(header + 'window.PDF_BOOKS = ' + json.dumps(books, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8', newline='\n')
    print(f'Registered Stemford Urdu 1 ({meta["pages"]} pages, right-to-left).', flush=True)


if __name__ == '__main__':
    main()
