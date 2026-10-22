"""Build the English 3+ activities for letters b-z: a "Learn" animation and a game on each letter page,
and "Show me how" (pencil writes, then colours) on each trace page. Writes books/activities-english3.js.

    python tools/find_glyphs.py 8 10 12 ... > glyphs.json
    python tools/make_english3.py glyphs.json
    python tools/make_english3.py --videos      # only put newly added videos on the pages
"""
import json
import os
import sys

from ink import make_ink

LETTER_PAGE = dict(zip('abcdefghijklmnopqrstuvwxyz',
                       [5, 7, 9, 11, 17, 19, 21, 23, 27, 29, 31, 33, 39, 41, 43, 45, 49, 51, 53, 55, 61, 63, 65, 67, 71, 73]))

# sentence under the picture, and the three "as in" words, as printed in the book
WORDS = {
    'a': ('The tiny ant finds a shiny apple.', ['apple', 'ant', 'alligator']),
    'b': ('The cute bear eats a sweet banana.', ['banana', 'ball', 'bear']),
    'c': ('The cat is sitting on the car.', ['car', 'cap', 'cat']),
    'd': ('The dog runs with the deer.', ['dog', 'duck', 'door']),
    'e': ('The happy elephant brings an envelope.', ['envelope', 'egg', 'elephant']),
    'f': ('The frog and the fish are in the pond.', ['fish', 'frog', 'fan']),
    'g': ('The goat looks at the grapes.', ['guava', 'grapes', 'goat']),
    'h': ('The hen stands happily near her house.', ['hat', 'hen', 'house']),
    'i': ('The insect sees the inkpot.', ['insect', 'inkpot', 'igloo']),
    'j': ('The jet flies over the jeep.', ['jar', 'jug', 'jeep']),
    'k': ('The king fills his cup with hot tea.', ['key', 'kettle', 'kitten']),
    'l': ('The lamb stands near the lemon tree.', ['lemon', 'leaf', 'lion']),
    'm': ('The monkey eats a mango.', ['map', 'mango', 'monkey']),
    'n': ('The nuts are on the newspaper.', ['nest', 'nuts', 'newspaper']),
    'o': ('The ox eats an onion.', ['orange', 'ox', 'octopus']),
    'p': ('The parrot is sitting on a pear tree.', ['pear', 'peacock', 'parrot']),
    'q': ('The quail rests on the quilt.', ['quill', 'quilt', 'quail']),
    'r': ('The rabbit jumps into the ring.', ['ring', 'rabbit', 'racket']),
    's': ('The sun shines on the sunflower.', ['sunflower', 'sun', 'snake']),
    't': ('The tiger is under the tree.', ['turtle', 'tomato', 'tiger']),
    'u': ('The umpire holds an umbrella.', ['urn', 'umpire', 'umbrella']),
    'v': ('The van moves through the valley.', ['vest', 'van', 'valley']),
    'w': ('A piece of wood lies near the well.', ['watch', 'wood', 'well']),
    'x': ('The boy plays the xylophone near the X-ray.', ['X-ray', 'Christmas tree', 'xylophone']),
    'y': ('The yak plays with the colourful yo-yo.', ['yarn', 'yo-yo', 'yak']),
    'z': ('There is a zebra at the zoo.', ['zip', 'zebra', 'zoo']),
}

HOW = {
    'a': 'Go round like a ball, then go up, and come down with a little tail.',
    'b': 'Start at the top, go straight down, then go up and round.',
    'c': 'Start at the top and go round, like a big open mouth.',
    'd': 'Go round like a ball, then go up tall, and come down.',
    'e': 'Go across, then round and round.',
    'f': 'Start with a hook at the top, go down, then a line across.',
    'g': 'Go round like a ball, then go down and curl like a hook.',
    'h': 'Go down tall, then go up and make a hump.',
    'i': 'Go straight down, then put a dot on top.',
    'j': 'Go down and curl like a hook, then put a dot on top.',
    'k': 'Go down tall, then in, and out.',
    'l': 'Go straight down from the top, with a little tail.',
    'm': 'Go down, then make two humps.',
    'n': 'Go down, then up and over, one hump.',
    'o': 'Go round and round, like an orange.',
    'p': 'Go down long, then up and round.',
    'q': 'Go round like a ball, then go down long.',
    'r': 'Go down, then up and over a little.',
    's': 'Curve like a snake, round one way, then round the other way.',
    't': 'Go down with a little tail, then a line across.',
    'u': 'Go down and round like a cup, then up and down.',
    'v': 'Slide down, then slide up.',
    'w': 'Down, up, down, up.',
    'x': 'Slide down one way, then slide down the other way.',
    'y': 'Go down and round, then down long with a hook.',
    'z': 'Go across, slide down, then go across again.',
}

