"""Activities reviewed against the supplied English 4+ PDF, image pages 5–80.

Keeps this edition's pictures, word lists and writing rows. No borrowed videos.
Run after import_english4.py. The source PDF and other books are unchanged.
"""
import json
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
BOOK = 'stemford-english-4'
GAP = 11   # pixels that join neighbouring printed dots of one letter
# Picture page, vocabulary row, word-building column, story.
LESSONS = [
 (6,'Apricot Almond Axe','ant arm ask and','Ali holds his arrow to hit the red apple. He has put his axe down on the log. An ant is crawling on the leaf. Oh no! A big alligator is in the pond.'),
 (8,'Bear Ball Bag','bag bed big bus','The happy baby holds a banana in his hand. A bus stops near the lake, and a boat floats softly. A pretty butterfly flies around the baby.'),
 (10,'Cup Cap Candle','cap can cot cub','The boy cuts the cake with his friends. A camel with a cat on its back watches happily. The cow stands near the car.'),
 (12,'Doll Dolphin Dice','dad den dig dog','The boy smiles and plays his drum. The dog runs around, and the duck quacks loudly. The deer walks near the house door.'),
 (17,'Elbow Egg Engine','egg end eye elk','An elephant walks near the train engine. An eagle carries an envelope in the sky. A little egg rests safely in its nest.'),
 (19,'Fruit Fan Fig','fan fit fun fox','A girl in a blue frock looks at her fish in the bowl. On the wall, a fox and a frog smile in a picture. A yellow flower shines bright beside them.'),
 (21,'Guava Glass Gloves','gap got gum gun','A little girl walks happily in the green field. A goat stands beside her, and a gorilla jumps with joy. They all look up at the sweet grapes on the tree.'),
 (23,'Honey Hat House','hat hen him hot','The hippo smiles at the hen and horse. They all look up at the helicopter in the clouds. It is a bright and happy day.'),
 (28,'Ink Insect Injection','ink ill ice','A little girl stands beside a cold igloo. She sees an inkpot and a tiny insect on the snow. She laughs and enjoys the cold day.'),
 (30,'Jacket Jar Jewellery','jar jam jet jug','A funny joker makes the children laugh. They stand near a green jeep with a jug of juice on it. The girl eats red jelly happily.'),
 (32,'Kettle Key Kiwi','key ken kit kid','The old king sits under the tall trees. A kangaroo hops around the kettle. A little kitten meows softly.'),
 (34,'Leaf Lamp Laptop','lab leg lip log','The lion looks at the lemons on the tree. A white lamb watches from the top. A ladder stands beside the wall.'),
 (39,'Mask Melon Mirror','man mop mud mug','The bright moon shines in the night sky. A man drinks milk from his mug. A monkey sits beside him eating a juicy mango.'),
 (41,'Nose Nuts Net','new nib now nut','A bird sits happily in its nest on the tree. A man catches fish with his net in the stream. A newspaper lies on the grass below.'),
 (43,'Orange Onion Olives','oak oil old out','The ox pulls a cart full of oranges. An ostrich picks one up and runs to the river. An octopus pops up to catch it.'),
 (45,'Parrot Peach Pumpkin','pay pen pin pot','A colourful peacock spreads its feathers. A cute panda eats a juicy pear. A little penguin stands happily beside them.'),
 (50,'Quill Quail Quilt','qin que qua','The queen writes on a long paper with her quill. She smiles as she finishes her work. Her helper holds a soft quilt for her.'),
 (52,'Rose Rocket Racket','rat red run rug','The rain falls softly on the green field. A rabbit jumps in the puddle near the rooster and the rhino. A bright rainbow shines in the sky.'),
 (54,'Sofa Soap Swan','sat sea sit sun','The bright sun shines over the green hill. A snake rests on the warm path beside a snail. A spider spins its web between the leaves.'),
 (56,'Toy Tree Tub','tub tap ten toy','A blue train moves fast on the track. A truck waits at the gate for it to pass. A tiger and a turtle watch from the side.'),
 (58,'Utensils Urn Umbrella','up us urn','The umpire stands on the cricket field. It starts to rain softly from the sky. He opens his colourful umbrella to stay dry.'),
 (63,'Vase Vest Violin','van vet veg','A van stops under a big tree. It is full of fresh vegetables. A vulture sits on a branch and looks down.'),
 (65,'Wheel Watch Wolf','wig win way web','A boy looks out from the window of the house. Another boy runs happily holding a big watermelon. Beside the house, a well with a wooden wheel stands.'),
 (67,'X-ray Xebec Xylophone','box fox mix fix','A kind doctor studies the X-ray of a chest. He stands beside the desk in a room. A colourful box marked with six is kept nearby.'),
 (69,'Yoghurt Yarn Yo-yo','yes you yak yet','A big yak eats grass near the water. One boy plays with a yo-yo while another eats yoghurt and yolk. A white yacht sails on the blue sea.'),
 (71,'Zoo Zebra Zero','zip zig zag zap','A family visits the zoo on a sunny day. The zebra stands quietly behind the fence. A tiger walks nearby in another cage.'),
]

