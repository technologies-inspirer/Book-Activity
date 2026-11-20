"""Build this edition's Maths 5+ activities and question-only exercise views.

Run after import_maths5.py and link_maths5_videos.py. Other books are preserved.
Videos come only from maths5-videos.json. No AI stories or Yes/No checklists.
"""
import json
import math
from functools import lru_cache
from pathlib import Path
import cv2

ROOT = Path(__file__).resolve().parents[1]
BOOK = 'stemford-maths-5'
START = '// BEGIN GENERATED MATHS 5 QUESTIONS'
END = '// END GENERATED MATHS 5 QUESTIONS'


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def save(path, data):
    (ROOT / path).write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def box(x, y, w, h):
    return dict(zip(('x', 'y', 'w', 'h'), (round(float(v), 3) for v in (x, y, w, h))))


@lru_cache(maxsize=80)
def image(page):
    return cv2.imread(str(ROOT / f'books/{BOOK}/p{page:03}.jpg'))


@lru_cache(maxsize=80)
def frames(page):
    """Empty answer frames with coloured borders, excluding model answers and printed pictures."""
    im = image(page)
    h, w = im.shape[:2]
    white = (im.min(axis=2) > 238).astype('uint8')
    _, _, stats, _ = cv2.connectedComponentsWithStats(white, connectivity=4)
    out = []
    for x, y, bw, bh, area in stats[1:]:
        if not (.025*w < bw < .36*w and .015*h < bh < .12*h and .10*h < y < .94*h and area/(bw*bh) > .72):
            continue
        inner = im[y+max(1, int(bh*.15)):y+int(bh*.78), x+max(1, int(bw*.15)):x+int(bw*.85)]
        if not inner.size or (inner.min(axis=2) < 175).mean() > .012:
            continue
        ring = im[max(0, y-4):min(h, y+bh+4), max(0, x-4):min(w, x+bw+4)]
        coloured = ring.max(axis=2).astype(int) - ring.min(axis=2) > 40
        coloured[4:-4, 4:-4] = False
        if coloured.sum() < 2*(bw+bh)*.10:
            continue
        out.append(box(x/w*100, y/h*100, bw/w*100, bh/h*100))
    return sorted(out, key=lambda r: (round(r['y']), r['x']))


def contains(outer, r):
    return r['x'] >= outer['x'] and r['y'] >= outer['y'] and r['x']+r['w'] <= outer['x']+outer['w'] and r['y']+r['h'] <= outer['y']+outer['h']


QUESTIONS = {}


def Q(page, kind, title, crop, **more):
    q = {'type': 'question', 'kind': kind, 'title': title, 'say': title, 'button': {'x': 1, 'y': 1}, 'crop': box(*crop), **more}
    QUESTIONS.setdefault(page, []).append(q)
    return q


def W(page, title, crop, lines=None):
    c = box(*crop)
    lines = [box(*r) for r in lines] if lines is not None else [r for r in frames(page) if contains(c, r)]
    assert lines, (page, title, 'No measured answer areas; inspect the page')
    return Q(page, 'write', title, crop, lines=lines, hint={'x': lines[0]['x']+lines[0]['w']/2, 'y': lines[0]['y']+lines[0]['h']/2})


def choose(page, title, crop, options):
    return Q(page, 'choose', title, crop, options=[{**box(x,y,w,h), 'correct':bool(correct), 'label':label} for x,y,w,h,correct,label in options])


def match(page, title, crop, dots):
    return Q(page, 'match', title, crop, dots=[{'id':str(id), 'x':x, 'y':y} for id,x,y in dots])


def colour(page, title, crop, parts, samples):
    return Q(page, 'colour', title, crop, parts=parts, samples=samples,
             hint={'x':parts[0]['box']['x']+parts[0]['box']['w']/2, 'y':parts[0]['box']['y']+parts[0]['box']['h']/2})


