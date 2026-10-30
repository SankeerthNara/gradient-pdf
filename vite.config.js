import { defineConfig } from 'vite';

// Multi-page: the app plus static content pages (built from scripts/pages.py).
export default defineConfig({
  build: {
    rolldownOptions: {
      input: { main: 'index.html', privacy: 'privacy.html', terms: 'terms.html', notFound: '404.html' },
    },
  },
});
