#!/usr/bin/env node
/* Builds The Wonder List from the files in source/content/.
   The finished site is written to the top level of the repository, which is where GitHub Pages serves it from,
   and to docs/ as a spare copy for a Pages setup that points at that folder.
   source/preview/ is a single-page, hash-routed copy for sharing as a preview.
   Each copy includes api/*.json, the feed the app can read. */
const fs = require('fs');
const path = require('path');
const WL = require('./src/site.js');

const root = __dirname;
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, 'content', f), 'utf8'));
const data = { site: read('site.json'), places: read('places.json'), guides: read('guides.json'), areas: read('areas.json') };
const SITE = data.site.url;

// Fail the build on broken references, so the site and the app never get bad data.
const slugs = new Set(data.places.map((p) => p.slug));
const images = new Set(fs.readdirSync(path.join(root, 'assets/img')));
const areaNames = new Set(data.areas.map((a) => a.name));
const problems = [];
data.places.forEach((p) => {
  [p.image].concat(p.gallery || []).forEach((i) => { if (!images.has(i)) problems.push(`${p.slug}: missing image ${i}`); });
  if (!areaNames.has(p.area)) problems.push(`${p.slug}: area "${p.area}" is not in areas.json`);
  p.occasions.forEach((o) => { if (!data.site.occasions.includes(o)) problems.push(`${p.slug}: unknown occasion ${o}`); });
});
data.guides.forEach((g) => {
  if (!images.has(g.image)) problems.push(`${g.slug}: missing image ${g.image}`);
  g.places.forEach((s) => { if (!slugs.has(s)) problems.push(`${g.slug}: unknown place ${s}`); });
});
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---- fonts: shipped with the site, so they never depend on another server ---- */
const FONTS = [
  ['Playfair Display', 400, 'normal', 'playfair-display-latin-400-normal.woff2'],
  ['Playfair Display', 400, 'italic', 'playfair-display-latin-400-italic.woff2'],
  ['Playfair Display', 500, 'normal', 'playfair-display-latin-500-normal.woff2'],
  ['Playfair Display', 500, 'italic', 'playfair-display-latin-500-italic.woff2'],
  ['Julius Sans One', 400, 'normal', 'julius-sans-one-latin-400-normal.woff2'],
  ['Inter', 400, 'normal', 'inter-latin-400-normal.woff2'],
  ['Inter', 500, 'normal', 'inter-latin-500-normal.woff2'],
  ['Inter', 600, 'normal', 'inter-latin-600-normal.woff2']
];
function fontCss(inline) {
  return FONTS.map(([family, weight, style, file]) => {
    const src = inline
      ? 'data:font/woff2;base64,' + fs.readFileSync(path.join(root, 'assets/fonts', file)).toString('base64')
      : '../fonts/' + file;
    return `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};font-display:swap;src:url(${src}) format("woff2")}`;
  }).join('\n') + '\n';
}

/* ---- structured data ---- */
const pageUrl = (file) => SITE + '/' + (file === 'index.html' ? '' : file.replace(/\.html$/, ''));
const staticCtx = WL.makeCtx('static', '');
const abs = (href) => pageUrl(href);
const ORG = { '@type': 'Organization', name: data.site.name, url: SITE + '/', sameAs: ['https://www.instagram.com/' + data.site.instagram + '/'] };

