// Head parity for the phase 1 pages: compares a candidate origin with production (biblesketch.app, served by
// the Firebase render functions today). Fails on any difference not listed in INTENDED.
// Usage: node scripts/check-pages.mjs [candidate-origin=http://localhost:4321]
import assert from 'node:assert/strict';

const CANDIDATE = process.argv[2] ?? 'http://localhost:4321';
const LIVE = 'https://biblesketch.app';
const PATHS = [
  '/about', '/privacy', '/terms', '/verified', '/blog',
  '/blog/joshua-1-9-coloring-page-free', '/blog/5-printable-christian-christmas-coloring-pages-for-toddlers',
  '/blog/5-genesis-1-coloring-pages-for-toddlers', '/blog/bible-coloring-pages',
  '/blog/christian-christmas-coloring-pages', '/blog/joshua-jericho-coloring-pages',
];
// Deliberate changes (ROADMAP 1, phase 1), as "path field".
const INTENDED = new Set([
  '/privacy canonical', '/terms canonical', // self-canonicals added
  '/verified robots', // noindex moved from the header alone into a meta tag too
  '/about twitter:card', // one value (summary, square logo); the live page had two
  '/blog twitter:card', // listing: summary (square logo), was only in the server tags
  // noindex pages now carry the same og/twitter basics as every page (harmless for pages nobody shares)
  '/privacy twitter:card', '/terms twitter:card', '/verified og:title', '/verified twitter:card',
]);

const decode = (s) => s?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
function head(html) {
  const h = html.slice(0, html.indexOf('</head>'));
  const meta = (attr, key) => {
    const all = [...h.matchAll(new RegExp(`<meta[^>]*${attr}="${key}"[^>]*>`, 'g'))].map((m) => decode(m[0].match(/content="([^"]*)"/)?.[1]));
    return all.length ? [...new Set(all)].join(' | ') : undefined;
  };
  return {
    title: decode(h.match(/<title[^>]*>([^<]*)<\/title>/)?.[1]),
    description: meta('name', 'description'),
    canonical: [...new Set([...h.matchAll(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/g)].map((m) => m[1]))].join(' | ') || undefined,
    robots: meta('name', 'robots')?.replace('max-image-preview:large | ', '').replace(' | max-image-preview:large', ''),
    'og:title': meta('property', 'og:title'),
    'og:image': meta('property', 'og:image'),
    'twitter:card': meta('name', 'twitter:card'),
  };
}

let diffs = 0;
for (const path of PATHS) {
  const [a, b] = await Promise.all([
    fetch(`${CANDIDATE}${path}`).then((r) => r.text()),
    fetch(`${LIVE}${path}?cb=${Date.now()}`).then((r) => r.text()),
  ]);
  const [mine, live] = [head(a), head(b)];
  for (const field of Object.keys(live)) {
    if (mine[field] === live[field]) continue;
    const intended = INTENDED.has(`${path} ${field}`);
    if (!intended) diffs++;
    console.log(`${intended ? 'intended' : 'DIFF    '} ${path} ${field}\n   live: ${live[field]}\n   new:  ${mine[field]}`);
  }
}
assert.equal(diffs, 0, `${diffs} unintended head differences`);
console.log('head parity ok');
