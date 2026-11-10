"""Materialize the page-by-page palette audit for the bundled PDF books.

No palette is inferred from logos, backgrounds or printed illustrations. Existing
reviewed drawing lessons are retained; additional colouring tasks are listed here.
Other pages have one black pencil for tracing, matching, answers and annotation.
Run from the repository root after importing books.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Image numbers, not the often different page numbers printed in the books.
EXTRA = {
    'new-stemford-english-3': {
        13: ('red blue orange green', 'Colour a–d and the apple; match and write letters'),
        25: ('red blue orange green brown', 'Colour e–h, the fish and the hat'),
        35: ('red blue orange green yellow', 'Colour i–l and the lemon with its leaf'),
        36: ('light_blue', 'Trace and colour the igloo using its printed blue outline'),
        47: ('red blue orange green', 'Colour m–p and the orange with its leaf'),
        57: ('red blue orange green', 'Colour q–t; colour the tomato red and its leaves green'),
        59: ('green red', 'Trace and colour the snake; green body and red mouth hint'),
        69: ('red blue orange green yellow purple brown', 'Colour u–x and the xylophone bars and wooden beaters'),
        75: ('red blue yellow', 'Colour y and z and the yacht using the preceding yacht example'),
    },
    'maxford-global-qaida-3-english': {
        7: ('red brown yellow blue', 'Trace lines and colour the outlined house'),
        8: ('grey blue', 'Trace lines and colour the well stones and roof'),
        9: ('orange', 'Trace the orange curved-line practice'),
        10: ('blue', 'Trace loops and curves on the blue practice page'),
        27: ('red green blue yellow', 'Colour apple, ball and cap using the nearby examples'),
        28: ('black', 'Colour the selected beginning-sound letters and circle pictures'),
        47: ('blue orange', 'Colour only the f pictures: envelope, fish and fan'),
        66: ('light_blue', 'Trace and colour the blue-outlined igloo'),
        86: ('black', 'Colour the selected beginning-sound letters and circle pictures'),
        103: ('green yellow', 'Colour only the s pictures: snake and sun'),
    },
    'stemford-maths-3': {
        21: ('pink green yellow orange blue teal', 'Colour five flowers and the teal number 5'),
        27: ('red', 'Trace and colour the circle red as instructed'),
        39: ('blue', 'Trace and colour the square blue as instructed'),
        56: ('yellow', 'Follow and colour numbers 1 to 15 using the yellow starting example'),
        57: ('yellow', 'Trace and colour the rectangle yellow as instructed'),
        69: ('green', 'Trace and colour the triangle green as instructed'),
    },
    'stemford-science-1': {
        13: ('black brown light_brown pink', 'Draw your own face and label its parts'),
        30: ('red green yellow orange brown light_brown black', 'Draw your breakfast: open food drawing'),
    },
    'stemford-english-1': {
        4: ('black brown light_brown pink red blue green yellow', 'Draw your family'),
        10: ('black brown light_brown pink red blue green yellow', 'Draw an activity with your family'),
        14: ('red blue yellow green purple brown black', 'Colour the outlined objects chosen by the teacher'),
        27: ('red blue green yellow brown pink orange', 'Colour the house and garden scene using favourite colours'),
        32: ('green grey yellow brown', 'Trace and colour the mosque using the printed example'),
        50: ('black green brown red blue yellow pink', 'Draw things seen in a park'),
        52: ('red blue green yellow light_brown brown black orange', 'Colour favourite activities with friends'),
        58: ('black brown light_brown pink red blue green yellow', 'Draw faces in your social circle'),
        70: ('red green yellow orange pink brown', 'Colour the fruits that grow on trees'),
        97: ('brown light_brown yellow black', 'Colour only jungle animals: lion, monkey and deer'),
        112: ('black brown light_brown grey pink green blue red yellow', 'Draw your chosen pet for the pet care plan'),
    },
    'stemford-series-computer-book-0-curve': {
        6: ('grey black', 'Colour only the CPU using the example'),
        15: ('grey black blue', 'Colour the game console and headphones'),
        19: ('grey black blue', 'Colour the laptop using the example'),
        24: ('grey black', 'Colour only the optical drive'),
        27: ('black', 'Colour the correct first letters'),
        33: ('black grey blue', 'Colour the speakers and tablet'),
        34: ('black grey green', 'Colour the UPS and its green power button'),
        36: ('green', 'Trace and colour the WhatsApp logo green'),
        37: ('black grey green', 'Colour the Xbox and its green details'),
        41: ('blue', 'Colour only the Zoom logo'),
    },
    'stemford-computer-book-1': {
        9: ('black grey blue', 'Draw and colour a computer system'),
        15: ('black grey blue', 'Draw and colour monitor, mouse and CPU'),
        22: ('black grey blue brown light_brown green red', 'Draw and colour one use of a computer'),
        30: ('grey black brown pink', 'Trace and colour computer mouse and real mouse'),
        44: ('black yellow orange red', 'Draw and colour the Tux penguin mascot'),
        51: ('black red', 'Draw route arrows and recreate the red grid pattern'),
        58: ('black red brown blue green yellow', 'Draw and colour your house'),
        62: ('black grey blue green red yellow', 'Draw smart devices for the AI in My Life poster'),
    },
    'stemford-urdu-3': {
        10: ('light_brown red green black', 'Colour potato and pomegranate; write beginning letters'),
        58: ('blue grey brown light_brown black', 'Colour bicycle, chest, elderly man and well; write beginning letters'),
        68: ('grey blue brown black', 'Colour aeroplane and utensils; write beginning letters'),
        82: ('grey yellow red green blue black', 'Colour scissors and patterned spinning top; write beginning letters'),
    },
    'stemford-urdu-4': {
        19: ('orange yellow black', 'Join the Urdu letters in sequence and colour the duck beak and feet'),
        96: ('brown grey green blue yellow orange pink red black', 'Read and write counting 1 to 10 and colour the outlined objects'),
    },

}

def names(text):
    # Multi-word names use underscores in the compact review table.
    return [name.replace('_', ' ') for name in text.split()]

def main():
    path = ROOT / 'books/colour-palettes.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    reviewed = {}
    total = 0
    for meta_file in sorted((ROOT/'books').glob('*/meta.json')):
        meta = json.loads(meta_file.read_text(encoding='utf-8'))
        book = meta['id']
        pages = {str(p): {'picture': 'No requested colouring: black pencil for reading notes, matching or writing',
                          'colours': ['black']} for p in range(1, meta['pages']+1)}
        pages.update(data['books'].get(book, {}))
        for page, (colours, note) in EXTRA.get(book, {}).items():
            pages[str(page)] = {'picture': note, 'colours': names(colours)}
        for page, entry in pages.items():
            assert 1 <= int(page) <= meta['pages']
            assert entry['colours'] and len(set(entry['colours'])) == len(entry['colours'])
            assert all(name in data['colours'] for name in entry['colours']), (book, page, entry)
        reviewed[book] = dict(sorted(pages.items(), key=lambda item: int(item[0])))
        total += len(pages)
    data['books'] = reviewed
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print(f'Reviewed palettes for {total} pages in {len(reviewed)} books.')

if __name__ == '__main__':
    main()
