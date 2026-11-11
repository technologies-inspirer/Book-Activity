"""Reviewed Maths 4+ activities, using only this edition's pictures and guides.

No AI stories or borrowed videos. Story buttons wait for publisher-supplied
YouTube links in books/maths4-videos.json, keyed by image page (not number).
Run from the repo root after import_maths4.py.
"""
import json
from pathlib import Path
import cv2
import numpy as np
from ink import make_ink

ROOT=Path(__file__).resolve().parents[1]
BOOK='stemford-maths-4'
NUMBERS={1:(6,'lion'),2:(8,'ducks'),3:(10,'horses'),4:(12,'pandas'),5:(14,'balls'),
         6:(20,'cups'),7:(22,'birds'),8:(24,'cats'),9:(26,'balloons'),0:(28,'empty basket'),
         10:(30,'ladybugs'),11:(36,'vases'),12:(38,'oranges'),13:(40,'strawberries'),
         14:(42,'almonds'),15:(44,'squirrels'),16:(48,'caps'),17:(50,'books'),18:(52,'keys'),
         19:(54,'fish'),20:(56,'eggs')}
THEMES={1:'orange',2:'green',3:'purple',4:'teal',5:'orange',6:'pink',7:'blue',8:'orange',
        9:'green',0:'yellow',10:'red',11:'blue',12:'orange',13:'green',14:'purple',
        15:'orange',16:'teal',17:'orange',18:'green',19:'pink',20:'teal'}
CONCEPTS={5:'Comparison of sizes',18:'Comparison of heights',19:'Comparison of lengths',
          34:'Units and tens',47:'Few and many',58:'Colours',59:'Odd one out',60:'Before, after and between',
          66:'2D shapes',67:'Addition',69:'Subtraction',71:'Time',72:'Money'}

def read(path): return json.loads((ROOT/path).read_text(encoding='utf-8'))
def write(path,value): (ROOT/path).write_text(json.dumps(value,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
def rect(part,box,colour=None,all_surface=False):
    out={'part':part,'box':box}
    if colour:out['colour']=colour
    out['surface']='all' if all_surface else 'object'
    return out

def make_game(title,items,crop=None,button=None):
    # Each item: the printed picture/answer caption and its rectangle in page %.
    if crop is None:
        x=min(i[1] for i in items);y=min(i[2] for i in items)
        right=max(i[1]+i[3] for i in items);bottom=max(i[2]+i[4] for i in items)
        crop=[max(0,x-2),max(0,y-2),min(100,right+2)-max(0,x-2),min(100,bottom+2)-max(0,y-2)]
    return {'type':'game','title':title,'label':'Play','button':button or {'x':71,'y':2},
            'crop':dict(zip(['x','y','w','h'],crop)),
            'targets':[{'name':name,'x':x,'y':y,'w':w,'h':h,'say':name+'.'} for name,x,y,w,h in items]}

def clusters(values,gap=3):
    groups=[]
    for v in values:
        if not groups or v-groups[-1][-1]>gap:groups.append([v])
        else:groups[-1].append(v)
    return [int(np.mean(g)) for g in groups]

def cut_ink(page,box,glyph,dotted=False):
    if glyph=='line' or dotted:
        x,y,bw,bh=box;padded=[x-bw/4,y-bh/4,bw*1.5,bh*1.5]
        src=f'books/{BOOK}/ink/p{page:03}_{round(x*10)}_{round(y*10)}.png'
    else:src,padded=make_ink(BOOK,page,box)
    if glyph=='line' or dotted:
        # These guides are light grey, unlike the near-black number dots.
        im=cv2.imread(str(ROOT/f'books/{BOOK}/p{page:03}.jpg'));h,w=im.shape[:2]
        x,y,bw,bh=padded;x0=int(x*w/100);y0=int(y*h/100);x1=int((x+bw)*w/100);y1=int((y+bh)*h/100)
        crop=np.full((y1-y0,x1-x0,3),255,np.uint8)
        a,b,c,d=max(0,x0),max(0,y0),min(w,x1),min(h,y1)
        crop[b-y0:d-y0,a-x0:c-x0]=im[b:d,a:c]
        grey=cv2.cvtColor(crop,cv2.COLOR_BGR2GRAY)
        mask=((grey<(210 if dotted else 235))&(crop.max(axis=2).astype(int)-crop.min(axis=2)<35)).astype('uint8')
        inner=np.zeros_like(mask);py=int(mask.shape[0]/6);px=int(mask.shape[1]/6)
        inner[py:mask.shape[0]-py,px:mask.shape[1]-px]=1;mask*=inner
        mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(13,13)))
        mask=cv2.dilate(mask,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)))
        rgba=np.zeros((*mask.shape,4),np.uint8);rgba[:,:,:3]=(111,47,214);rgba[:,:,3]=mask*255
        cv2.imwrite(src,rgba)
    alpha=cv2.imread(src,cv2.IMREAD_UNCHANGED)[...,3]
    assert np.count_nonzero(alpha)>15,(page,box,glyph)
    return {'glyph':glyph,'box':box,'ink':{'src':src,'box':padded}}

