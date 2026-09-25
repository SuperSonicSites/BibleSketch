// Sunday Prep issues (docs/email-marketing-plan.md §5.4, §6.9): one sundayPrep/<Thursday> doc per week, which
// emailTick sends from Thursday 8 a.m. Eastern (8 a.m. local further west) to everyone opted in for 7+ days.
//   node scripts/sunday-prep.mjs --list
//   node scripts/sunday-prep.mjs --date=2026-10-08 --sketch=<public sketch id> --story="Jonah and the big fish" \
//        --subject="Sunday: Jonah and the big fish" --text="1-2 sentences about the story"
//        writes (or rewrites) the issue as a draft; the next emailTick emails the owner a [DRAFT] copy to approve
//   node scripts/sunday-prep.mjs --date=2026-10-08 --approve    after the owner approves the draft
// A sketch is never used twice, and a story not twice within 52 weeks (§12.7). Production data: owner-approved.
import { DOCS, firestore, listDocs, plain } from './firestore-rest.mjs';

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const flag = (k) => process.argv.includes(`--${k}`);
const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };

const issues = [];
for await (const d of listDocs('sundayPrep', ['sketchId', 'story', 'subject', 'approved', 'previewedAt', 'sendAt'])) {
  const f = Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, plain(v)]));
  issues.push({ date: d.name.split('/').pop(), ...f });
}

if (flag('list')) {
  for (const i of issues.sort((a, b) => a.date.localeCompare(b.date))) {
    console.log(`${i.date}  ${i.approved ? 'approved' : i.previewedAt ? 'draft sent' : 'draft'}  ${i.subject}  (${i.sketchId})`);
  }
  process.exit(0);
}

const date = arg('date');
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || new Date(`${date}T12:00:00Z`).getUTCDay() !== 4) fail('--date must be a Thursday, YYYY-MM-DD');
const path = `${DOCS}/sundayPrep/${date}`;

if (flag('approve')) {
  const cur = issues.find((i) => i.date === date);
  if (!cur) fail(`no issue for ${date}`);
  if (!cur.previewedAt) fail('the owner hasn’t been sent the draft yet (it goes out with the next emailTick, within 30 minutes)');
  await firestore('PATCH', path, { query: { 'updateMask.fieldPaths': 'approved' }, body: { fields: { approved: { booleanValue: true } } } });
  console.log(`✓ ${date} approved: it sends from ${cur.sendAt}`);
  process.exit(0);
}

const [sketchId, story, subject, text] = ['sketch', 'story', 'subject', 'text'].map(arg);
if (!sketchId || !story || !subject || !text) fail('--sketch, --story, --subject and --text are all required');
if (text.length > 400) fail('--text: keep it to 1-2 sentences');
const others = issues.filter((i) => i.date !== date);
if (others.some((i) => i.sketchId === sketchId)) fail(`sketch ${sketchId} was already used`);
const yearAgo = new Date(Date.parse(`${date}T12:00:00Z`) - 364 * 864e5).toISOString().slice(0, 10);
if (others.some((i) => i.story.toLowerCase() === story.toLowerCase() && i.date > yearAgo)) fail(`"${story}" ran within the last 52 weeks`);

const sketch = await firestore('GET', `${DOCS}/sketches/${sketchId}`).catch(() => null);
if (sketch?.fields?.isPublic?.booleanValue !== true) fail(`sketch ${sketchId} isn't public`);
const pd = sketch.fields.promptData?.mapValue?.fields || {};
const ref = [plain(pd.book), plain(pd.chapter), plain(pd.start_verse), plain(pd.end_verse)];
if (!ref[0] || !ref[1]) fail('the sketch has no Bible reference');
if (!(ref[3] > ref[2])) ref.length = 3;

// 8:00 a.m. in New York on that Thursday, daylight saving or not.
const offset = /GMT([+-]\d+)/.exec(new Date(`${date}T12:00:00Z`).toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' }))[1];
const sendAt = new Date(Date.parse(`${date}T08:00:00Z`) - Number(offset) * 36e5).toISOString();
const value = (v) => (typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) });
await firestore('PATCH', path, {
  query: { 'updateMask.fieldPaths': ['sketchId', 'story', 'subject', 'text', 'ref', 'sendAt', 'approved', 'previewedAt'] },
  body: {
    fields: {
      sketchId: value(sketchId), story: value(story), subject: value(subject), text: value(text),
      ref: { arrayValue: { values: ref.map(value) } }, sendAt: { timestampValue: sendAt },
      approved: { booleanValue: false }, // any change needs a fresh approval; previewedAt is cleared (masked, not sent)
    },
  },
});
console.log(`✓ draft ${date}: "${subject}" (${ref.join(' ')}), sends from ${sendAt} once approved. The owner gets the draft within 30 minutes.`);
