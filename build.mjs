// Stowaway Labs static site builder. Zero dependencies.
// Reads src/pages/*.html, wraps each in the shared layout (head, header,
// footer, SEO, JSON-LD) and writes plain .html files to the repo root so the
// site opens straight from disk and can be hosted on GitHub Pages as-is.
//
//   node build.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(ROOT, 'src');
const images = JSON.parse(fs.readFileSync(path.join(SRC, 'images.json'), 'utf8'));

export const SITE = {
  url: 'https://www.stowawaylabs.com',
  name: 'Stowaway Labs',
  tagline: 'Gig Harbor coworking for the adventurous',
  street: '8809 N. Harborview Dr., Suite 101',
  city: 'Gig Harbor',
  region: 'WA',
  zip: '98332',
  phone: '(253) 525-8911',
  phoneHref: 'tel:+12535258911',
  email: 'ahoy@stowawaylabs.com',
  instagram: 'https://www.instagram.com/stowawaylabs/',
  login: 'https://archieapp.co/stowaway-labs/sign-in',
  register: 'https://archieapp.co/stowaway-labs/register',
  land: 'https://www.stowawaylabs.com/land-acknowledgement',
  maps: 'https://www.google.com/maps/search/?api=1&query=Stowaway+Labs+8809+N+Harborview+Dr+Suite+101+Gig+Harbor+WA+98332',
};

const NAV = [
  ['memberships', 'memberships.html', 'Memberships'],
  ['space', 'space.html', 'The Space'],
  ['virtual-office', 'virtual-office.html', 'Virtual Office'],
  ['events', 'events.html', 'Events'],
  ['about', 'about.html', 'About'],
  ['contact', 'contact.html', 'Visit'],
];

