// The collection lane (stories.json `collections`, owner decisions 2026-09-26): which pages to generate next so the
// current sprint's stories become complete sets, and, for the Pinterest lane, whether a page already exists.
// Read-only (it reads production Firestore unauthenticated). Rejects go through pins-plan.mjs --reject <plan>.
//   node scripts/collection-plan.mjs --next 5          the next pages to make: story, scene, audience, createSketch inputs
//   node scripts/collection-plan.mjs --status          sprint progress per story (scenes x audiences) and thin banks
//   node scripts/pins-plan.mjs --next 5 | node scripts/collection-plan.mjs --reuse
//                                                      the Pin slots, each with `reuse`: the id of a public owner page
//                                                      that matches it (same ref, audience and style, or verse font)
//                                                      and is not in pins.json yet, else null (generate it)
// A complete story: every scene (pin-year.json scene items in its ranges) as Toddler and Young Child in Sunday School
// style and as Adult in the story's `adult` style (default Classic), plus up to 2 verse-art pages of its verse items.
import fs from 'node:fs';
import { query } from '../src/lib/firestore.ts';
import { MASTER_UID } from '../src/lib/config.ts';

const year = JSON.parse(fs.readFileSync(new URL('../src/data/pin-year.json', import.meta.url), 'utf8'));
const { stories, collections } = JSON.parse(fs.readFileSync(new URL('../src/data/stories.json', import.meta.url), 'utf8'));
const learn = JSON.parse(fs.readFileSync(new URL('../src/data/pin-learn.json', import.meta.url), 'utf8'));
const V = year.variants;

// Same parsing and slug as pins-plan.mjs and web/src/lib/sketch.ts slugOf (verse art uses the start verse only).
const REF = /^((?:[1-3] )?[A-Za-z][A-Za-z ]*?) (\d+):(\d+)(?:-(\d+))?$/;
const parseRef = (ref) => {
  const m = ref.match(REF);
  return m && { book: m[1], chapter: Number(m[2]), startVerse: Number(m[3]), ...(m[4] ? { endVerse: Number(m[4]) } : {}) };
};
const slug = (r, verse) => `${r.book}-${r.chapter}-${r.startVerse}${!verse && r.endVerse > r.startVerse ? `-${r.endVerse}` : ''}`
  .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
const inRange = (r, [b, c1, v1, c2, v2]) => r && r.book === b && r.chapter * 1000 + r.startVerse >= c1 * 1000 + v1 && r.chapter * 1000 + r.startVerse <= c2 * 1000 + v2;
const storyOf = (r) => stories.find((st) => st.ranges.some((x) => inRange(r, x)));
const order = (r) => r.chapter * 1000 + r.startVerse;

// Same wording as pins-plan.mjs guidance(): the moment, then the learned composition notes.
const guidance = (moment, kind) => `${kind === 'verse' ? `Decorations: ${moment}.` : `Draw this moment: ${moment}.`} ${learn.compositionNotes?.[kind] ?? ''}`.trim().slice(0, 500);
const rejected = (plan) => (learn.rejects?.[plan]?.length ?? 0) >= 2;

// The owner's public pages by "slug|audience:style": T:<style>, Y:<style>, A:<style> (Teen counts as A), V:<font>,
// plus "slug|V" for any verse art.
const pages = (await query('sketches', [['userId', MASTER_UID], ['isPublic', true]], 2000, { ordered: false }))
  .filter((s) => !s.isBookmark && s.promptData?.book);
const have = new Map();
const spans = []; // { book, chapter, from, to, key: "T:<style>" | "Y:<style>" | "A:<style>" }
for (const s of pages) {
  const p = s.promptData;
  const r = { book: p.book, chapter: p.chapter, startVerse: p.start_verse, endVerse: p.end_verse };
  const keys = s.type === 'verse'
    ? [`${slug(r, true)}|V`, `${slug(r, true)}|V:${p.font_style}`]
    : [`${slug(r, false)}|${p.age_group === 'Toddler' ? 'T' : p.age_group === 'Young Child' ? 'Y' : 'A'}:${p.art_style}`];
  for (const k of keys) if (!have.has(k)) have.set(k, s);
  if (s.type !== 'verse') spans.push({ book: p.book, chapter: p.chapter, from: p.start_verse, to: p.end_verse ?? p.start_verse, key: keys[0].split('|')[1] });
}
const covered = (r, key) => spans.some((x) => x.key === key && x.book === r.book && x.chapter === r.chapter
  && ((r.startVerse >= x.from && r.startVerse <= x.to) || (x.from >= r.startVerse && x.from <= (r.endVerse ?? r.startVerse))));

// A story's scenes and verse items from the calendar bank, in Bible order.
function bank(st) {
  const its = year.items.map((i) => ({ ...i, r: parseRef(i.ref) })).filter((i) => i.r && storyOf(i.r)?.id === st.id);
  const isVerse = (i) => i.variants.every((v) => V[v]?.kind === 'verse');
  const onePer = (list, prefer) => {
    const by = new Map();
    for (const i of list) { const k = slug(i.r, false); if (!by.has(k) || (prefer(i) && !prefer(by.get(k)))) by.set(k, i); }
    return [...by.values()].sort((a, b) => order(a.r) - order(b.r));
  };
  const sceneItems = its.filter((i) => !isVerse(i));
  return {
    kids: onePer(sceneItems, (i) => i.variants.some((v) => v === 'T' || v === 'Y')),
    adults: onePer(sceneItems, (i) => i.variants.includes('A')),
    verses: its.filter(isVerse).sort((a, b) => order(a.r) - order(b.r)),
  };
}

