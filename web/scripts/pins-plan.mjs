// The yearly Pinterest calendar (src/data/pin-year.json) turned into exact instructions for the daily task
// (docs/pinterest-runbook.md, "Daily scheduled task"). Read-only except --reject.
//   node scripts/pins-plan.mjs --next 5           the next 5 slots: date, board, template, what to generate and how
//   node scripts/pins-plan.mjs --check            bank integrity, 365-day coverage, supply per board and season
//   node scripts/pins-plan.mjs --reject <plan> "<reason>"   log a rejected page (pin-learn.json), 2 rejects = skip
// Code does the bookkeeping (dates, ramp, mix, no repeats); Claude generates, reviews and writes the copy.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { entries, dailyCap } from '../src/lib/pins.ts';
import year from '../src/data/pin-year.json' with { type: 'json' };

const LEARN = new URL('../src/data/pin-learn.json', import.meta.url);
const learn = JSON.parse(fs.readFileSync(LEARN, 'utf8'));
const DAY = 864e5;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const addDays = (d, n) => iso(Date.parse(d) + n * DAY);
const between = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

// ---------------------------------------------------------------- dates
// Gregorian Easter (anonymous algorithm) and the other moveable days the seasons hang on.
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(Date.UTC(y, month - 1, day));
}
const nthWeekday = (y, month, weekday, n) => { // weekday 0 = Sunday
  const first = new Date(Date.UTC(y, month - 1, 1)).getUTCDay();
  return iso(Date.UTC(y, month - 1, 1 + ((weekday - first + 7) % 7) + (n - 1) * 7));
};
const ANCHORS = {
  easter,
  pentecost: (y) => addDays(easter(y), 49),
  mothersday: (y) => nthWeekday(y, 5, 0, 2), // US and Canada
  fathersday: (y) => nthWeekday(y, 6, 0, 3),
  thanksgiving: (y) => nthWeekday(y, 11, 4, 4), // US
};
// "10-01" (month-day) or "easter-60" / "pentecost+5" (days from a moveable day), for the season year `y`.
const point = (spec, y) => {
  const m = spec.match(/^([a-z]+)([+-]\d+)?$/);
  if (m) return addDays(ANCHORS[m[1]](y), Number(m[2] ?? 0));
  return `${y}-${spec}`;
};
// The season's window that contains `d` (a window may cross New Year), with its peak, or null.
function windowAt(season, d) {
  const y = Number(d.slice(0, 4));
  for (const sy of [y - 1, y, y + 1]) {
    const from = point(season.from, sy);
    let to = point(season.to, sy);
    if (to < from) to = point(season.to, sy + 1);
    if (d >= from && d <= to) {
      let peak = point(season.peak ?? season.to, sy);
      if (peak < from) peak = point(season.peak, sy + 1);
      return { from, to, peak };
    }
  }
  return null;
}

// ---------------------------------------------------------------- the bank
const VARIANTS = year.variants; // code → createSketch fields
const BOOKS = /^((?:[1-3] )?[A-Za-z][A-Za-z ]*?) (\d+):(\d+)(?:-(\d+))?$/;
const parseRef = (ref) => {
  const m = ref.match(BOOKS);
  if (!m) return null;
  return { book: m[1], chapter: Number(m[2]), startVerse: Number(m[3]), ...(m[4] ? { endVerse: Number(m[4]) } : {}) };
};
// Same slug as the coloring page (web/src/lib/sketch.ts slugOf); verse art only ever uses the start verse.
const slugOf = (r, verse) => `${r.book}-${r.chapter}-${r.startVerse}${!verse && r.endVerse > r.startVerse ? `-${r.endVerse}` : ''}`
  .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
const items = year.items.map((i) => {
  const r = parseRef(i.ref);
  const verse = i.variants.every((v) => VARIANTS[v]?.kind === 'verse');
  return { ...i, r, verse, slug: r && slugOf(r, verse) };
});
const byId = new Map(items.map((i) => [i.id, i]));
const seasons = new Map(year.seasons.map((s) => [s.id, s]));

