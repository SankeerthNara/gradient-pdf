// Content pages (privacy, terms, 404): shared look, theme toggle and entrance motion.
import '@fontsource-variable/archivo/wdth.css';
import './style.css';
import { initTheme, fixAppLinks } from './theme.js';
import { initAnalytics } from './analytics.js';

initTheme(document.getElementById('theme'));
initAnalytics();
fixAppLinks();
for (const el of document.querySelectorAll('.nav, .doc-page')) el.classList.add('play');
