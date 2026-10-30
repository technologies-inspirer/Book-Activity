import JSZip from 'jszip';

const HEADERS = ['School Name', 'Address', 'Username', 'City', 'Password'];
const MAX_XML = 10 * 1024 * 1024;
function xml(text) {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('Unsupported Excel document.');
  const document = new DOMParser().parseFromString(text, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('Invalid Excel XML.');
  return document;
}
async function readXml(zip, path) {
  const entry = zip.file(path);
  if (!entry || entry._data?.uncompressedSize > MAX_XML) throw new Error('Excel worksheet is missing or too large.');
  const text = await entry.async('string');
  if (text.length > MAX_XML) throw new Error('Excel worksheet is too large.');
  return xml(text);
}

export async function readSchoolWorkbook(file) {
  if (!file || file.size > 5 * 1024 * 1024 || !/\.xlsx$/i.test(file.name)) throw new Error('Choose an Excel .xlsx file smaller than 5 MB.');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const workbook = await readXml(zip, 'xl/workbook.xml');
  const relations = await readXml(zip, 'xl/_rels/workbook.xml.rels');
  const firstSheet = [...workbook.getElementsByTagName('sheet')].find(sheet => sheet.getAttribute('state') !== 'hidden' && sheet.getAttribute('state') !== 'veryHidden');
  const relationId = firstSheet?.getAttribute('r:id');
  const relationship = [...relations.getElementsByTagName('Relationship')].find(item => item.getAttribute('Id') === relationId);
  const target = relationship?.getAttribute('Target') || '';
  if (relationship?.getAttribute('TargetMode') === 'External' || !/^(?:\/?xl\/)?worksheets\/[\w.-]+\.xml$/.test(target)) throw new Error('Unsupported Excel worksheet.');
  const path = target.startsWith('/') ? target.slice(1) : target.startsWith('xl/') ? target : `xl/${target}`;
  let shared = [];
  if (zip.file('xl/sharedStrings.xml')) shared = [...(await readXml(zip, 'xl/sharedStrings.xml')).getElementsByTagName('si')].map(item => [...item.getElementsByTagName('t')].map(t => t.textContent).join(''));
  const sheet = await readXml(zip, path);
  const allRows = [...sheet.getElementsByTagName('row')];
  if (allRows.length > 501) throw new Error('Import no more than 500 schools at once.');
  const rows = allRows.map(row => {
    const values = [];
    for (const cell of row.getElementsByTagName('c')) {
      const letters = (cell.getAttribute('r') || '').match(/^[A-Z]+/)?.[0];
      if (!letters) continue;
      const column = [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
      if (column > 50) continue;
      if (cell.getElementsByTagName('f').length) throw new Error('Use plain values, not formulas, in the import file.');
      const value = cell.getElementsByTagName('v')[0]?.textContent || '';
      values[column] = cell.getAttribute('t') === 's' ? shared[Number(value)] || '' : cell.getAttribute('t') === 'inlineStr' ? [...cell.getElementsByTagName('t')].map(t => t.textContent).join('') : value;
    }
    return values;
  }).filter(row => row.some(value => value?.trim()));
  const header = rows.shift() || [];
  const columns = HEADERS.map(name => header.findIndex(value => value?.trim().toLowerCase() === name.toLowerCase()));
  if (columns.some(index => index < 0)) throw new Error(`Required Excel columns: ${HEADERS.join(', ')}.`);
  if (!rows.length) throw new Error('Add at least one school below the column headings.');
  return rows.map((row, index) => {
    const [name, address, email, city, password] = columns.map(column => String(row[column] || '').trim());
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) throw new Error(`Row ${index + 2}: enter a school name, valid email username and password of at least 8 characters.`);
    return { name, email, password, schoolProfile: { name, address, city, email }, allBooks: true, bookIds: [], expires: '' };
  });
}

export async function schoolImportTemplate() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
  zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Schools" sheetId="1" r:id="rId1"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
  zip.file('xl/worksheets/sheet1.xml', `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${HEADERS.map((name, index) => `<c r="${String.fromCharCode(65 + index)}1" t="inlineStr"><is><t>${name}</t></is></c>`).join('')}</row></sheetData></worksheet>`);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadSchoolTemplate(blob) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'school-register-template.xlsx'; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