// Uses so far: entries with `plan` count exactly; older entries count against the item with the same page slug.
function usesOf(list) {
  const uses = new Map(); // item id → [{ v, release }]
  for (const e of list) {
    let id, v;
    if (e.plan) [id, v] = e.plan.split(':');
    else id = items.find((i) => i.board === e.board && i.slug === e.ref)?.id;
    if (!id) continue;
    if (!uses.has(id)) uses.set(id, []);
    uses.get(id).push({ v: v === undefined ? null : Number(v), release: e.release, board: e.board, ref: e.ref });
  }
  return uses;
}

// ---------------------------------------------------------------- the daily mix
// Board quotas for a release day, trimmed to the ramp: seasonal boards first (front-load), then one Sunday School,
// one Scripture, Adult on Tuesdays and Fridays, then Sunday School up to its cap.
const weekday = (d) => new Date(`${d}T12:00:00Z`).getUTCDay();
function quotas(d) {
  const want = [];
  const seasonal = {};
  for (const s of year.seasons) if (s.perDay && windowAt(s, d)) seasonal[s.board] = Math.min(year.boardCap[s.board], (seasonal[s.board] ?? 0) + s.perDay);
  for (const [b, n] of Object.entries(seasonal)) for (let i = 0; i < n; i++) want.push(b);
  want.push('sunday-school', 'scripture');
  if (year.adultDays.includes(weekday(d))) want.push('adult');
  while (want.filter((b) => b === 'sunday-school').length < year.boardCap['sunday-school']) want.push('sunday-school');
  const q = {};
  for (const b of want.slice(0, dailyCap(d))) q[b] = (q[b] ?? 0) + 1;
  return q;
}

// ---------------------------------------------------------------- picking
const learned = (feature) => learn.weights?.[feature] ?? 1;
const itemWeight = (i, v) => {
  const f = VARIANTS[i.variants[v]];
  return learned(`board:${i.board}`) * learned(`book:${i.r.book}`) * (i.series ? learned(`series:${i.series}`) : 1)
    * (f.age ? learned(`age:${f.age}`) * learned(`style:${f.style}`) : learned(`font:${f.font}`));
};
// How well the item fits the date: evergreen 1; an active season 1.5-2 (closer to its peak = higher); inactive and
// not evergreen = can't go.
function seasonFit(i, d) {
  let best = i.seasons.includes('evergreen') ? 1 : 0;
  for (const id of i.seasons) {
    const s = seasons.get(id);
    const w = s && windowAt(s, d);
    if (!w) continue;
    const span = Math.max(1, between(w.from, w.to));
    best = Math.max(best, 1.5 + 0.5 * (1 - Math.min(1, Math.abs(between(d, w.peak)) / span)));
  }
  return best;
}
const REPEAT_GAP = 90, WINNER_GAP = 180, SLUG_GAP = 30;
const rejected = (i, v) => (learn.rejects?.[`${i.id}:${v}`]?.length ?? 0) >= 2;
const winners = new Set((learn.winners ?? []).map((w) => w.plan ?? w.item).filter(Boolean));

