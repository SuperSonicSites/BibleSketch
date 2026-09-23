// End-to-end check of the shared shell against the Firebase emulators (production rules from seo-fixes):
// email sign-up (user doc + Welcome Bonus, then signed out), unverified login re-sends the link, verified
// login, profile completion, Account settings, a guest Bless queued through sign-in, Save, password reset,
// sign-out, and the CompleteRegistration event.
//
// Needs: emulators from the seo-fixes worktree (scripts/emulators.cmd) and `npx astro preview` on
// http://localhost:4321 (exactly localhost: that is what switches the islands to the emulators).
// Run: node scripts/e2e-auth.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(`${process.env.LOCALAPPDATA}/npm-cache/_npx/0f94ee7615faf582/node_modules/`);
const puppeteer = require('puppeteer-core');
const { Launcher } = require('chrome-launcher');

const SITE = 'http://localhost:4321';
const PROJECT = 'biblesketch-5104c';
const FS = `http://localhost:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = `http://localhost:9099`;
const OWNER = { authorization: 'Bearer owner' };
const run = Date.now().toString(36);
const email = `e2e-${run}@test.local`;
const password = 'secret123';
// Sketches embedded in /blog/bible-coloring-pages; the page reads them from production, the island writes to
// the emulator, so the test seeds emulator copies.
const EMBEDS = ['qXyvSvE2VwB5PT9nrEeD', 'gts06GvvQyiXOQqK9PQ1'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (check, label, ms = 15000) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(250)) if (await check()) return;
  assert.fail(`timed out: ${label}`);
};
const doc = async (path) => {
  const r = await fetch(`${FS}/${path}`, { headers: OWNER });
  return r.status === 200 ? (await r.json()).fields : null;
};
const uidOf = async (mail) => {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:batchGet?maxResults=500`, { headers: OWNER });
  return (await r.json()).users?.find((u) => u.email === mail)?.localId;
};
const oobCodes = async () =>
  (await (await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`)).json()).oobCodes.filter((c) => c.email === email);

let passed = 0;
const step = async (label, fn) => { await fn(); passed++; console.log(`ok - ${label}`); };

for (const id of EMBEDS) {
  await fetch(`${FS}/sketches/${id}`, {
    method: 'PATCH', headers: { ...OWNER, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { userId: { stringValue: 'someone-else' }, isPublic: { booleanValue: true }, blessCount: { integerValue: '0' } } }),
  });
}

