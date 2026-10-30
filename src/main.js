import '@fontsource-variable/archivo/wdth.css';
import './style.css';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { STYLES, ANGLE, cssGradient, customStyle, toneTrack } from './styles.js';
// pdf-lib is only needed at export time, so it's loaded lazily.

// Start the 1.2 MB PDF engine now, so the first file opens without waiting for it.
pdfjs.GlobalWorkerOptions.workerPort = new Worker(workerUrl, { type: 'module' });

const $ = (id) => document.getElementById(id);
const [home, editor, drop, fileInput, page, canvas, loader, meta, docName, strip, styleName, download, reset, pageNo, prevBtn, nextBtn, themeBtn] =
  ['home', 'editor', 'drop', 'file', 'page', 'canvas', 'loader', 'meta', 'docName', 'strip', 'styleName', 'download', 'reset', 'pageNo', 'prev', 'next', 'theme'].map($);
const [customDialog, openCustom, removeCustom, bgTone, textTone, demo] =
  ['customDialog', 'openCustom', 'removeCustom', 'bgTone', 'textTone', 'demo'].map($);
const root = document.documentElement;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let bytes, fileName, locked = false, docPassword, current = STYLES[0];

/* ---------- helpers ---------- */
const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  replay(t, 'show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
// Swap screens and replay Tabby-style staggered entrance on the new one.
function showScreen(next) {
  for (const s of [home, editor]) s.hidden = s !== next;
  replay(next, 'play');
}

/* ---------- opening animation (once per session) ---------- */
{
  const intro = $('intro');
  const start = () => { intro.remove(); $('nav').classList.add('play'); home.classList.add('play'); };
  let seen = false;
  try { seen = sessionStorage.introSeen; sessionStorage.introSeen = 1; } catch {}
  if (seen || reducedMotion()) start();
  else {
    setTimeout(() => intro.classList.add('out'), 1150);
    intro.addEventListener('animationend', (e) => { if (e.animationName === 'intro-out') start(); });
  }
}

/* ---------- theme (circular reveal from the toggle, like Tabby) ---------- */
function syncThemeLabel() {
  themeBtn.setAttribute('aria-label', `Switch to ${root.dataset.theme === 'dark' ? 'light' : 'dark'} theme`);
}
syncThemeLabel();
themeBtn.onclick = () => {
  const apply = () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.theme = root.dataset.theme; } catch {}
    syncThemeLabel();
  };
  if (!document.startViewTransition || reducedMotion()) return apply();
  const r = themeBtn.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.startViewTransition(apply).ready.then(() => {
    root.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(.16, 1, .3, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  });
};

/* ---------- saved custom styles (localStorage) ---------- */
const SAVE_KEY = 'gradientPdf.customStyles.v2';
const isTone = (v) => Number.isInteger(v) && v >= 0 && v <= 100;
function loadSaved() {
  try {
    const list = JSON.parse(localStorage[SAVE_KEY] || '[]');
    return list.filter((s) => isTone(s.bgTone) && isTone(s.textTone)).map((s, i) => ({ ...customStyle(s.bgTone, s.textTone, i + 1), saved: true }));
  } catch { return []; }
}
function storeSaved(list) {
  try { localStorage[SAVE_KEY] = JSON.stringify(list.map(({ bgTone, textTone }) => ({ bgTone, textTone }))); }
  catch { toast('Couldn’t save on this device'); }
}
let saved = loadSaved();
let allStyles = [];

/* ---------- style strip ---------- */
function paintSwatch(el, s) {
  if (s.stops) el.style.setProperty('--g', cssGradient(s.stops));
  if (s.bg) el.style.setProperty('--gb', cssGradient(s.bg));
}
function buildStrip() {
  allStyles = [...STYLES, ...saved];
  strip.replaceChildren(...allStyles.map((s, i) => {
    const b = document.createElement('button');
    b.className = `swatch ${s.mode}`;
    b.setAttribute('role', 'option');
    b.setAttribute('aria-label', s.name);
    b.dataset.i = i;
    b.innerHTML = '<span>Aa</span>';
    paintSwatch(b, s);
    b.onclick = () => b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    return b;
  }));
}
buildStrip();
const centerOn = (s, behavior = 'auto') =>
  strip.children[allStyles.findIndex((x) => x.id === s.id)]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior });

