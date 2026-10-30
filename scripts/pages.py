# Generates the static content pages (privacy, terms, 404) from one template.
# Run: python scripts/pages.py
SITE = 'https://gradient-pdf.vercel.app'
CONTACT = 'https://github.com/SankeerthNara/gradient-pdf/issues'
LOGO = '''<span class="logo">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <defs><linearGradient id="lgNav" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" /><stop offset="1" stop-color="#5cf2c0" /></linearGradient></defs>
          <path class="a a-fill" style="--d:.55s" d="M7 13.5 17 10v10H7Z" fill="url(#lgNav)" />
          <path class="a a-draw" style="--d:.1s" pathLength="1" d="M7 4h6.5L17 7.5V20H7Z" />
          <path class="a a-draw" style="--d:.4s" pathLength="1" d="M13.5 4v3.5H17" />
        </svg>
      </span>'''
FAV = ("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>"
       "<stop offset='0' stop-color='%23ffffff'/><stop offset='1' stop-color='%235cf2c0'/></linearGradient></defs><rect width='24' height='24' rx='6' fill='%233b49f0'/>"
       "<path d='M7 13.5 17 10v10H7Z' fill='url(%23g)'/><path d='M7 4h6.5L17 7.5V20H7Z M13.5 4v3.5H17' fill='none' stroke='white' stroke-width='1.8' stroke-linejoin='round'/></svg>")
SUN = '<svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>'
MOON = '<svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>'


def page(file, path, title, desc, h1, body, crumb=True, index=True):
    canonical = f'{SITE}{path}'
    head_extra = f'<link rel="canonical" href="{canonical}" />' if index else '<meta name="robots" content="noindex" />'
    if crumb:
        head_extra += ('\n  <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":['
                       f'{{"@type":"ListItem","position":1,"name":"Home","item":"{SITE}/"}},'
                       f'{{"@type":"ListItem","position":2,"name":"{h1}","item":"{canonical}"}}]}}</script>')
    crumbs = (f'<nav class="crumbs a a-up" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">›</span>'
              f'<span aria-current="page">{h1}</span></nav>') if crumb else ''
    html = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  {head_extra}
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Gradient PDF" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:image" content="{SITE}/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="{FAV}" />
  <script>try{{document.documentElement.dataset.theme=localStorage.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}}catch(e){{}}</script>
</head>
<body>
  <header class="nav">
    <a class="brand" href="/">
      {LOGO}
      Gradient PDF
    </a>
    <button id="theme" class="icon-btn" type="button" aria-label="Switch theme">
      {SUN}
      {MOON}
    </button>
  </header>

  <main class="grid-lines">
    <article class="wrap doc-page">
      {crumbs}
      <h1 class="display a a-up" style="--d:.08s">{h1}</h1>
{body}
    </article>
  </main>

  <footer class="site-footer">
    <a href="/">Recolour a PDF</a>
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
    <a href="{CONTACT}" rel="noopener">Contact</a>
    <button type="button" class="link-btn" data-cookie-settings hidden>Cookie settings</button>
  </footer>

  <script type="module" src="/src/page.js"></script>
</body>
</html>
'''
    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)


def prose(s):
    return '\n'.join('      ' + l for l in s.strip().split('\n'))


page('privacy.html', '/privacy', 'Privacy policy · Gradient PDF',
     'Gradient PDF recolours PDFs entirely in your browser. Your files and passwords never leave your device. Here is exactly what is stored and why.',
     'Privacy policy', prose(f'''