def digits_in(page,box,value):
    """Read connected runs of the book's printed grey dotted digits, not invented fonts."""
    im=cv2.imread(str(ROOT/f'books/{BOOK}/p{page:03}.jpg'));h,w=im.shape[:2]
    x,y,bw,bh=box;x0=round(x/100*w);y0=round(y/100*h);x1=round((x+bw)/100*w);y1=round((y+bh)/100*h)
    crop=im[y0:y1,x0:x1];gray=cv2.cvtColor(crop,cv2.COLOR_BGR2GRAY)
    mask=(gray<210)&(crop.max(axis=2).astype(int)-crop.min(axis=2)<38)
    # Ignore neutral divider strokes at the centre of tens/units cells.
    for col in range(mask.shape[1]):
        if mask[:,col].mean()>.88:mask[:,col]=False
    # Remove full-length rules, keeping the shorter printed digit 1.
    v=cv2.morphologyEx(mask.astype('uint8'),cv2.MORPH_OPEN,np.ones((max(3,int(mask.shape[0]*.94)),1),np.uint8))
    hline=cv2.morphologyEx(mask.astype('uint8'),cv2.MORPH_OPEN,np.ones((1,max(3,int(mask.shape[1]*.94))),np.uint8))
    mask &= ~(v.astype(bool)|hline.astype(bool))
    # Horizontal/vertical rules are excluded by the reviewed cell inset.
    active_y=np.flatnonzero(mask.any(axis=1))
    if not len(active_y) or active_y[-1]-active_y[0] < h*.018:return []
    cols=np.flatnonzero(mask.sum(axis=0)>2)
    # Tens/units are printed in separate equal-width cells. Group each
    # digit's fragments inside its own cell (4 often has separated columns).
    runs=[]
    for k in range(len(str(value))):
        part=[v for v in cols if k*mask.shape[1]/len(str(value)) <= v < (k+1)*mask.shape[1]/len(str(value))]
        assert part,(page,box,value,k)
        runs.append(part)
    out=[]
    for digit,run in zip(str(value),runs):
        xx0,xx1=run[0],run[-1]+1;ys=np.flatnonzero(mask[:,xx0:xx1].any(axis=1))
        b=[round((x0+xx0)/w*100,3),round((y0+ys[0])/h*100,3),round((xx1-xx0)/w*100,3),round((ys[-1]-ys[0]+1)/h*100,3)]
        out.append(cut_ink(page,b,digit,dotted=True))
    return out

def header_digits(page,value):
    im=cv2.imread(str(ROOT/f'books/{BOOK}/p{page:03}.jpg'));h,w=im.shape[:2]
    x0=int(w*.17);y0=int(h*.03);crop=im[y0:int(h*.215),x0:int(w*.43)]
    mask=(crop.min(axis=2)>225).astype('uint8')
    _,_,stats,_=cv2.connectedComponentsWithStats(mask)
    boxes=sorted([s for s in stats[1:] if s[3]>h*.07 and s[2]>w*.006],key=lambda s:-s[4])[:len(str(value))]
    assert len(boxes)==len(str(value)),(page,value,'header')
    boxes=sorted(boxes,key=lambda s:s[0]);marks=[]
    for digit,(x,y,bw,bh,_) in zip(str(value),boxes):
        box=[round((x0+x)/w*100,3),round((y0+y)/h*100,3),round(bw/w*100,3),round(bh/h*100,3)]
        marks.append(cut_ink(page,box,digit))
    return marks

