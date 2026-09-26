// Fills `verse` in src/data/page-text.json for every public owner page that has none yet: the World English Bible
// text (public domain) from bible-api.com, with "the LORD" as on the Pins (withLord in functions/generation/pipeline.js).
// Idempotent: safe to rerun after new pages are published. Reads production Firestore unauthenticated (read-only).
// Run: node scripts/page-text-verses.mjs   (docs/seo-plan.md stage 3)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { query } from '../src/lib/firestore.ts';
import { reference } from '../src/lib/sketch.ts';
import { MASTER_UID } from '../src/lib/config.ts';

const { withLord } = createRequire(import.meta.url)('../../functions/generation/pipeline.js');
const FILE = new URL('../src/data/page-text.json', import.meta.url);
const MAX = 600; // long passages (up to 41 verses) are cut at a word, with an ellipsis
const texts = JSON.parse(readFileSync(FILE, 'utf8'));

const sketches = await query('sketches', [['userId', MASTER_UID], ['isPublic', true]], 1000, { ordered: false });
const todo = sketches.filter((s) => s.promptData?.book && !s.isBookmark && !texts[s.id]?.verse);
console.log(`${sketches.length} public owner pages, ${todo.length} without verse text`);

const byRef = new Map();
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
  if (verse) texts[s.id] = { ...texts[s.id], verse };
}

const sorted = Object.fromEntries(Object.entries(texts).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(FILE, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`${Object.values(sorted).filter((t) => t.verse).length} pages have verse text (${byRef.size} references fetched)`);
