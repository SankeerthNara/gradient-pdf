// Google Analytics 4, loaded only after the visitor accepts cookies (GA sets _ga cookies,
// which EU/UK law treats as needing consent). Set VITE_GA_ID (e.g. G-XXXXXXXXXX) at build time;
// without it nothing loads and no banner shows.
const GA_ID = import.meta.env.VITE_GA_ID;
const KEY = 'gradientPdf.analyticsConsent'; // 'granted' | 'denied'

const stored = () => { try { return localStorage[KEY]; } catch { return undefined; } };
const store = (v) => { try { localStorage[KEY] = v; } catch {} };

let loaded = false;
function loadGA() {
  if (loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.append(s);
}

// Withdrawing consent: stop sending and remove GA's cookies from this site.
function clearGA() {
  window[`ga-disable-${GA_ID}`] = true;
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0].trim();
    if (!name.startsWith('_ga')) continue;
    for (const domain of ['', `; domain=${location.hostname}`, `; domain=.${location.hostname}`]) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
}

function showBanner() {
  if (document.getElementById('consent')) return;
  const el = document.createElement('div');
  el.id = 'consent';
  el.className = 'consent';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Cookie consent');
  el.innerHTML = `
    <p>We'd like to use Google Analytics cookies to see how the site is used. Your PDFs are never part of this.
      <a href="/privacy">Privacy policy</a></p>
    <div class="consent-actions">
      <button type="button" class="ghost-pill" data-v="denied">Decline</button>
      <button type="button" class="pill small" data-v="granted">Accept</button>
    </div>`;
  el.addEventListener('click', (e) => {
    const v = e.target.closest('button')?.dataset.v;
    if (!v) return;
    store(v);
    el.remove();
    if (v === 'granted') loadGA();
    else clearGA();
  });
  document.body.append(el);
}

export function initAnalytics() {
  if (!GA_ID) return;
  for (const b of document.querySelectorAll('[data-cookie-settings]')) {
    b.hidden = false;
    b.onclick = showBanner;
  }
  const choice = stored();
  if (choice === 'granted') loadGA();
  else if (!choice) showBanner();
}
