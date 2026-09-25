// Outage win-back (docs/email-marketing-plan.md §12.1): accounts created 2026-03-26 to 09-21 that never made a page and
// never bought, while generation was down. Owner-approved 2026-09-25 (CASL implied consent, lawyer-checked).
//   node scripts/outage-winback.mjs                                   dry run: counts only
//   node scripts/outage-winback.mjs --test=<email> --name=<Name> --at=<ISO>   one test email now (no gift, no marker)
//   node scripts/outage-winback.mjs --send --at=<ISO>                 gift + schedule the email for <ISO>, once per account
//   node scripts/outage-winback.mjs --at=<ISO> --reschedule=<id,...> --drop=<id,...>
//       after cancelling those scheduled emails in Resend: send the --reschedule ones again (names re-checked), and mark
//       the --drop ones dropped so --send never picks them up again
// --send writes production data and sends real email. Not a list: recipients aren't added to Resend contacts.
import { DOCS, PROJECT, firestore, getToken, listDocs, plain } from './firestore-rest.mjs';

const SINCE = '2026-03-26';
const BEFORE = '2026-09-22'; // generation worked again from Sep 21-22: later sign-ups never saw the outage
const MASTER_UID = 'TiAEiMqWxpWqxCLtoI5OgHAvtf33';
const FROM = 'Renaud from Bible Sketch <renaud@e.biblesketch.app>';
const REPLY_TO = 'hello@biblesketch.app';
const LINK = 'https://biblesketch.app/?utm_source=email&utm_medium=email&utm_campaign=outage-2026';
const UNSUB = 'mailto:hello@biblesketch.app?subject=Unsubscribe';
const ADDRESS = 'Bible Sketch · Supersonic Sites Inc. · 109b - 1917 Peninsula Rd, Ucluelet, BC V0R 3A0, Canada · hello@biblesketch.app';

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const at = arg('at') ? new Date(arg('at')) : null;
if (at && isNaN(at)) throw new Error('--at must be an ISO date');
const until = at && new Date(at.getTime() + 30 * 24 * 60 * 60 * 1000);
const dateLabel = until?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'America/New_York' });

// First word of the display name, only if it looks like a first name; otherwise no name ("Hi," and a plain
// subject). The 2026-09-25 review of the first batch found role and org words, all-caps handles and merged names.
const NOT_NAMES = new Set(['teacher', 'profe', 'nursery', 'city', 'church', 'real', 'admin', 'info', 'office', 'kids',
  'children', 'ministry', 'school', 'sunday', 'pastor', 'youth', 'team', 'the', 'mom', 'mama', 'test']);