function structured(out, route, url) {
  const ld = [], m = out.meta, it = out.item;
  if (route.name === 'home') {
    ld.push(Object.assign({ '@context': 'https://schema.org', description: data.site.description, parentOrganization: { '@type': 'Organization', name: data.site.parent } }, ORG));
    ld.push({ '@context': 'https://schema.org', '@type': 'WebSite', name: data.site.name, url: SITE + '/' });
  }
  if (route.name === 'place') {
    const type = { restaurant: 'Restaurant', bar: 'BarOrPub', hotel: 'Hotel' }[it.category] || 'LocalBusiness';
    const biz = { '@context': 'https://schema.org', '@type': type, name: it.name, description: it.verdict, url,
      image: SITE + '/img/' + it.image, priceRange: it.price,
      address: { '@type': 'PostalAddress', addressLocality: it.city, addressRegion: it.area, addressCountry: 'GB' },
      review: { '@type': 'Review', reviewBody: it.verdict, author: ORG, dateModified: it.updated } };
    if (it.cuisine) biz.servesCuisine = it.cuisine;
    if (it.phone) biz.telephone = it.phone;
    ld.push(biz);
  }
  if (route.name === 'guide') {
    ld.push({ '@context': 'https://schema.org', '@type': 'Article', headline: it.title, description: it.standfirst, url,
      image: SITE + '/img/' + it.image, datePublished: it.published, dateModified: it.updated, author: ORG, publisher: ORG });
  }
  if (m.list && m.list.length) {
    ld.push({ '@context': 'https://schema.org', '@type': 'ItemList', name: out.title.split(' | ')[0], numberOfItems: m.list.length,
      itemListElement: m.list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: abs(staticCtx.link('place', p.slug)) })) });
  }
  if (m.crumbs && m.crumbs.length) {
    ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: m.crumbs.map((c, i) => Object.assign({ '@type': 'ListItem', position: i + 1, name: c.name }, c.href && i < m.crumbs.length - 1 ? { item: SITE + '/' + c.href.replace(/^(\.\.\/)+/, '').replace(/\.html$/, '') } : {})) });
  }
  if (m.faq && m.faq.length) {
    ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: m.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  }
  return ld.map((o) => '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, '\\u003c') + '</script>').join('\n');
}

