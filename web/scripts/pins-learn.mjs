// Long-term learning for the Pinterest calendar (docs/pinterest-runbook.md, "The learning loop").
// Owner decisions 2026-09-24: learn only from outbound clicks and saves of Pins at least 180 days old; find the
// "je ne sais quoi" (composition, expressions, feel, style) of winners AND losers, without mistaking luck for a
// lesson. So each Pin gets two outcomes, both ranked within its own board (boards differ a lot):
//   - reach     = clicks + saves: what the topic and Pinterest's distribution gave it (partly a lottery);
//   - resonance = (clicks + saves) per 1,000 impressions, for Pins shown at least MIN_IMPRESSIONS times: whether
//                 people who saw the image wanted it. Visual traits are learned from resonance.
// Run monthly by the daily task, in web/:
//   node scripts/pins-learn.mjs [report.json]   update src/data/pin-learn.json (numbers from KV `learn:report`
//                                                unless a report file is given) and print the summary
//   node scripts/pins-learn.mjs --list          the learning Pins with their images, and which have no profile yet
//   node scripts/pins-learn.mjs --selftest
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { entries } from '../src/lib/pins.ts';
import { getDoc } from '../src/lib/firestore.ts';
import year from '../src/data/pin-year.json' with { type: 'json' };

const LEARN = new URL('../src/data/pin-learn.json', import.meta.url);
const K = 5; // shrinkage: a feature needs about K Pins before its value moves far from neutral
const MIN_IMPRESSIONS = 300; // below this, Pinterest barely showed the Pin: no verdict on the image
const DAY = 864e5;
const clamp = (x) => Math.min(2, Math.max(0.5, x));

// Percentile rank (0-1, ties averaged) of each value within its group.
export function percentiles(rows, key, group) {
  const out = new Map();
  for (const g of new Set(rows.map(group))) {
    const list = rows.filter((r) => group(r) === g && r[key] !== null).sort((a, b) => a[key] - b[key]);
    list.forEach((r, i) => {
      const same = list.filter((x) => x[key] === r[key]);
      const first = list.indexOf(same[0]);
      out.set(r, list.length === 1 ? 0.5 : (first + (same.length - 1) / 2) / (list.length - 1));
    });
  }
  return out;
}
// Mean percentile of a feature's Pins, shrunk toward 0.5; n = how many Pins carry it.
export function effects(rows, pctKey) {
  const acc = {};
  for (const r of rows) if (r[pctKey] !== null) for (const f of r.features) (acc[f] ??= []).push(r[pctKey]);
  return Object.fromEntries(Object.entries(acc).map(([f, v]) => [f, { n: v.length, mean: (v.reduce((a, b) => a + b, 0) + K * 0.5) / (v.length + K) }]));
}
const confidence = (n, mean) => (n >= 15 && Math.abs(mean - 0.5) >= 0.1 ? 'strong' : n >= 8 && Math.abs(mean - 0.5) >= 0.07 ? 'moderate' : 'hunch');

if (process.argv[2] === '--selftest') {
  const rows = [1, 2, 3, 4].map((x) => ({ b: 'a', x }));
  assert.deepEqual([...percentiles(rows, 'x', (r) => r.b).values()], [0, 1 / 3, 2 / 3, 1]);
  const e = effects([...Array(20)].map(() => ({ features: ['feel:joyful'], p: 1 })).concat([{ features: ['feel:solemn'], p: 0 }]), 'p');
  assert.ok(e['feel:joyful'].mean >= 0.89 && e['feel:solemn'].mean > 0.4, 'shrinkage keeps a single Pin near neutral');
  assert.equal(confidence(20, 0.9), 'strong');
  assert.equal(confidence(3, 0.9), 'hunch');
  console.log('pins-learn selftest ok');
  process.exit(0);
}

const learn = JSON.parse(fs.readFileSync(LEARN, 'utf8'));
const listOnly = process.argv[2] === '--list';
const report = JSON.parse(process.argv[2] && !listOnly
  ? fs.readFileSync(process.argv[2], 'utf8')
  : execSync('npx wrangler kv key get learn:report --binding PINTEREST --remote', { encoding: 'utf8' }));