const firstName = (display) => {
  let w = String(display || '').trim().split(/\s+/)[0] || '';
  const merged = w.match(/^(\p{Lu}\p{Ll}{2,})(\p{Lu}\p{Ll}{4,})$/u); // "LyndaSpector" -> "Lynda" (not "LaToya", "HyeJung")
  if (merged) w = merged[1];
  if (!/^\p{L}[\p{L}'’-]{1,19}$/u.test(w) || (w.length > 2 && w === w.toUpperCase()) || NOT_NAMES.has(w.toLowerCase())) return null;
  return w[0].toUpperCase() + w.slice(1);
};
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function message(to, name) {
  const hi = name ? `Hi ${name},` : 'Hi,';
  const body = [
    'Did you ever get your coloring page made?',
    `Our page maker was broken for part of the summer, and I'm sorry about that. It works again, your 5 free pages are still in your account, and to make up for it, printing is unlimited for you until ${dateLabel}.`,
  ];
  const footer = `You're getting this because you created a Bible Sketch account. ${ADDRESS}`;
  return {
    from: FROM, to, reply_to: REPLY_TO, subject: name ?? 'quick question',
    headers: { 'List-Unsubscribe': `<${UNSUB}>` },
    tags: [{ name: 'campaign', value: 'outage-2026' }],
    text: [hi, ...body, `Make your page: ${LINK}`, 'Renaud\nBible Sketch', '--', footer, `Unsubscribe: reply "unsubscribe" or write to ${REPLY_TO}`].join('\n\n'),
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222;max-width:560px">`
      + [hi, ...body].map((p) => `<p>${esc(p)}</p>`).join('')
      + `<p>Make your page: <a href="${LINK}">biblesketch.app</a></p><p>Renaud<br>Bible Sketch</p>`
      + `<p style="margin-top:28px;padding-top:12px;border-top:1px solid #eee;font-size:12px;color:#888">${esc(footer)} · <a href="${UNSUB}" style="color:#888">Unsubscribe</a></p></div>`,
  };
}

async function resendKey() {
  const r = await fetch(`https://secretmanager.googleapis.com/v1/projects/${PROJECT}/secrets/RESEND_API_KEY/versions/latest:access`,
    { headers: { authorization: `Bearer ${await getToken()}` } });
  if (!r.ok) throw new Error(`Secret Manager: ${r.status}`);
  return Buffer.from((await r.json()).payload.data, 'base64').toString('utf8').trim();
}
async function resend(path, body, idempotencyKey) {
  const r = await fetch(`https://api.resend.com${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${await resendKey()}`, 'content-type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(body),
  });
  const out = await r.json();
  if (!r.ok) throw new Error(`Resend ${path}: ${r.status} ${JSON.stringify(out)}`);
  return out;
}

if (arg('test')) {
  if (!at) throw new Error('--at is needed for the gift date');
  const { id } = await resend('/emails', message(arg('test'), firstName(arg('name'))), `outage-2026-test-${Date.now()}`);
  console.log(`test sent to ${arg('test')} (id ${id})`);
  process.exit(0);
}

// The cohort: same rules as the 2026-09-24 analysis (§3.1).
const cohort = [];
for await (const u of listDocs('users', ['createdAt', 'printsUnlimitedUntil'])) {
  const uid = u.name.split('/').pop();
  const created = String(plain(u.fields?.createdAt));
  if (uid === MASTER_UID || !(created >= SINCE && created < BEFORE)) continue;
  let active = false;
  for await (const t of listDocs(`users/${uid}/transactions`, ['type'])) {
    if (['usage', 'credit_purchase', 'subscription', 'prints_subscription'].includes(plain(t.fields?.type))) active = true;
  }
  if (!active) cohort.push({ uid, pass: String(plain(u.fields?.printsUnlimitedUntil) ?? '') });
}
const auth = await (await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, {
  method: 'POST', headers: { authorization: `Bearer ${await getToken()}`, 'content-type': 'application/json' },
  body: JSON.stringify({ localId: cohort.map((c) => c.uid) }),
})).json();
const byUid = new Map((auth.users || []).map((a) => [a.localId, a]));
const recipients = cohort.map((c) => ({ ...c, a: byUid.get(c.uid) })).filter((c) => c.a?.emailVerified && c.a.email);
const unnamed = recipients.filter((c) => !firstName(c.a.displayName)).length;
console.log(`${cohort.length} in the cohort; ${recipients.length} with a verified email (${unnamed} without a usable first name)`);
const ids = (k) => (arg(k) || '').split(',').filter(Boolean);
if (arg('reschedule') || arg('drop')) {
  if (!at || at.getTime() < Date.now() + 5 * 60 * 1000) throw new Error('--at must be at least 5 minutes ahead');
  const markers = new Map();
  for await (const m of listDocs('processedWebhooks', ['emailId'])) {
    if (m.name.includes('/outage2026_')) markers.set(plain(m.fields?.emailId), m.name.split('/outage2026_').pop());
  }
  const uidOf = (id) => {
    if (!markers.has(id)) throw new Error(`no marker for ${id}`);
    return markers.get(id);
  };
  const again = ids('reschedule').map((id) => recipients.find((c) => c.uid === uidOf(id)));
  if (again.some((c) => !c)) throw new Error('a rescheduled account is not a verified recipient');
  const batch = again.map((c) => ({ ...message(c.a.email, firstName(c.a.displayName)), scheduled_at: at.toISOString() }));
  const sent = batch.length
    ? (await resend('/emails/batch', batch, `outage-2026-fix-${at.toISOString()}-${ids('reschedule').join('.')}`.slice(0, 256))).data : [];
  const mark = (uid, fields) => firestore('PATCH', `${DOCS}/processedWebhooks/outage2026_${uid}`,
    { query: { 'updateMask.fieldPaths': Object.keys(fields) }, body: { fields } });
  for (const [i, c] of again.entries()) {
    await mark(c.uid, { status: { stringValue: 'outage_email_rescheduled' }, emailId: { stringValue: sent[i]?.id ?? '' } });
  }
  const drops = ids('drop').map(uidOf);
  for (const uid of drops) await mark(uid, { status: { stringValue: 'outage_email_dropped' } });
  console.log(`rescheduled ${sent.length} for ${at.toISOString()} `
    + `(subjects: ${again.map((c) => firstName(c.a.displayName) ?? 'quick question').join(', ')}); dropped ${drops.length}`);
  process.exit(0);
}
if (!process.argv.includes('--send')) process.exit(0);
if (!at || at.getTime() < Date.now() + 5 * 60 * 1000) throw new Error('--send needs --at at least 5 minutes ahead');

// 1. The gift, for the whole cohort (never shortens a longer pass).
let granted = 0;
for (const c of cohort) {
  if (c.pass >= until.toISOString()) continue;
  await firestore('PATCH', `${DOCS}/users/${c.uid}`, {
    query: { 'updateMask.fieldPaths': 'printsUnlimitedUntil', 'currentDocument.exists': 'true' },
    body: { fields: { printsUnlimitedUntil: { timestampValue: until.toISOString() } } },
  });
  granted++;
}
// 2. The email, once per account: a marker per uid in processedWebhooks, plus a batch idempotency key.
const todo = [];
for (const c of recipients) {
  const marker = await fetch(`https://firestore.googleapis.com/v1/${DOCS}/processedWebhooks/outage2026_${c.uid}`,
    { headers: { authorization: `Bearer ${await getToken()}` } });
  if (marker.status === 404) todo.push(c);
}
const batch = todo.map((c) => ({ ...message(c.a.email, firstName(c.a.displayName)), scheduled_at: at.toISOString() }));
const sent = batch.length ? (await resend('/emails/batch', batch, `outage-2026-${at.toISOString()}-${todo.length}`)).data : [];
for (const [i, c] of todo.entries()) {
  await firestore('PATCH', `${DOCS}/processedWebhooks/outage2026_${c.uid}`, {
    body: { fields: { status: { stringValue: 'outage_email_scheduled' }, userId: { stringValue: c.uid },
      emailId: { stringValue: sent[i]?.id ?? '' }, scheduledAt: { timestampValue: at.toISOString() } } },
  });
}
console.log(`gift: ${granted} accounts now have unlimited prints until ${until.toISOString()}; `
  + `email: ${sent.length} scheduled for ${at.toISOString()} (${recipients.length - todo.length} already had one)`);