const browser = await puppeteer.launch({ executablePath: Launcher.getInstallations()[0], headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('dialog', (d) => d.accept());
await page.evaluateOnNewDocument(() => {
  window.__z = [];
  window.zaraz = { track: (name, payload) => window.__z.push([name, payload]) };
});

const open = async (path) => {
  await page.goto(SITE + path, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr][client="idle"]').length === 0, { timeout: 15000 });
};
// client:visible islands hydrate once scrolled in: bring the button into view and wait for its island.
const pressWhenHydrated = async (el) => {
  await el.scrollIntoView();
  await page.waitForFunction((b) => !b.closest('astro-island')?.hasAttribute('ssr'), { timeout: 15000 }, el);
  await el.click();
};
const click = (text) => page.locator(`::-p-text(${text})`).click();
const type = (selector, value) => page.locator(selector).fill(value);
const dialogText = () => page.$eval('[role=dialog]', (d) => d.textContent).catch(() => '');
const headerText = () => page.$eval('nav', (n) => n.textContent);

try {
  await step('sign-up writes the user doc and the Welcome Bonus, then signs out and asks for verification', async () => {
    await open('/about');
    await click('Claim Free Credits');
    await type('input[autocomplete=name]', 'E2E Tester');
    await type('input[type=email]', email);
    for (const input of await page.$$('input[autocomplete=new-password]')) await input.type(password);
    await page.click('#terms-agree');
    await click('Create Account');
    await waitFor(async () => (await dialogText()).includes('Verify your email'), 'verification view');
    const uid = await uidOf(email);
    assert.ok(uid, 'account exists');
    const user = await doc(`users/${uid}`);
    assert.equal(user.credits.integerValue, '5');
    assert.equal(user.displayName.stringValue, 'E2E Tester');
    const tx = await (await fetch(`${FS}/users/${uid}/transactions`, { headers: OWNER })).json();
    assert.equal(tx.documents?.length, 1, 'one Welcome Bonus transaction');
    assert.equal(tx.documents[0].fields.type.stringValue, 'bonus');
    assert.ok((await headerText()).includes('Log In'), 'signed out after sign-up');
    assert.equal((await oobCodes()).filter((c) => c.requestType === 'VERIFY_EMAIL').length, 1);
    const events = await page.evaluate(() => window.__z);
    assert.deepEqual(events.map((e) => e[0]), ['CompleteRegistration']);
    assert.equal(events[0][1].external_id, uid);
  });

  await step('logging in before verifying re-sends the link and stays signed out', async () => {
    await click('Go to Login');
    await type('input[type=email]', email);
    await type('input[autocomplete=current-password]', password);
    await click('Sign In');
    await waitFor(async () => (await dialogText()).includes('Verify your email'), 'verification view again');
    assert.equal((await oobCodes()).filter((c) => c.requestType === 'VERIFY_EMAIL').length, 2, 'link re-sent');
    assert.ok((await headerText()).includes('Log In'));
  });

  await step('verified login shows the avatar menu and the profile-completion prompt; Skip marks it done', async () => {
    const link = (await oobCodes()).find((c) => c.requestType === 'VERIFY_EMAIL').oobLink;
    await fetch(link);
    await click('Go to Login');
    await type('input[type=email]', email);
    await type('input[autocomplete=current-password]', password);
    await click('Sign In');
    await waitFor(async () => (await headerText()).includes('E2E Tester'), 'avatar menu with name');
    await waitFor(async () => (await dialogText()).includes('Add a profile photo'), 'completion prompt');
    await click('Skip for now');
    const uid = await uidOf(email);
    await waitFor(async () => (await doc(`users/${uid}`)).profileComplete?.booleanValue === true, 'profileComplete');
  });

  await step('Account settings show credits and downloads, and update the display name', async () => {
    await click('E2E Tester');
    await click('Profile Settings');
    await waitFor(async () => (await dialogText()).includes('Image Credits'), 'account modal');
    const text = await dialogText();
    assert.match(text, /Image Credits5/);
    assert.match(text, /Downloads\/Prints5/, 'downloadsRemaining shown (the bundle showed 0)');
    await page.locator('[role=dialog] input[type=text][required]').fill('E2E Renamed');
    await click('Update Profile');
    const uid = await uidOf(email);
    await waitFor(async () => (await doc(`users/${uid}`)).displayName?.stringValue === 'E2E Renamed', 'name updated');
    await waitFor(async () => (await headerText()).includes('E2E Renamed'), 'header shows new name');
  });

  await step('Bless and Save on a blog embed write the allowed documents', async () => {
    await open('/blog/bible-coloring-pages');
    await waitFor(async () => (await headerText()).includes('E2E Renamed'), 'session restored');
    const [bless] = await page.$$('[aria-label="Bless this sketch"]');
    await pressWhenHydrated(bless);
    const uid = await uidOf(email);
    await waitFor(async () => (await doc(`sketches/${EMBEDS[0]}`)).blessCount.integerValue === '1', 'blessCount 1');
    await waitFor(async () => (await doc(`users/${uid}`)).blessedSketchIds?.arrayValue?.values?.[0]?.stringValue === EMBEDS[0], 'blessed id');
    const [save] = await page.$$('[aria-label="Save to collection"]');
    await pressWhenHydrated(save);
    await waitFor(async () => (await doc(`sketches/bookmark_${uid}_${EMBEDS[0]}`))?.isBookmark?.booleanValue === true, 'bookmark');
  });

  await step('sign-out returns to the guest header', async () => {
    await click('E2E Renamed');
    await click('Sign Out');
    await waitFor(async () => (await headerText()).includes('Log In'), 'guest header');
  });

  await step('a guest Bless opens sign-in and runs after login with the signed-in user', async () => {
    await open('/blog/bible-coloring-pages');
    const buttons = await page.$$('[aria-label="Bless this sketch"]');
    await pressWhenHydrated(buttons[1]);
    await waitFor(async () => (await dialogText()).includes('Welcome Back'), 'login modal');
    await type('input[type=email]', email);
    await type('input[autocomplete=current-password]', password);
    await click('Sign In');
    await waitFor(async () => (await doc(`sketches/${EMBEDS[1]}`)).blessCount.integerValue === '1', 'queued bless ran');
  });

  await step('password reset sends the email and confirms', async () => {
    await click('E2E Renamed');
    await click('Sign Out');
    await waitFor(async () => (await headerText()).includes('Log In'), 'guest header');
    await click('Log In');
    await click('Forgot Password?');
    await type('input[type=email]', email);
    await click('Send Reset Link');
    await waitFor(async () => (await dialogText()).includes('Check your inbox'), 'reset view');
    assert.ok((await oobCodes()).some((c) => c.requestType === 'PASSWORD_RESET'));
  });

  assert.deepEqual(errors, [], 'no uncaught page errors');
  console.log(`\nAll ${passed} checks passed.`);
} catch (e) {
  console.error('dialog:', await dialogText());
  console.error('console errors:', consoleErrors.slice(-5));
  throw e;
} finally {
  await browser.close();
}
