import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { MAX_DRAFT_BYTES, MAX_PDF_BYTES, MAX_PAGES } from './project.js';

GlobalWorkerOptions.workerSrc = workerUrl;
// Bundle fonts, character maps and image decoders locally, including for GitHub Pages.
const binaryAssets = import.meta.glob('/node_modules/pdfjs-dist/{cmaps,standard_fonts,wasm}/*.{bcmap,ttf,pfb,otf,wasm}', { eager: true, query: '?url', import: 'default' });
class LocalBinaryDataFactory {
  async fetch({ kind, filename }) {
    const directory = { cMapUrl: 'cmaps', standardFontDataUrl: 'standard_fonts', wasmUrl: 'wasm' }[kind];
    const url = binaryAssets[`/node_modules/pdfjs-dist/${directory}/${filename}`];
    if (!url) throw new Error(`PDF resource unavailable: ${filename}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Could not load a PDF font or image decoder.');
    return new Uint8Array(await response.arrayBuffer());
  }
}
const checkAbort = signal => { if (signal.aborted) throw new DOMException('Conversion cancelled', 'AbortError'); };
const canvasBlob = canvas => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not convert this page into an image.')), 'image/jpeg', .88));

export async function convertPdf(file, { signal, onProgress }) {
  if (!file || file.size > MAX_PDF_BYTES || !file.size) throw new Error('Choose a PDF smaller than 50 MB.');
  if (!(await file.slice(0, 1024).text()).includes('%PDF-')) throw new Error('This file is not a valid PDF.');
  checkAbort(signal);
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, useWorkerFetch: false, BinaryDataFactory: LocalBinaryDataFactory, cMapPacked: true, enableXfa: false });
  let passwordProtected = false;
  task.onPassword = () => { passwordProtected = true; void task.destroy(); };
  const cancel = () => { void task.destroy(); };
  signal.addEventListener('abort', cancel, { once: true });
  const canvas = document.createElement('canvas');
  const thumbnail = document.createElement('canvas');
  try {
    const pdf = await task.promise;
    checkAbort(signal);
    if (pdf.numPages > MAX_PAGES) throw new Error(`Choose a PDF with no more than ${MAX_PAGES} pages.`);
    const pages = [];
    let bytes = 0;
    for (let number = 1; number <= pdf.numPages; number++) {
      checkAbort(signal);
      const page = await pdf.getPage(number);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2.5, 1600 / Math.max(base.width, base.height)) });
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport, background: '#ffffff' }).promise;
      checkAbort(signal);
      const image = await canvasBlob(canvas);
      thumbnail.width = Math.max(1, Math.round(canvas.width / canvas.height * 180)); thumbnail.height = 180;
      thumbnail.getContext('2d').drawImage(canvas, 0, 0, thumbnail.width, thumbnail.height);
      const thumb = await canvasBlob(thumbnail);
      bytes += image.size + thumb.size;
      if (bytes > MAX_DRAFT_BYTES) throw new Error('Converted pages are too large. Split this PDF into smaller books.');
      pages.push({ number, image, thumbnail: thumb, width: canvas.width, height: canvas.height, activities: [] });
      onProgress({ completed: number, total: pdf.numPages });
      page.cleanup();
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    checkAbort(signal);
    return { version: 1, id: crypto.randomUUID(), title: file.name.replace(/\.pdf$/i, ''), fileName: file.name, seriesId: '', classId: '', subjectId: '', pages };
  } catch (error) {
    if (signal.aborted) throw new DOMException('Conversion cancelled', 'AbortError');
    if (passwordProtected) throw new Error('This PDF is password protected. Upload an unlocked copy.');
    throw new Error(error.message || 'This PDF could not be converted.');
  } finally {
    signal.removeEventListener('abort', cancel);
    canvas.width = canvas.height = thumbnail.width = thumbnail.height = 0;
    await task.destroy();
  }
}