// ---------- <x-img> shortcode -> responsive <picture> ----------
function attrs(str) {
  const out = {};
  for (const m of str.matchAll(/([a-z-]+)(?:="([^"]*)")?/g)) out[m[1]] = m[2] ?? true;
  return out;
}
function picture(a) {
  const meta = images[a.name];
  if (!meta) throw new Error(`Unknown image: ${a.name}`);
  const ws = meta.widths;
  const set = (ext) => ws.map((w) => `assets/img/${a.name}-${w}.${ext} ${w}w`).join(', ');
  const fallbackW = ws.includes(1024) ? 1024 : ws.at(-1);
  const w = 1024, h = Math.round(1024 * meta.ratio);
  const sizes = a.sizes || '(min-width: 1100px) 50vw, 100vw';
  const eager = a.eager === true;
  const cls = a.class ? ` class="${a.class}"` : '';
  const pos = a.pos ? ` style="object-position:${a.pos}"` : '';
  if (!a.alt && a.alt !== '') throw new Error(`Missing alt for ${a.name}`);
  return `<picture${cls}><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="assets/img/${a.name}-${fallbackW}.jpg" alt="${a.alt}" width="${w}" height="${h}"${pos} ${eager ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'} decoding="async"></picture>`;
}

// ---------- shared fragments ----------
const sprite = fs.readFileSync(path.join(SRC, 'partials/icons.svg'), 'utf8');
const icon = (n, cls = 'i') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${n}"></use></svg>`;

function header(active) {
  const links = NAV.map(([key, href, label]) =>
    `<li><a href="${href}"${key === active ? ' aria-current="page"' : ''}>${label}</a></li>`).join('');
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-header" data-header>
  <div class="container header-inner">
    <a class="brand" href="index.html" aria-label="Stowaway Labs home">
      <img src="assets/img/logo-ink.png" alt="Stowaway Labs" width="${images.logo.width}" height="${images.logo.height}">
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-nav-toggle>
      <span class="nav-toggle-bars" aria-hidden="true"></span><span class="sr-only">Menu</span>
    </button>
    <nav class="site-nav" id="site-nav" aria-label="Main">
      <ul class="nav-links">${links}</ul>
      <div class="nav-actions">
        <a class="nav-login" href="${SITE.login}" rel="noopener">Member login</a>
        <a class="btn btn-primary btn-sm" href="book.html"${active === 'book' ? ' aria-current="page"' : ''}>Book a desk</a>
      </div>
    </nav>
  </div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="footer-wave" aria-hidden="true"><svg viewBox="0 0 1440 48" preserveAspectRatio="none"><path d="M0 24c120 16 240 16 360 0s240-16 360 0 240 16 360 0 240-16 360 0v24H0z"/></svg></div>
  <div class="container footer-grid">
    <div class="footer-brand">
      <img src="assets/img/logo-cream.png" alt="Stowaway Labs" width="${images.logo.width}" height="${images.logo.height}" loading="lazy">
      <p class="footer-tag">${SITE.tagline}.</p>
      <a class="btn btn-primary btn-sm" href="book.html#free-day">Locals: claim a free day</a>
    </div>
    <div>
      <h2 class="footer-h">Visit</h2>
      <address>
        <a href="${SITE.maps}" rel="noopener">${SITE.street}<br>${SITE.city}, ${SITE.region} ${SITE.zip}</a>
      </address>
      <p class="footer-note">Under Devoted Kiss Cafe, in the former TideRunner Boat Co. building.</p>
    </div>
    <div>
      <h2 class="footer-h">Hours and contact</h2>
      <p>Monday to Friday<br>9 a.m. to 5 p.m.</p>
      <p><a href="${SITE.phoneHref}">${SITE.phone}</a><br><a href="mailto:${SITE.email}">${SITE.email}</a></p>
      <p><a class="footer-ig" href="${SITE.instagram}" rel="noopener">${icon('instagram')} @stowawaylabs</a></p>
    </div>
    <div>
      <h2 class="footer-h">Explore</h2>
      <ul class="footer-links">
        <li><a href="memberships.html">Memberships and pricing</a></li>
        <li><a href="book.html">Book a desk</a></li>
        <li><a href="book.html#tour">Book a tour</a></li>
        <li><a href="virtual-office.html">Virtual office and mail</a></li>
        <li><a href="virtual-office.html#boaters">Boater address</a></li>
        <li><a href="events.html">Waterfront events</a></li>
        <li><a href="${SITE.login}" rel="noopener">Member login</a></li>
      </ul>
    </div>
  </div>
  <div class="container footer-base">
    <p>&copy; <span data-year>2026</span> Stowaway Labs, Gig Harbor, Washington. <a href="${SITE.land}" rel="noopener">Land acknowledgement</a></p>
    <p>Photography by <a href="https://jahnilynnphoto.com" rel="noopener">Jahni Lynn Photo</a> and Beyond Harbor Waves.</p>
  </div>
</footer>`;
}

function jsonLd() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE.url}/#business`,
    name: SITE.name,
    slogan: SITE.tagline,
    description: 'Waterfront coworking space and community hub in downtown Gig Harbor, Washington, with indoor and deck workspace, gigabit Wi-Fi, soundproof meeting booths, virtual office and mail service, and a waterfront event venue.',
    url: `${SITE.url}/`,
    logo: `${SITE.url}/assets/img/logo-ink.png`,
    image: [`${SITE.url}/assets/img/og-stowaway-labs.jpg`, `${SITE.url}/assets/img/lounge-view-1024.jpg`, `${SITE.url}/assets/img/monitor-desks-1024.jpg`],
    email: SITE.email,
    telephone: '+1-253-525-8911',
    priceRange: '$12 to $750',
    foundingDate: '2025-09-22',
    founder: [{ '@type': 'Person', name: 'Nick Gough' }, { '@type': 'Person', name: 'Lauren Gough' }],
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.street,
      addressLocality: SITE.city,
      addressRegion: SITE.region,
      postalCode: SITE.zip,
      addressCountry: 'US',
    },
    hasMap: SITE.maps,
    areaServed: 'Greater Gig Harbor, Washington',
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00', closes: '17:00',
    }],
    sameAs: [SITE.instagram],
    amenityFeature: ['Indoor workspace', 'Outdoor waterfront deck workspace', 'Gigabit Wi-Fi', 'Free printing', 'Ultrawide monitors', 'Laptop stands, mice and keyboards', 'Whiteboards', 'Coffee and snacks bar', 'Soundproof meeting booths']
      .map((name) => ({ '@type': 'LocationFeatureSpecification', name, value: true })),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Coworking and virtual office',
      itemListElement: [
        ['Drop-in coworking', 12, 'HUR', 'Hourly access, 2-hour minimum, weekdays 9 a.m. to 5 p.m.'],
        ['Part-time membership', 250, 'MON', 'Up to 50 hours per month, priority workspace booking, local-business discounts.'],
        ['Full-time membership', 500, 'MON', 'Unlimited weekday access, private storage locker, virtual office included.'],
        ['Corporate Flex', 750, 'MON', 'A shared pool of 100 hours per month for your team.'],
        ['Virtual office and mail', 49, 'MON', 'Waterfront business address and private mailbox. $39 per month for members.'],
      ].map(([name, price, unit, description]) => ({
        '@type': 'Offer',
        name, description,
        priceSpecification: { '@type': 'UnitPriceSpecification', price, priceCurrency: 'USD', unitCode: unit },
      })),
    },
  };
  return `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
}

function layout(meta, body, file) {
  const canonical = file === 'index.html' ? `${SITE.url}/` : `${SITE.url}/${file}`;
  const scripts = (meta.scripts || []).map((s) => `<script src="assets/js/${s}" defer></script>`).join('');
  return `<!doctype html>