def worksheet_grid(page,value):
    # Grey grid: first top-left cell is absent, first top digit is the model.
    # Detect its long horizontal rules so every blank cell gets its own pencil clip.
    im=cv2.imread(str(ROOT/f'books/{BOOK}/p{page:03}.jpg'));h,w=im.shape[:2]
    gray=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY);low=im.max(axis=2).astype(int)-im.min(axis=2)<30
    band=((gray<210)&low).astype('uint8');band[int(h*.35):]=0
    lines=cv2.morphologyEx(band,cv2.MORPH_OPEN,np.ones((1,int(w*.30)),np.uint8))
    ys=[v for v in clusters(np.flatnonzero(lines.sum(axis=1)>w*.30)) if h*.035<v<h*.34]
    assert len(ys)==5,(page,'grid rows',ys)
    top,bottom=ys[0]/h*100,ys[-1]/h*100
    # Repeated vertical rules determine this edition's four or five columns.
    cut=band[ys[1]+5:ys[-1]-5]
    xs=[v for v in clusters(np.flatnonzero(cut.mean(axis=0)>.85)) if w*.07<v<w*.8]
    assert len(xs) in (5,6),(page,'grid columns',xs)
    boxes=[]
    for row,(a,b) in enumerate(zip(ys,ys[1:])):
        for col,(c,d) in enumerate(zip(xs,xs[1:])):
            if row==0 and col==0:continue
            boxes.append(rect(f'writing cell {row+1}-{col+1}',[round(c/w*100+.3,3),round(a/h*100+.25,3),round((d-c)/w*100-.6,3),round((b-a)/h*100-.5,3)],all_surface=True))
    marks=[]
    for c,d in zip(xs[2:],xs[3:]):
        box=[c/w*100+1,top+.8,(d-c)/w*100-2,(ys[1]-ys[0])/h*100-1.6]
        marks+=digits_in(page,box,value)
    return boxes,marks,top,bottom

def answer_boxes(page):
    """Find the real empty coloured answer frames, not approximate offsets.

    A candidate must be a nearly solid white rectangle/circle with a coloured
    enclosing border. Black picture outlines and the open white page are excluded.
    """
    im=cv2.imread(str(ROOT/f'books/{BOOK}/p{page:03}.jpg'));h,w=im.shape[:2]
    white=(im.min(axis=2)>238).astype('uint8')
    _,_,stats,_=cv2.connectedComponentsWithStats(white)
    out=[]
    for x,y,bw,bh,area in stats[1:]:
        if not (w*.03<bw<w*.22 and h*.015<bh<h*.10 and h*.33<y<h*.94 and area/(bw*bh)>.77):continue
        ring=im[max(0,y-4):min(h,y+bh+4),max(0,x-4):min(w,x+bw+4)]
        saturated=ring.max(axis=2).astype(int)-ring.min(axis=2)>45
        border=saturated.copy();border[4:-4,4:-4]=False
        if border.sum()<2*(bw+bh)*.10:continue
        out.append(rect('answer frame',[round(x/w*100,3),round(y/h*100,3),round(bw/w*100,3),round(bh/h*100,3)],all_surface=True))
    return out

