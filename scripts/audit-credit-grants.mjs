// One-time fraud audit: every credit grant the Zoho webhook wrote, plus every premium user,
// as CSV to compare against a Zoho invoice/payment export.
// Before the webhook was locked down, anyone could POST ?pack=...&uid=... and grant credits.
//
// Usage: node scripts/audit-credit-grants.mjs > credit-grants.csv
import { listDocs, plain } from './firestore-rest.mjs';

const GRANT_TYPES = ['credit_purchase', 'subscription']; // written by the webhook only
const fieldsOf = (d) => Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, plain(v)]));
const csv = (row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');

console.log(csv(['kind', 'uid', 'when', 'type', 'pack', 'amount', 'price', 'description', 'credits_now', 'isPremium', 'planStatus', 'zohoSubscriptionId']));

// ponytail: one request per user (no collection-group index needed); fine for a one-off audit.
for await (const userDoc of listDocs('users', ['credits', 'isPremium', 'planStatus', 'zohoSubscriptionId'])) {
  const uid = userDoc.name.split('/').pop();
  const u = fieldsOf(userDoc);
  const tail = [u.credits, u.isPremium, u.planStatus, u.zohoSubscriptionId];

  for await (const t of listDocs(`users/${uid}/transactions`, ['type', 'pack', 'creditsAdded', 'amount', 'price', 'description', 'timestamp', 'createdAt'])) {
    const f = fieldsOf(t);
    if (GRANT_TYPES.includes(f.type)) {
      console.log(csv(['grant', uid, f.timestamp ?? f.createdAt, f.type, f.pack, f.creditsAdded ?? f.amount, f.price, f.description, ...tail]));
    }
  }
  if (u.isPremium) console.log(csv(['premium', uid, '', '', '', '', '', '', ...tail]));
}