<html lang="en-US" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title}</title>
<meta name="description" content="${meta.description}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#13232b">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Stowaway Labs">
<meta property="og:title" content="${meta.ogTitle || meta.title}">
<meta property="og:description" content="${meta.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE.url}/assets/img/og-stowaway-labs.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="A coworker on the Stowaway Labs deck above the Gig Harbor marina">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<link rel="stylesheet" href="assets/css/site.css">
${jsonLd()}
${meta.extraHead || ''}
<script src="assets/js/site.js" defer></script>${scripts}
</head>
<body class="${meta.bodyClass || ''}">
<div hidden>${sprite}</div>
${header(meta.nav)}
<main id="main">
${body}
</main>
${footer()}
</body>
</html>
`;
}

// ---------- build ----------
const pagesDir = path.join(SRC, 'pages');
const built = [];
for (const f of fs.readdirSync(pagesDir).filter((x) => x.endsWith('.html'))) {
  let raw = fs.readFileSync(path.join(pagesDir, f), 'utf8');
  const m = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->/);
  if (!m) throw new Error(`${f}: missing front matter`);
  const meta = JSON.parse(m[1]);
  let body = raw.slice(m[0].length);
  body = body
    .replace(/<x-img\s([^>]*?)\s*\/?>(<\/x-img>)?/g, (_, a) => picture(attrs(a)))
    .replace(/\{\{icon:([a-z0-9-]+)(?::([a-z0-9 -]+))?\}\}/g, (_, n, c) => icon(n, c ? `i ${c}` : 'i'))
    .replace(/\{\{(\w+)\}\}/g, (_, k) => {
      if (!(k in SITE)) throw new Error(`${f}: unknown token ${k}`);
      return SITE[k];
    });
  fs.writeFileSync(path.join(ROOT, f), layout(meta, body, f));
  built.push(f);
}

// sitemap + robots
const today = new Date().toISOString().slice(0, 10);
const urls = built.filter((f) => f !== '404.html').sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((f) => `  <url><loc>${SITE.url}/${f === 'index.html' ? '' : f}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
console.log(`Built ${built.length} pages: ${built.join(', ')}`);
