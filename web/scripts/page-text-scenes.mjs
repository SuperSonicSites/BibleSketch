// Stage 11 (docs/seo-plan.md): a short scene name and a picture description for owner pages, written a few a day by
// pinterest-daily after looking at each image up close. They render as the page's H1/title ("<scene> Coloring Page
// (<ref>)"), the "What's in this picture" paragraph and the search snippet (web/src/pages/coloring-page/[...path].astro).
//   node scripts/page-text-scenes.mjs --next 5        pages to write next: new pages first, then the backlog by story
//   node scripts/page-text-scenes.mjs --write <file>  merge {"<sketchId>": {"scene", "description"}} after checks,
//                                                     then tell IndexNow about those pages
//   node scripts/page-text-scenes.mjs --status        how many pages have their words, per story
// Read-only on Firestore (unauthenticated); writes only src/data/page-text.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { query } from '../src/lib/firestore.ts';
import { ORIGIN, canonicalPath, reference } from '../src/lib/sketch.ts';
import { MASTER_UID } from '../src/lib/config.ts';

const FILE = new URL('../src/data/page-text.json', import.meta.url);
const texts = JSON.parse(readFileSync(FILE, 'utf8'));
const { stories, collections } = JSON.parse(readFileSync(new URL('../src/data/stories.json', import.meta.url), 'utf8'));
const pins = JSON.parse(readFileSync(new URL('../src/data/pins.json', import.meta.url), 'utf8'));
// Creation is the comparison group: no words until this date (3 weeks from the start, owner plan 2026-09-25).
const HOLD = { creation: '2026-10-17' };
const today = new Date().toISOString().slice(0, 10);

const pages = (await query('sketches', [['userId', MASTER_UID], ['isPublic', true]], 2000, { ordered: false }))
  .filter((s) => s.promptData?.book && !s.isBookmark);
const byId = new Map(pages.map((s) => [s.id, s]));
const inRange = (p, [b, c1, v1, c2, v2]) => p.book === b && p.chapter * 1000 + (p.start_verse ?? 1) >= c1 * 1000 + v1 && p.chapter * 1000 + (p.start_verse ?? 1) <= c2 * 1000 + v2;
const storyOf = (s) => stories.find((st) => st.ranges.some((r) => inRange(s.promptData, r)));
const done = (s) => texts[s.id]?.scene && texts[s.id]?.description;
const titleOf = (scene, s) => `${scene} Coloring Page (${reference(s.promptData)}) | Bible Sketch`;

// Order: Nativity, Wise Men, Noah (owner plan), then this season's collection sprint, evergreen, other stories,
// then pages outside any story. New pages (the last 2 days) go first whatever their story.
const md = today.slice(5);
const sprint = collections.sprints.find((w) => (w.from <= w.to ? md >= w.from && md <= w.to : md >= w.from || md <= w.to));
const order = [...new Set(['nativity', 'wise-men', 'noahs-ark', ...(sprint?.stories ?? []), ...collections.evergreen, ...stories.map((s) => s.id)])];
const rank = (s) => {
  const fresh = Date.now() - Date.parse(s.createdAt ?? 0) < 2 * 864e5 ? 0 : 1;
  const st = storyOf(s)?.id;
  return fresh * 1e6 + (st ? order.indexOf(st) : order.length) * 1e3;
};
const held = (s) => (HOLD[storyOf(s)?.id] ?? '') > today;

// The checks every entry must pass (the words show as the H1, the title and Google's snippet).
function check(id, t) {
  const s = byId.get(id), e = [];
  if (!s) return [`${id}: not a public owner page`];
  if (typeof t.scene !== 'string' || typeof t.description !== 'string') return [`${id}: needs scene and description strings`];
  const { scene, description: d } = t;
  if (scene.length < 3 || titleOf(scene, s).length > 70) e.push(`scene makes a ${titleOf(scene, s).length}-character title (max 70): ${titleOf(scene, s)}`);
  if (/coloring|page|\d|[:|#!]/i.test(scene)) e.push(`scene should be the picture's name only (no "coloring page", reference or symbols): ${scene}`);
  if (d.length < 80 || d.length > 155) e.push(`description is ${d.length} characters (80-155)`);
  if (!/[.]$/.test(d) || /[#!]|\bAI\b|stunning|vibrant|perfect for|beautiful|delve|tapestry|intricate/i.test(d)) e.push(`description: plain sentences ending with a period, no hype words or "AI": ${d}`);
  if (/^(this|a|an) (coloring )?(page|picture|image)/i.test(d)) e.push(`description should start with what is drawn, not "This page": ${d}`);
  return e.map((m) => `${id}: ${m}`);
}

const args = process.argv.slice(2);
if (args[0] === '--write') {
  const add = JSON.parse(readFileSync(args[1], 'utf8'));
  const errors = Object.entries(add).flatMap(([id, t]) => check(id, t));
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  for (const [id, t] of Object.entries(add)) texts[id] = { ...texts[id], scene: t.scene.trim(), description: t.description.trim() };
  writeFileSync(FILE, `${JSON.stringify(Object.fromEntries(Object.entries(texts).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`);
  console.log(`${Object.keys(add).length} pages written; ${pages.filter(done).length}/${pages.length} owner pages have their words`);
  const KEY = '2c2cf7276dcf89edc85f8e0516f8197a';
  const urlList = Object.keys(add).map((id) => ORIGIN + canonicalPath(byId.get(id)));
  const res = await fetch('https://www.bing.com/indexnow', {
    method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: 'biblesketch.app', key: KEY, keyLocation: `${ORIGIN}/${KEY}.txt`, urlList }),
    signal: AbortSignal.timeout(15000),
  }).catch((e) => ({ status: 0, text: async () => e.message }));
  console.log(`IndexNow: ${urlList.length} URLs -> ${res.status}${res.status === 200 || res.status === 202 ? '' : ` ${await res.text()}`}`);
} else if (args[0] === '--status') {
  const per = new Map();
  for (const s of pages) { const k = storyOf(s)?.id ?? '(no story)'; const v = per.get(k) ?? [0, 0]; v[1]++; if (done(s)) v[0]++; per.set(k, v); }
  console.log(`${pages.filter(done).length}/${pages.length} owner pages have their words${HOLD.creation > today ? `; creation held until ${HOLD.creation} (comparison group)` : ''}`);
  for (const id of [...order, '(no story)']) if (per.has(id)) console.log(`  ${id.padEnd(22)} ${per.get(id).join('/')}`);
} else {
  const n = Number(args[args.indexOf('--next') + 1]) || 5;
  const next = pages.filter((s) => !done(s) && !held(s)).sort((a, b) => rank(a) - rank(b) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '')).slice(0, n);
  const pinOf = new Map(pins.map((e) => [e.sketchId, e]));
  console.log(JSON.stringify(next.map((s) => ({
    id: s.id, url: ORIGIN + canonicalPath(s), image: `${ORIGIN}/img/w800/${decodeURIComponent(new URL(s.imageUrl).pathname.split('/o/')[1] ?? '')}`,
    ref: reference(s.promptData), story: storyOf(s)?.name ?? null, audience: s.promptData.age_group ?? null,
    style: s.type === 'verse' ? `verse art, ${s.promptData.font_style}` : s.promptData.art_style, verse: texts[s.id]?.verse ?? null,
    pin: pinOf.get(s.id)?.description ?? null,
  })), null, 2));
}