const now = Date.now();
// By the start of the board name ("Easter Coloring Pages & Sunday School Crafts" is the Easter board).
const boardKey = (name = '') => (/^easter/i.test(name) ? 'easter' : /^christmas/i.test(name) ? 'christmas' : /^scripture/i.test(name) ? 'scripture'
  : /^sunday/i.test(name) ? 'sunday-school' : /adult/i.test(name) ? 'adult' : null);
const boardOf = new Map(report.boards.map((b) => [b.id, boardKey(b.name)]));
const entryOf = new Map(entries.map((e) => [e.sketchId, e]));
const itemOf = new Map(year.items.map((i) => [i.id, i]));
// The bank item a Pin's passage belongs to: same board, book and chapter, the exact verses first, else overlapping
// ones (a winner on Genesis 1:20-22 comes back through the Genesis 1:21 item).
const REF = /^((?:[1-3] )?[A-Za-z][A-Za-z ]*?) (\d+):(\d+)(?:-(\d+))?$/;
const itemFor = (board, pd) => {
  if (!pd?.book) return null;
  const [s, e] = [pd.start_verse, pd.end_verse ?? pd.start_verse];
  const hits = year.items.map((i) => [i, i.board === board && i.ref.match(REF)])
    .filter(([, m]) => m && m[1] === pd.book && Number(m[2]) === pd.chapter && Number(m[3]) <= e && Number(m[4] ?? m[3]) >= s);
  return (hits.find(([, m]) => Number(m[3]) === s && Number(m[4] ?? m[3]) === e) ?? hits[0])?.[0] ?? null;
};
// "<item>:<variant>" when the page's age/style or font is one of the item's variants, else the item alone.
const planOf = (item, pd) => {
  if (!item) return null;
  const v = item.variants.findIndex((code) => {
    const f = year.variants[code];
    return f.font ? f.font === pd.font_style : f.age === pd.age_group && f.style === pd.art_style;
  });
  return v >= 0 ? `${item.id}:${v}` : item.id;
};