# The colouring picture at the top of each tracing page, checked on the page, with the crayons it needs.
PICTURES = {
 'a':('alligator: green body, yellow eyes and belly','green yellow black'),
 'b':('butterfly: bright wings in yellow, orange, pink and blue','yellow orange pink blue black'),
 'c':('cat: orange fur, pink nose','orange pink black'),
 'd':('duck: yellow body, orange beak','yellow orange black'),
 'e':('elephant: grey body, pink ears','grey pink black'),
 'f':('Pakistan flag: dark green and white, brown pole','dark_green brown black'),
 'g':('goat: brown and light brown coat','brown light_brown black'),
 'h':('horse: brown coat','brown black'),
 'i':('insect: green body, light blue wings, pink legs','green light_blue pink black'),
 'j':('jug: blue','blue light_blue black'),
 'k':('kangaroo: brown and light brown, pink ears','brown light_brown pink black'),
 'l':('lotus: pink flower, green leaf','pink green black'),
 'm':('monkey: brown fur, light brown face','brown light_brown black'),
 'n':('nest: brown twigs, green leaves','brown green black'),
 'o':('oranges: orange fruit, green leaves','orange green black'),
 'p':('parrot: green feathers, red beak','green red black'),
 'q':('queen: yellow crown with blue and red jewels, light brown face','yellow blue red light_brown black'),
 'r':('rabbit: light brown fur, pink nose','light_brown pink black'),
 's':('swan: white feathers shaded grey, orange beak, light blue water','grey orange light_blue black'),
 't':('tent: yellow and orange, green grass','yellow orange green black'),
 'u':('umbrella: red, blue, yellow and green','red blue yellow green black'),
 'v':('van: blue body, yellow lights, grey wheels','blue yellow grey black'),
 'w':('well: grey stones, brown wood, blue bucket','grey brown blue black'),
 'x':('xylophone: a different colour for each bar','red blue green yellow orange brown black'),
 'y':('yacht: red and yellow sails, blue water','red blue yellow black'),
 'z':('zebra: black stripes','black'),
}

