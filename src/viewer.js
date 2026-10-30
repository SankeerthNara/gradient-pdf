// In-app PDF viewer (Chrome-style layout, Tabby colours). Loaded on demand.
import * as pdfjs from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import { duoFilter } from './duotone.js';

// pdf_viewer.mjs reads the core library from this global, so set it before importing.
globalThis.pdfjsLib = pdfjs;
const { EventBus, PDFLinkService, PDFFindController, PDFViewer } = await import('pdfjs-dist/web/pdf_viewer.mjs');

const $ = (id) => document.getElementById(id);
const container = $('vContainer'), sidebar = $('vSidebar'), pageInput = $('vPage');
const narrow = () => matchMedia('(max-width: 799px)').matches;

const eventBus = new EventBus();
const linkService = new PDFLinkService({ eventBus });
const findController = new PDFFindController({ eventBus, linkService });
// No high-zoom "detail" canvases: custom styles recolour each page canvas, and those would slip past.
const viewer = new PDFViewer({ container, viewer: $('vPdf'), eventBus, linkService, findController, removePageBorders: true, enableDetailCanvas: false });
linkService.setViewer(viewer);

let doc = null, style = null, thumbObserver = null;
// Thumbnails share pdf.js's worker with the main pages, so they wait until the first page is up
// and then render one at a time, never holding up the page you're looking at.
let thumbQueue = [], thumbBusy = false, thumbsGo = false;
function queueThumb(el) { thumbQueue.push(el); pumpThumbs(); }
async function pumpThumbs() {
  if (thumbBusy || !thumbsGo || !thumbQueue.length) return;
  thumbBusy = true;
  await renderThumb(doc, thumbQueue.shift());
  thumbBusy = false;
  pumpThumbs();
}

// Preset styles are CSS blend layers over each page (see .viewer[data-mode] in style.css);
// custom styles get a GPU filter on each page canvas once pdf.js has drawn it.
eventBus.on('pagerendered', ({ source, cssTransform, isDetailView }) => {
  const canvas = source.canvas;
  if (!canvas || cssTransform || isDetailView) return;
  if (style?.mode === 'duo') canvas.style.filter = duoFilter(style, canvas.width, canvas.height);
  canvas.dataset.ready = '';
  if (!thumbsGo) { thumbsGo = true; pumpThumbs(); }
});

/* ---------- page number, zoom label, active thumbnail ---------- */
eventBus.on('pagesinit', () => { viewer.currentScaleValue = narrow() ? 'page-width' : 'page-fit'; });
eventBus.on('pagechanging', ({ pageNumber }) => {
  pageInput.value = pageNumber;
  for (const t of sidebar.children) t.toggleAttribute('aria-current', +t.dataset.page === pageNumber);
  sidebar.children[pageNumber - 1]?.scrollIntoView({ block: 'nearest' });
});
eventBus.on('scalechanging', ({ scale }) => { $('vZoomLabel').textContent = `${Math.round(scale * 100)}%`; });

pageInput.onchange = () => {
  const n = Math.round(+pageInput.value);
  if (doc && n >= 1 && n <= doc.numPages) viewer.currentPageNumber = n;
  else pageInput.value = viewer.currentPageNumber;
};
$('vIn').onclick = () => viewer.increaseScale();
$('vOut').onclick = () => viewer.decreaseScale();
$('vZoomLabel').onclick = $('vFit').onclick = () => {
  viewer.currentScaleValue = viewer.currentScaleValue === 'page-fit' ? 'page-width' : 'page-fit';
};
$('vRotate').onclick = () => { viewer.pagesRotation = (viewer.pagesRotation + 90) % 360; };

/* ---------- thumbnails (rendered lazily as they scroll into view) ---------- */
$('vThumbs').onclick = () => setSidebar(sidebar.hidden);
function setSidebar(open) {
  sidebar.hidden = !open;
  $('vThumbs').setAttribute('aria-pressed', open);
  $('viewer').classList.toggle('with-sidebar', open);
  requestAnimationFrame(refit);
}
// "Fit page/width" are computed once; recompute them when the space for the pages changes.
function refit() {
  const v = viewer.currentScaleValue;
  if (doc && isNaN(+v)) viewer.currentScaleValue = v;
}
addEventListener('resize', refit);