// The best (item, variant) for a board on a day, or null. `explore`: ignore learned weights (keeps learning honest).
function pick(board, d, uses, list, explore) {
  let best = null;
  const recentSlugs = new Set(list.filter((e) => e.board === board && Math.abs(between(e.release, d)) < SLUG_GAP).map((e) => e.ref));
  const remakes = list.filter((e) => e.release > addDays(d, -30) && e.remake).length;
  const lastMonth = list.filter((e) => e.release > addDays(d, -30)).length || 1;
  for (const i of items) {
    if (i.board !== board || !i.r) continue;
    const fit = seasonFit(i, d);
    if (!fit || recentSlugs.has(i.slug)) continue;
    const past = uses.get(i.id) ?? [];
    const lastUse = past.map((u) => u.release).sort().at(-1);
    i.variants.forEach((_, v) => {
      if (rejected(i, v)) return;
      const same = past.filter((u) => u.v === v || u.v === null);
      let remake = false;
      if (same.length) {
        // A used moment comes back only as a proven winner, after 6 months, within 10% of recent slots.
        const w = winners.has(`${i.id}:${v}`) || winners.has(i.id);
        if (!w || between(same.map((u) => u.release).sort().at(-1), d) < WINNER_GAP || remakes / lastMonth >= 0.1) return;
        remake = true;
      } else if (lastUse && between(lastUse, d) < REPEAT_GAP) return; // another variant of a recent moment
      const series = i.series && past.length === 0 && items.some((o) => o.series === i.series && o.order < i.order && uses.has(o.id)) ? 1.3 : 1;
      const score = (i.priority ?? 1) * fit * series * (explore ? 1 : itemWeight(i, v)) * (remake ? 1.2 : 1) - v * 0.01;
      if (!best || score > best.score || (score === best.score && i.id < best.i.id)) best = { i, v, score, remake };
    });
  }
  return best;
}

function template(board, d, list) {
  if (board === 'scripture') return 'plain';
  if (board === 'adult') return 'black';
  const last = list.filter((e) => e.board === board && e.release <= d && ['paper', 'purple'].includes(e.template))
    .sort((a, b) => a.release.localeCompare(b.release)).at(-1);
  return last?.template === 'paper' ? 'purple' : 'paper';
}

// The master-only `guidance` for createSketch: the moment (scenes) or the decorations (verse art), plus the
// composition notes the learning loop keeps for that kind of page.
const guidance = (i, v) => {
  const f = VARIANTS[i.variants[v]];
  const kind = f.kind === 'verse' ? 'verse' : f.age === 'Adult' ? 'adult' : 'kids';
  const what = kind === 'verse' ? `Decorations: ${i.moment}.` : `Draw this moment: ${i.moment}.`;
  return `${what} ${learn.compositionNotes?.[kind] ?? ''}`.trim().slice(0, 500);
};