# The publisher's YouTube videos for each letter: Story, Vocabulary, Formation (None where no link was given yet).
VIDEOS = {
 'a':('kyk73kgbsNY','8LRdeZ1CjLw','EOw7ORXXIBQ'), 'b':('qNH9UW032hU','LM_xiRXKVBU','vterHXhwq1Y'),
 'c':('yZqA8MeIA3Y','2kcKxMDblfo','9OrVrT2AF48'), 'd':('5Q8Q2JzJxAk','hONQLud9RiA','Z9Q4nahB1V8'),
 # The list gave the Ee story link for Ee vocabulary too, so the vocabulary button waits for its own link.
 'e':('C43qbSuwU1Y',None,'tsInFbpD4pI'),          'f':('HVO5mTPaVuk','ak0f3fWOPVY','UfDKd-9YsQY'),
 'g':('HS2bngh69Xk','UakrEqf5YDg','amt2emI78no'), 'h':('fo2I8uSafII','4BAunzjP5A0','BlUO6aZNAs4'),
 'i':('YV79EpsG0S4','kmuPSZrh8To','aIKj_8Dtk9Q'), 'j':('T54YtTK1xdU','qCVzh4UtTyY','CbPxKJ4g6OQ'),
 'k':('NZ9YA5bQzTE','L68Y7Zn8CS0','H_H_ymXzKb8'), 'l':('9zdrAdkMhkc','kXTwB_EkYRI','lpum8gmjWhU'),
 'm':('vm0Kn9tEixg','QrIVbK1MNBQ','mFbcwpCRF8M'), 'n':('On3yMSiBaQM','GI5j6q3gPyY','Qbe2pO70iGI'),
 'o':('omjWyZXm_08','yO7TPeKZjQg','jx9F-195NB4'), 'p':('40UYNpbSLQA','ApQcbF_gXTw','uMnYzTpy8No'),
 'q':('3zdaMjSDckI','qZa3AfIl-kU','pv6Ksg20BQE'), 'r':('MNH-1bUEXC4','S6K8qG_tho4','Z0fKCef8n1o'),
 's':('4cQOh2tlIlE','w6Vb52dyb9U','Llgk0M8c_0w'), 't':('SkWj2x2AVeQ','SknKYFt3how','h61BpjHWNAw'),
 'u':('R-AhNwKKVZM','rMW-Rw3GI8Q','loeG8rO8zFk'), 'v':('PXqvTnp6FNM','OjBc2fMJf_w','c5ME830KUDw'),
 'w':('A_PdM77QAD4','tLsgjBAAO1M','22iS7-s1rA8'), 'x':('7YEmlaTssO4','555-UmQAtkw','AlQDgacbjdU'),
 'y':('tHuDe-GE_hA','pwp-GcQqVWk','B-x2hNh6DYY'), 'z':('gOS5OXO9msQ','df4nhryuFLg','YzjN9oJkRmE'),
}

def lesson_videos(letter):
    """Story and Vocabulary buttons, stacked at the top left of the big picture."""
    out=[]
    for (title,icon,y),vid in zip([('Story','📖',23),('Vocabulary','🔤',27.5)],VIDEOS[letter][:2]):
        if vid: out.append({'type':'videos','label':title,'icon':icon,'title':f'{title} of letter {letter.upper()}{letter}',
                            'button':{'x':3,'y':y},'videos':[{'title':title,'src':'https://youtu.be/'+vid}]})
    return out

def scene(page, text, cx=50, cy=45, width=90):
    return {'page':page,'from':{'cx':cx,'cy':cy,'w':width},
            'to':{'cx':cx,'cy':cy,'w':max(26,width-12)},'text':text}

def story(page,title,text,scenes=None,button=None):
    return {'type':'story','label':title,'title':title,'icon':'📖',
            'button':button or {'x':6,'y':3},'scenes':scenes or [scene(page,text)]}

def game(title,items,crop,button=None):
    # Each target is a picture or printed answer actually present in this edition.
    return {'type':'game','title':title,'button':button or {'x':67,'y':3},
            'crop':dict(zip(('x','y','w','h'),crop)),
            'targets':[{'name':name,'x':x,'y':y,'w':w,'h':h,'say':say}
                       for name,x,y,w,h,say in items]}

def cluster(values,gap=4):
    groups=[]
    for value in values:
        if not groups or value-groups[-1][-1]>gap: groups.append([value])
        else: groups[-1].append(value)
    return [int(np.mean(group)) for group in groups]

