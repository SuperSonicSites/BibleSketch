// One-time backfill: remove the `email` field from every users/{uid} doc.
// Public profiles are readable by anyone; emails already live in Firebase Auth.
// New docs are handled by the onUserCreated trigger.
//
// Dry run (default): node scripts/strip-user-emails.mjs
// Apply:             node scripts/strip-user-emails.mjs --apply
import { firestore, listDocs } from './firestore-rest.mjs';

const apply = process.argv.includes('--apply');
let total = 0;
let withEmail = 0;

for await (const d of listDocs('users', 'email')) {
  total++;
  if (!d.fields?.email) continue;
  withEmail++;
  if (apply) {
    // updateMask names the field but the body omits it, which deletes it.
    await firestore('PATCH', d.name, { query: { 'updateMask.fieldPaths': 'email', 'currentDocument.exists': 'true' }, body: {} });
  }
}

console.log(`${total} user docs, ${withEmail} with an email field${apply ? ' (removed)' : ' (dry run, nothing changed)'}.`);