# picture to colour on the trace page: name, colour word, colour, ellipse (cx, cy, rx, ry in % of the page)
COLOUR = {
    'a': ('apple', 'red', '#e63946', (73.3, 32.5, 19, 10.3)),
    'c': ('cake', 'pink', '#ff8fab', (71, 26, 19, 13)),
    'd': ('duck', 'yellow', '#f9c74f', (72, 24, 15, 12)),
    'e': ('elephant', 'grey', '#9aa5b1', (67, 27, 15, 13)),
    'g': ('grapes', 'green', '#7bc043', (71, 32, 14, 12)),
    'i': ('igloo', 'blue', '#90e0ef', (66, 26, 21, 9)),
    'j': ('jug', 'blue', '#4aa3df', (73, 25, 15, 13)),
    'k': ('kangaroo', 'brown', '#c68642', (70, 26, 11, 16)),
    'l': ('leaf', 'green', '#43aa8b', (72, 26, 17, 15)),
    'm': ('monkey', 'brown', '#a0522d', (73, 27, 12, 11)),
    'n': ('nest', 'brown', '#b07d48', (70, 27, 20, 7)),
    'o': ('orange', 'orange', '#ff9f1c', (70, 22.5, 19, 13)),
    'p': ('parrot', 'green', '#43aa8b', (70, 25, 13, 15)),
    'q': ('quail', 'brown', '#b5835a', (69, 24, 16, 11)),
    'r': ('rabbit', 'light brown', '#d4a373', (71, 26, 12, 14)),
    's': ('snake', 'green', '#90be6d', (72, 25, 17, 12)),
    't': ('turtle', 'green', '#52b788', (70, 22, 20, 10)),
    'u': ('umbrella', 'red', '#e63946', (71, 17, 17, 7)),
    'v': ('vase', 'orange', '#f4a261', (73, 25, 10, 14)),
    'w': ('window', 'blue', '#a2d2ff', (71, 27, 15, 13)),
    'x': ('xylophone', 'orange', '#f4a261', (68, 26, 14, 14)),
}

THIRDS = [(7, 31), (33, 57), (59, 93)]


# The publisher's own videos for a letter, if they have been put in videos/stemford-english-3/ (named like the letter a ones).
VIDEO_DIR = 'videos/stemford-english-3/'
# Each video may be named like the letter a ones, or sit in a folder named after the letter (b/story.mp4).
LESSON_VIDEOS = [('Story', ['Story of Letter {L}.mp4', '{L}/story.mp4']),
                 ('Phonic Poem', ['Letter {L} Phonic Poem.mp4', '{L}/phonic poem.mp4', '{L}/poem.mp4']),
                 ('Vocabulary', ['Letter {L} Vocabulary.mp4', '{L}/vocabulary.mp4'])]
FORMATION = ['Letter {L} Formation.mp4', '{L}/formation.mp4']
# where the writing ends in a formation video that goes on to other things (a teacher talking), in seconds
FORMATION_END = {'b': 22, 'c': 24}
# each video gets its own button, stacked in the sky at the top right of the big picture: icon and top (% of the page)
VIDEO_BUTTONS = {'Story': ('📖', 25.5), 'Phonic Poem': ('🎵', 30), 'Vocabulary': ('🔤', 34.5)}


def videos_for(L, names):
    out = []
    for t, cands in names:
        for n in [cands] if isinstance(cands, str) else cands:
            if os.path.exists(VIDEO_DIR + n.format(L=L)):
                out.append({'title': t, 'src': VIDEO_DIR + n.format(L=L)})
                break
    return out


def formation_for(L):
    how = videos_for(L, [('How to write ' + L, FORMATION)])
    if how and L in FORMATION_END:
        how[0]['src'] += '#t=0,%g' % FORMATION_END[L]
    return how[0] if how else None


def relink_videos():
    """Only put the videos on the pages again, keeping the activities already made (no glyph scan needed)."""
    path = 'books/activities-english3.js'
    src = open(path, encoding='utf-8').read()
    head, body = src[:src.index('(window.BOOK_ACTIVITIES')], src[src.index(', ') + 2:src.rstrip().rindex(');')]
    acts = json.loads(body)
    for L, p in LETTER_PAGE.items():
        acts[str(p)] = letter_page(L, p)
        trace = acts[str(p + 1)]
        trace.pop('video', None)
        how = formation_for(L)
        if how:
            trace['video'] = how
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(head + "(window.BOOK_ACTIVITIES['new-stemford-english-3'], ")
        f.write(json.dumps(acts, indent=1, ensure_ascii=False))
        f.write(');\n')
    print('videos relinked')