// The next `n` open slots, 7 to 60 days out, each with what to make.
function plan(n, today = iso(Date.now())) {
  const list = entries.map((e) => ({ ...e }));
  const uses = usesOf(list);
  const out = [];
  for (let d = addDays(today, 7); d <= addDays(today, 60) && out.length < n; d = addDays(d, 1)) {
    // The day's quotas first; then, if a board had nothing left to post, its slots go to Sunday School and then
    // Scripture up to their caps (pins-plan --check warns so the bank gets refilled).
    const passes = [Object.entries(quotas(d)), [['sunday-school', year.boardCap['sunday-school']], ['scripture', year.boardCap.scripture]]];
    for (const [board, want] of passes.flat()) {
      let have = list.filter((e) => e.release === d && e.board === board).length;
      const total = () => list.filter((e) => e.release === d).length;
      while (have < want && total() < dailyCap(d) && out.length < n) {
        const choice = pick(board, d, uses, list, out.length % 5 === 4);
        if (!choice) break;
        const { i, v, remake } = choice;
        const f = VARIANTS[i.variants[v]];
        const slot = {
          release: d, board, template: template(board, d, list), plan: `${i.id}:${v}`, remake, ref: i.slug,
          moment: i.moment, series: i.series ?? null,
          create: f.kind === 'verse'
            ? { kind: 'verse', book: i.r.book, chapter: i.r.chapter, startVerse: i.r.startVerse, font: f.font, guidance: guidance(i, v), ...(learn.bestComposition ? { composition: learn.bestComposition } : {}) }
            : { kind: 'scene', ...i.r, age: f.age, style: f.style, guidance: guidance(i, v) },
        };
        out.push(slot);
        list.push({ release: d, board, ref: i.slug, plan: slot.plan, template: slot.template, remake });
        if (!uses.has(i.id)) uses.set(i.id, []);
        uses.get(i.id).push({ v, release: d, board });
        have++;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- check
function check() {
  // Moveable days (the seasons depend on them).
  assert.equal(easter(2026), '2026-04-05');
  assert.equal(easter(2027), '2027-03-28');
  assert.equal(easter(2028), '2028-04-16');
  assert.equal(ANCHORS.thanksgiving(2026), '2026-11-26');
  assert.equal(ANCHORS.mothersday(2027), '2027-05-09');
  assert.equal(ANCHORS.fathersday(2027), '2027-06-20');
  assert.equal(windowAt({ from: '12-16', to: '01-03', peak: '01-06' }, '2027-01-02').peak, '2027-01-06');

  const errors = [], warnings = [];
  const ids = new Set();
  for (const i of items) {
    if (ids.has(i.id)) errors.push(`${i.id}: duplicate id`);
    ids.add(i.id);
    if (!i.r) errors.push(`${i.id}: bad ref "${i.ref}"`);
    if (!year.boardCap[i.board]) errors.push(`${i.id}: unknown board ${i.board}`);
    for (const s of i.seasons) if (s !== 'evergreen' && !seasons.has(s)) errors.push(`${i.id}: unknown season ${s}`);
    for (const v of i.variants) if (!VARIANTS[v]) errors.push(`${i.id}: unknown variant ${v}`);
    if (!i.moment || i.moment.length > 300) errors.push(`${i.id}: moment missing or over 300 chars`);
  }
  for (const s of year.seasons) {
    if (!year.boardCap[s.board]) errors.push(`season ${s.id}: unknown board ${s.board}`);
    for (const p of [s.from, s.to, s.peak].filter(Boolean)) if (!/^\d\d-\d\d$|^[a-z]+([+-]\d+)?$/.test(p)) errors.push(`season ${s.id}: bad date ${p}`);
  }
  // Coverage: every day of the next 365 has a mix; supply of unused (item, variant) pairs per board vs the next
  // 90 days of slots.
  const today = iso(Date.now());
  const uses = usesOf(entries);
  const need = {}, supply = {};
  for (let k = 7; k < 372; k++) {
    const d = addDays(today, k);
    const q = quotas(d);
    if (!Object.keys(q).length) errors.push(`${d}: no board mix`);
    if (k >= 97) continue;
    for (const [b, n] of Object.entries(q)) {
      const open = n - entries.filter((e) => e.release === d && e.board === b).length;
      if (open > 0) need[b] = (need[b] ?? 0) + open;
    }
  }
  for (const i of items) i.variants.forEach((_, v) => {
    if (!(uses.get(i.id) ?? []).some((u) => u.v === v || u.v === null) && !rejected(i, v)) supply[i.board] = (supply[i.board] ?? 0) + 1;
  });
  for (const [b, n] of Object.entries(need)) {
    const have = supply[b] ?? 0;
    const line = `${b}: ${have} unused pages in the bank for about ${n} open slots in the next 90 days`;
    (have < n ? warnings : []).push(`${line} (refill: add moments)`);
    console.log(line);
  }
  console.log(`${items.length} items, ${items.reduce((a, i) => a + i.variants.length, 0)} pages, ${year.seasons.length} seasons`);
  for (const w of warnings) console.log('warn ', w);
  for (const e of errors) console.log('ERROR', e);
  if (errors.length) process.exit(1);
}

// ---------------------------------------------------------------- main
const args = process.argv.slice(2);
if (args[0] === '--check') check();
else if (args[0] === '--reject') {
  const [, planId, reason] = args;
  if (!planId || !reason) throw new Error('usage: --reject <item:variant> "<reason>"');
  learn.rejects ??= {};
  (learn.rejects[planId] ??= []).push({ date: iso(Date.now()), reason });
  fs.writeFileSync(LEARN, `${JSON.stringify(learn, null, 2)}\n`);
  console.log(`${planId}: ${learn.rejects[planId].length} reject(s)${learn.rejects[planId].length >= 2 ? ', skipped from now on' : ''}`);
} else {
  const n = Number(args[args.indexOf('--next') + 1]) || 5;
  console.log(JSON.stringify(plan(n), null, 2));
}
