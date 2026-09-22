// One-time fraud audit: every credit grant the Zoho webhook wrote, plus every premium user,
// as CSV to compare against a Zoho invoice/payment export.
// Before the webhook was locked down, anyone could POST ?pack=...&uid=... and grant credits.
//
// Usage: node scripts/audit-credit-grants.mjs > credit-grants.csv
import { firestore, listDocs, plain, DOCS } from './firestore-rest.mjs';

const csv = (row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
console.log(csv(['kind', 'uid', 'when', 'type', 'pack', 'amount', 'price', 'description', 'credits_now', 'isPremium', 'planStatus', 'zohoSubscriptionId']));

// Server-written grants live in users/{uid}/transactions with these types.
const grants = await firestore('POST', `${DOCS}:runQuery`, {
  body: {
    structuredQuery: {
      from: [{ collectionId: 'transactions', allDescendants: true }],
      where: { fieldFilter: { field: { fieldPath: 'type' }, op: 'IN', value: { arrayValue: { values: [{ stringValue: 'credit_purchase' }, { stringValue: 'subscription' }] } } } },
    },
  },
});

const users = new Map();
for await (const d of listDocs('users', ['credits', 'isPremium', 'planStatus', 'zohoSubscriptionId'])) {
  users.set(d.name.split('/').pop(), Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, plain(v)])));
}

for (const { document: d } of grants.filter((g) => g.document)) {
  const f = Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, plain(v)]));
  const uid = d.name.split('/users/')[1].split('/')[0];
  const u = users.get(uid) || {};
  console.log(csv(['grant', uid, f.timestamp ?? f.createdAt, f.type, f.pack, f.creditsAdded ?? f.amount, f.price, f.description,
    u.credits, u.isPremium, u.planStatus, u.zohoSubscriptionId]));
}

for (const [uid, u] of users) {
  if (u.isPremium) console.log(csv(['premium', uid, '', '', '', '', '', '', u.credits, u.isPremium, u.planStatus, u.zohoSubscriptionId]));
}