def main():
    palette=read('books/colour-palettes.json');regions=read('books/colour-regions.json')
    colours=palette['colours'];pages={str(p):{'picture':'Writing and answers: black pencil','colours':['black']} for p in range(1,73)}
    areas={};acts={};summary=[]
    videos_path=ROOT/'books/maths4-videos.json'
    if not videos_path.exists():write('books/maths4-videos.json',{})
    videos=read('books/maths4-videos.json')
    def set_palette(page,names,note):pages[str(page)]={'picture':note,'colours':names.split()}
    def fill(page,title,steps=None):
        return {'type':'fill','title':title,'drawingMode':'regions','colours':[colours[c] for c in pages[str(page)]['colours']],
                'steps':steps or [{'say':'Complete the printed exercise. Write your answers in the spaces provided.','marks':[]}]}
    def story_button(page,title):
        link=videos.get(str(page),{}).get('Story')
        return {'type':'videos','label':'Story','icon':'\U0001f4d6','title':'Story: '+title,'button':{'x':5,'y':21},
                'pending':not bool(link),'videos':[{'title':'Story','src':link}] if link else []}
    # Number picture pages: trace the large number and colour exactly N beads.
    for n,(p,thing) in NUMBERS.items():
        theme=THEMES[n];set_palette(p,theme+' black',f'Trace {n} and colour {n} beads')
        marks=header_digits(p,n)
        # Beads are in one row up to ten; 11-20 use two rows of ten.
        im=cv2.imread(str(ROOT/f'books/{BOOK}/p{p:03}.jpg'));h,w=im.shape[:2]
        # Use reviewed bead row positions from the actual printed pages.
        if n>=11:centres=[(21.1+i*7.27,y) for y in (77.8,83.0) for i in range(10)]
        else:centres=[(20.9+i*7.55,80.2) for i in range(10)]
        areas[str(p)]=[rect('bead '+str(i+1),[x-2.9,y-2.2,5.8,4.4],colours[theme]) for i,(x,y) in enumerate(centres)]
        steps=[{'say':f'Trace the number {n}.','marks':marks}]
        if n:steps.append({'say':f'Colour {n} beads. Count as you colour.', 'marks':[{'scribble':colours[theme],'cx':x,'cy':y,'rx':1.9,'ry':1.25} for x,y in centres[:n]]})
        acts[p]=[story_button(p,f'Number {n}'),fill(p,f'Trace {n} and count the beads',steps)]
        # A separate count game highlights the printed bead positions; no AI story.
        acts[p].append(make_game('Count the beads',[(f'bead {i+1}',x-2.4,y-1.8,4.8,3.6) for i,(x,y) in enumerate(centres[:max(1,n)])],button={'x':63,'y':72}))
        summary.append({'number':n,'picturePage':p,'tracePage':None if n==0 else p+1,'objects':thing})
        if n==0:
            # Zero's writing exercise is on the picture page itself.
            for x in (40,53.5):marks+=digits_in(p,[x,34.5,6,5],0)
            areas[str(p)]+=[rect('zero writing cell',[9.3+i*13.5,34.3+row*6.9,13.1,6.4],all_surface=True) for row in (0,1) for i in range(6) if row or i>0]
            areas[str(p)].append(rect('empty basket tick',[47.4,66,5.5,4],all_surface=True))
            continue
        q=p+1;boxes,small,top,bottom=worksheet_grid(q,n);areas[str(q)]=boxes
        set_palette(q,'black',f'Trace and write {n}; complete the printed counting exercise')
        acts[q]=[fill(q,f'Trace and write {n}',[{'say':f'Trace the printed number {n}. Then write more numbers in the empty cells.','marks':small}])]
        # The object-counting answer area is separate from the tracing grid.
        if n>=11:
            areas[str(q)]+=[rect('count answer',[58,55,33,8],all_surface=True)]
            objects={11:('fish','plums','stars','watermelons'),12:('flowers','butterflies','hearts','fish'),13:('bees','pots','almonds','oranges'),14:('apples','caps','hearts','bees'),15:('chicks','butterflies','stars','balls'),16:('strawberries','pears','flags','pineapples'),17:('balloons','oranges','birds','bees'),18:('birds','aeroplanes','chicks','cakes'),19:('bananas','balls','apples','birds'),20:('pencils','caps','cakes','bananas')}[n]
            acts[q].append(make_game('Count the printed groups',[(f'{n} {objects[0]}',8,39,83,19),(objects[1],7,66,27,18),(objects[2],36,66,27,18),(objects[3],65,66,27,18)],button={'x':73,'y':35}))
            for x in (7,36,65):areas[str(q)].append(rect('tick the correct number',[x,85,27,8],all_surface=True))
        else:
            # Cross-out instruction has its own clip; drawing cannot leave the exercise.
            areas[str(q)]+=[rect('cross out upper group',[67,10,25,10],all_surface=True),rect('cross out lower group',[67,22,25,10],all_surface=True)]
    # Specific colouring tasks on number worksheets, read from their printed prompts.
    worksheet_colours={7:('yellow black','Colour the sun yellow; colour the moon'),9:('brown grey black','Cow brown with black horns; rabbit grey'),
      11:('red yellow green black','Traffic lights red, yellow and green; triangle red'),13:('brown blue black','Horse brown; square blue'),
      15:('yellow red black','Star yellow; starfish red'),21:('red yellow pink black','Flower petals red; dice spots pink'),
      23:('red orange yellow green blue purple pink black','Seven rainbow colours'),25:('pink brown black','Octopus pink; eight balloons brown'),
      27:('green blue black','Tic-tac-toe board green; birthday candles blue'),31:('black','Colour the two hands and write ten')}
    for p,(names,note) in worksheet_colours.items():
        set_palette(p,names,note)
        # Two individual outline pictures keep strokes in the selected picture.
        areas[str(p)]+=[rect('left picture',[7,36,46,26]),rect('right picture',[53,38,42,24]),
                       rect('left picture count',[33,62,9,5],all_surface=True),rect('right picture count',[81,62,9,5],all_surface=True)]
        # Lower object counts are written in three discrete answer boxes.
        if p not in (15,31):
            for y in (73,80,87):areas[str(p)].append(rect('object count answer',[83,y,9,5],all_surface=True))
        elif p==31:
            areas[str(p)]+=[rect('hand count',[78,59,10,6],all_surface=True)]
            for y in (72,81,89):areas[str(p)].append(rect('fruit count',[83,y,9,5],all_surface=True))
        else:areas[str(p)]+=[rect('match stars to numbers',[9,69,82,24],all_surface=True)]
        acts[p][0]['colours']=[colours[c] for c in pages[str(p)]['colours']]
    # Pre-writing tracks: exact dotted guide strips, individually clipped.
    acts[4]=[fill(4,'Pre-writing lines')];areas['4']=[]
    tracks=[('horizontal',[11,15,80,11]),('vertical',[11,29,80,17]),('zigzag',[11,49,80,9]),('zigzag',[11,60,80,9]),('upward curves',[11,71,80,11]),('downward curves',[11,83,80,11])]
    for name,box in tracks:areas['4'].append(rect(name,box,all_surface=True))
    # All other pages: distinct exercise spaces and games using actual page pictures.
    other={
      5:('Compare sizes',[('biggest animal',50,16,40,34),('smallest chick',71,55,16,12)],[rect('biggest answer',[39,83,10,6],all_surface=True)]),
      16:('Count fruit and fingers',[(name,x,y,24,16) for name,x,y in [('3 mangoes',6,16),('4 apples',53,16),('1 banana',6,39),('2 lemons',53,39),('5 strawberries',6,63)]], [rect('colour counting squares',[35,14,10,60],all_surface=True),rect('colour counting squares',[83,14,10,36],all_surface=True),rect('finger answers',[5,87,88,8],all_surface=True)]),
      17:('Match equal counts',[('4 butterflies',6,12,27,20),('5 spiders',34,23,28,20),('3 ladybirds',65,12,28,20)], [rect('number choices',[5,29,89,16],all_surface=True),rect('count answers',[27,56,66,8],all_surface=True),rect('matching numbers',[37,79,26,7],all_surface=True)]),
      18:('Compare heights',[('tallest giraffe',69,13,22,40),('shortest squirrel',71,62,20,13)],[rect('shortest answer',[82,84,10,6],all_surface=True)]),
      19:('Compare lengths',[('longest bus',49,17,43,26),('shortest bicycle',70,56,23,15)],[rect('longest answer',[22,86,10,7],all_surface=True)]),
      29:('Count the groups',[(name,x,y,35,17) for name,x,y in [('9 apples',8,29),('6 carrots',54,29),('7 stars',8,51),('5 bees',54,51),('4 chicks',8,74),('2 bags',54,74)]],[rect('numbers zero to nine',[10,15,78,6],all_surface=True)]+[rect('correct number',[x,y,32,6],all_surface=True) for x in (8,54) for y in (45,67,89)]),
      32:('Connect groups and numbers',[('5 ladybirds',8,14,33,13),('8 pencils',64,14,29,13),('0 objects',8,28,33,13),('2 bees',64,28,29,13),('7 skittles',8,42,33,13),('9 fish',64,42,29,13)],[rect('match to number',[41,13,20,44],all_surface=True),rect('count answers',[7,84,86,6],all_surface=True),rect('zero to ten',[7,92,85,5],all_surface=True)]),
      33:('Count objects and write',[(f'row {i+1}',7,12+i*8.3,35,7) for i in range(10)],[rect('numeral and word answer row '+str(i+1),[43,12+i*8.3,49,7],all_surface=True) for i in range(10)]),
      34:('Units and tens',[(str(n),8+(n-1)%4*22,14+(n-1)//4*25,20,24) for n in range(1,9)]+[('9',8,64,20,24)],[rect('trace number',[8+(n-1)%4*22,34+(n-1)//4*25,20,7],all_surface=True) for n in range(1,9)]+[rect('nine',[8,84,20,7],all_surface=True),rect('tens and units answer',[72,81,20,12],all_surface=True)]),
      35:('Count tens and units',[('11',8,13,38,18),('12',54,13,38,18),('13',8,33,38,18),('14',54,33,38,18)],[rect('units answer',[78,20,13,8],all_surface=True),rect('units answer',[32,40,13,8],all_surface=True),rect('units answer',[78,40,13,8],all_surface=True),rect('correct number choices',[7,70,86,23],all_surface=True)]),
      46:('Count each group',[('10 hearts',6,43,41,20),('15 balls',53,43,41,20),('12 pots',6,69,41,19),('6 flowers',53,69,41,19)],[rect('circle 15',[7,14,86,22],all_surface=True)]+[rect('correct total',[x,y,39,6],all_surface=True) for x in (7,54) for y in (62,88)]),
      47:('Few and many',[('few fish',9,17,39,32),('many fish',52,17,39,32),('many ice creams',53,58,40,15),('few objects',52,81,40,12)],[rect('many tick',[84,68,9,6],all_surface=True),rect('few cross',[84,87,9,6],all_surface=True)]),
      58:('Name the colours',[('red strawberry',35,15,20,16),('red tomato',63,12,28,19),('yellow lemon',40,36,17,13),('yellow mango',64,34,29,16),('blue hat',36,56,21,13),('blue igloo',58,53,35,17),('green grapes',35,73,24,16),('green flag',60,73,33,16)],[rect(name,[x,y,w,h],colours[name.split()[0]]) for name,x,y,w,h in [('red strawberry',35,15,20,16),('red tomato',63,12,28,19),('yellow lemon',40,36,17,13),('yellow mango',64,34,29,16),('blue hat',36,56,21,13),('blue igloo',58,53,35,17),('green grapes',35,73,24,16),('green flag',60,73,33,16)]]),
      59:('Find the odd one out',[('lemon',73,12,20,18),('sandwich',72,37,23,16),('crocodile',7,58,24,13),('backpack',51,80,23,13)],[rect('odd object '+str(i),b,all_surface=True) for i,b in enumerate([[73,12,20,18],[72,37,23,16],[7,58,24,13],[51,80,23,13]])]),
      60:('Before, after and between',[('9 comes before 10',14,17,20,23),('10 is between 9 and 11',39,17,20,23),('11 comes after 10',65,17,20,23)],[rect('after answers',[29,49,13,19],all_surface=True),rect('before answers',[56,49,13,19],all_surface=True),rect('between answers',[26,78,14,20],all_surface=True),rect('before and after',[56,78,34,20],all_surface=True)]),
      66:('Match 2D shapes',[('square',79,20,12,9),('triangle',78,30,14,8),('rectangle',75,40,20,8),('circle',79,50,12,10)],[rect('matching exercise',[7,20,87,40],all_surface=True),rect('shape picture',[10,64,83,31])]),
      67:('Add the objects',[('1 pineapple',6,20,21,15),('2 pineapples',35,20,28,15),('3 pineapples',64,20,29,15),('4 balls',6,46,23,17),('2 balls',41,49,15,14),('6 balls',65,43,27,20)],[rect('ball sum',[10,63,78,7],all_surface=True),rect('apple sum',[10,91,78,7],all_surface=True)]),
      68:('Add each row',[('4 plus 2 caps',7,13,72,9),('3 plus 4 lemons',7,29,72,10),('3 plus 2 apples',7,47,72,10),('6 plus 3 leaves',7,63,72,10),('7 plus 3 flowers',7,80,72,11)],[rect('total answer '+str(i+1),[84,y,10,8],all_surface=True) for i,y in enumerate([13,30,47,64,81])]+[rect('number in group '+str(i),[x,y,9,6],all_surface=True) for i,(x,y) in enumerate((x,y) for x in (37,72) for y in (18,35,52,69,86))]),
      69:('Subtract the crossed objects',[('5 minus 2 equals 3',7,21,86,16),('7 minus 3 equals 4',7,49,70,12),('4 minus 2 equals 2',7,67,70,13),('9 minus 4 equals 5',7,84,70,8)],[rect('subtraction answer '+str(i),[84,y,10,7],all_surface=True) for i,y in enumerate([58,77,92])]),
      70:('Subtract with objects',[(name,7+(i%2)*46,12+(i//2)*20,40,17) for i,name in enumerate(['5 minus 3 equals 2','6 minus 2 equals 4','8 minus 5 equals 3','4 minus 3 equals 1','3 minus 1 equals 2','9 minus 2 equals 7','7 minus 3 equals 4','6 minus 0 equals 6'])],[rect('subtraction answer '+str(i),[36+(i%2)*46,24+(i//2)*20,10,6],all_surface=True) for i in range(1,8)]),
      71:('Read the clock',[('minute hand',23,17,28,27),('hour hand',51,17,28,27),('15 minutes',7,56,20,14),('30 minutes',29,56,20,14),('45 minutes',51,56,20,14),('60 minutes',73,56,20,14)],[rect('draw clock hands '+str(i),[8+i*22,82,18,14],all_surface=True) for i in range(4)]),
      72:('Recognise money',[('20 rupees',8,13,23,14),('10 rupees',32,13,23,14),('5 rupees',56,14,13,12),('2 rupees',70,14,12,12),('1 rupee',83,14,11,12)],[rect('correct coin or note',[9,35,83,14],all_surface=True)]+[rect('wallet amount '+str(i),[x,y,15,9],all_surface=True) for i,(x,y) in enumerate([(15,51),(43,51),(73,51),(30,78),(59,78)])]),
    }
    for p,(title,items,bounds) in other.items():
        if p==58:set_palette(p,'red yellow blue green black','Use the four printed colour codes')
        if p==66:set_palette(p,'blue yellow green red black','Square blue, circle yellow, triangle green, rectangle red')
        areas[str(p)]=bounds;acts[p]=[fill(p,title),make_game(title,items)]
        if p in CONCEPTS:acts[p].insert(0,story_button(p,title))
    # The colour-code shapes have individual boundaries and required colours.
    areas['66']=[rect('matching exercise',[7,19,87,34],all_surface=True)]
    for x,y,w,h in [(33.7+i*4,71.2,3,2.2) for i in range(6)]:
        areas['66'].append(rect('square window',[x,y,w,h],colours['blue']))
    for box in [[42.6,64.3,5.1,4.1],[35.2,75.6,5.4,4.0],[50,75.6,5.4,4.0],[74.3,63,12,9]]:
        areas['66'].append(rect('circle',box,colours['yellow']))
    for points in [[[33.1,70.8],[45.2,61],[57.4,70.8]],[[9.2,74],[19.7,62.6],[30.3,74]],[[61,79],[67.1,71],[73.2,79]],[[71.8,84],[74.7,80],[77.6,84]],[[78.1,84],[81.2,81],[84.3,84]]]:
        areas['66'].append({'part':'triangle','polygon':points,'colour':colours['green'],'surface':'object'})
    for box in [[16,74,7.5,14.5],[66,79,2,9.5],[73.8,84,1.7,4.5],[80.5,84,1.7,4.5],[42.2,81.3,6,7],[33.1,73.5,24.3,15]]:
        areas['66'].append(rect('rectangle',box,colours['red']))
    # Required colours printed beside each outline picture.
    for page,part,colour in [(7,'right picture','yellow'),(9,'left picture','brown'),(9,'right picture','grey'),(11,'right picture','red'),(13,'left picture','brown'),(13,'right picture','blue'),(15,'left picture','yellow'),(15,'right picture','red'),(21,'left picture','red'),(21,'right picture','pink'),(25,'left picture','pink'),(25,'right picture','brown'),(27,'left picture','green'),(27,'right picture','blue')]:
        for r in areas[str(page)]:
            if r['part']==part:r['colour']=colours[colour]
    for r in areas['9']:
        if r['part']=='right picture':r['box']=[67,35,25,24]
    areas['9']=[rect('cow horn',[39.2,37.5,2.8,3],colours['black']),rect('cow horn',[48.8,37.3,2.8,3.5],colours['black'])]+areas['9']
    areas['11']=[rect('red light',[33.6,41,6.2,4.7],colours['red']),rect('yellow light',[33.6,45.7,6.2,4.7],colours['yellow']),rect('green light',[33.6,50.4,6.2,5],colours['green'])]+areas['11']
    # Pre-writing demonstrates the actual printed dotted paths (not the arrows).
    track_boxes=[[13.3,21.4,73.1,1.0],[13.3,24.8,73.1,1.0]]
    pre=cv2.imread(str(ROOT/f'books/{BOOK}/p004.jpg'));ph,pw=pre.shape[:2]
    band=(pre[int(ph*.30):int(ph*.42)].min(axis=2)>235).astype('uint8')
    _,_,stats,_=cv2.connectedComponentsWithStats(band)
    capsules=sorted([v for v in stats[1:] if v[3]>ph*.065 and pw*.008<v[2]<pw*.04],key=lambda v:v[0])
    assert len(capsules)==11,('vertical tracks',len(capsules))
    track_boxes += [[(x+bw/2)/pw*100-.45,31.8,.9,7.8] for x,y,bw,bh,_ in capsules]
    track_boxes += [[12.2,45.8,75.1,4.4],[12.2,57,75.1,4.1],[11.8,66.6,76.2,7.3],[11.8,79.5,76.2,7.1]]
    track_marks=[cut_ink(4,box,'line') for box in track_boxes]
    acts[4][0]['steps']=[{'say':'Start at the dot and follow each printed line.','marks':track_marks}]
    areas['4']=[rect('trace track '+str(i),[x-.5,y-.5,w+1,h+1],all_surface=True) for i,(x,y,w,h) in enumerate(track_boxes)]
    # Units-and-tens page: its own nine dotted digits and the ten pair.
    marks=[];areas['34']=[]
    for n in range(1,10):
        x=13.8+((n-1)%4)*21.0;y=31.0+((n-1)//4)*26.8
        marks+=digits_in(34,[x,y,8.7,5.7],n)
        areas['34'].append(rect('write '+str(n),[x-1,y-1,10.7,7.7],all_surface=True))
    marks+=digits_in(34,[73.7,74,17.5,6],10)
    areas['34'] += [rect('tens and units cell',[73+i*10,y,9,5.7],all_surface=True) for i in (0,1) for y in (74,81,87.5)]
    acts[34][1]['steps']=[{'say':'Count the units and trace one to nine. Ten units make one ten. Trace ten.','marks':marks}]
    # Numbers 21-50: ten printed two-digit pairs per page, two rows of five.
    for p,first in [(61,21),(62,31),(63,41)]:
        marks=[];items=[];areas[str(p)]=[]
        for i in range(10):
            col=i%5;row=i//5;x=9.8+col*16.65;y=32.8+row*39.5;n=first+i
            marks+=digits_in(p,[x,y,13.8,5.4],n)
            items.append((str(n),x,18+row*39.5,13.8,21))
            areas[str(p)].append(rect('number '+str(n),[x,y,13.8,18],all_surface=True))
        acts[p]=[fill(p,f'Trace numbers {first} to {first+9}',[{'say':f'Trace the numbers from {first} to {first+9}. Count the tens and units.','marks':marks}]),make_game('Find the number',items)]
    # Tens page: the four printed model pairs 20, 30, 40, 50.
    areas['64']=[];marks=[];items=[]
    for i,n in enumerate((20,30,40,50)):
        x=7.5+i*23;marks+=digits_in(64,[x,42,20,7],n)
        areas['64'].append(rect(str(n)+' column',[x,42,20,51],all_surface=True));items.append((str(n),x,13,20,36))
    acts[64]=[fill(64,'Trace the tens',[{'say':'Trace twenty, thirty, forty and fifty.','marks':marks}]),make_game('Find the tens',items)]
    # Fifty printed 51-100 cells, left-to-right rows, ending with 100.
    areas['65']=[];marks=[];items=[]
    for row in range(10):
        for col in range(5):
            n=51+row+col*10
            if row==9 and col==4:n=100
            x=10.8+col*16.65;y=11.3+row*7.85
            marks+=digits_in(65,[x,y,13.2 if n!=100 else 14.5,5.1],n)
            areas['65'].append(rect('number '+str(n),[x-.5,y-.4,14.2 if n!=100 else 15.5,5.8],all_surface=True));items.append((str(n),x-.5,y-.4,14.2 if n!=100 else 15.5,5.8))
    acts[65]=[fill(65,'Trace numbers 51 to 100',[{'say':'Trace the printed numbers, reading tens and units carefully.','marks':marks}]),make_game('Find numbers 51 to 100',items)]
    assert set(acts)==set(range(4,73)),sorted(set(range(4,73))-set(acts))
    for page in acts:
        if page not in [58,66]+[p for p,_ in NUMBERS.values()]:areas[str(page)]=answer_boxes(page)+areas[str(page)]
    # Every worksheet fill gets its exact reviewed palette, including later overrides.
    for p,entries in acts.items():
        for a in entries:
            if a['type']=='fill':a['colours']=[colours[c] for c in pages[str(p)]['colours']]
    palette['books'][BOOK]=pages;regions[BOOK]=areas
    (ROOT/'books/colour-palettes.json').write_text(json.dumps(palette,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    # Keep other books' authored region formatting and only replace this book's block.
    region_path=ROOT/'books/colour-regions.json';original=region_path.read_text(encoding='utf-8')
    if BOOK not in json.loads(original):
        block=json.dumps({BOOK:areas},indent=2)[1:-1].strip('\n');region_path.write_text(original.rstrip()[:-1].rstrip()+',\n'+block+'\n}\n',encoding='utf-8')
    else:
        start=original.index('"'+BOOK+'"');value_start=original.index(':',start)+1
        while original[value_start].isspace():value_start+=1
        _,length=json.JSONDecoder().raw_decode(original[value_start:])
        value=json.dumps(areas,ensure_ascii=False,indent=2).replace('\n','\n  ')
        region_path.write_text(original[:value_start]+value+original[value_start+length:],encoding='utf-8')
    source='// Generated by tools/make_maths4.py; no AI stories or borrowed videos.\n'
    source+=f"window.BOOK_ACTIVITIES = window.BOOK_ACTIVITIES || {{}};\nwindow.BOOK_ACTIVITIES['{BOOK}'] = "+json.dumps(dict(sorted(acts.items())),ensure_ascii=False,indent=1)+';\n'
    (ROOT/'books/activities-maths4.js').write_text(source,encoding='utf-8')
    write(f'books/{BOOK}/text.json',[[] for _ in range(72)])
    write(f'books/{BOOK}/lessons.json',summary)
    print(f'Maths 4+: {len(acts)} instructional pages, {sum(len(a) for a in acts.values())} activities; all stories await supplied links.')

if __name__=='__main__':main()