async function buildThumbs() {
  thumbObserver?.disconnect();
  const first = await doc.getPage(1);
  const { width, height } = first.getViewport({ scale: 1 });
  sidebar.replaceChildren(...Array.from({ length: doc.numPages }, (_, i) => {
    const b = document.createElement('button');
    b.className = 'vthumb';
    b.dataset.page = i + 1;
    b.setAttribute('aria-label', `Page ${i + 1}`);
    b.innerHTML = `<span class="tw"><canvas style="aspect-ratio:${width}/${height}"></canvas></span><span>${i + 1}</span>`;
    b.onclick = () => { viewer.currentPageNumber = i + 1; if (narrow()) setSidebar(false); };
    return b;
  }));
  const forDoc = doc;
  thumbObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting || e.target.dataset.done) continue;
      e.target.dataset.done = 1;
      queueThumb(e.target);
    }
  }, { root: sidebar, rootMargin: '300px' });
  for (const t of sidebar.children) thumbObserver.observe(t);
  sidebar.children[0]?.setAttribute('aria-current', '');
}
async function renderThumb(forDoc, el) {
  if (!el || forDoc !== doc) return;
  const p = await forDoc.getPage(+el.dataset.page);
  const canvas = el.querySelector('canvas');
  const vp = p.getViewport({ scale: (110 * Math.min(devicePixelRatio || 1, 2)) / p.getViewport({ scale: 1 }).width });
  canvas.width = vp.width;
  canvas.height = vp.height;
  canvas.style.aspectRatio = `${vp.width}/${vp.height}`;
  await p.render({ canvas, viewport: vp }).promise.catch(() => {});
  if (forDoc === doc && style?.mode === 'duo') canvas.style.filter = duoFilter(style, canvas.width, canvas.height);
}

/* ---------- find in document ---------- */
const findBar = $('vFindBar'), findInput = $('vFindInput');
function setFind(open) {
  findBar.hidden = !open;
  if (open) { findInput.focus(); findInput.select(); } else eventBus.dispatch('findbarclose', { source: null });
}
function find(type = 'again', previous = false) {
  eventBus.dispatch('find', {
    source: null, type, query: findInput.value, caseSensitive: false, entireWord: false,
    highlightAll: true, findPrevious: previous, matchDiacritics: false,
  });
}
$('vFind').onclick = () => setFind(findBar.hidden);
findInput.oninput = () => find('');
findInput.onkeydown = (e) => {
  if (e.key === 'Enter') { e.preventDefault(); find('again', e.shiftKey); }
  if (e.key === 'Escape') setFind(false);
};
$('vFindNext').onclick = () => find('again');
$('vFindPrev').onclick = () => find('again', true);
eventBus.on('updatefindmatchescount', ({ matchesCount: { current, total } }) => {
  $('vFindCount').textContent = findInput.value ? `${total ? current : 0} of ${total}` : '';
});
eventBus.on('updatefindcontrolstate', ({ matchesCount }) => {
  const { current = 0, total = 0 } = matchesCount || {};
  $('vFindCount').textContent = findInput.value ? `${total ? current : 0} of ${total}` : '';
});
addEventListener('keydown', (e) => {
  if (!doc || $('viewer').hidden) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); setFind(true); }
});

/* ---------- pinch / ctrl+wheel zoom ---------- */
// Trackpad pinches arrive as ctrl+wheel; touch pinches are scaled visually, then applied once on release.
container.addEventListener('wheel', (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  viewer.currentScale = Math.min(10, Math.max(0.1, viewer.currentScale * Math.exp(-e.deltaY / 300)));
}, { passive: false });
let pinch = null;
const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
container.addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch = { start: dist(e.touches), ratio: 1 }; }, { passive: true });
container.addEventListener('touchmove', (e) => {
  if (!pinch || e.touches.length !== 2) return;
  e.preventDefault();
  pinch.ratio = dist(e.touches) / pinch.start;
  $('vPdf').style.transform = `scale(${pinch.ratio})`;
}, { passive: false });
container.addEventListener('touchend', () => {
  if (!pinch) return;
  $('vPdf').style.transform = '';
  viewer.currentScale = Math.min(10, Math.max(0.1, viewer.currentScale * pinch.ratio));
  pinch = null;
});

/* ---------- open / close ---------- */
// Shows the document the editor already has open (no re-download, no re-parse), styled live,
// so the viewer opens instantly whatever the page count.
export async function load(pdf, pageStyle) {
  unload();
  thumbQueue = [];
  thumbsGo = false;
  doc = pdf;
  style = pageStyle;
  $('vPages').textContent = doc.numPages;
  pageInput.value = 1;
  viewer.setDocument(doc);
  linkService.setDocument(doc);
  setSidebar(!narrow());
  setFind(false);
  findInput.value = '';
  await buildThumbs();
}

// The document belongs to the editor, so it's only detached here, not destroyed.
export function unload() {
  if (!doc) return;
  thumbObserver?.disconnect();
  thumbQueue = [];
  sidebar.replaceChildren();
  viewer.setDocument(null);
  linkService.setDocument(null);
  doc = style = null;
}
