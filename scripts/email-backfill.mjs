// One-time backfill of emailProfiles (docs/email-marketing-plan.md §6.2) from each account's history: pages made,
// the first page, whether they ever bought, and the email choice in private/profile. After this, the
// onTransactionCreated and onPrivateProfileWritten triggers keep it current. Safe to re-run: counts are absolute,
// and an existing unsubscribe token, `fired` marker or offer is never touched.
//   node scripts/email-backfill.mjs          dry run: totals only
//   node scripts/email-backfill.mjs --write  writes production data (owner-approved)
import crypto from 'node:crypto';
import { DOCS, firestore, getToken, listDocs, plain } from './firestore-rest.mjs';

const PURCHASES = new Set(['credit_purchase', 'subscription', 'prints_subscription']);
const MIRROR = { emailOptIn: 'optIn', optInSource: 'optInSource', optInAt: 'optInAt', persona: 'persona', timezone: 'timezone' };
const write = process.argv.includes('--write');

const get = async (path) => {
  const r = await fetch(`https://firestore.googleapis.com/v1/${DOCS}/${path}`, { headers: { authorization: `Bearer ${await getToken()}` } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GET ${path}: ${r.status}`);
  return r.json();
};

const totals = { users: 0, madePage: 0, bought: 0, optedIn: 0 };
for await (const u of listDocs('users', ['createdAt'])) {
  const uid = u.name.split('/').pop();
  let pagesMade = 0;
  let first = null;
  let bought = false;
  for await (const t of listDocs(`users/${uid}/transactions`, ['type', 'timestamp', 'description'])) {
    const type = plain(t.fields?.type);
    if (PURCHASES.has(type)) bought = true;
    if (type !== 'usage') continue;
    pagesMade++;
    const at = plain(t.fields?.timestamp);
    if (at && (!first || at < first.at)) first = { at, ref: /^(?:Generated|Verse Art): (.+)$/.exec(plain(t.fields?.description) || '')?.[1] ?? null };
  }
  const fields = { pagesMade: { integerValue: String(pagesMade) }, bought: { booleanValue: bought } };
  if (first) Object.assign(fields, { firstPageAt: { timestampValue: first.at }, firstPageRef: first.ref ? { stringValue: first.ref } : { nullValue: null } });
  const choice = await get(`users/${uid}/private/profile`);
  if (choice) {
    for (const [from, to] of Object.entries(MIRROR)) fields[to] = choice.fields?.[from] ?? { nullValue: null };
    fields.optIn = { booleanValue: plain(choice.fields?.emailOptIn) === true };
    fields.landingPath = choice.fields?.signup?.mapValue?.fields?.path ?? { nullValue: null };
  }
  const existing = await get(`emailProfiles/${uid}`);
  if (!existing?.fields?.unsubToken) fields.unsubToken = { stringValue: crypto.randomBytes(16).toString('base64url') };

  totals.users++;
  if (pagesMade) totals.madePage++;
  if (bought) totals.bought++;
  if (fields.optIn?.booleanValue) totals.optedIn++;
  if (write) {
    await firestore('PATCH', `${DOCS}/emailProfiles/${uid}`, { query: { 'updateMask.fieldPaths': Object.keys(fields) }, body: { fields } });
  }
}
console.log(`${write ? 'wrote' : 'dry run:'} ${totals.users} accounts; ${totals.madePage} made a page, ${totals.bought} bought, ${totals.optedIn} opted in`);