let raf;
strip.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(pickCentered); }, { passive: true });
function pickCentered() {
  const r0 = strip.getBoundingClientRect();
  const mid = r0.left + r0.width / 2;
  let best, bestD = Infinity;
  for (const b of strip.children) {
    const r = b.getBoundingClientRect();
    const d = Math.abs(r.left + r.width / 2 - mid);
    b.style.setProperty('--d', Math.min(d / 160, 1).toFixed(3));
    if (d < bestD) { bestD = d; best = b; }
  }
  if (best) select(allStyles[best.dataset.i]);
}
strip.addEventListener('keydown', (e) => {
  const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (!step) return;
  e.preventDefault();
  const i = allStyles.findIndex((x) => x.id === current.id);
  strip.children[Math.max(0, Math.min(allStyles.length - 1, i + step))]?.click();
});

function select(s) {
  if (s.id === current.id) return;
  current = s;
  [...strip.children].forEach((b) => b.setAttribute('aria-selected', allStyles[b.dataset.i].id === s.id));
  styleName.textContent = s.name;
  replay(styleName, 'pop');
  removeCustom.hidden = !s.saved;
  page.dataset.mode = s.mode;
  paintSwatch(page, s);
  paintPreview();
  replay(page, 'settle');
  navigator.vibrate?.(6);
}

/* ---------- custom style pop-up ---------- */
// Both bars share one track: black → grey → white, then every colour.
bgTone.style.setProperty('--track', toneTrack('to right'));
textTone.style.setProperty('--track', toneTrack('to right'));

const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => { const [r, g, b] = rgbOf(h); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
const draftStyle = () => customStyle(+bgTone.value, +textTone.value);

// The demo page is plain black-on-white text, so its duotone is just text colour on background colour.
function updateDemo() {
  const s = draftStyle();
  bgTone.style.setProperty('--thumb', s.bg[0]);
  textTone.style.setProperty('--thumb', s.stops[0]);
  paintSwatch(demo, s);
  $('customHint').textContent = Math.abs(lum(s.bg[0]) - lum(s.stops[0])) < 0.25
    ? 'Text and background are very close, so text will be hard to read.'
    : '';
}
bgTone.oninput = textTone.oninput = updateDemo;

openCustom.onclick = () => {
  if (current.mode === 'duo') { bgTone.value = current.bgTone; textTone.value = current.textTone; }
  updateDemo();
  customDialog.showModal();
};

$('customForm').addEventListener('submit', (e) => {
  const action = e.submitter?.value;
  if (action !== 'apply' && action !== 'save') return;
  let s = draftStyle();
  if (action === 'save') {
    if (!saved.some((x) => x.id === s.id)) {
      storeSaved([...saved, s]);
      saved = loadSaved();
      buildStrip();
    }
    s = saved.find((x) => x.id === s.id);
    toast(`Saved as ${s.name}. It’ll be here next time.`);
  }
  current = STYLES[0]; // force select() to refresh labels
  select(s);
  centerOn(s, 'smooth');
});

/* ---------- duotone preview: same maths as the PDF soft mask in recolor.js ---------- */
const ctx2d = canvas.getContext('2d');
let basePixels = null, previewRaf;
function paintPreview() {
  cancelAnimationFrame(previewRaf);
  previewRaf = requestAnimationFrame(() => {
    if (!basePixels) return;
    if (current.mode !== 'duo') return ctx2d.putImageData(basePixels, 0, 0);
    const { width: w, height: h, data: src } = basePixels;
    const out = new ImageData(w, h), dst = out.data;
    const [t0, t1] = current.stops.map(rgbOf), [b0, b1] = current.bg.map(rgbOf);
    const a = (ANGLE * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a); // CSS gradient axis, y down
    const len = Math.abs(w * dx) + Math.abs(h * dy);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const g = ((x - w / 2) * dx + (y - h / 2) * dy) / len + 0.5; // position along the gradient
        const L = (0.3 * src[i] + 0.59 * src[i + 1] + 0.11 * src[i + 2]) / 255; // PDF luminosity
        for (let c = 0; c < 3; c++) {
          const tc = t0[c] + (t1[c] - t0[c]) * g, bc = b0[c] + (b1[c] - b0[c]) * g;
          dst[i + c] = tc + (bc - tc) * L;
        }
        dst[i + 3] = 255;
      }
    }
    ctx2d.putImageData(out, 0, 0);
  });
}

removeCustom.onclick = () => {
  storeSaved(saved.filter((x) => x.id !== current.id));
  saved = loadSaved();
  buildStrip();
  current = STYLES[1];
  select(STYLES[0]);
  centerOn(STYLES[0], 'smooth');
};

/* ---------- loading ---------- */
async function open(file) {
  if (!file) return;
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return toast('That’s not a PDF');
  bytes = new Uint8Array(await file.arrayBuffer());
  fileName = file.name.replace(/\.pdf$/i, '');
  await show();
}

