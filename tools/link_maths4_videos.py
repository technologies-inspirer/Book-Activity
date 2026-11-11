"""Scan and resolve only QR codes printed in the supplied Maths 4+ edition.

Run from the repository root after import_maths4.py.
"""
import sys,json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
from pyzbar.pyzbar import decode,ZBarSymbol
from link_videos import fetch,videos_on,clean
import re,urllib.parse
book=Path('books/stemford-maths-4');qr={}
for p in range(1,73):
 im=Image.open(book/f'p{p:03}.jpg');hits=decode(im,symbols=[ZBarSymbol.QRCODE])
 if not hits: hits=decode(im.resize((im.width*2,im.height*2)),symbols=[ZBarSymbol.QRCODE]);scale=2
 else:scale=1
 if hits:
  hit=hits[0];r=hit.rect;qr[str(p)]={'url':hit.data.decode(),'box':[round(r.left/scale/im.width*100,2),round(r.top/scale/im.height*100,2),round(r.width/scale/im.width*100,2),round(r.height/scale/im.height*100,2)]}
print('QR codes',len(qr),flush=True)
def resolve(pair):
 p,item=pair
 try:
  final,body=fetch(item['url']);item['videos']=videos_on(body);m=re.search(r'utm_campaign=([^&]+)',final);item['title']=urllib.parse.unquote_plus(m.group(1)) if m else 'Maths 4+ lesson'
  print(p,len(item['videos']),flush=True)
 except Exception as e: item['videos']=[];item['title']='';print(p,str(e),flush=True)
 return p,item
with ThreadPoolExecutor(max_workers=12) as pool:qr=dict(pool.map(resolve,qr.items()))
(book/'qr.json').write_text(json.dumps(qr,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
p=Path('books/library.js');head,data=p.read_text(encoding='utf-8').split('window.PDF_BOOKS = ',1);books=json.loads(data.rstrip(';\n'));next(b for b in books if b['id']=='stemford-maths-4')['qr']={p:i for p,i in qr.items() if i['videos']};p.write_text(head+'window.PDF_BOOKS = '+json.dumps(books,ensure_ascii=False,indent=1)+';\n',encoding='utf-8')
