import {
  PDFDocument, PDFName, PDFDict, PDFOperator, PDFOperatorNames as Ops,
  pushGraphicsState as q, popGraphicsState as Q, setGraphicsState, setFillingRgbColor,
  rectangle, fill, clip, endPath,
} from '@cantoo/pdf-lib';
import { ANGLE } from './styles.js';

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

// Axial shading matching CSS linear-gradient(angle) across `box` (PDF space, y up).
function shading(ctx, stops, angleDeg, box) {
  const cols = stops.map(rgb);
  const parts = cols.slice(1).map((c, i) => ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: cols[i], C1: c, N: 1 }));
  const fn = parts.length === 1 ? parts[0] : ctx.obj({
    FunctionType: 3, Domain: [0, 1], Functions: parts,
    Bounds: parts.slice(1).map((_, i) => (i + 1) / parts.length),
    Encode: parts.flatMap(() => [0, 1]),
  });
  const a = (angleDeg * Math.PI) / 180, dx = Math.sin(a), dy = Math.cos(a);
  const half = (Math.abs(box.width * dx) + Math.abs(box.height * dy)) / 2;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  return ctx.register(ctx.obj({
    ShadingType: 2, ColorSpace: 'DeviceRGB', Function: fn, Extend: [true, true],
    Coords: [cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half],
  }));
}

// Lossless: original page content is untouched; we only add blend-mode layers on top,
// so text stays vector/selectable and images are never re-encoded.
// Password-protected files are opened with `password` and locked again with it, so the
// recoloured copy stays protected. Throws EncryptedPDFError for protected files without one.
export async function recolor(bytes, style, onProgress = () => {}, password) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false, password: password || undefined });
  const save = () => {
    if (password) doc.encrypt({ userPassword: password, ownerPassword: password });
    return doc.save();
  };
  if (style.mode === 'none') return save();
  const ctx = doc.context;
  const gsDiff = ctx.register(ctx.obj({ Type: 'ExtGState', BM: 'Difference' }));
  const gsMul = ctx.register(ctx.obj({ Type: 'ExtGState', BM: 'Multiply' }));
  const pages = doc.getPages();
  const { mode } = style;

  for (const [i, page] of pages.entries()) {
    const m = page.getMediaBox();
    const box = rectangle(m.x, m.y, m.width, m.height);
    const layer = (gs, ...paint) => [q(), ...(gs ? [setGraphicsState(page.node.newExtGState('GS', gs))] : []), box, ...paint, Q()];
    const gradientLayer = (gs, stops) => {
      // Counter the page's /Rotate so the gradient looks the same as the preview.
      const sh = shading(ctx, stops, ANGLE - page.getRotation().angle, page.getCropBox());
      const res = page.node.Resources();
      let dict = res.lookupMaybe(PDFName.of('Shading'), PDFDict);
      if (!dict) res.set(PDFName.of('Shading'), (dict = ctx.obj({})));
      const key = dict.uniqueKey('Sh');
      dict.set(key, sh);
      return layer(gs, clip(), endPath(), PDFOperator.of(Ops.ShadingFill, [key]));
    };
    const ops = [];

    if (mode === 'invert' || mode === 'text') ops.push(...layer(gsDiff, setFillingRgbColor(1, 1, 1), fill()));
    if (mode === 'text' || mode === 'paper') ops.push(...gradientLayer(gsMul, style.stops));
    if (mode === 'duo') {
      // Duotone: paint the text colour, then the background colour through a soft mask made
      // from the page itself (white areas → background, black areas → text). Works for any
      // colour pair; the original content stays underneath, so text remains selectable.
      ops.push(...gradientLayer(null, style.stops));
      let mask = null; // blank pages have nothing to mask: all background
      if (page.node.Contents()) {
        const copy = await doc.embedPage(page);
        await copy.embed(); // snapshot now, before our layers are added to the page
        const form = ctx.lookup(copy.ref);
        form.dict.set(PDFName.of('Matrix'), ctx.obj([1, 0, 0, 1, 0, 0])); // keep page coordinates
        form.dict.set(PDFName.of('Group'), ctx.obj({ S: 'Transparency', CS: 'DeviceRGB' }));
        mask = ctx.register(ctx.obj({ Type: 'ExtGState', SMask: { Type: 'Mask', S: 'Luminosity', G: copy.ref, BC: [1, 1, 1] } }));
      }
      ops.push(...gradientLayer(mask, style.bg));
    }
    page.pushOperators(...ops);

    // Opaque white paper underneath, otherwise blank (transparent) areas don't blend.
    const paper = ctx.register(ctx.contentStream([q(), setFillingRgbColor(1, 1, 1), box, fill(), Q()]));
    page.node.Contents().insert(0, paper);

    onProgress(i + 1, pages.length);
    if (i % 20 === 19) await new Promise((r) => setTimeout(r));
  }
  return save();
}

// Re-exported so callers can detect protected files with instanceof (names get minified).
export { EncryptedPDFError } from '@cantoo/pdf-lib';
