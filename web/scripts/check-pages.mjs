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
  // phase 2: every tag, and the profiles in the live sitemap
  ...['advent', 'christmas', 'epiphany', 'lent', 'holy-week', 'easter', 'pentecost', 'ordinary-time', 'creation', 'the-fall',
    'exile', 'prophets', 'miracles', 'parables', 'resurrection'].map((t) => `/tags/${t}`),
  ...['xaeS7pQ1HZRfPOIkdNV6LPbmKXC2', 'xeggSuDd2uZae29ONIpJqTEVWly2', 'QUmmtp2Zv0SB9v3OkxNI1PZXqtf2', 'TiAEiMqWxpWqxCLtoI5OgHAvtf33',
    'ArEgVs05L7fJYzYbA5CpFb6CqSI2', 'lRlBce35zvYPdzUjRs68txidY5W2', 'Zzd57UpTVchrtJ3qxlr0B5MLUWi1', 'EIV569rIHRVDiHYHTzFEKzDPzeg1'].map((u) => `/profile/${u}`),
  // phases 3-4
  '/pricing', '/gallery', '/', '/bible-verse-coloring',
];
// Deliberate changes (ROADMAP 1, phase 1), as "path field".
const INTENDED = new Set([
  '/privacy canonical', '/terms canonical', // self-canonicals added
  '/verified robots', // noindex moved from the header alone into a meta tag too
  '/about twitter:card', // one value (summary, square logo); the live page had two
  '/blog twitter:card', // listing: summary (square logo), was only in the server tags
  // noindex pages now carry the same og/twitter basics as every page (harmless for pages nobody shares)
  '/privacy twitter:card', '/terms twitter:card', '/verified og:title', '/verified twitter:card',
  // tag pages: one title, the richer one the live client renders after boot (what Google indexes), not the
  // server's short "<Tag> Coloring Pages | Bible Sketch"
  ...PATHS.filter((p) => p.startsWith('/tags/')).flatMap((p) => [`${p} title`, `${p} og:title`]),
  // verse art: the client title/description Google indexes (as for tags), and the example page as share image
  ...['title', 'description', 'og:title', 'og:image', 'twitter:card'].map((f) => `/bible-verse-coloring ${f}`),
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

// The full-size original is never offered publicly (docs/seo-plan.md stages 1 and 6): no Firebase Storage URL in
// any <head> or JSON-LD, including two coloring pages (an owner page and a community page). Profiles are left
// out: their og:image is the account's avatar (not a coloring page) and they are all noindexed.
const firebaseIn = (h) => {
  const headPart = h.slice(0, h.indexOf('</head>') + 1);
  const ld = [...h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('');
  return /firebasestorage\.googleapis\.com/.test(headPart + ld);
};
const SKETCHES = ['/coloring-page/genesis-21-2-3/0DhrOOagZsTeNidpmXfu', '/coloring-page/john-19-30-34/ebkDUWhgdHRiKnyUe0jw'];
const leaks = [];
for (const path of [...PATHS.filter((p) => !p.startsWith('/profile/')), ...SKETCHES]) {
  if (firebaseIn(await fetch(`${CANDIDATE}${path}`).then((r) => r.text()))) leaks.push(path);
}
assert.deepEqual(leaks, [], `Firebase Storage URL in head or JSON-LD: ${leaks.join(', ')}`);
console.log('no Firebase Storage URL in head or JSON-LD');
