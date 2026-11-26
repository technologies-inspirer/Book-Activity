import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

// The bundled letter masks are 8-bit RGBA PNGs. Decode their alpha with Node's
// built-in zlib so the full printed-letter audit also runs in CI without Pillow.
export function readInkPng(path) {
  const png = readFileSync(path);
  if (png.readUInt32BE(0) !== 0x89504e47 || png[24] !== 8 || png[25] !== 6 || png[28] !== 0) throw new Error(`Expected a noninterlaced RGBA mask: ${path}`);
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20), chunks = [];
  for (let offset = 8; offset < png.length;) {
    const size = png.readUInt32BE(offset), type = png.toString('ascii',offset+4,offset+8);
    if (type === 'IDAT') chunks.push(png.subarray(offset+8,offset+8+size));
    offset += size+12;
  }
  const data = inflateSync(Buffer.concat(chunks)), stride = w*4, pixels = new Uint8Array(w*h*4);
  const paeth = (a,b,c) => {
    const p=a+b-c, x=Math.abs(p-a),y=Math.abs(p-b),z=Math.abs(p-c);
    return x<=y && x<=z ? a : y<=z ? b : c;
  };
  let offset=0;
  for(let y=0;y<h;y++) {
    const filter=data[offset++];
    if(filter>4) throw new Error('Unknown PNG filter');
    for(let x=0;x<stride;x++) {
      const i=y*stride+x,a=x>=4?pixels[i-4]:0,b=y?pixels[i-stride]:0,c=y&&x>=4?pixels[i-stride-4]:0;
      const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);
      pixels[i]=(data[offset++]+predictor)&255;
    }
  }
  const alpha=new Uint8Array(w*h);
  for(let i=0;i<alpha.length;i++) alpha[i]=pixels[i*4+3];
  return {w,h,alpha};
}
