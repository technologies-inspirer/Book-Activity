"""Import the supplied Stemford Maths 2 PDF (Class 2) without changing other books.

Run from the repository root:
    python tools/import_sst1.py "path/to/STEMFORD Maths Class 2 Final (2025) Curve.pdf"
The source PDF stays where it was supplied; the reader uses the generated JPEGs.
Page 1 is the book's title page; the reader opens on the publisher's front cover (cover.jpg).
"""
import json
import sys
from pathlib import Path
import pymupdf
from import_pdf import cover_colours, PAGE_WIDTH, COVER_WIDTH

ROOT = Path(__file__).resolve().parents[1]
BOOK = 'stemford-maths-2'


def main():
    source = Path(sys.argv[1])
    out = ROOT / 'books' / BOOK
    out.mkdir(exist_ok=True)
    with pymupdf.open(source) as doc:
        for index, page in enumerate(doc):
            zoom = PAGE_WIDTH / page.rect.width
            page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False).save(out / f'p{index+1:03d}.jpg', jpg_quality=82)
            if (index + 1) % 16 == 0:
                print(f'Imported {index+1}/{len(doc)} Maths 2 pages', flush=True)
        first = doc[0]
        zoom = COVER_WIDTH / first.rect.width
        # the publisher's own front cover (cover.jpg, from "Math Book 2 Front.png") is kept; page 1 is the title page
        if not (out / 'cover.jpg').exists():
            first.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False).save(out / 'cover.jpg', jpg_quality=85)
        c1, c2 = cover_colours(first)
        meta = {'id': BOOK, 'title': 'Stemford Maths 2', 'author': 'Javed Publishers',
                'dir': f'books/{BOOK}', 'pages': len(doc),
                'ratio': round(first.rect.width / first.rect.height, 4), 'c1': c1, 'c2': c2, 'frontCover': True}
    (out / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    library = ROOT / 'books/library.js'
    raw = library.read_bytes().decode('utf-8')
    crlf = '\r\n' in raw
    header, data = raw.replace('\r\n', '\n').split('window.PDF_BOOKS = ', 1)
    books = [book for book in json.loads(data.strip().removesuffix(';')) if book['id'] != BOOK]
    books.append(meta)
    text = header + 'window.PDF_BOOKS = ' + json.dumps(books, ensure_ascii=False, indent=1) + ';\n'
    library.write_bytes((text.replace('\n', '\r\n') if crlf else text).encode('utf-8'))
    print(f'Registered Stemford Maths 2 ({meta["pages"]} pages).', flush=True)


if __name__ == '__main__':
    main()