def letter_page(L, p):
    sentence, words = WORDS[L]
    vids = videos_for(L, LESSON_VIDEOS)
    if vids:
        buttons = [{'type': 'videos', 'label': v['title'], 'icon': VIDEO_BUTTONS[v['title']][0], 'title': v['title'] + ' of letter ' + L,
                    'button': {'x': 64, 'y': VIDEO_BUTTONS[v['title']][1]}, 'videos': [v]} for v in vids]
        return buttons + [game_for(L, words)]
    learn = {
        'type': 'story', 'label': 'Learn ' + L, 'icon': '🔤', 'title': 'The letter ' + L, 'button': {'x': 47, 'y': 23.5},
        'scenes': [
            {'page': p, 'from': {'cx': 20, 'cy': 19, 'w': 40}, 'to': {'cx': 20, 'cy': 19, 'w': 30},
             'text': f'This is the letter {L}. Say it with me. {L}, {L}, {L}!'},
            {'page': p, 'from': {'cx': 80, 'cy': 18, 'w': 40}, 'to': {'cx': 85, 'cy': 18, 'w': 26},
             'text': f'Look at the mouth, and say the sound of {L}.'},
            {'page': p, 'from': {'cx': 50, 'cy': 42, 'w': 80}, 'to': {'cx': 50, 'cy': 38, 'w': 50}, 'text': sentence},
        ] + [
            {'page': p, 'from': {'cx': cx, 'cy': 74, 'w': 36}, 'to': {'cx': cx, 'cy': 74, 'w': 30}, 'text': f'{L} for {word}.'}
            for cx, word in zip((20, 45, 75), words)
        ] + [
            {'page': p, 'from': {'cx': 50, 'cy': 74, 'w': 100}, 'to': {'cx': 50, 'cy': 74, 'w': 90},
             'text': f"{', '.join(words)}. They all begin with {L}!"}
        ]}
    return [learn, game_for(L, words)]


def game_for(L, words):
    return {
        'type': 'game', 'title': f'Find the {L} words!', 'button': {'x': 32, 'y': 62},
        'crop': {'x': 5, 'y': 63, 'w': 90, 'h': 21},
        'targets': [{'name': word, 'x': a, 'y': 65, 'w': b - a, 'h': 19, 'say': f'{word[0].upper() + word[1:]} begins with {L}.'}
                    for (a, b), word in zip(THIRDS, words)]}


def trace_page(L, page, boxes):
    big, row1, row2 = boxes
    def g(bs):
        out = []
        for b in bs:
            src, box = make_ink('new-stemford-english-3', page, b)
            out.append({'glyph': L, 'box': b, 'ink': {'src': src, 'box': box}})
        return out
    steps = [
        {'say': f'Let us write the letter {L}. {HOW[L]}', 'marks': g(big[:1])},
        {'say': 'Again! ' + HOW[L], 'marks': g(big[1:2])},
        {'say': 'Now trace the small letters.', 'marks': g(row1)},
        {'say': 'One more line. Good job!', 'marks': g(row2)},
    ]
    if L in COLOUR:
        name, word, col, (cx, cy, rx, ry) = COLOUR[L]
        steps.append({'say': f'Now let us colour the {name}. Let us make it {word}! Well done! Now it is your turn.',
                      'marks': [{'scribble': col, 'cx': cx, 'cy': cy, 'rx': rx, 'ry': ry}]})
    else:
        steps[-1]['say'] = 'One more line. Well done! Now it is your turn.'
    act = {'type': 'fill', 'title': 'Trace and write', 'steps': steps}
    how = formation_for(L)
    if how:
        act['video'] = how
    return act


if __name__ == '__main__':
    if sys.argv[1:] == ['--videos']:
        relink_videos()
        sys.exit()
    glyphs = json.load(open(sys.argv[1]))
    acts = {}
    for L, p in LETTER_PAGE.items():
        acts[p] = letter_page(L, p)
        acts[p + 1] = trace_page(L, p + 1, glyphs[str(p + 1)])
    with open('books/activities-english3.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write('// Generated by tools/make_english3.py: letters a to z of New Stemford English 3+.\n')
        f.write("Object.assign(window.BOOK_ACTIVITIES['new-stemford-english-3'], ")
        f.write(json.dumps(acts, indent=1, ensure_ascii=False))
        f.write(');\n')
    print(len(acts), 'pages')