function doc({ title, description, body, base, url, image, extraHead, script, type }) {
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${url ? `<link rel="canonical" href="${url}">\n<meta property="og:url" content="${url}">` : ''}
<meta property="og:site_name" content="${esc(data.site.name)}">
<meta property="og:type" content="${type || 'website'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${image ? `<meta property="og:image" content="${image}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
${url ? `<link rel="alternate" type="application/rss+xml" title="${esc(data.site.name)} guides" href="${SITE}/feed.xml">` : ''}
<link rel="stylesheet" href="${base}css/fonts.css">
<link rel="stylesheet" href="${base}css/site.css">
${extraHead || ''}
</head>
<body>
${body}
<script src="${base}js/content.js"></script>
<script src="${base}js/site.js"></script>
<script>${script}</script>
</body>
</html>
`;
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}
// Only ever remove what the build itself writes, so the repository's own files are safe.
const GENERATED = ['img', 'css', 'js', 'fonts', 'api', 'video', 'places', 'guides', 'london', 'sitemap.xml', 'robots.txt', 'feed.xml', '.nojekyll'];
function clean(out) {
  if (!fs.existsSync(out)) return;
  GENERATED.forEach((n) => fs.rmSync(path.join(out, n), { recursive: true, force: true }));
  fs.readdirSync(out).filter((f) => f.endsWith('.html')).forEach((f) => fs.rmSync(path.join(out, f)));
}
function copyShared(out, inlineFonts) {
  clean(out);
  fs.mkdirSync(path.join(out, 'img'), { recursive: true });
  images.forEach((i) => fs.copyFileSync(path.join(root, 'assets/img', i), path.join(out, 'img', i)));
  // Reel videos, when there are any, live in assets/video and are copied as they are.
  const vids = path.join(root, 'assets/video');
  if (fs.existsSync(vids)) { fs.mkdirSync(path.join(out, 'video'), { recursive: true }); fs.readdirSync(vids).forEach((v) => fs.copyFileSync(path.join(vids, v), path.join(out, 'video', v))); }
  write(path.join(out, 'css/site.css'), fs.readFileSync(path.join(root, 'src/site.css'), 'utf8'));
  write(path.join(out, 'css/fonts.css'), fontCss(inlineFonts));
  if (!inlineFonts) {
    fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
    FONTS.forEach((f) => fs.copyFileSync(path.join(root, 'assets/fonts', f[3]), path.join(out, 'fonts', f[3])));
  }
  write(path.join(out, 'js/site.js'), fs.readFileSync(path.join(root, 'src/site.js'), 'utf8'));
  write(path.join(out, 'js/content.js'), 'window.WL_CONTENT = ' + JSON.stringify(data).replace(/</g, '\\u003c') + ';\n');
  // The feed for the app: same content the pages are built from.
  write(path.join(out, 'api/places.json'), JSON.stringify(data.places, null, 2));
  write(path.join(out, 'api/guides.json'), JSON.stringify(data.guides, null, 2));
  write(path.join(out, 'api/areas.json'), JSON.stringify(data.areas, null, 2));
  write(path.join(out, 'api/site.json'), JSON.stringify(data.site, null, 2));
}

/* ---- static site ---- */
const today = new Date().toISOString().slice(0, 10);
const pages = [
  { file: 'index.html', route: { name: 'home' } },
  { file: 'places.html', route: { name: 'places' } },
  { file: 'guides.html', route: { name: 'guides' } },
  { file: 'roulette.html', route: { name: 'roulette' } },
  { file: 'gold.html', route: { name: 'gold' } },
  { file: 'links.html', route: { name: 'links' } },
  { file: '404.html', route: { name: 'missing' } }
]
  .concat(data.places.map((p) => ({ file: `places/${p.slug}.html`, route: { name: 'place', slug: p.slug }, lastmod: p.updated })))
  .concat(data.guides.map((g) => ({ file: `guides/${g.slug}.html`, route: { name: 'guide', slug: g.slug }, lastmod: g.updated })))
  .concat(data.site.categories.map((c) => ({ file: `london/${c.slug}.html`, route: { name: 'category', slug: c.slug } })))
  .concat(WL.liveAreas(data).map((a) => ({ file: `london/${a.slug}.html`, route: { name: 'area', slug: a.slug } })))
  .concat(WL.liveOccasions(data).map((o) => ({ file: `london/${WL.slugify(o)}.html`, route: { name: 'occasion', slug: WL.slugify(o) } })));

const INDEXABLE = data.site.indexable !== false;
function buildStatic(dist) {
copyShared(dist, false);
const seen = new Set();
pages.forEach((pg) => {
  if (seen.has(pg.file)) { console.error('Two pages want the same address: ' + pg.file); process.exit(1); }
  seen.add(pg.file);
  const base = pg.file.includes('/') ? '../' : '';
  const out = WL.render(WL.makeCtx('static', base), data, pg.route);
  const url = pageUrl(pg.file);
  const img = out.item && out.item.image ? out.item.image : 'dining-room.jpg';
  write(path.join(dist, pg.file), doc({
    title: out.title, description: out.description, body: out.html, base, url,
    image: SITE + '/img/' + img, extraHead: (INDEXABLE ? '' : '<meta name="robots" content="noindex">\n') + structured(out, pg.route, url),
    type: pg.route.name === 'guide' ? 'article' : 'website',
    script: `WL.mount(document, WL_CONTENT, WL.makeCtx('static', '${base}'));`
  }));
});

const listed = pages.filter((p) => p.file !== '404.html' && p.file !== 'links.html');
write(path.join(dist, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  listed.map((p) => `  <url><loc>${pageUrl(p.file)}</loc><lastmod>${p.lastmod || today}</lastmod></url>`).join('\n') + '\n</urlset>\n');

// Search engines and AI search crawlers are all welcome. Listing the AI ones by name makes the choice explicit.
write(path.join(dist, '.nojekyll'), '');
write(path.join(dist, 'robots.txt'), !INDEXABLE ? 'User-agent: *\nAllow: /\n' : ['User-agent: *', 'Allow: /', '',
  ...['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Claude-SearchBot', 'Claude-User', 'ClaudeBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended']
    .flatMap((b) => ['User-agent: ' + b, 'Allow: /', '']),
  'Sitemap: ' + SITE + '/sitemap.xml', ''].join('\n'));

const rfc822 = (iso) => new Date(iso + 'T09:00:00Z').toUTCString();
write(path.join(dist, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${esc(data.site.name)}</title>
<link>${SITE}/</link>
<description>${esc(data.site.description)}</description>
<language>en-gb</language>
${data.guides.map((g) => `<item><title>${esc(g.title)}</title><link>${pageUrl('guides/' + g.slug + '.html')}</link><guid>${pageUrl('guides/' + g.slug + '.html')}</guid><pubDate>${rfc822(g.published)}</pubDate><description>${esc(g.standfirst)}</description></item>`).join('\n')}
</channel></rss>
`);

}
const repo = path.join(root, '..');
buildStatic(repo);
buildStatic(path.join(repo, 'docs'));

/* ---- preview (one page, hash routes, fonts inlined) ---- */
const prev = path.join(root, 'preview');
copyShared(prev, true);
const home = WL.render(WL.makeCtx('app', ''), data, { name: 'home' });
write(path.join(prev, 'index.html'), doc({
  title: 'The Wonder List', description: data.site.description, base: '',
  body: '<div id="app">' + home.html + '</div>', script: 'WL.start(WL_CONTENT);'
}));

console.log(`Built ${pages.length} static pages and the preview from ${data.places.length} places, ${data.guides.length} guides and ${data.areas.length} areas.`);
