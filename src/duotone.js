import { ANGLE } from './styles.js';

export const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// Same maths as the PDF luminosity soft mask in recolor.js: white → background colour,
// black → text colour, with both gradients laid along the CSS 135° axis of the page.
export function duotone({ width: w, height: h, data: src }, style) {
  const out = new ImageData(w, h), dst = out.data;
  const [t0, t1] = style.stops.map(rgbOf), [b0, b1] = style.bg.map(rgbOf);
  const a = (ANGLE * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a); // y grows downwards on screen
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const g = ((x - w / 2) * dx + (y - h / 2) * dy) / len + 0.5;
      const L = (0.3 * src[i] + 0.59 * src[i + 1] + 0.11 * src[i + 2]) / 255;
      for (let c = 0; c < 3; c++) {
        const tc = t0[c] + (t1[c] - t0[c]) * g, bc = b0[c] + (b1[c] - b0[c]) * g;
        dst[i + c] = tc + (bc - tc) * L;
      }
      dst[i + 3] = 255;
    }
  }
  return out;
}

// Recolour a rendered canvas in place.
export function duotoneCanvas(canvas, style) {
  const ctx = canvas.getContext('2d');
  ctx.putImageData(duotone(ctx.getImageData(0, 0, canvas.width, canvas.height), style), 0, 0);
}
