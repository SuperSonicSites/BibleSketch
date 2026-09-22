// Guards hosting-public/ before a deploy (firebase.json predeploy hooks run it from the repo root).
// hosting-public/ is the live Hosting release byte for byte; scripts/hosting-live-files.json records
// its hashes (sha256 of the gzip level-9 bytes, as Firebase Hosting computes them).
// Usage: node scripts/check-hosting-public.mjs [--live]
//   --live also HEADs every file functions/index.html references on biblesketch-5104c.web.app.
//   SKIP_LIVE_ASSET_CHECK=1 skips that network step (billing hotfixes).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import zlib from 'node:zlib';

// Paths relative to hosting-public/. CHANGED: live files replaced on purpose. ADDED: new files ('dir/' = prefix).
const CHANGED = ['og.png', 'logo.png', 'blog-images/christian-christmas-coloring-pages.webp'];
const ADDED = ['404.html', 'fonts/'];

const DIR = 'hosting-public';
const sha = (f) => crypto.createHash('sha256').update(zlib.gzipSync(fs.readFileSync(f), { level: 9 })).digest('hex');
const live = JSON.parse(fs.readFileSync('scripts/hosting-live-files.json', 'utf8'))
  .filter((f) => !f.path.startsWith('/__/')).map((f) => ({ path: f.path.slice(1), hash: f.hash }));

assert(!fs.existsSync(`${DIR}/index.html`), `${DIR}/index.html must not exist: it would shadow the homeRender rewrite`);

for (const { path, hash } of live) {
  assert(fs.existsSync(`${DIR}/${path}`), `live file missing: ${DIR}/${path}`);
  if (!CHANGED.includes(path)) assert.equal(sha(`${DIR}/${path}`), hash, `${DIR}/${path} differs from the live release (list it in CHANGED if intended)`);
}

const known = new Set(live.map((f) => f.path));
for (const f of fs.readdirSync(DIR, { recursive: true }).map((p) => p.replaceAll('\\', '/'))) {
  if (known.has(f) || fs.statSync(`${DIR}/${f}`).isDirectory()) continue;
  assert(ADDED.some((a) => (a.endsWith('/') ? f.startsWith(a) : f === a)), `unexpected file ${DIR}/${f} (list it in ADDED if intended)`);
}

const html = fs.readFileSync('functions/index.html', 'utf8');
const refs = [...new Set([...html.matchAll(/(?:src|href)="(\/[^"]*)"|url\(['"]?(\/[^)'"]*)/g)]
  .map((m) => (m[1] ?? m[2]).split(/[?#]/)[0]))]
  .filter((p) => p !== '/' && !p.startsWith('//') && !p.startsWith('/__/'));
for (const p of refs) assert(fs.existsSync(DIR + p), `functions/index.html references ${p}, which is not in ${DIR}/`);

let onLive = '';
if (process.argv.includes('--live')) {
  if (process.env.SKIP_LIVE_ASSET_CHECK === '1') console.warn('WARNING: SKIP_LIVE_ASSET_CHECK=1, template assets NOT checked on live Hosting');
  else {
    for (const p of refs) {
      const { status } = await fetch(`https://biblesketch-5104c.web.app${p}`, { method: 'HEAD', redirect: 'manual' });
      assert.equal(status, 200, `live Hosting returns ${status} for ${p}: release Hosting before deploying this template`);
    }
    onLive = ', all 200 on live Hosting';
  }
}

console.log(`hosting-public OK: ${live.length} live files, ${refs.length} template refs${onLive}`);
