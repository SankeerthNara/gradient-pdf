// Light/dark toggle with Tabby's circular reveal. Shared by every page.
const root = document.documentElement;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initTheme(themeBtn) {
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
}
