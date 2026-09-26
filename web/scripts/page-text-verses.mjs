// Fills `verse` in src/data/page-text.json for every public owner page that has none yet: the World English Bible
// text (public domain) from bible-api.com, with "the LORD" as on the Pins (withLord in functions/generation/pipeline.js).
// Idempotent: safe to rerun after new pages are published. Reads production Firestore unauthenticated (read-only).
// Then tells IndexNow (Bing, which shares with the other engines) about the pages it just filled: they are the new
// owner pages (docs/seo-plan.md stage 7). IndexNow throttles Cloudflare Worker traffic, so this runs here, from the
// owner's machine (the pinterest-daily task), not in the Worker.
// Run: node scripts/page-text-verses.mjs              new pages only
//      node scripts/page-text-verses.mjs --indexnow-all  also submit every owner page, tag page and main page once
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { query } from '../src/lib/firestore.ts';
import { ORIGIN, canonicalPath, reference } from '../src/lib/sketch.ts';
import { MASTER_UID } from '../src/lib/config.ts';

const { withLord } = createRequire(import.meta.url)('../../functions/generation/pipeline.js');
const FILE = new URL('../src/data/page-text.json', import.meta.url);
const MAX = 600; // long passages (up to 41 verses) are cut at a word, with an ellipsis
const texts = JSON.parse(readFileSync(FILE, 'utf8'));

const sketches = await query('sketches', [['userId', MASTER_UID], ['isPublic', true]], 1000, { ordered: false });
const todo = sketches.filter((s) => s.promptData?.book && !s.isBookmark && !texts[s.id]?.verse);
console.log(`${sketches.length} public owner pages, ${todo.length} without verse text`);

const byRef = new Map();
const added = [];
let failures = 0;
for (const s of todo) {
  const ref = reference(s.promptData);
  if (!byRef.has(ref)) {
    // bible-api.com allows about 15 requests per 30 s
    await new Promise((r) => setTimeout(r, 2200));
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=web`, { signal: AbortSignal.timeout(15000) }).catch(() => null);
    const body = res?.ok ? await res.json() : null;
    let verse = body?.text ? withLord(body.text.replace(/\s+/g, ' ').trim()) : '';
    if (verse.length > MAX) verse = `${verse.slice(0, verse.lastIndexOf(' ', MAX - 1))}…`;
    byRef.set(ref, verse);
    if (!verse) {
      failures += 1;
      console.warn('no text for', ref, res?.status);
      if (failures >= 3) break; // stop after 3 failures in a row is enough to know something is wrong
    } else failures = 0;
  }
  const verse = byRef.get(ref);
  if (verse) {
    texts[s.id] = { ...texts[s.id], verse };
    added.push(s);
  }
}

const sorted = Object.fromEntries(Object.entries(texts).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(FILE, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`${Object.values(sorted).filter((t) => t.verse).length} pages have verse text (${byRef.size} references fetched)`);

// IndexNow: the key is public by design, served at /<key>.txt (web/public).
const KEY = '2c2cf7276dcf89edc85f8e0516f8197a';
const all = process.argv.includes('--indexnow-all');
const pages = (all ? sketches.filter((s) => !s.isBookmark) : added).map((s) => ORIGIN + canonicalPath(s));
if (pages.length) {
  const tags = all ? [...new Set(sketches.flatMap((s) => s.tags ?? []))].map((t) => `${ORIGIN}/tags/${t}`) : [];
  const main = all ? ['/', '/gallery', '/bible-verse-coloring', '/blog', '/about', '/pricing'] : ['/', '/gallery'];
  const urlList = [...pages, ...tags, ...main.map((m) => ORIGIN + m)];
  const res = await fetch('https://www.bing.com/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: 'biblesketch.app', key: KEY, keyLocation: `${ORIGIN}/${KEY}.txt`, urlList }),
    signal: AbortSignal.timeout(15000),
  }).catch((e) => ({ status: 0, text: async () => e.message }));
  // 200 or 202 = accepted; anything else is reported and left for the next run.
  console.log(`IndexNow: ${urlList.length} URLs -> ${res.status}${res.status === 200 || res.status === 202 ? '' : ` ${await res.text()}`}`);
} else console.log('IndexNow: no new pages to submit');
