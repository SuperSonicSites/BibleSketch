// Give full-size sketch originals a long-lived Cache-Control (thumbnails already get one from
// the Resize extension). Objects are never overwritten, so `immutable` is safe. Idempotent: re-run monthly.
// PATCH only sets cacheControl: download tokens, contentType and contentDisposition stay as they are,
// and it fires metadataUpdate (not finalize), so the Resize extension does not run.
//
// Dry run (default): node scripts/optimize-sketch-images.mjs
// Apply:             node scripts/optimize-sketch-images.mjs --apply
// Emulator:          set STORAGE_EMULATOR_HOST=127.0.0.1:9199
import { getToken } from './firestore-rest.mjs';

const BUCKET = 'biblesketch-5104c.firebasestorage.app';
const CACHE = 'private, max-age=31536000, immutable';
const ORIGINAL = /^user_uploads\/[^/]+\/sketches\/\d+\.(png|jpe?g)$/;
const emulator = process.env.STORAGE_EMULATOR_HOST?.replace(/^https?:\/\//, '');
// The emulator serves PATCH only on /b/..., not /storage/v1/b/...
const base = emulator ? `http://${emulator}/b/${BUCKET}/o` : `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o`;
const apply = process.argv.includes('--apply');
const auth = { authorization: `Bearer ${emulator ? 'owner' : await getToken()}` };

const todo = [];
let total = 0;
let pageToken;
do {
  const url = new URL(base);
  url.searchParams.set('prefix', 'user_uploads/');
  url.searchParams.set('fields', 'nextPageToken,items(name,generation,metageneration,contentType,cacheControl,size)');
  if (pageToken) url.searchParams.set('pageToken', pageToken);
  const res = await fetch(url, { headers: auth });
  if (!res.ok) throw new Error(`list: ${res.status} ${await res.text()}`);
  const page = await res.json();
  for (const o of page.items || []) {
    total++;
    if (ORIGINAL.test(o.name) && !o.cacheControl) todo.push(o);
  }
  pageToken = page.nextPageToken;
} while (pageToken);

const mb = (todo.reduce((s, o) => s + Number(o.size || 0), 0) / 1e6).toFixed(1);
console.log(`${total} objects under user_uploads/, ${todo.length} originals without cacheControl (${mb} MB).`);
todo.slice(0, 5).forEach((o) => console.log(`  ${o.name}  ${o.contentType}  ${o.size} B`));

let done = 0;
let skipped = 0;
for (const o of apply ? todo : []) {
  const url = `${base}/${encodeURIComponent(o.name)}?ifMetagenerationMatch=${o.metageneration}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ cacheControl: CACHE }),
  });
  if (res.status === 412 || res.status === 404) { skipped++; continue; } // changed or deleted since listing
  if (!res.ok) throw new Error(`PATCH ${o.name}: ${res.status} ${await res.text()}`);
  done++;
}
console.log(apply
  ? `Set cacheControl on ${done}, skipped ${skipped} (changed or deleted since listing).`
  : 'Dry run, nothing changed. Re-run with --apply.');
