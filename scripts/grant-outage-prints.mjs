// One-time apology gift for the generation outage (docs/email-marketing-plan.md §12.1): a month of unlimited
// prints (users/{uid}.printsUnlimitedUntil) for accounts created since 2026-03-26 that never made a page and never
// bought anything. Dry run by default (counts only). --apply writes, right before the win-back email goes out,
// and never shortens a longer pass. --apply is an owner-approved production write.
// Run from the repo root: node scripts/grant-outage-prints.mjs [--apply] [--days=30]
import { DOCS, firestore, listDocs, plain } from './firestore-rest.mjs';

const SINCE = '2026-03-26';
const MASTER_UID = 'TiAEiMqWxpWqxCLtoI5OgHAvtf33';
const apply = process.argv.includes('--apply');
const days = Number(process.argv.find((a) => a.startsWith('--days='))?.slice(7) ?? 30);
const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

let cohort = 0;
let written = 0;
for await (const u of listDocs('users', ['createdAt', 'printsUnlimitedUntil'])) {
  const uid = u.name.split('/').pop();
  const f = u.fields || {};
  if (uid === MASTER_UID || !(String(plain(f.createdAt)) >= SINCE)) continue;
  let active = false;
  for await (const t of listDocs(`users/${uid}/transactions`, ['type'])) {
    if (['usage', 'credit_purchase', 'subscription', 'prints_subscription'].includes(plain(t.fields?.type))) active = true;
  }
  if (active) continue;
  cohort++;
  if (!apply || String(plain(f.printsUnlimitedUntil) ?? '') >= until) continue;
  await firestore('PATCH', `${DOCS}/users/${uid}`, {
    query: { 'updateMask.fieldPaths': 'printsUnlimitedUntil', 'currentDocument.exists': 'true' },
    body: { fields: { printsUnlimitedUntil: { timestampValue: until } } },
  });
  written++;
}
console.log(`${cohort} accounts in the outage cohort; ${apply
  ? `${written} now have unlimited prints until ${until}`
  : 'dry run, nothing written (add --apply)'}`);
