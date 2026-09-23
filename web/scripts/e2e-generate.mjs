// End-to-end check of phases 3-4 against the Firebase emulators: /pricing (checkout URL, return events),
// /gallery (community listing, My Gallery, owner dialog) and both generators (createSketch / editSketch with the
// emulator's fake Gemini: charge, refund, out of credits, result URL that survives a refresh, paid and free edits).
//
// Needs: emulators (seo-fixes worktree, scripts/emulators.cmd, functions/.env.local FAKE_GEMINI=1) and
// `npx astro preview --port 4321` built with FIRESTORE_EMULATOR=localhost:8080 in web/.dev.vars.
// Run: node scripts/e2e-generate.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(`${process.env.LOCALAPPDATA}/npm-cache/_npx/0f94ee7615faf582/node_modules/`);
const puppeteer = require('puppeteer-core');
const { Launcher } = require('chrome-launcher');

const SITE = 'http://localhost:4321';
const PROJECT = 'biblesketch-5104c';
const FS = `http://localhost:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = 'http://localhost:9099';
const OWNER = { authorization: 'Bearer owner' };
const run = Date.now().toString(36);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (check, label, ms = 30000) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(300)) if (await check()) return;
  assert.fail(`timed out: ${label}`);
};
const value = (v) => typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? { integerValue: String(v) }
  : v instanceof Date ? { timestampValue: v.toISOString() }
  : Array.isArray(v) ? { arrayValue: { values: v.map(value) } }
  : typeof v === 'object' ? { mapValue: { fields: fields(v) } } : { stringValue: v };
const fields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, value(v)]));
const put = (path, data) => fetch(`${FS}/${path}`, { method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' }, body: JSON.stringify({ fields: fields(data) }) });
const get = async (path) => {
  const r = await fetch(`${FS}/${path}`, { headers: OWNER });
  return r.status === 200 ? (await r.json()).fields : null;
};
const credits = async (uid) => Number((await get(`users/${uid}`)).credits.integerValue);

async function account(name, profile = {}) {
  const email = `${name}-${run}@test.local`;
  const res = await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=any`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'secret123', returnSecureToken: true }),
  })).json();
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: 'POST', headers: { ...OWNER, 'content-type': 'application/json' },
    body: JSON.stringify({ localId: res.localId, emailVerified: true }),
  });
  await put(`users/${res.localId}`, { uid: res.localId, displayName: name, credits: 5, downloadsRemaining: 5, isPremium: false, blessedSketchIds: [], profileComplete: true, photoURL: '', ...profile });
  return { uid: res.localId, email };
}

let passed = 0;
const step = async (label, fn) => { await fn(); passed++; console.log(`ok - ${label}`); };

const maker = await account('maker');
const premium = await account('premium', { isPremium: true });
const broke = await account('broke', { credits: 0 });
// A public sketch for the community listing (tag christmas) and a private one of maker's.
const pub = `e2e-pub-${run}`;
const priv = `e2e-priv-${run}`;
const sketch = (userId, isPublic, extra = {}) => ({
  userId, isPublic, isBookmark: false, blessCount: 3, type: 'scene', createdAt: new Date(), tags: ['christmas'],
  imageUrl: 'https://biblesketch.app/logo.png', storagePath: `user_uploads/${userId}/sketches/x.png`,
  promptData: { book: 'Luke', chapter: 2, start_verse: 7, age_group: 'Teen', art_style: 'Classic', aspect_ratio: '3:4' }, ...extra,
});
await put(`sketches/${pub}`, sketch(premium.uid, true));
await put(`sketches/${priv}`, sketch(maker.uid, false, { promptData: { book: 'Mark', chapter: 1, start_verse: 9, age_group: 'Teen', art_style: 'Classic' } }));

