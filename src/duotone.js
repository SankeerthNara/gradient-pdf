import { ANGLE } from './styles.js';

export const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// Custom styles on screen: an SVG filter, so the GPU recolours pages while compositing and
// no JavaScript touches pixels (a per-pixel loop took ~70 ms per page and stalled scrolling).
// Same maths as the PDF luminosity soft mask in recolor.js:
//   out = L·background + (1 − L)·text,  L = 0.3R + 0.59G + 0.11B
// with both gradients laid along the CSS 135° axis of the page.
const NS = 'http://www.w3.org/2000/svg';
const LUMA = '0.3 0.59 0.11 0 0 ';
const INV = '-0.3 -0.59 -0.11 0 1 ';
const OPAQUE = '0 0 0 0 1';
let defs = null;
const made = new Set();

function gradientImage(stops, w, h) {
  const a = (ANGLE * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a); // y grows downwards
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const [x1, y1, x2, y2] = [w / 2 - dx * half, h / 2 - dy * half, w / 2 + dx * half, h / 2 + dy * half];
  const stopEls = stops.map((c, i) => `<stop offset='${i / (stops.length - 1)}' stop-color='${c}'/>`).join('');
  const svg = `<svg xmlns='${NS}' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'>`
    + `<linearGradient id='g' gradientUnits='userSpaceOnUse' x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}'>${stopEls}</linearGradient>`
    + `<rect width='${w}' height='${h}' fill='url(#g)'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Returns a CSS `filter` value for this style on an element with the given aspect ratio.
export function duoFilter(style, width, height) {
  const ratio = Math.round((width / height) * 1000); // gradient geometry depends on the aspect ratio
  const id = `gp-duo-${style.id}-${ratio}`;
  if (!made.has(id)) {
    if (!defs) {
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      defs = svg.appendChild(document.createElementNS(NS, 'defs'));
      document.body.append(svg);
    }
    const w = 1000, h = Math.round(1e6 / ratio);
    const f = document.createElementNS(NS, 'filter');
    f.id = id;
    for (const [k, v] of Object.entries({ x: 0, y: 0, width: 1, height: 1, 'color-interpolation-filters': 'sRGB', primitiveUnits: 'objectBoundingBox' })) f.setAttribute(k, v);
    // Every intermediate stays fully opaque: the arithmetic composite works on premultiplied colours.
    f.innerHTML = `
      <feColorMatrix in="SourceGraphic" type="matrix" values="${LUMA.repeat(3)}${OPAQUE}" result="L"/>
      <feColorMatrix in="SourceGraphic" type="matrix" values="${INV.repeat(3)}${OPAQUE}" result="iL"/>
      <feImage href="${gradientImage(style.bg, w, h)}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="B"/>
      <feImage href="${gradientImage(style.stops, w, h)}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="T"/>
      <feComposite in="L" in2="B" operator="arithmetic" k1="1" result="LB"/>
      <feComposite in="iL" in2="T" operator="arithmetic" k1="1" result="iLT"/>
      <feComposite in="LB" in2="iLT" operator="arithmetic" k2="1" k3="1"/>`;
    defs.append(f);
    made.add(id);
  }
  return `url(#${id})`;
}