def trace_marks(page,letter):
    """Extract masks only from actual dotted capital/small glyphs in the writing grid.

    Find the three long ruled writing rows, then isolate the dark printed dots.
    Capitals sit on the row's top rule (the top of A, the bar of T), so each row is
    read from a little above that rule. The rules are light grey and the dots are
    near-black, so a dark threshold keeps the dots and drops the rules. Letters are
    split where a run of empty columns separates them.
    """
    im=cv2.imread(str(ROOT/f'books/{BOOK}/p{page:03}.jpg'))
    h,w=im.shape[:2];gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY)
    low=(im.max(axis=2).astype(int)-im.min(axis=2)<35)
    lines=cv2.morphologyEx(((gray<220)&low).astype('uint8'),cv2.MORPH_OPEN,np.ones((1,int(w*.48)),np.uint8))
    ys=cluster(np.flatnonzero(lines.sum(axis=1)>w*.48))
    # Tables have top/bottom lines at ~35–75% of the page; ignore picture edges.
    ys=[y for y in ys if h*.32<y<h*.76]
    # Every writing row is about 7% of the page tall. Faint guide lines inside a row are skipped.
    candidates=[]
    for a in ys:
        b=next((b for b in ys if h*.065<b-a<h*.078),None)
        if b and (not candidates or a>candidates[-1][1]): candidates.append((a,b))
    # The first row's bottom is also the divider across the large model cell.
    if page==66:
        candidates=[(int(h*a/100),int(h*b/100)) for a,b in [(38.9,45.9),(48.2,55.2),(57.5,64.6)]]
    if len(candidates)!=3:
        raise ValueError(f'Page {page}: expected three writing rows, got {[(round(a/h*100,1),round(b/h*100,1)) for a,b in candidates]}')
    marks=[]
    for row,(top,bottom) in enumerate(candidates):
        left=int(w*(.56 if row==0 else .40 if row==1 else .11));right=int(w*.92)
        # Tails of g, j, p, q and y end on the bottom rule, so read a little below it too.
        y0=top-int(h*.012);y1=bottom+int(h*.008)
        cut=im[y0:y1,left:right];g=cv2.cvtColor(cut,cv2.COLOR_BGR2GRAY)
        mask=((g<140)&(cut.max(axis=2).astype(int)-cut.min(axis=2)<60)).astype('uint8')
        # Join the dots of one letter (they are a few pixels apart in every direction).
        joined=cv2.dilate(mask,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(GAP,GAP)))
        _,_,stats,_=cv2.connectedComponentsWithStats(joined)
        # A part cut by the left edge belongs to the solid model letters, not the dotted row.
        parts=sorted([list(s[:4]) for s in stats[1:] if s[4]>20 and s[0]>0],key=lambda s:s[0])
        # The dot of i and j is a separate part above its stem: give it to the letter below it.
        boxes=[]
        for s in sorted(parts,key=lambda s:-s[3]):
            home=next((b for b in boxes if s[0]>=b[0]-3 and s[0]+s[2]<=b[0]+b[2]+3),None)
            if home and s[3]<h*.012:
                x=min(home[0],s[0]);y=min(home[1],s[1])
                home[2:]=[max(home[0]+home[2],s[0]+s[2])-x,max(home[1]+home[3],s[1]+s[3])-y];home[:2]=[x,y]
            elif s[3]>h*.012: boxes.append(s)
        r=GAP//2
        boxes=sorted([(x+r,y+r,bw-2*r,bh-2*r) for x,y,bw,bh in boxes],key=lambda s:s[0])
        expected=(4,6,10)[row]
        if len(boxes) not in ((8,10) if row==2 else (expected,)): raise ValueError(f'Page {page} row {row}: {len(boxes)} glyphs, expected {expected}; {boxes}')
        for k,(x0,yy,bw,bh) in enumerate(boxes):
            xx=x0+bw;yb=yy+bh
            dot=mask[yy:yb,x0:xx]
            box=[(left+x0)/w*100,(y0+yy)/h*100,(xx-x0)/w*100,(yb-yy)/h*100]
            px,py=dot.shape[1]//4,dot.shape[0]//4
            # Join the dots into one smooth line, as tools/ink.py does for English 3+, so the child's
            # finger colours a solid letter and the reader can follow the letter's middle line.
            # The letter is padded first so the line keeps its full width at the box edge.
            line=np.zeros((dot.shape[0]+2*py,dot.shape[1]+2*px),np.uint8);line[py:py+dot.shape[0],px:px+dot.shape[1]]=dot
            unit=max(3,min(int(w*.006),int(dot.shape[0]*.08)));ell=lambda n:cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(n,n))
            line=cv2.erode(cv2.dilate(line,ell(unit*2+1)),ell(unit))
            line=cv2.GaussianBlur(line.astype(np.float32),(3,3),0)
            rgba=np.zeros(line.shape+(4,),np.uint8)
            rgba[:,:,:3]=(111,47,214);rgba[:,:,3]=np.clip(line*255,0,255).astype(np.uint8)
            path=f'books/{BOOK}/ink/p{page:03}_{row}_{k}.png'
            cv2.imwrite(str(ROOT/path),rgba)
            padded=[box[0]-px/w*100,box[1]-py/h*100,rgba.shape[1]/w*100,rgba.shape[0]/h*100]
            mark={'glyph':letter.upper() if k%2==0 else letter,
                  'box':[round(v,3) for v in box],
                  'ink':{'src':path,'box':[round(v,3) for v in padded]}}
            # This book's small i and j have their dot inside the letter box: stem first, then the dot.
            if k%2 and letter in SMALL_PENS: mark['pen']=SMALL_PENS[letter]
            marks.append(mark)
    return marks