const browser = await puppeteer.launch({ executablePath: Launcher.getInstallations()[0], headless: true });
const errors = [];
let page;
// A fresh incognito context: signed out, empty storage (one per test persona).
const fresh = async () => {
  if (page) await page.browserContext().close();
  page = await (await browser.createBrowserContext()).newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.evaluateOnNewDocument(() => {
    window.zaraz = { track: (n, p) => window.__z.push([n, p]), ecommerce: (n, p) => window.__z.push([n, p]) };
    window.__z = [];
  });
};
await fresh();
const events = () => page.evaluate(() => window.__z.map(([n, p]) => `${n}:${p.value ?? ''}:${p.external_id ?? ''}`));
const open = async (path) => {
  await page.goto(SITE + path, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]:not([client="visible"])').length === 0, { timeout: 20000 });
};
const click = (text) => page.locator(`::-p-text(${text})`).click();
const text = () => page.evaluate(() => document.body.innerText);
const signIn = async (who) => {
  await click('Log In');
  await page.locator('input[type=email]').fill(who.email);
  await page.locator('input[autocomplete=current-password]').fill('secret123');
  await click('Sign In');
  await waitFor(async () => !(await page.$('[role=dialog]')), 'signed in');
};
const signOut = fresh;

try {
  await step('pricing: guests are asked to sign up, then go to Zoho with their uid and the return URL', async () => {
    await open('/pricing');
    await click('Get Spark Pack');
    await page.waitForSelector('[role=dialog]');
    assert.match(await text(), /Create Account|Sign Up/i);
    await page.keyboard.press('Escape');
    await signIn(maker);
    await page.setRequestInterception(true);
    let zoho = '';
    const onReq = (r) => { if (r.url().includes('zohosecure')) { zoho = r.url(); r.abort(); } else r.continue(); };
    page.on('request', onReq);
    await click('Get Torch Pack');
    await waitFor(() => zoho, 'navigation to Zoho');
    page.off('request', onReq);
    await page.setRequestInterception(false);
    const u = new URL(zoho);
    assert.equal(u.searchParams.get('cf_cf_firebase_uid'), maker.uid);
    assert.equal(u.searchParams.get('redirect_url'), `${SITE}/pricing?purchase=torch`);
    assert.equal(u.searchParams.get('addon_code[0]'), '80credits');
  });

  await step('pricing: the return fires Purchase once with the buyer, strips the URL; premium sees Current Plan', async () => {
    await open('/pricing?purchase=torch&order_id=abc');
    await waitFor(async () => (await events()).some((e) => e.startsWith('Purchase')), 'purchase event');
    assert.match(await text(), /Credits Added!/);
    assert.equal(new URL(page.url()).search, '');
    const ev = await events();
    assert.deepEqual(ev.filter((e) => /Purchase|Order Completed/.test(e)), ['Order Completed:14.99:', `Purchase:14.99:${maker.uid}`]);
    await signOut();
    await open('/pricing');
    await signIn(premium);
    await waitFor(async () => /Current Plan/.test(await text()), 'current plan');
    assert.match(await text(), /You're a Premium Member!/);
    assert.equal(await page.$eval('[data-plan=premium]', (b) => b.disabled), true);
    await signOut();
  });

  await step('gallery: the community listing is server-rendered, filterable by tag, canonical to /gallery', async () => {
    const html = await (await fetch(`${SITE}/gallery?tag=christmas`)).text();
    assert.match(html, /<h1[^>]*>Bible Coloring Pages Gallery<\/h1>/);
    assert.ok(html.includes(`/coloring-page/luke-2-7/${pub}`), 'public sketch listed');
    assert.ok(!html.includes(priv), 'private sketch not listed');
    assert.match(html, /<link rel="canonical" href="https:\/\/biblesketch.app\/gallery">/);
    const other = await (await fetch(`${SITE}/gallery?tag=easter`)).text();
    assert.ok(!other.includes(pub), 'tag filter');
  });

  await step('gallery: My Gallery lists the owner\'s private sketches and the dialog manages them', async () => {
    await open('/gallery#my');
    await signIn(maker);
    await waitFor(async () => /Mark 1:9/.test(await text()), 'private sketch in My Gallery');
    await click('Mark 1:9');
    await page.waitForSelector('[role=dialog]');
    await waitFor(async () => /Owner Controls/i.test(await text()), 'owner view');
    await click('Change');
    await waitFor(async () => (await get(`sketches/${priv}`)).isPublic?.booleanValue === true, 'made public');
    await page.keyboard.press('Escape');
    await waitFor(async () => !(await page.$('[role=dialog]')) && (await text()).includes('Public'), 'dialog closed, card shows Public');
  });

  let made;
  await step('scene: generating charges one credit, shows the saved page, and a refresh keeps it', async () => {
    const c0 = await credits(maker.uid);
    await open('/');
    await page.locator('::-p-text(Create Coloring Page)').click();
    await waitFor(async () => /Your creation is ready|Try another scripture/.test(await text()), 'result shown', 60000);
    made = new URL(page.url()).searchParams.get('sketch');
    assert.ok(made, '?sketch= in the URL');
    assert.equal(await credits(maker.uid), c0 - 1);
    const doc = await get(`sketches/${made}`);
    assert.equal(doc.isPublic.booleanValue, false);
    assert.equal(doc.promptData.mapValue.fields.book.stringValue, 'Daniel');
    await open(`/?sketch=${made}`);
    await waitFor(async () => /Try another scripture/.test(await text()), 'result after refresh');
    assert.match(await text(), /Saved privately in My Gallery/);
    assert.match(await text(), /Share with the community/);
  });

  await step('result view: Add Ref is free and changes the image; Remove Color costs a credit and makes a new page', async () => {
    const c0 = await credits(maker.uid);
    const src0 = await page.$eval('img[alt$="coloring page"]', (i) => i.src);
    await click('Add Ref (free)');
    await waitFor(async () => (await page.$eval('img[alt$="coloring page"]', (i) => i.src)) !== src0, 'new image');
    assert.equal((await get(`sketches/${made}`)).refAdded.booleanValue, true);
    assert.ok(!(await text()).includes('Add Ref (free)'), 'Add Ref hidden once used');
    assert.equal(await credits(maker.uid), c0);
    await click('Remove Color');
    await waitFor(async () => new URL(page.url()).searchParams.get('sketch') !== made, 'switched to the new page', 60000);
    assert.equal(await credits(maker.uid), c0 - 1);
  });

  await step('a failed generation refunds and says so', async () => {
    const c0 = await credits(maker.uid);
    await open('/');
    const chapter = await page.$$('input[inputmode=numeric]');
    await chapter[0].click();
    await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
    await chapter[0].type('150');
    await chapter[1].click(); // blur commits the value
    await page.locator('::-p-text(Create Coloring Page)').click();
    await waitFor(async () => /credit was refunded/.test(await text()), 'refund message', 60000);
    assert.equal(await credits(maker.uid), c0);
    await page.keyboard.press('Escape');
    await signOut();
  });

  await step('out of credits: no call is made, the modal links to /pricing', async () => {
    await open('/bible-verse-coloring');
    await signIn(broke);
    await page.locator('::-p-text(Create Verse Art)').click();
    await waitFor(async () => /Out of Credits/.test(await text()), 'out of credits modal');
    assert.equal(await page.$eval('[role=dialog] a[href="/pricing"]', (a) => a.textContent), 'Get More Credits');
    await page.keyboard.press('Escape');
    await signOut();
  });

  await step('verse: generating makes private verse art', async () => {
    await open('/bible-verse-coloring');
    await signIn(maker);
    const c0 = await credits(maker.uid);
    await click('Playful');
    await page.locator('::-p-text(Create Verse Art)').click();
    await waitFor(async () => /Try another scripture/.test(await text()), 'verse result', 60000);
    const id = new URL(page.url()).searchParams.get('sketch');
    const doc = await get(`sketches/${id}`);
    assert.equal(doc.type.stringValue, 'verse');
    assert.equal(doc.promptData.mapValue.fields.font_style.stringValue, 'Playful');
    assert.equal(await credits(maker.uid), c0 - 1);
    assert.ok(!(await text()).includes('Add Ref'), 'no Add Ref on verse art');
  });

  assert.deepEqual(errors, [], 'no uncaught page errors');
  console.log(`\nAll ${passed} checks passed.`);
} catch (e) {
  console.error('url:', page.url());
  console.error('text:', (await text()).slice(0, 1200));
  throw e;
} finally {
  await browser.close();
}
