// End-to-end check of phase 2 against the Firebase emulators: the print/download endpoints (ID-token auth,
// quota rules: owners and premium free, others spend one, 0 left -> 402, private sketches only for their owner)
// and the owner flows on the coloring page (make public, tags, visibility, delete) plus the upgrade modal.
//
// Needs: emulators (seo-fixes worktree, scripts/emulators.cmd) and `npx astro preview --port 4321` started with
// FIRESTORE_EMULATOR=localhost:8080 in web/.dev.vars (the Worker then reads Firestore from the emulator and
// accepts emulator tokens; only for localhost requests). Images are read from production Storage (read-only).
// Run: node scripts/e2e-downloads.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { PDFDocument } from 'pdf-lib';

const require = createRequire(`${process.env.LOCALAPPDATA}/npm-cache/_npx/0f94ee7615faf582/node_modules/`);
const puppeteer = require('puppeteer-core');
const { Launcher } = require('chrome-launcher');

const SITE = 'http://localhost:4321';
const PROJECT = 'biblesketch-5104c';
const FS = `http://localhost:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = 'http://localhost:9099';
const OWNER = { authorization: 'Bearer owner' };
const run = Date.now().toString(36);
// A real, public original in production Storage (the Worker only reads it).
const STORAGE_PATH = 'user_uploads/TiAEiMqWxpWqxCLtoI5OgHAvtf33/sketches/1764185439472.png';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (check, label, ms = 15000) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(250)) if (await check()) return;
  assert.fail(`timed out: ${label}`);
};
const toFields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k,
  typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? { integerValue: String(v) }
  : Array.isArray(v) ? { arrayValue: { values: v.map((x) => ({ stringValue: x })) } }
  : v instanceof Date ? { timestampValue: v.toISOString() }
  : typeof v === 'object' ? { mapValue: { fields: toFields(v) } } : { stringValue: v }]));
const put = (path, data) => fetch(`${FS}/${path}`, { method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields: toFields(data) }) });
const get = async (path) => {
  const r = await fetch(`${FS}/${path}`, { headers: OWNER });
  return r.status === 200 ? (await r.json()).fields : null;
};
const downloadsLeft = async (uid) => Number((await get(`users/${uid}`)).downloadsRemaining.integerValue);

async function account(name, profile) {
  const email = `${name}-${run}@test.local`;
  const res = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=any`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'secret123', returnSecureToken: true }),
  })).json();
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' },
    body: JSON.stringify({ localId: res.localId, emailVerified: true }),
  });
  await put(`users/${res.localId}`, { uid: res.localId, displayName: name, credits: 5, downloadsRemaining: 2, isPremium: false, blessedSketchIds: [], profileComplete: true, photoURL: '', ...profile });
  const login = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=any`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'secret123', returnSecureToken: true }),
  })).json();
  return { uid: res.localId, email, token: login.idToken };
}

const post = (kind, id, token, extra = {}) => fetch(`${SITE}/api/${kind}/${id}`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded', origin: SITE },
  body: new URLSearchParams({ idToken: token, ...extra }),
});
const unsigned = (payload) => [{ alg: 'none', typ: 'JWT' }, payload].map((p) => Buffer.from(JSON.stringify(p)).toString('base64url')).join('.') + '.';

let passed = 0;
const step = async (label, fn) => { await fn(); passed++; console.log(`ok - ${label}`); };

const alice = await account('alice'); // spends downloads
const bob = await account('bob'); // owns the public sketch
const carol = await account('carol', { isPremium: true });
const pub = `e2e-pub-${run}`;
const priv = `e2e-priv-${run}`;
const sketch = { imageUrl: 'https://example.invalid/x.png', storagePath: STORAGE_PATH, blessCount: 0, type: 'scene', createdAt: new Date().toISOString(),
  promptData: { book: 'Genesis', chapter: 1, start_verse: 3, end_verse: 5, age_group: 'Toddler', art_style: 'Sunday School' } };
await put(`sketches/${pub}`, { ...sketch, userId: bob.uid, isPublic: true });
await put(`sketches/${priv}`, { ...sketch, userId: alice.uid, isPublic: false, tags: [] });
await put(`sketches/bookmark_${alice.uid}_${pub}`, { ...sketch, userId: alice.uid, isPublic: false, isBookmark: true, originalSketchId: pub, originalOwnerId: bob.uid });

await step('print returns a Letter or A4 PDF and spends one download', async () => {
  const r = await post('print', pub, alice.token, { paper: 'a4' });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'application/pdf');
  const doc = await PDFDocument.load(await r.arrayBuffer());
  const { width, height } = doc.getPage(0).getSize();
  assert.deepEqual([doc.getPageCount(), Math.round(width), Math.round(height)], [1, 595, 842], 'one A4 page');
  assert.equal(await downloadsLeft(alice.uid), 1);
});

await step('download returns the original as bible-sketch-<id>.png and spends one', async () => {
  const r = await post('download', pub, alice.token);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-disposition'), `attachment; filename="bible-sketch-${pub}.png"`);
  assert.ok((await r.arrayBuffer()).byteLength > 10000);
  assert.equal(await downloadsLeft(alice.uid), 0);
});

await step('with no downloads left: 402 and nothing spent', async () => {
  const r = await post('print', pub, alice.token);
  assert.equal(r.status, 402);
  assert.equal(await downloadsLeft(alice.uid), 0);
});

await step('owners and premium accounts never spend a download', async () => {
  assert.equal((await post('print', pub, bob.token)).status, 200);
  assert.equal(await downloadsLeft(bob.uid), 2);
  assert.equal((await post('download', pub, carol.token)).status, 200);
  assert.equal(await downloadsLeft(carol.uid), 2);
  assert.equal((await post('print', priv, alice.token)).status, 200, 'owner prints own private sketch');
});

await step('a dated unlimited-prints pass spends nothing until it expires', async () => {
  const day = 24 * 60 * 60 * 1000;
  const dave = await account('dave', { downloadsRemaining: 0, printsUnlimitedUntil: new Date(Date.now() + day) });
  assert.equal((await post('print', pub, dave.token)).status, 200);
  assert.equal(await downloadsLeft(dave.uid), 0);
  const erin = await account('erin', { downloadsRemaining: 0, printsUnlimitedUntil: new Date(Date.now() - day) });
  assert.equal((await post('print', pub, erin.token)).status, 402, 'an expired pass is the normal print wall');
});

await step("someone else's private sketch is a 404; a bookmark resolves to its original", async () => {
  assert.equal((await post('print', priv, bob.token)).status, 404);
  assert.equal((await post('print', `bookmark_${alice.uid}_${pub}`, carol.token)).status, 404, 'not your bookmark');
  await put(`users/${alice.uid}`, { uid: alice.uid, displayName: 'alice', credits: 5, downloadsRemaining: 1, isPremium: false, blessedSketchIds: [], profileComplete: true, photoURL: '' });
  assert.equal((await post('download', `bookmark_${alice.uid}_${pub}`, alice.token)).status, 200);
  assert.equal(await downloadsLeft(alice.uid), 0);
});

await step('bad, expired or foreign tokens get 401 (and spend nothing)', async () => {
  const now = Math.floor(Date.now() / 1000);
  const base = { aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub: bob.uid, iat: now, exp: now + 3600, email_verified: true };
  for (const token of ['garbage', unsigned({ ...base, exp: now - 10 }), unsigned({ ...base, aud: 'other-project' }), unsigned({ ...base, email_verified: false })]) {
    assert.equal((await post('print', pub, token)).status, 401);
  }
  assert.equal(await downloadsLeft(bob.uid), 2);
});

// ---- browser flows
const browser = await puppeteer.launch({ executablePath: Launcher.getInstallations()[0], headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
const open = async (path) => {
  await page.goto(SITE + path, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr][client="idle"]').length === 0, { timeout: 15000 });
};
const click = (text) => page.locator(`::-p-text(${text})`).click();
const signIn = async (who) => {
  await click('Log In');
  await page.locator('input[type=email]').fill(who.email);
  await page.locator('input[autocomplete=current-password]').fill('secret123');
  await click('Sign In');
  await waitFor(async () => !(await page.$('[role=dialog]')), 'signed in');
};
const text = () => page.evaluate(() => document.body.innerText);

try {
  await step('a free account with 0 left gets the upgrade modal instead of a print', async () => {
    await open('/coloring-page/genesis-1-3-5/' + pub);
    await signIn(alice);
    await waitFor(async () => (await text()).includes('(0 left)'), 'quota shown');
    const tabs = (await browser.pages()).length;
    await click('Print PDF');
    await waitFor(async () => (await text()).includes('Upgrade to Premium'), 'upgrade modal');
    assert.equal((await browser.pages()).length, tabs, 'no print tab opened');
    await click('Maybe Later');
  });

  await step('Print PDF posts into a tab opened inside the click (no popup block)', async () => {
    await click(alice.email.split('-')[0]); // avatar menu (display name "alice")
    await click('Sign Out');
    await waitFor(async () => (await text()).includes('Log In'), 'signed out');
    await signIn(bob); // bob: owner of pub, free prints
    await waitFor(async () => (await text()).includes('Print PDF'), 'print button');
    const tab = new Promise((resolve) => browser.once('targetcreated', resolve));
    await click('Print PDF');
    const target = await tab;
    const pdfPage = await target.page();
    await waitFor(async () => pdfPage.url().includes(`/api/print/${pub}`), 'print tab posted');
    await pdfPage.close();
  });

  await step('the owner of a private sketch can make it public from its 404 page', async () => {
    await click('bob');
    await click('Sign Out');
    await waitFor(async () => (await text()).includes('Log In'), 'signed out');
    await signIn(alice);
    await open('/coloring-page/x/' + priv);
    assert.ok((await text()).includes('Sketch Not Found'));
    await waitFor(async () => (await text()).includes('This coloring page is private'), 'owner panel');
    await click('Make Public');
    await waitFor(async () => (await get(`sketches/${priv}`)).isPublic.booleanValue === true, 'isPublic true');
    await page.waitForNavigation({ waitUntil: 'load' }).catch(() => {});
    await waitFor(async () => /owner controls/i.test(await text()), 'owner controls on the public page');
  });

  await step('owner edits tags, switches to private, then deletes', async () => {
    await click('Add Tags');
    await click('Easter');
    await click('Save Tags');
    await waitFor(async () => (await get(`sketches/${priv}`)).tags?.arrayValue?.values?.[0]?.stringValue === 'easter', 'tags saved');
    await click('Publicly Visible');
    await waitFor(async () => (await get(`sketches/${priv}`)).isPublic.booleanValue === false, 'private again');
    await click('Delete Sketch');
    await click('Yes, Delete');
    await waitFor(async () => (await get(`sketches/${priv}`)) === null, 'doc deleted');
  });

  assert.deepEqual(errors, [], 'no uncaught page errors');
  console.log(`\nAll ${passed} checks passed.`);
} catch (e) {
  console.error('url:', page.url());
  console.error('text:', (await text()).slice(0, 800));
  throw e;
} finally {
  await browser.close();
}