SMALL_PENS={'i':'M.1 .26V.82C.12 .98 .5 1 .95 .8M.1 0V.04',
            'j':'M.92 .17V.78C.92 1.02 .3 1.04 .02 .9M.92 0V.03'}

def main():
    (ROOT/f'books/{BOOK}/ink').mkdir(exist_ok=True)
    palette_path=ROOT/'books/colour-palettes.json';palettes=json.loads(palette_path.read_text(encoding='utf-8'))
    reviewed={str(p):{'picture':'Reading, matching or writing: black pencil','colours':['black']} for p in range(1,81)}
    acts={};texts={}
    for letter,(page,vocabulary,building,sentence) in zip('abcdefghijklmnopqrstuvwxyz',LESSONS):
        words=vocabulary.split();wordlist=building.split();tracepage=page+1
        lesson=f'Letter {letter.upper()} and {letter}. {sentence} '+'. '.join(words)+'.'
        # The publisher's videos replace the home-made story, as in English 3+.
        acts[page]=[*lesson_videos(letter),
                    game(f'Find the {letter.upper()} words',[(word, x,66,27,17,f'{word}.') for word,x in zip(words,(6,35,65))],(4,65,91,20),{'x':73,'y':63})]
        marks=trace_marks(tracepage,letter)
        picture,colours=PICTURES[letter]
        reviewed[str(tracepage)]={'picture':picture,'colours':[c.replace('_',' ') for c in colours.split()]}
        steps=[{'say':f'Trace capital {letter.upper()} and small {letter}.','marks':marks[:4]},
               {'say':'Trace the next row from left to right.','marks':marks[4:10]},
               {'say':'Finish the last row. Now colour the picture and complete the printed exercise.','marks':marks[10:]}]
        acts[tracepage]=[{'type':'fill','title':f'Trace and colour {letter.upper()}{letter}',
                          'colours':[palettes['colours'][c] for c in reviewed[str(tracepage)]['colours']], 'steps':steps,
                          # "How to write" in the trace panel, as in English 3+
                          'video':{'title':f'How to write {letter.upper()}{letter}','src':'https://youtu.be/'+VIDEOS[letter][2]}}]
        texts[page]=lesson;texts[tracepage]=f'Word building. {", ".join(wordlist)}. Trace capital {letter.upper()} and small {letter}. Colour the picture and complete the exercise.'
    # The printed pre-writing page: trace the house and write your own name.
    reviewed['5']={'picture':'Trace and colour the house, cloud and grass','colours':['red','brown','blue','green','black']}
    acts[5]=[story(5,'Pre-writing skills','Trace and colour the house. My name is Asim. What is your name? Write your name in the box.',button={'x':3,'y':3}),
             {'type':'fill','title':'Trace the house','colours':[palettes['colours'][c] for c in reviewed['5']['colours']],
              'steps':[{'say':'Trace the roof.','marks':[{'line':[29,39,61.3,20.5]},{'line':[61.3,20.5,94,39]},{'line':[94,39,29,39]}]},
                       {'say':'Trace the walls. Then colour the house and write your own name.','marks':[{'line':[33.5,39,33.5,66]},{'line':[33.5,66,89.5,66]},{'line':[89.5,66,89.5,39]}]}]}]
    # Reviewed exercise pages; prompts come directly from each printed page.
    exercises={
      14:'Look at the pictures and circle the correct letter. Connect the pictures that begin with B, then write B b.',
      15:'Which pictures begin with the same sound? Circle them. Match each letter to its picture and write the missing letter.',
      25:'Circle pictures beginning with E, F, G and H. Listen to each printed word and circle its picture.',
      26:'Say each picture name and circle its beginning letter. Write the capital beginning letter below each picture.',
      36:'Write the first letter of each picture in capital and small letters. Circle the correct beginning letter.',
      37:'Match each coloured key to the matching colour word. Then match pictures that begin with the same sound.',
      47:'Write the first letter of each picture in capital and small letters. Match letters M, N, O and P with the correct pictures.',
      48:'Trace and colour objects beginning with O. Say each picture name and circle the correct beginning letter.',
      60:'Write the first letter of each picture in capital and small letters. Circle the correct beginning letter and match pictures with the same sound.',
      61:'Match and write the beginning letters: sun, truck, rhino, quill and umbrella.',
      73:'Write the first letter of each picture in capital and small letters. Match W, V, X, Z and Y with the correct picture.',
      74:'Circle the correct first letter: vest, yarn, wheel, xylophone, watch and zoo.',
      75:'Write capital and small letters from A a to Z z. The first pair has been done for you.',
      76:'The five vowels are A, E, I, O and U. Trace and colour the vowels. Colour the picture using its code: A yellow, E green, I brown, O blue and U red.',
      77:'All letters other than vowels are consonants. Choose the correct beginning consonant for clock, fish, hen, juice, lamp, mango, snake, watch and zip.',
      78:'Listen to beginning, middle and ending sounds. Cat, box, hen, van. Ant, pen, zip, mug. Car, top, pin, hat. Write the missing sounds in cap, log, fox and net.',
      79:'Use a before a consonant sound: a hat, a jeep, a deer. Use an before a vowel sound: an onion, an elephant, an umbrella. Write a or an for duck, orange, swan, igloo and ice cream.',
      80:'Read double letter sounds: ball, hiss, puff, buzz, fell, hill. Read rhyming words: cat and mat, fan and pan, dog and log, hen and pen.',
    }
    # Only these revision pages request colouring; the rest keep a black pencil.
    reviewed['48']={'picture':'Colour the O objects: octopus, orange, ox and onion','colours':['purple','orange','brown','pink','green']}
    reviewed['76']={'picture':'Printed vowel colour code','colours':['yellow','green','brown','blue','red']}
    for page,text in exercises.items(): acts[page]=[story(page,'Practise this page',text)];texts[page]=text
    # Blending pages retain the exact printed CVC words, read one cell at a time.
    blends={16:'jam cap rat fan dam map mat pan ram tap hat can',27:'red hen jet beg bed pea wet peg fed pet net leg',38:'bib lip fig pin rib kid wig fin nib rip dig bin',49:'pot top log box hot mop jog fox cot pop dog Bob',62:'bug bun nut cub mug run hut tub rug sun cut sub'}
    for page,wordline in blends.items():
        words=wordline.split();scenes=[];items=[]
        for i,word in enumerate(words):
            col=i%4;row=i//4;cx=16+col*23;cy=23+row*26
            scenes.append(scene(page,' '.join(word.lower())+'. '+word+'.',cx,cy,28))
            items.append((word,5+col*23,14+row*26,22,24,f'{word}.'))
        acts[page]=[story(page,'Blend to read','',scenes),game('Find the word',items,(4,12,92,79))]
        texts[page]='Blend to read. '+'. '.join(words)+'. Sound out the letters separately and blend them to read and write each word.'
    # Sound-recognition games on the printed revision pictures.
    for page,words in [(14,'apple cat doll ball duck aeroplane'),(26,'egg grapes hen fish fox gift'),(36,'joker jug lion igloo'),(47,'mirror parrot nest ostrich'),(60,'rooster rhino snail tiger'),(74,'vest yarn wheel xylophone watch zoo')]:
        cols=3 if page in (14,26) else 2 if page==74 else 4
        items=[]
        for i,word in enumerate(words.split()):
            col=i%cols;row=i//cols;x=5+col*(90/cols);y=(7+row*28 if page==74 else (14 if page in (14,26) else 13)+row*20)
            items.append((word,x,y,90/cols-2,19,f'{word} begins with {word[0]}.'))
        acts[page].append(game('Find the picture and its sound',items,(4,5 if page==74 else 10,92,85 if page==74 else 46)))
    additional_games={
      15:('Find matching beginning sounds',[(n, x, y, 20, 12, f'{n} begins with {n[0]}.') for n,x,y in [('axe',8,12),('bear',8,26),('cup',8,40),('alligator',8,54),('dolphin',39,12),('butterfly',39,26),('cake',39,40),('bus',39,54),('cap',70,12),('ant',70,26),('balloon',70,40),('cat',70,54)]],(4,10,92,58)),
      25:('Find the beginning sound',[(n,x,y,17,12,f'{n} begins with {n[0]}.') for n,x,y in [('egg',77,9),('fan',77,24),('grapes',20,39),('glass',58,39),('horse',77,53)]],(4,7,92,61)),
      37:('Match key colours',[(n,30,y,10,5,f'{n} key.') for n,y in [('pink',16),('purple',21),('orange',25),('brown',29)]],(6,10,86,28)),
      48:('Find the O objects',[(n,x,y,w,h,f'{n} begins with O.') for n,x,y,w,h in [('octopus',40,21,21,30),('orange',76,27,16,13),('ox',76,17,17,11),('onion',42,48,15,11)]],(5,12,90,49)),
      73:('Find the beginning sound',[(n,5+i%3*30,12+i//3*23,28,20,f'{n} begins with {n[0]}.') for i,n in enumerate(['xylophone','vulture','watermelon','zoo','yak','umbrella'])],(4,10,92,49)),
      77:('Find the consonant sound',[(n,5+i%3*31,51+i//3*15,15,10,f'{n} begins with {n[0]}.') for i,n in enumerate(['clock','fish','hen','juice','lamp','mango','snake','watch','zip'])],(4,48,92,46)),
      79:('Choose a or an',[(n,x,y,25,18,n+'.') for n,x,y in [('a duck',7,53),('an orange',37,53),('a swan',67,53),('an igloo',22,74),('an ice cream',54,74)]],(4,51,92,44)),
      80:('Find the rhyming word',[(n, x, y, 20, 17, f'{n}.') for n,x,y in [('cat',7,56),('mat',29,56),('fan',53,56),('pan',76,56),('dog',7,75),('log',29,75),('hen',53,75),('pen',76,75)]],(5,55,91,39)),
    }
    for page,(title,items,crop) in additional_games.items(): acts[page].append(game(title,items,crop))
    # All instructional pages are covered; front matter has no invented activity.
    assert set(acts)==set(range(5,81)), sorted(set(range(5,81))-set(acts))
    palettes['books'][BOOK]=reviewed
    palette_path.write_text(json.dumps(palettes,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    out='// Generated by tools/make_english4.py from the supplied English 4+ edition.\n'
    out+=f"window.BOOK_ACTIVITIES = window.BOOK_ACTIVITIES || {{}};\nwindow.BOOK_ACTIVITIES['{BOOK}'] = "
    out+=json.dumps(dict(sorted(acts.items())),ensure_ascii=False,indent=1)+';\n'
    (ROOT/'books/activities-english4.js').write_text(out,encoding='utf-8')
    # Authored narration is available to Listen for this raster-only source.
    texts[5]='Trace and colour the house. My name is Asim. What is your name? Write your name in the box.'
    (ROOT/f'books/{BOOK}/text.json').write_text(json.dumps([[[3,3,94,92,texts[p]]] if p in texts else [] for p in range(1,81)],ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
    print(f'English 4+: {len(acts)} instructional pages, {sum(len(a) for a in acts.values())} activities, tracing masks extracted from the printed rows.')

if __name__=='__main__': main()