<div class="prose a a-up" style="--d:.16s">
  <p class="updated">Last updated 31 October 2026</p>
  <h2>The short version</h2>
  <p>Your PDFs never leave your device. Gradient PDF opens, previews and recolours files entirely inside your browser. Nothing you choose is uploaded to us or anyone else.</p>
  <h2>Your files and passwords</h2>
  <p>When you pick, drop or paste a PDF, your browser reads it into memory on your device. Recolouring and the downloaded copy are produced there too. If a PDF is password-protected, the password you type is used only in your browser to open the file and to lock the downloaded copy again. It is never stored or sent anywhere.</p>
  <h2>What is saved on your device</h2>
  <ul>
    <li><strong>Theme</strong> (light or dark), so the site remembers your choice.</li>
    <li><strong>Saved custom styles</strong> (two slider positions each), so they appear next time.</li>
    <li><strong>Opening animation seen</strong>, for the current tab only, so it plays once per visit.</li>
  </ul>
  <p>These live in your browser's own storage. We can't see them, and you can remove them at any time by clearing this site's data in your browser settings. Your cookie choice is stored the same way.</p>
  <h2>Hosting</h2>
  <p>The site is hosted by Vercel. Like any web host, Vercel processes standard request information such as IP address, browser type and the page requested, to deliver and protect the site. See <a href="https://vercel.com/legal/privacy-policy" rel="noopener">Vercel's privacy policy</a>.</p>
  <h2>Analytics and cookies</h2>
  <p>With your permission, we use <a href="https://policies.google.com/privacy" rel="noopener">Google Analytics</a> to understand how the site is used, such as which pages are visited and roughly where visitors come from. Google Analytics only loads after you choose <strong>Accept</strong> in the cookie banner. If you choose <strong>Decline</strong>, it never loads.</p>
  <p>When accepted, Google Analytics sets cookies named <code>_ga</code> and <code>_ga_*</code> to tell visits apart. It records things like pages viewed, referring site, approximate location, browser and device. Google processes this data on our behalf and may transfer it outside your country. It never sees your PDFs, passwords or styles.</p>
  <p>You can change your choice at any time with <strong>Cookie settings</strong> at the bottom of every page. Declining after accepting stops Google Analytics and removes its cookies from this site.</p>
  <h2>Children</h2>
  <p>The site isn't directed at children and doesn't knowingly collect personal information from anyone.</p>
  <h2>Changes and contact</h2>
  <p>If this policy changes, the date at the top changes with it. Questions? <a href="{CONTACT}" rel="noopener">Open an issue on GitHub</a>.</p>
</div>'''))

page('terms.html', '/terms', 'Terms of use · Gradient PDF',
     'The terms for using Gradient PDF, a free tool that inverts and recolours PDFs with gradients in your browser while keeping text sharp.',
     'Terms of use', prose(f'''
<div class="prose a a-up" style="--d:.16s">
  <p class="updated">Last updated 30 October 2026</p>
  <h2>Using Gradient PDF</h2>
  <p>Gradient PDF is a free tool that recolours PDF files in your browser. By using it, you agree to these terms.</p>
  <h2>Your files</h2>
  <p>You keep all rights to the files you process. Only use files you have the right to modify. Gradient PDF respects protections set by a document's owner: if a PDF restricts editing, it won't be recoloured.</p>
  <h2>No warranty</h2>
  <p>The tool is provided "as is", without warranties of any kind. We work to keep text sharp and colours accurate, but can't guarantee every PDF or PDF reader will show results exactly as previewed. Keep your original file.</p>
  <h2>Limitation of liability</h2>
  <p>To the extent the law allows, we aren't liable for any loss or damage arising from using the tool, including lost data or files.</p>
  <h2>Acceptable use</h2>
  <p>Don't use the site to break the law, infringe anyone's rights, or interfere with how the site runs.</p>
  <h2>Changes and contact</h2>
  <p>We may update these terms; the date at the top shows the latest version. Questions? <a href="{CONTACT}" rel="noopener">Open an issue on GitHub</a>.</p>
</div>'''))

page('404.html', '/404', 'Page not found · Gradient PDF',
     'This page does not exist. Head back to Gradient PDF to invert or recolour a PDF.',
     'Page not found', prose('''
<p class="lead a a-up" style="--d:.16s">This page doesn't exist, or it has moved. Your PDF tools are one click away.</p>
<a class="pill a a-pill" style="--d:.26s" href="/">Back to Gradient PDF <span class="pill-dot">→</span></a>'''), crumb=False, index=False)
print('pages written')