def part(name, bounds, colours, outline=None):
    return {'part':name, 'box':box(*bounds), 'colours':colours, **({'outline':outline} if outline else {})}


def game(title, targets, crop, hide=()):
    return {'type':'game','title':title,'label':'Play','crop':box(*crop),
            'targets':[{'name':name,**box(x,y,w,h),'say':name+'.'} for name,x,y,w,h in targets],
            **({'hide':[box(*r) for r in hide]} if hide else {})}


def replace_regions(path, value):
    """Replace only our book block; preserve other editions' hand-authored formatting."""
    p=ROOT/path;s=p.read_text(encoding='utf-8')
    if BOOK not in json.loads(s):
        addition=json.dumps({BOOK:value},ensure_ascii=False,indent=2)[1:-1].strip()
        p.write_text(s.rstrip()[:-1].rstrip()+',\n  '+addition+'\n}\n',encoding='utf-8')
    else:
        start=s.index('"'+BOOK+'"');start=s.index(':',start)+1
        while s[start].isspace():start+=1
        _,length=json.JSONDecoder().raw_decode(s[start:])
        p.write_text(s[:start]+json.dumps(value,ensure_ascii=False,indent=2)+s[start+length:],encoding='utf-8')


def main():
    cv2.setNumThreads(1)
    assert read(f'books/{BOOK}/meta.json')['pages']==80
    palettes=read('books/colour-palettes.json');C=palettes['colours']
    make_questions(C)
    games=make_games()
    topics=read('books/maths5-videos.json');by_page={p:t for t in topics.values() for p in t['pages']}
    acts={};regions={}
    page_palettes={str(p):{'picture':'Reading page; black pencil only','colours':['black']} for p in range(1,81)}
    for page in range(4,81):
        entries=[]
        # This edition reserves a clear strip above the printed headings. Keep buttons there rather than
        # mistaking empty answer cells for free space. Five pills fit with a gap, even on a phone.
        header=iter((75,56.5,38,19.5,1))
        assert len(QUESTIONS.get(page,[]))+(page in games)+(page in by_page)<=5, (page,'Too many header controls; group subparts of the same printed question')
        def place(): return {'x':next(header),'y':.55}
        if page in by_page:
            t=by_page[page]
            # Publisher-supplied lesson videos for this exact page come first, then the topic's role videos.
            lessons=[{'title':l['title'],'src':l['src']} for l in t.get('lessons',[]) if page in l['pages']]
            entries.append({'type':'videos','label':'Videos','title':t['title'],
                            'button':place(),
                            'videos':lessons+[{'title':role,'src':t[role]} for role in ('Student','Teacher','Parents')]})
        if page in games:
            a=games[page];a['button']=place();entries.append(a)
        parts=[];colours=[C['black']]
        for q in QUESTIONS.get(page,[]):
            q['button']=place()
            parts += [{'part':'answer area','box':[r[k] for k in ('x','y','w','h')],'surface':'all'} for r in q.get('lines',[])]
            for p in q.get('parts',[]):
                colours+=p['colours'];r={'part':p['part'],'box':[p['box'][k] for k in ('x','y','w','h')],'surface':'all' if p.get('outline')=='rectangle' else 'object'}
                x,y,w,h=r['box']
                if p.get('outline') in ('ellipse','triangle'):
                    polygon=([[x+w/2,y],[x+w,y+h],[x,y+h]] if p['outline']=='triangle' else
                             [[round(x+w/2+w/2*math.cos(j*math.pi/16),4),round(y+h/2+h/2*math.sin(j*math.pi/16),4)] for j in range(32)])
                    r={'part':p['part'],'polygon':polygon}
                if len(p['colours'])==1:r['colour']=p['colours'][0]
                parts.append(r)
        if parts:
            # The separate questions provide precise views; page practice uses the same reviewed areas.
            entries.append({'type':'fill','title':'Write and colour','drawingMode':'regions',
                            'colours':list(dict.fromkeys(colours)),
                            'steps':[{'say':'Read the printed question and complete its answer spaces.','marks':[]}]})
        acts[page]=entries
        if parts: regions[str(page)]=parts
        page_palettes[str(page)]={'picture':'This page\'s answer pencil and reviewed activity colours','colours':[name for name,hex in C.items() if hex in colours]}
    palettes['books'][BOOK]=page_palettes
    (ROOT/'books/colour-palettes.json').write_text(json.dumps(palettes,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    replace_regions('books/colour-regions.json',regions)
    source='// Generated by tools/make_maths5.py; only publisher-supplied role videos, no AI stories.\n'
    source+=f'window.BOOK_ACTIVITIES = window.BOOK_ACTIVITIES || {{}};\nwindow.BOOK_ACTIVITIES["{BOOK}"] = '+json.dumps(acts,ensure_ascii=False,indent=1)+';\n'
    (ROOT/'books/activities-maths5.js').write_text(source,encoding='utf-8')
    p=ROOT/'books/questions.js';s=p.read_text(encoding='utf-8')
    if START in s:
        a=s.index(START);b=s.index(END,a)+len(END);s=s[:a]+s[b:]
    s=s.rstrip()+'\n\n'+START+'\n'+f'window.BOOK_QUESTIONS["{BOOK}"] = '+json.dumps(QUESTIONS,ensure_ascii=False,indent=1)+';\n'+END+'\n'
    p.write_text(s,encoding='utf-8')
    save(f'books/{BOOK}/lessons.json',topics)
    print(f'Maths 5+: {len(acts)} pages, {sum(len(v) for v in QUESTIONS.values())} questions, {len(games)} games.',flush=True)


# Page definitions below are measured against the supplied 80-page edition.
def make_questions(C):
    # Number tables: the first row is the publisher's worked example.
    for p, first, last, x, split in [(4,33,88,62,76), *[(p,28,88,62,76) for p in (7,9,10,16)],
                                    *[(p,26,80,63,77) for p in (25,27,29,31,32)]]:
        W(p,'Count, read and write.',(5,13,91,73.6 if p>=25 else 76.5))
    W(5,'Count the objects in each group and write the number.',(5,5,91,42))
    match(5,'Match the numerals with the number words.',(1,48,98,47),
          [(n,x,y) for n,x,y in [('7',16,56),('6',16,67),('8',16,78),('9',16,88),
                                ('5',83,56),('1',83,67),('2',83,78),('3',83,88),
                                ('3',42,54),('5',58,60),('8',42,65),('1',58,70),
                                ('6',42,75),('9',58,80),('2',42,86),('7',58,91)]])
    W(8,'Count and write. Mark the greater and smaller number.',(6,46,89,43),
      [(x,y,6,3.8) for x in (18,38,63,83) for y in (66.6,85)])
    W(11,'Count the blocks. Write the numbers and compare using <, > or =.',(5,54.8,90,32.7),
      [(x,y,6.8,3.8) for y in (63.8,72.8,81.8) for x in (10,48,83)])
    W(12,'Count the dots and compare the numbers.',(6,6,89,18))
    W(12,'Count the objects and compare using <, > or =.',(6,25,88,29))
    # The small circles are closed ellipses; colour only the requested number in each stack.
    W(12,'Put <, > or = in each box.',(6,81,88,14))
    beads=[]
    for x,n,key in [(10.8,4,'green'),(27.2,9,'green'),(41.8,8,'magenta'),(58.1,3,'magenta'),(73.8,6,'blue'),(90.2,6,'blue')]:
        for j in range(n):
            beads.append(part('counting circle',(x-1.18,74.5-j*1.62,2.36,1.62),[C[key]],'ellipse'))
    beads += [part('comparison sign',(x,76,5,3.5),[C['black']],'rectangle') for x in (16.5,47.5,79.5)]
    colour(12,'Colour the circles and compare the given numbers.',(6,54,88,27),beads,[])
    for title,y,rows in [('Arrange the numbers in ascending order.',6,[15,28,42]),
                         ('Arrange the numbers in descending order.',50,[60,73,87])]:
        W(14,title,(6,y,88,44),[(x,yy,11,4.5) for yy in rows for x in (12,28,44,60,76)])
    W(15,'Count and write the even and odd numbers.',(5,12,90,55))
    nums=[(13+i*7.9,79.5,5.5,4,i%2==1,str(i+1)) for i in range(10)]
    choose(15,'Encircle the even numbers.',(6,74,88,11),nums)
    choose(15,'Find the odd numbers.',(6,74,88,11),[(x,y,w,h,not ok,label) for x,y,w,h,ok,label in nums])
    W(17,'Write the missing numbers to help the squirrel find its tree.',(5,10,90,50))
    W(17,'Write the numerals for the following.',(6,61,88,17))
    W(17,'Write the numbers in words.',(6,79,88,16))
    for p in (18,35):
        W(p,'Write the number that comes between the given numbers.',(5,7,91,45))
        W(p,'Write the numbers before and after the given numbers.',(5,52,91,42))
    for p,title in [(20,'Write forward counting from 0 to 49.'),(21,'Write backward counting from 49 to 0.'),
                    (36,'Write forward counting from 50 to 99.'),(37,'Write backward counting from 99 to 50.')]:
        W(p,title,(6,10,88,80))
    Q23=W(23,'Fill in the blanks: left and right.',(6,25,88,16),[(34,28,11,3),(34,32,12,3)])
    Q23['hide']=[box(6,36.4,53,4.2)]
    for i,(y,label,correct) in enumerate([(64,'apple',0),(73,'butterfly',1),(82,'pear',2)]):
        # Keep the entire cupboard as the reference, without the unrelated hand/blocks lesson above it.
        q=choose(23,f'Where is the {label}?',(6,55,88,35.7),
               [(10+j*14.8,y+3,13,4.5,j==correct,v) for j,v in enumerate(('top','middle','bottom'))])
        q['hide']=[box(6,yy,49,8.7) for j,yy in enumerate((63,72,81)) if j!=i]
    for i,(label,correct) in enumerate([('Who is before Asad?',0),('Who is after Asad?',1),('Who is between Amna and Hamza?',0)]):
        q=choose(24,label,(5,43,90,46),[(69+j*12,75+i*4.2,10,4,j==correct,('Asad' if i==2 and j==0 else 'Amna' if j==0 else 'Hamza')) for j in range(2)])
        q['hide']=[box(5,43,56,3.1), *[box(5,yy,89,4.1) for j,yy in enumerate((75,79.3,83.6)) if j!=i]]
    for p in (26,28,30):
        q=W(p,'Count, circle the correct number and write it.',(5,6,90,43.7))
        q['lines'] += [box(76,yy,5.5,11) for yy in (11.5,25,38.5)]
        W(p,'Write the next numbers.',(5,49,43,21))
        W(p,'Write the previous numbers.',(51,49,44,21))
        if p!=28: W(p,'Write the missing numbers.',(5,72,90,22))
    balloons=[(8.1,78.6,8.6,7.9,'blue'),(18.4,76.5,8.8,7.9,'red'),(29.1,84.1,8.4,7.8,'red'),
              (39.4,82.1,8.6,7.7,'blue'),(53.3,78.5,8.4,7.8,'blue'),(63.7,76.5,8.7,7.8,'red'),
              (73.5,84,8.7,7.9,'blue'),(83.6,82.1,8.6,7.8,'red')]
    colour(28,'Colour the greater number red and the smaller number blue.',(6,71,88,24),
           [part('balloon',(x,y,w,h),[C[k]],'ellipse') for x,y,w,h,k in balloons],[])
    W(33,'Count, colour the correct number and write it.',(5,6,90,43))
    QUESTIONS[33][-1]['crop']=box(5,6,90,43.7)
    QUESTIONS[33][-1]['lines'] += [box(76,yy,5.5,11) for yy in (11.5,25,38.5)]
    W(33,'Write the next numbers.',(5,51,90,21))
    W(33,'Write the previous numbers.',(5,74,90,20))
    W(34,'Complete the missing numbers: count in tens.',(5,78.1,90,9.1))
    W(38,'Count, write and add the fruit.',(5,67,90,22),[(70,69,13,3),(70,75,13,3), *[(x,83,6,4.3) for x in (47,64,81)]])
    W(39,'Count on your fingers and add the numbers.',(6,36,88,15),[(x,47,7,2.4) for x in (25,55,86)])
    W(39,'Add the numbers after counting on your fingers.',(6,52,88,37),[(x,y,7,2.5) for y in (68,85) for x in (26,56,86)])
    # Freehand strokes stay inside each complete hand outline, so the child can colour the requested
    # fingers without a rectangular mask spilling onto the surrounding paper.
    hands=[]
    for y in (55.72,72.83):
        for x in (10.62,22.23,40.69,52.31,70,81.62):
            # The final pair is 0.7% left of a uniform grid. Include every outline edge with a paper margin;
            # cutting that edge would let the outside flood reach the palm and disable colouring there.
            hands.append(part('hand',(x-.4,y-.4,11.11,10.86),[C['light brown']]))
    colour(39,'Colour the fingers to show the addition.',(6,52,88,37),hands,[{'page':39,**box(54,8,38,18)}])
    W(40,'Add using the number lines and write the answers.',(5,52.5,90,33.5),[(23,y,7,2.4) for y in (57,63.3,69.7,76,82.2)])
    W(41,'Count the objects, write the numbers and find the total.',(5,9,90,79.2))
    # The unframed total lines are distinct from the small count circles.
    QUESTIONS[41][-1]['lines'] += [box(x,y,8,2.4) for x,y in ((44,24),(47,40),(53,55.5),(47,70.5),(46,85.2))]
    W(42,'Horizontal addition.',(6,29,43,59))
    W(42,'Vertical addition.',(52,29,43,59),[(x,y,8.5,3.5) for x in (59.5,80) for y in (41,55.2,69.5,83.7)])
    W(43,'Add the units. Write the answers in the columns.',(5,10,90,78))
    for p,op in [(44,'add'),(64,'subtract')]:
        W(p,f'Count and {op} the shapes.',(5,9,90,38 if p==44 else 40),[(86,y,6,2.5) for y in (22,29.5,36,42.5)] if p==44 else [(84,y,7,2.5) for y in (22.5,30,37.5,44.5)])
        W(p,f'Count, write and {op} the shapes.',(5,48 if p==44 else 50,90,41 if p==44 else 39),[(x,y,5,2.5) for y in ((63,70,77,84) if p==44 else (62.5,70.2,77.8,85.4)) for x in (75,82,88)])
    for p,titles in [(45,['How many sparrows are there in total?','How many caterpillars are there altogether?']),
                     (67,['How many apples are left?','How many buttons are left?'])]:
        W(p,titles[0],(5,9,90,36.5) if p==45 else (5,9,90,39))
        W(p,titles[1],(5,46,90,37.5) if p==45 else (5,49,90,36))
    # Two rectangular objects in the printed 2D exercise can both be matched to rectangle.
    # A paper matching corridor preserves that valid many-to-one answer instead of forcing a false square.
    W(46,'Match each object to its relevant shape.',(6,29,88,40),[(8,44,78,14)])
    W(46,'Trace and write the name of each shape.',(5,69,90,19),
      [*( (x,72,13,9) for x in (7,24,42,58,78)),*((x,82.5,14,4) for x in (6,24,42,61,79))])
    match(47,'Match each object to its relevant solid shape.',(6,38,88,50),
          [('cube',14,55),('cone',32.5,55),('cylinder',48.5,55),('sphere',64.3,55),('cuboid',84,55),
           ('cuboid',18,78),('cylinder',37.8,77),('sphere',54.8,77),('cone',72.6,76),('cube',86.3,78.5)])
    pattern_rows=[(34,8,[(63,35,9,6,'red','rectangle'),(76,35,9,6,'yellow','ellipse')],(12,35,30,6)),
                  (44,8,[(53,45,8.5,6,'green','triangle'),(64,45,17,6,'blue','rectangle'),(83,45,9,6,'red',None)],(12,45,39,6)),
                  (54,8,[(63,55,9,6,'yellow','triangle'),(76,55,9,6,'yellow','triangle')],(12,55,47,6)),
                  (64,8,[(56,65,9,6,'blue','ellipse'),(67,65,14,6,'green','rectangle'),(83,65,9,6,'blue','ellipse')],(12,65,41,6)),
                  (74,8,[(51,75,9,6,'green','triangle'),(64,75,9,6,'green','triangle'),(76,75,9,6,'red','rectangle')],(12,75,35,6))]
    # Each row already contains its own full coloured model. A second header crop would cut through the
    # longer models and take useful drawing space away on phones.
    colour(48,'Complete the patterns.',(5,30,90,52),
           [part('pattern shape',(x,yy,w,hh),[C[key]],outline) for _,_,shapes,_ in pattern_rows for x,yy,w,hh,key,outline in shapes],
           [])
    colour(49,'Colour the fifth and ninth leaves.',(5,73,90,15),
           [part('fifth leaf',(40.7,77.7,9.2,9),[C['green']]),part('ninth leaf',(75.95,77.7,9.2,9),[C['green']])],[])
    for p,title,crops in [(50,'Make groups of two.',[(5,9,90,41),(5,50,90,38)]),
                          (51,'Make groups of five.',[(5,9,90,39),(5,49,90,41)]),
                          (52,'Share equally and write the answer.',[(5,10,90,34),(5,44,90,43)])]:
        for c in crops: W(p,title,c)
    QUESTIONS[50][1]['hide']=[box(58,82.3,37,5.7)]
    # Dotted group borders are traced as narrow bands, keeping ink off the birds and caps.
    for q,rects in zip(QUESTIONS[51], [[(x,17,21,17.5) for x in (16,40,64)],[(x,y,37,6.5) for x in (10,55) for y in (56,62.5,69)]]):
        for x,y,w,h in rects:
            q['lines'] += [box(x,y,w,1.2),box(x,y+h-1.2,w,1.2),box(x,y,1.2,h),box(x+w-1.2,y,1.2,h)]
    W(53,'Skip count in twos.',(5,11,90,39),[(x,y,8,3.5) for x,y in [(67,16),(73,25),(55,30),(35,29),(22,35),(35,42),(58,42)]])
    W(53,'Skip count in fives.',(5,50,90,38),[(x,y,8,3.5) for x,y in [(71,56),(78,64),(58,70),(39,69),(25,74),(40,81),(62,81)]])
    W(54,'Write one more and one less.',(5,34,90,52))
    # Sorting is a drawing task. Keep each labelled destination as its own bounded drawing area.
    for title,crop,keys,rects in [
        ('Draw and sort the balls and balloons. Colour big ones yellow and small ones blue.',(5,10,90,35.5),['yellow','blue'],[(51,19,19,11),(73,19,19,11),(51,36,19,9),(73,36,19,9)]),
        ('Draw and sort squares and triangles. Use the model colours.',(5,46,90,23),['pink','purple','green','orange','blue'],[(51,54,19,14),(73,54,19,14)]),
        ('Draw and sort circles and rectangles. Use the model colours.',(5,70,90,19),['blue','orange','pink','green'],[(51,75,19,13),(73,75,19,13)])]:
        allowed=([['yellow'],['blue'],['yellow'],['blue']] if len(rects)==4 else
                 [['pink','purple','green'],['orange','blue']] if crop[1]==46 else [['blue','green'],['orange','pink']])
        colour(59,title,crop,[part('drawing box',r,[C[k] for k in ks],'rectangle') for r,ks in zip(rects,allowed)],
               [{'page':59,**box(8,crop[1]+6,39,crop[3]-7)}])
    W(60,'Subtract and write the answer.',(5,70.5,90,18.5),[(79,77,6,3),(79,84,6,3)])['hide']=[box(67,70.5,28,5)]
    W(61,'Count back on your fingers and subtract.',(5,27,90,36),[(x,y,7,2.5) for x,y in [(22,41),(53,41),(85,41),(39,58),(71,58)]])
    W(61,'Cross out fingers and subtract.',(5,64,90,22.4),
      [*( (x,69,22,11) for x in (8,39,72)),*((x,82,7,3) for x in (22,53,84))])
    W(62,'Subtract using the number lines.',(5,44,90,41),[(22,y,7,3) for y in (48.5,56.3,64,71.8,79.5)])
    W(63,'Count and subtract the objects.',(5,9,90,32),[(28,36,6.5,3),(75,36,6.5,3)])
    W(63,'Cross out the objects. Write the subtraction.',(5,41,90,48),
      [*((x,y,6,2.5) for y in (61,83) for x in (24,54,84)),*((x,y,25,15) for y in (46,69) for x in (10,40,70))])
    W(65,'Horizontal subtraction.',(5,28,60,63))
    W(65,'Vertical subtraction.',(66,28,28,63),[(77,y,7,3) for y in (41,56.5,71.5,86)])
    W(66,'Subtract the units and write the answers.',(5,9,90,76))
    W(68,'Add zero.',(5,40,90,11))
    W(68,'Subtract zero.',(5,78,90,10))
    W(70,'Measure each object and write the answer.',(5,10,90,76),[(80,y,6,3.5) for y in (19,37.5,55,73.5)])
    W(71,'Mark the heavy and light objects.',(5,31.5,90,56.5))
    # Six blocks high for the ostrich, all ten for the giraffe. The upper-left tower is already coloured.
    for x,y,n,title in [(46.5,48.5,6,'Colour blocks to show the height of the ostrich.'),(80.3,48.5,10,'Colour blocks to show the height of the giraffe.')]:
        colour(72,title,(5 if x<60 else 55,48,49 if x<60 else 39,39),
               [part('height block',(x,y+(9-j)*3.7,7,3.65),[C['blue']],'rectangle') for j in range(n)],[])
    W(73,'How many eggs can the egg box hold?',(5,50,90,20),[(38,61,9,3)])
    W(73,'How many bread rolls can the basket hold?',(5,70,90,17),[(82,76.5,9,3)])
    choose(74,'Circle the spoon which has more capacity.',(6,43,42,25),
           [(10,55,16,10,False,'small metal spoon'),(21,51,23,15,True,'large wooden spoon')])
    choose(74,'Circle the bowl which has less capacity.',(53,43,41,25),
           [(55,54,23,11,False,'large blue bowl'),(80,56,12,8,True,'small orange bowl')])
    W(74,'Circle the correct words about Cup A and Cup B.',(5,69,90,17),[(9,76,7,3),(31,82,11,3)])
    W(75,'Write the time.',(5,54,90,33.7),[(x,y,16,3) for x,y in [(11,71),(33,71),(55,71),(77,71),(32,83),(78,83)]])
    W(76,'Read the sentences and draw the hour and minute hands.',(4,6,92,89),
      [(58,16,10,7),(12,46,10,7),(58,46,10,7),(9,76,10,7),(56,76,10,7)])
    W(77,'Write the next day.',(6,28,43,35))
    W(77,'Write the day before.',(52,28,43,35))
    missing=[(15,70),(27,70),(58,70),(70,70),(15,77),(35,77),(62,77),(79,77),
             (15,84),(26,84),(32,84),(44,84),(62,84),(73,84),(86,84),(36,91),(44,91),(49,91),(61,91)]
    W(77,'Fill in the missing letters.',(6,64,88,31))
    W(78,'Order the months from January to December by connecting the dots.',(5,43,90,46),[(25,51,54,36)])
    for crop,opts,title in [((6,50,26,15),[(13,62,7,3,True,'Rs 1'),(22,62,7,3,False,'Rs 2')],'Choose the value of the one-rupee coin.'),
                            ((35,50,24,15),[(39,62,8,3,True,'Rs 5'),(48,62,8,3,False,'Rs 2')],'Choose the value of the five-rupee coin.'),
                            ((65,49,28,16),[(69,62,9,3,True,'Rs 10'),(79,62,9,3,False,'Rs 20')],'Choose the value of the ten-rupee note.')]:
        q=choose(79,title,crop,opts)
        if crop[0]<60:q['hide']=[box(crop[0],50,crop[2],3.2)]
    W(79,'Count, add and write the money totals.',(5,66,90,19),[(41,72,6,3),(33,79,7,3),(85,72,6,3),(77,79,7,3)])
    # Multiple equivalent coins/notes are valid. Use the paper circling task; a fixed choose-key would reject
    # legitimate answers (e.g. either of the two Rs 10 notes for Rs 15). Never pretend to grade those sums.
    W(80,'Circle the coins and notes that match the price.',(5,6,90,89.1),[(28.5,y+1,66,14) for y in (11,28,45,62,80)])


def make_games():
    return {
        6:game('Tens and units',[('one ten',54,12,8,20),('three units',66,26,20,7)],(50,9,39,25)),
        8:game('Greater and smaller',[('five chocolates',19,23,23,9),('two chocolates',65,25,16,8)],(6,11,88,34.5)),
        13:game('Ascending and descending',[('ascending order',10,65,37,12),('descending order',55,65,37,12)],(5,56,90,28)),
        19:game('Forward and backward',[('counting forward',6,13,89,32),('counting backward',6,48,89,30)],(5,11,90,67.5)),
        22:game('Positions',[('inside the house',20,31,12,10),('outside the house',73,31,16,12),('above',34,60,11,4),('below',56,74,14,18)],(1,15,98,77.5)),
        46:game('Flat shapes',[('square',9,16,11,8),('circle',25,16,12,8),('triangle',41,16,11,8),('rectangle',55,16,20,8),('oval',77,16,16,8)],(6,12,88,17),[(69,12,25,3)]),
        47:game('Solid shapes',[('cube',6,25,11,12),('cone',20,25,10,12),('sphere',32,26,10,11),('cylinder',44,25,10,12),('cuboid',57,25,13,12)],(5,24,67,13)),
        49:game('Ordinal numbers',[('first',23,27,7,7),('fifth',45,27,7,7),('tenth',85,25,8,9)],(5,20,90,16)),
        55:game('Compare sizes',[('big',29,17,22,19),('small',53,25,15,11)],(17,16,60,22)),
        56:game('Compare lengths',[('long',18,15.5,36,16),('short',57,21,28,10)],(4,15.5,90,18)),
        57:game('Compare heights',[('tall',17,12.5,16,20),('short',32,21,12,12)],(8,12,46,22.5),[(8,12,13,3)]),
        58:game('Compare weights',[('heavy',35,13.5,15,21),('light',52,26,13,8)],(20,13,57,23)),
        69:game('Measuring length',[('paperclip',13,33,15,3),('handspan',32,27,12,10),('foot',47,28,18,10),('blocks',70,31,16,6)],(10,26,79,14)),
    }


if __name__=='__main__':main()