async function show(password) {
  loader.hidden = false;
  try {
    // pdf.js transfers the buffer to its worker, so hand it a copy.
    const pdf = await pdfjs.getDocument({ data: bytes.slice(), password }).promise;
    const { info } = await pdf.getMetadata();
    pdfDoc?.loadingTask.destroy(); // pdf.js v6: documents are closed via their loading task
    pdfDoc = pdf;
    locked = !!info.EncryptFilterName;
    docPassword = password;
    docName.textContent = `${fileName}.pdf`;
    meta.textContent = `${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''}${!locked ? '' : docPassword ? ' · 🔒 download keeps the same password' : ' · 🔒 editing restricted by its owner'} · style applies to every page`;
    showScreen(editor);
    await drawPage(1);
    centerOn(current);
    pickCentered();
  } catch (e) {
    if (e.name === 'PasswordException') return askPassword(e.code === pdfjs.PasswordResponses.INCORRECT_PASSWORD);
    console.error(e);
    toast('Couldn’t read this PDF');
  } finally {
    loader.hidden = true;
  }
}

let pdfDoc, pageNum = 1, renderTask;
async function drawPage(n) {
  pageNum = n;
  pageNo.textContent = `${n} / ${pdfDoc.numPages}`;
  prevBtn.disabled = n === 1;
  nextBtn.disabled = n === pdfDoc.numPages;
  const p = await pdfDoc.getPage(n);
  if (n !== pageNum) return; // user already moved on to another page
  const base = p.getViewport({ scale: 1 });
  const frame = page.parentElement;
  const fit = Math.min((frame.clientWidth - 40) / base.width, (innerHeight * (innerWidth < 900 ? 0.45 : 0.55)) / base.height);
  // 2x is sharp on every phone screen; 3x would be 2.25x the pixels to draw for no visible gain.
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const vp = p.getViewport({ scale: fit * dpr });
  renderTask?.cancel(); // one canvas can't host two renders at once
  canvas.width = vp.width;
  canvas.height = vp.height;
  canvas.style.width = `${vp.width / dpr}px`;
  canvas.style.height = `${vp.height / dpr}px`;
  renderTask = p.render({ canvas, viewport: vp });
  basePixels = null;
  try { await renderTask.promise; } catch (e) { if (e.name === 'RenderingCancelledException') return; throw e; }
  basePixels = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
  paintPreview();
}

function turnPage(step) {
  const n = pageNum + step;
  if (!pdfDoc || n < 1 || n > pdfDoc.numPages) return;
  replay(page, step > 0 ? 'flip-next' : 'flip-prev');
  drawPage(n);
}
prevBtn.onclick = () => turnPage(-1);
nextBtn.onclick = () => turnPage(1);

function askPassword(wrong) {
  $('pwMsg').textContent = wrong ? 'Wrong password, try again.' : 'Enter its password to open it.';
  $('pwInput').value = '';
  $('pwDialog').showModal();
}
$('pwForm').addEventListener('submit', (e) => { if (e.submitter?.value === 'ok') show($('pwInput').value); });

fileInput.onchange = () => open(fileInput.files[0]);
// Labels pointing at the file input aren't keyboard-activatable by default.
for (const l of document.querySelectorAll('label[for="file"]')) {
  l.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } };
}
addEventListener('paste', (e) => open(e.clipboardData?.files[0]));
addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
addEventListener('dragleave', (e) => { if (!e.relatedTarget) drop.classList.remove('over'); });
addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); open(e.dataTransfer.files[0]); });

reset.onclick = () => {
  pdfDoc?.loadingTask.destroy(); // pdf.js v6: documents are closed via their loading task
  bytes = pdfDoc = null;
  fileInput.value = '';
  showScreen(home);
};

/* ---------- export ---------- */
download.onclick = async () => {
  // Opened without a password but still encrypted: the author restricted editing, so respect that.
  if (locked && !docPassword) return toast('This PDF’s owner has restricted editing, so it can’t be recoloured 🔒');
  download.disabled = true;
  const label = download.firstChild;
  const { recolor, EncryptedPDFError } = await import('./recolor.js');
  try {
    const out = await recolor(bytes, current, (i, n) => { label.textContent = `Working… ${i}/${n} `; }, docPassword);
    const url = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
    Object.assign(document.createElement('a'), { href: url, download: `${fileName}-${current.id}.pdf` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    label.textContent = 'Downloaded ';
    download.lastElementChild.textContent = '✓';
    download.classList.add('done');
    setTimeout(() => {
      download.classList.remove('done');
      label.textContent = 'Download PDF ';
      download.lastElementChild.textContent = '↓';
    }, 1800);
  } catch (e) {
    console.error(e);
    label.textContent = 'Download PDF ';
    toast(e instanceof EncryptedPDFError ? 'This PDF is protected and couldn’t be unlocked 🔒' : 'Export failed, try again');
  } finally {
    download.disabled = false;
  }
};
