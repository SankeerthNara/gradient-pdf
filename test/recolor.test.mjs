// Self-check: node test/recolor.test.mjs — writes test/out/*.pdf for a visual look.
import assert from 'node:assert';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument, StandardFonts, rgb, degrees } from '@cantoo/pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { recolor } from '../src/recolor.js';
import { STYLES, customStyle } from '../src/styles.js';

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const a = doc.addPage([595, 842]);
a.drawText('Hello tabby. Vector text stays sharp.', { x: 50, y: 760, size: 22, font });
a.drawRectangle({ x: 50, y: 500, width: 200, height: 120, color: rgb(0.9, 0.3, 0.2) });
const b = doc.addPage([595, 842]);
b.setRotation(degrees(90));
b.drawText('Rotated page', { x: 50, y: 760, size: 22, font });
doc.addPage([400, 400]); // blank page, no content stream
const src = await doc.save();
mkdirSync('test/out', { recursive: true });
writeFileSync('test/out/source.pdf', src);

for (const style of [...STYLES, customStyle(40, 0), customStyle(0, 40, 1), customStyle(55, 90, 2)]) {
  const out = await recolor(src, style);
  writeFileSync(`test/out/${style.id}.pdf`, out);
  const pdf = await getDocument({ data: out.slice() }).promise;
  assert.equal(pdf.numPages, 3);
  const text = (await (await pdf.getPage(1)).getTextContent()).items.map((i) => i.str).join('');
  assert.match(text, /Vector text stays sharp/, `${style.id}: text must survive as real text`);
  assert.ok(out.length < src.length + 6000, `${style.id}: output should barely grow (${src.length} -> ${out.length})`);
}
// Password-protected input: export must work and stay locked with the same password.
const lockedDoc = await PDFDocument.load(src);
lockedDoc.encrypt({ userPassword: 'meow', ownerPassword: 'meow' });
const locked = await lockedDoc.save();
for (const style of [STYLES[1], STYLES[5], customStyle(40, 0)]) {
  const out = await recolor(locked, style, undefined, 'meow');
  await assert.rejects(getDocument({ data: out.slice() }).promise, /password/i, `${style.id}: output must stay locked`);
  const pdf = await getDocument({ data: out.slice(), password: 'meow' }).promise;
  const text = (await (await pdf.getPage(1)).getTextContent()).items.map((i) => i.str).join('');
  assert.match(text, /Vector text stays sharp/, `${style.id}: locked export keeps text`);
  writeFileSync(`test/out/locked-${style.id}.pdf`, out);
}
console.log('ok', STYLES.length + 3, 'styles + 3 password-protected');