// 1. Snapshots: lifetime numbers the first time a Pin is seen at day 180 or later, and at day 365.
learn.snapshots ??= {};
for (const p of report.pins) {
  const sketchId = p.link?.match(/\/coloring-page\/[^/]+\/([^/?#]+)/)?.[1];
  const board = boardOf.get(p.board);
  if (!sketchId || !board) continue;
  const age = Math.floor((now - Date.parse(`${p.created}Z`)) / DAY);
  const life = p.metrics?.lifetime_metrics ?? {};
  const numbers = { clicks: life.outbound_click ?? 0, saves: life.save ?? 0, impressions: life.impression ?? 0 };
  const s = (learn.snapshots[p.id] ??= { sketchId, board, created: p.created.slice(0, 10) });
  if (age >= 180 && !s.d180) s.d180 = { ...numbers, age, ...(age > 200 ? { approx: true } : {}) };
  if (age >= 365 && !s.d365) s.d365 = { ...numbers, age, ...(age > 385 ? { approx: true } : {}) };
}

// 2. Every Pin with a day-180 snapshot, with what it is (metadata) and what it looks like (its visual profile).
const rows = [];
for (const [pinId, s] of Object.entries(learn.snapshots).filter(([, x]) => x.d180)) {
  const sketch = await getDoc('sketches', s.sketchId).catch(() => null);
  const pd = sketch?.promptData ?? {};
  const e = entryOf.get(s.sketchId);
  const planItem = e?.plan ? itemOf.get(e.plan.split(':')[0]) : null;
  const qa = sketch?.qa;
  const band = (x, cuts, name) => (x === undefined ? null : `${name}:${cuts.find((c) => x < c) !== undefined ? `<${cuts.find((c) => x < c)}` : `>=${cuts.at(-1)}`}`);
  const tags = e?.tags ?? learn.profiles?.[s.sketchId] ?? [];
  const { clicks, saves, impressions } = s.d180;
  rows.push({
    pinId, ...s, clicks, saves, impressions, reach: clicks + saves,
    resonance: impressions >= MIN_IMPRESSIONS ? (1000 * (clicks + saves)) / impressions : null,
    kind: pd.font_style ? 'verse' : pd.age_group === 'Adult' ? 'adult' : 'kids',
    profiled: tags.length > 0, image: sketch?.imageUrl ?? null,
    ref: pd.book ? `${pd.book} ${pd.chapter}:${pd.start_verse}${pd.end_verse ? `-${pd.end_verse}` : ''}` : null,
    ageStyle: pd.font_style ?? `${pd.age_group}/${pd.art_style}`,
    plan: e?.plan ?? planOf(itemFor(s.board, pd), pd),
    meta: [
      `board:${s.board}`, pd.age_group && `age:${pd.age_group}`, pd.art_style && `style:${pd.art_style}`, pd.font_style && `font:${pd.font_style}`,
      pd.book && `book:${pd.book}`, e && `template:${e.template}`, e && `opener:${e.title.split(': ')[0]}`, planItem?.series && `series:${planItem.series}`,
    ].filter(Boolean),
    visual: [...tags.map((t) => `tag:${t}`), qa && band(qa.lineMm, [0.6, 1.2, 2], 'lineMm'), qa && band(qa.regions, [150, 400, 800], 'regions')].filter(Boolean),
  });
}

if (listOnly) {
  // For the visual study and back-filling profiles (pins-review.py sheets): [label, look, story, sketchId, image].
  const seen = new Set();
  console.log(JSON.stringify(rows.filter((r) => r.image && !seen.has(r.sketchId) && seen.add(r.sketchId))
    .map((r) => [`${r.board} ${r.ref ?? ''}${r.profiled ? '' : ' (no profile)'}`, r.ageStyle, `${r.reach} c+s, ${r.resonance?.toFixed(1) ?? '-'}/1k`, r.sketchId, r.image])));
  process.exit(0);
}

// Every learned Pin counts as a use of its bank item for pins-plan's no-repeat rule, Pins posted before the
// calendar existed included (only proven winners come back).
for (const r of rows) if (r.plan) learn.snapshots[r.pinId].plan = r.plan;

// 3. Ranks within each board, then what the ranks say.
const reachPct = percentiles(rows, 'reach', (r) => r.board);
const resPct = percentiles(rows, 'resonance', (r) => r.board);
for (const r of rows) Object.assign(r, { reachPct: reachPct.get(r) ?? null, resPct: resPct.get(r) ?? null, features: [] });
if (rows.length >= 20) {
  // Planner weights (what to post): reach and resonance together, on the metadata features.
  for (const r of rows) Object.assign(r, { features: r.meta, both: r.resPct === null ? r.reachPct : (r.reachPct + r.resPct) / 2 });
  learn.weights = Object.fromEntries(Object.entries(effects(rows, 'both')).filter(([, x]) => x.n >= 3).map(([f, x]) => [f, Number(clamp(2 * x.mean).toFixed(3))]));
  // Visual traits (how to draw it): resonance only, so a lucky or unlucky distribution doesn't teach us anything.
  // Overall and per kind of page (what works for toddlers may not for adults); smaller groups = lower confidence.
  for (const r of rows) r.features = r.visual;
  const traitsOf = (list) => Object.fromEntries(Object.entries(effects(list, 'resPct'))
    .map(([f, x]) => [f, { n: x.n, effect: Number((x.mean - 0.5).toFixed(3)), confidence: confidence(x.n, x.mean) }])
    .sort((a, b) => b[1].effect - a[1].effect));
  learn.traits = traitsOf(rows);
  learn.traitsByKind = Object.fromEntries(['kids', 'adult', 'verse'].map((k) => [k, traitsOf(rows.filter((r) => r.kind === k))]));
  // Winners (may come back as fresh images): top 10% by reach + resonance, a sketch once.
  const ranked = [...rows].sort((a, b) => b.both - a.both).filter((r, i, a) => a.findIndex((x) => x.sketchId === r.sketchId) === i);
  learn.winners = ranked.slice(0, Math.max(1, Math.round(ranked.length * 0.1)))
    .map((r) => ({ pinId: r.pinId, sketchId: r.sketchId, board: r.board, plan: r.plan, ref: r.ref, clicks: r.clicks, saves: r.saves, impressions: r.impressions, pct: Number(r.both.toFixed(2)) }));
  // The visual study sets: per kind of page, the 12 most and least resonant Pins that Pinterest showed enough.
  learn.study = {};
  for (const kind of ['kids', 'adult', 'verse']) {
    const shown = rows.filter((r) => r.kind === kind && r.resPct !== null && r.image)
      .sort((a, b) => b.resPct - a.resPct).filter((r, i, a) => a.findIndex((x) => x.sketchId === r.sketchId) === i);
    const pick = (list) => list.slice(0, 12).map((r) => ({ sketchId: r.sketchId, ref: r.ref, board: r.board, ageStyle: r.ageStyle, perK: Number(r.resonance.toFixed(1)), impressions: r.impressions, image: r.image }));
    if (shown.length >= 8) learn.study[kind] = { top: pick(shown), bottom: pick([...shown].reverse()) };
  }
  // Numbers-only composition hints per kind (the monthly visual study turns them and the images into
  // compositionNotes, which is what the planner puts in the guidance).
  const say = (list) => list.map(([f]) => f.slice(4).replace(':', ' ')).join(', ');
  const notes = (t) => {
    const good = Object.entries(t).filter(([f, x]) => f.startsWith('tag:') && x.effect > 0 && x.confidence !== 'hunch');
    const bad = Object.entries(t).filter(([f, x]) => f.startsWith('tag:') && x.effect < 0 && x.confidence !== 'hunch').reverse();
    return `${good.length ? `Resonates: ${say(good)}.` : ''}${bad.length ? ` Falls flat: ${say(bad)}.` : ''}`.trim();
  };
  learn.traitNotes = { all: notes(learn.traits), ...Object.fromEntries(Object.entries(learn.traitsByKind).map(([k, t]) => [k, notes(t)])) };
  learn.referenceCandidates = Object.values(Object.groupBy(ranked.slice(0, Math.max(1, Math.round(ranked.length * 0.1))).filter((r) => r.kind !== 'verse'), (r) => r.ageStyle))
    .flatMap((g) => g.slice(0, 3)).map((r) => ({ ageStyle: r.ageStyle, sketchId: r.sketchId, ref: r.ref, image: r.image }));
}
learn.updated = new Date(now).toISOString().slice(0, 10);
learn.basedOn = { pins: rows.length, profiled: rows.filter((r) => r.profiled).length, shownEnough: rows.filter((r) => r.resonance !== null).length, reportPins: report.pins.length };
fs.writeFileSync(LEARN, `${JSON.stringify(learn, null, 2)}\n`);

// 4. Summary for the runbook's "What's working".
const w = Object.entries(learn.weights ?? {}).sort((a, b) => b[1] - a[1]);
const t = Object.entries(learn.traits ?? {});
console.log(`Report of ${report.generated ?? '?'}. Learned from ${rows.length} Pins at least 180 days old (${learn.basedOn.shownEnough} shown ${MIN_IMPRESSIONS}+ times, ${learn.basedOn.profiled} with a visual profile).`);
if (rows.length < 20) console.log('Fewer than 20: weights, traits and winners unchanged.');
console.log(`What to post, strongest: ${w.slice(0, 6).map(([f, x]) => `${f} x${x}`).join(', ')}`);
console.log(`What to post, weakest: ${w.slice(-6).reverse().map(([f, x]) => `${f} x${x}`).join(', ')}`);
console.log(`How to draw it, resonates: ${t.filter(([, x]) => x.effect > 0).slice(0, 8).map(([f, x]) => `${f.replace('tag:', '')} ${x.effect > 0 ? '+' : ''}${x.effect} (${x.confidence}, n=${x.n})`).join('; ')}`);
console.log(`How to draw it, falls flat: ${t.filter(([, x]) => x.effect < 0).slice(-8).reverse().map(([f, x]) => `${f.replace('tag:', '')} ${x.effect} (${x.confidence}, n=${x.n})`).join('; ')}`);
console.log(`Winners: ${learn.winners.map((r) => r.ref ?? r.sketchId).join('; ')}`);
