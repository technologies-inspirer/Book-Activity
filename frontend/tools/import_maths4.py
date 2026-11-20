"""Import the supplied 72-page Maths 4+ PDF without changing other books or QR links.

Run from the repository root: python tools/import_maths4.py
The source PDF stays in its upload folder; the reader uses the generated JPEGs.
"""
import json
from pathlib import Path
import pymupdf
from import_pdf import cover_colours, PAGE_WIDTH, COVER_WIDTH

ROOT = Path(__file__).resolve().parents[1]
BOOK = 'stemford-maths-4'

def main():
    source = next((ROOT / 'books/stemford-math-4').glob('*.pdf'))
    out = ROOT / 'books' / BOOK
    out.mkdir(exist_ok=True)
    with pymupdf.open(source) as doc:
        for index, page in enumerate(doc):
            zoom = PAGE_WIDTH / page.rect.width
            page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False).save(out / f'p{index+1:03d}.jpg', jpg_quality=82)
            if (index+1) % 16 == 0:
                print(f'Imported {index+1}/{len(doc)} Maths 4+ pages', flush=True)
        first = doc[0]
        zoom = COVER_WIDTH / first.rect.width
        first.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False).save(out / 'cover.jpg', jpg_quality=85)
        c1, c2 = cover_colours(first)
        meta = {'id': BOOK, 'title': 'Stemford Maths 4+', 'author': 'Javed Publishers',
                'dir': f'books/{BOOK}', 'pages': len(doc),
                'ratio': round(first.rect.width / first.rect.height, 4), 'c1': c1, 'c2': c2, 'rtl': False}
    (out / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    # The supplied PDF is raster-only: do not invent a text layer or video links.
    library = ROOT / 'books/library.js'
    original = library.read_text(encoding='utf-8')
    header, data = original.split('window.PDF_BOOKS = ', 1)
    books = json.loads(data.strip().removesuffix(';'))
    books = [book for book in books if book['id'] != BOOK]
    qr_file = out / 'qr.json'
    if qr_file.exists():
        meta['qr'] = {p: item for p, item in json.loads(qr_file.read_text(encoding='utf-8')).items() if item.get('videos')}
    books.append(meta)
    library.write_text(header + 'window.PDF_BOOKS = ' + json.dumps(books, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8', newline='\n')
    print('Registered Stemford Maths 4+ with left-to-right reading.', flush=True)

if __name__ == '__main__':
    main()
