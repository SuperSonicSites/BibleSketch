// Checks src/data/pins.json (the Pinterest calendar, src/lib/pins.ts) before a deploy. Read-only.
//   node scripts/pins-check.mjs            validate the calendar; exit 1 on any error
//   node scripts/pins-check.mjs --backlog  also list public master sketches that are neither on Pinterest nor in the calendar
// Errors: one release per day for the whole account, sketch public + owned by the master account, slug matches,
// never already on Pinterest, copy rules. Warnings: similar copy on a board, same passage on a board within 30 days.
import { entries, BOARDS, TEMPLATES, MASTER_UID, pinFile } from '../src/lib/pins.ts';
import { getDoc, query } from '../src/lib/firestore.ts';
import { slugOf, reference } from '../src/lib/sketch.ts';

const CTA = 'Get your first 5 prints free at BibleSketch.';
// Every board the account ever pinned to (archived ones included), read from Pinterest's public widget.
const PINTEREST_BOARDS = [
  'sunday-school-activities-bible-coloring-lessons', 'christian-adult-coloring-pages-biblical-scenes',
  'christmas-coloring-pages-nativity-printables', 'easter-coloring-pages-sunday-school-crafts',
  'christian-art-bible-illustrations', 'scripture-coloring-sheets-bible-verse-coloring',
  'bible-doodles-simple-christian-drawings',
];

const errors = [], warnings = [];
const err = (e, msg) => errors.push(`${e.release} ${e.board} ${e.sketchId}: ${msg}`);
const warn = (e, msg) => warnings.push(`${e.release} ${e.board} ${e.sketchId}: ${msg}`);

const pinned = new Set();
for (const b of PINTEREST_BOARDS) {
  const j = await (await fetch(`https://widgets.pinterest.com/v3/pidgets/boards/biblesketch/${b}/pins/`)).json();
  for (const p of j.data?.pins ?? []) {
    const m = (p.link || '').match(/\/coloring-page\/[^/]+\/([^/?#]+)/);
    if (m) pinned.add(decodeURIComponent(m[1]));
  }
}

const seen = new Map(), days = new Map(), files = new Set();
const words = (s) => new Set(s.toLowerCase().match(/[a-z']+/g));
const firstSentence = (s) => s.split(/(?<=[.!?])\s/)[0];

for (const e of entries) {
  if (!BOARDS.includes(e.board)) err(e, `unknown board ${e.board}`);
  if (!TEMPLATES.includes(e.template)) err(e, `unknown template ${e.template}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.release)) err(e, 'release must be YYYY-MM-DD');
  if (typeof e.approved !== 'boolean') err(e, 'approved must be true or false');
  if (seen.has(e.sketchId)) err(e, 'sketch listed twice');
  seen.set(e.sketchId, e);
  if (days.has(e.release)) err(e, `second release on ${e.release} (also ${days.get(e.release).sketchId}): one Pin per day for the account`);
  days.set(e.release, e);
  if (files.has(pinFile(e))) err(e, 'duplicate Pin image name');
  files.add(pinFile(e));
  if (pinned.has(e.sketchId)) err(e, 'already on Pinterest');

  if (e.title.length < 40 || e.title.length > 100) err(e, `title is ${e.title.length} chars (40-100)`);
  if (!e.title.includes('|')) err(e, 'title needs "| <reference>"');
  if (/\bfree\b/i.test(e.title)) err(e, 'no "Free" in titles (weak reach)');
  if (e.description.length < 250 || e.description.length > 420) err(e, `description is ${e.description.length} chars (250-420)`);
  if (!e.description.endsWith(CTA)) err(e, 'description must end with the free-prints line');
  if (/#\w|[\u{1F300}-\u{1FAFF}]/u.test(e.description)) err(e, 'no hashtags or emojis');

  const s = await getDoc('sketches', e.sketchId);
  if (!s) { err(e, 'sketch missing or private'); continue; }
  if (s.userId !== MASTER_UID) err(e, 'not the master account');
  if (s.isPublic !== true) err(e, 'not public');
  if (slugOf(s) !== e.ref) err(e, `ref ${e.ref} but the page slug is ${slugOf(s)}`);
  if (s.promptData && !e.title.includes(reference(s.promptData))) warn(e, `title lacks the reference "${reference(s.promptData)}"`);
}

// Copy variety and passage spacing, per board.
for (const b of BOARDS) {
  const list = entries.filter((e) => e.board === b).sort((x, y) => x.release.localeCompare(y.release));
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const [x, y] = [list[i], list[j]];
      if (firstSentence(x.description) === firstSentence(y.description)) warn(y, `same first sentence as ${x.sketchId}`);
      const [wx, wy] = [words(x.description), words(y.description)];
      const overlap = [...wx].filter((w) => wy.has(w)).length / Math.min(wx.size, wy.size);
      if (overlap > 0.75) warn(y, `description ${Math.round(overlap * 100)}% like ${x.sketchId}`);
      const gap = (Date.parse(y.release) - Date.parse(x.release)) / 864e5;
      if (x.ref === y.ref && gap < 30) warn(y, `same passage as ${x.sketchId} only ${gap} days apart`);
    }
    if (i && list[i].title.split(':')[0] === list[i - 1].title.split(':')[0]) warn(list[i], 'same title opener as the previous Pin on this board');
  }
}

if (process.argv.includes('--backlog')) {
  const master = await query('sketches', [['isPublic', true], ['userId', MASTER_UID]], 1000, { ordered: false });
  const free = master.filter((s) => !pinned.has(s.id) && !seen.has(s.id));
  console.log(`\nBacklog: ${free.length} public master sketches not on Pinterest and not in the calendar`);
  for (const s of free) {
    const p = s.promptData || {};
    console.log(`${s.id}  ${s.type || 'sketch'}  ${reference(p)}  ${p.age_group || '-'} / ${p.art_style || p.font_style || '-'}  ${s.storagePath ? 'ok' : 'no image'}`);
  }
}

console.log(`${entries.length} entries, ${entries.filter((e) => e.approved).length} approved, ${pinned.size} sketches already on Pinterest`);
for (const w of warnings) console.log('warn ', w);
for (const e of errors) console.log('ERROR', e);
if (errors.length) process.exit(1);