// Everything a story still needs, kids first across all scenes, then adults, then verse art.
function missing(st) {
  const adult = st.adult ?? 'Classic';
  const { kids, adults, verses } = bank(st);
  const out = [];
  for (const [code, age] of [['T', 'Toddler'], ['Y', 'Young Child']]) {
    for (const i of kids) {
      const sl = slug(i.r, false);
      const plan = `${i.id}:C-${code}`;
      if (!covered(i.r, `${code}:Sunday School`) && !rejected(plan)) out.push({ i, plan, sl, create: { kind: 'scene', ...i.r, age, style: 'Sunday School', guidance: guidance(i.moment, 'kids') } });
    }
  }
  for (const i of adults) {
    const sl = slug(i.r, false);
    const plan = `${i.id}:C-A`;
    if (!covered(i.r, `A:${adult}`) && !rejected(plan)) out.push({ i, plan, sl, create: { kind: 'scene', ...i.r, age: 'Adult', style: adult, guidance: guidance(i.moment, 'adult') } });
  }
  const verseHave = verses.filter((i) => have.has(`${slug(i.r, true)}|V`)).length;
  for (const i of verses.slice(0, Math.max(0, 2 - verseHave))) {
    const sl = slug(i.r, true);
    const plan = `${i.id}:C-V`;
    const font = V[i.variants[0]]?.font ?? 'Elegant Script';
    if (!have.has(`${sl}|V`) && !rejected(plan)) out.push({ i, plan, sl, create: { kind: 'verse', book: i.r.book, chapter: i.r.chapter, startVerse: i.r.startVerse, font, guidance: guidance(i.moment, 'verse') } });
  }
  return { out, scenes: kids.length, verses: verses.length };
}

// Today's sprint (month-day windows, may wrap the new year), then evergreen.
const md = new Date().toISOString().slice(5, 10);
const within = (w) => (w.from <= w.to ? md >= w.from && md <= w.to : md >= w.from || md <= w.to);
const sprint = collections.sprints.find(within);
const queue = [...new Set([...(sprint?.stories ?? []), ...collections.evergreen])].map((id) => stories.find((s) => s.id === id)).filter(Boolean);

const args = process.argv.slice(2);
if (args[0] === '--reuse') {
  const pinned = new Set(JSON.parse(fs.readFileSync(new URL('../src/data/pins.json', import.meta.url), 'utf8')).map((e) => e.sketchId));
  const slots = JSON.parse(fs.readFileSync(0, 'utf8'));
  const code = (age) => (age === 'Toddler' ? 'T' : age === 'Young Child' ? 'Y' : 'A');
  const match = (c, sl) => pages.find((s) => {
    if (pinned.has(s.id) || s.promptData.chapter !== c.chapter || s.promptData.book !== c.book) return false;
    const p = s.promptData, r = { book: p.book, chapter: p.chapter, startVerse: p.start_verse, endVerse: p.end_verse };
    return c.kind === 'verse'
      ? s.type === 'verse' && slug(r, true) === sl && p.font_style === c.font
      : s.type !== 'verse' && slug(r, false) === sl && code(p.age_group) === code(c.age) && p.art_style === c.style;
  });
  const used = new Set();
  for (const sl of slots) {
    const s = match(sl.create, sl.ref);
    sl.reuse = s && !used.has(s.id) ? s.id : null;
    if (sl.reuse) used.add(sl.reuse);
  }
  console.log(JSON.stringify(slots, null, 2));
} else if (args[0] === '--status') {
  console.log(`sprint: ${sprint ? `${sprint.from} to ${sprint.to} (${sprint.why})` : 'none'}`);
  for (const st of queue) {
    const { out, scenes, verses } = missing(st);
    const target = scenes * 3 + Math.min(2, verses);
    const flag = scenes < 6 ? `  <- only ${scenes} scenes in the bank: add scenes to pin-year.json (series)` : '';
    console.log(`${sprint?.stories.includes(st.id) ? '*' : ' '} ${st.id.padEnd(22)} ${String(target - out.length).padStart(3)}/${String(target).padEnd(3)} done  (${scenes} scenes, adult: ${st.adult ?? 'Classic'})${flag}`);
  }
} else {
  const n = Number(args[args.indexOf('--next') + 1]) || collections.perDay;
  const slots = [];
  for (const st of queue) {
    for (const m of missing(st).out) {
      if (slots.length >= n) break;
      slots.push({ lane: 'collection', story: st.id, plan: m.plan, ref: m.sl, moment: m.i.moment, create: m.create });
    }
    if (slots.length >= n) break;
  }
  console.log(JSON.stringify(slots, null, 2));
}
