// Security regression check for the Phase A hardening (rules, generateContent, Zoho webhook,
// user triggers, render escaping, storage). Fails loudly if any protection regresses.
//
// Runs against local emulators only:
//   functions/.secret.local  GEMINI_API_KEY=<any dummy>  ZOHO_WEBHOOK_SECRET=localtestsecret123
//   functions/.env.local     ZOHO_ENFORCE_AUTH=true
//   hosting-public/          the live hosting files (functions render the pages)
//   firebase emulators:start --only auth,firestore,storage,functions,hosting --project biblesketch-5104c
// Usage: node scripts/security-check.mjs
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, addDoc,
  collection, serverTimestamp, arrayUnion, increment,
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator, ref, uploadString, listAll, getBytes } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

const PROJECT = 'biblesketch-5104c';
const AUTH = 'http://127.0.0.1:9099';
const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const FN = `http://127.0.0.1:5001/${PROJECT}/us-central1`;
const HOSTING = 'http://127.0.0.1:5000';
const ZOHO_SECRET = 'localtestsecret123';
const run = Date.now().toString(36);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (check, label, ms = 20000) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(300)) {
    if (await check()) return;
  }
  assert.fail(`timed out waiting for: ${label}`);
};
const denied = (p, label) => assert.rejects(p, (e) => /permission|unauthorized/i.test(`${e.code} ${e.message}`), label);
const allowed = async (p, label) => {
  try { await p; } catch (e) { assert.fail(`${label} was rejected: ${e.code} ${e.message}`); }
};
const callFails = (p, code, label) => assert.rejects(p, (e) => e.code === `functions/${code}`, label);

const clientApp = (name) => {
  const app = initializeApp({
    projectId: PROJECT, apiKey: 'any', authDomain: 'localhost', storageBucket: `${PROJECT}.firebasestorage.app`,
  }, `${name}-${run}`);
  const auth = getAuth(app); connectAuthEmulator(auth, AUTH, { disableWarnings: true });
  const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const storage = getStorage(app); connectStorageEmulator(storage, '127.0.0.1', 9199);
  const fns = getFunctions(app); connectFunctionsEmulator(fns, '127.0.0.1', 5001);
  return { auth, db, storage, call: (data) => httpsCallable(fns, 'generateContent')(data) };
};

// Email/password user, verified unless asked otherwise, signed in on its own app instance.
const makeUser = async (name, { verified = true } = {}) => {
  const email = `${name}-${run}@test.local`;
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=any`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'secret123', returnSecureToken: true }),
  });
  const { localId: uid } = await res.json();
  if (verified) {
    await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer owner' },
      body: JSON.stringify({ localId: uid, emailVerified: true }),
    });
  }
  const c = clientApp(name);
  await signInWithEmailAndPassword(c.auth, email, 'secret123');
  return { uid, email, ...c };
};

// Exactly what the live bundle writes when a user signs up.
const liveProfile = (u) => ({
  uid: u.uid, email: u.email, displayName: 'Test User', photoFileName: '', photoURL: '', storagePath: '',
  credits: 5, downloadsRemaining: 5, isPremium: false, blessedSketchIds: [], profileComplete: false,
  createdAt: serverTimestamp(),
});
const userDoc = (u, viewer = u) => getDoc(doc(viewer.db, 'users', u.uid));
const credits = async (u) => (await userDoc(u)).get('credits');
const adminDocExists = async (path) =>
  (await fetch(`${FIRESTORE}/${path}`, { headers: { authorization: 'Bearer owner' } })).status === 200;

let passed = 0;
const step = async (label, fn) => { await fn(); passed++; console.log(`ok - ${label}`); };

// ---------------------------------------------------------------- users
const alice = await makeUser('alice');
const bob = await makeUser('bob');

await step('live-bundle user doc create is allowed', async () => {
  await allowed(setDoc(doc(alice.db, 'users', alice.uid), liveProfile(alice)), 'create alice');
  await allowed(setDoc(doc(bob.db, 'users', bob.uid), liveProfile(bob)), 'create bob');
});

await step('user doc create with extra credits or premium is denied', async () => {
  const carol = await makeUser('carol');
  await denied(setDoc(doc(carol.db, 'users', carol.uid), { ...liveProfile(carol), credits: 500 }), 'credits 500');
  await denied(setDoc(doc(carol.db, 'users', carol.uid), { ...liveProfile(carol), isPremium: true }), 'premium');
  await denied(setDoc(doc(carol.db, 'users', carol.uid), { ...liveProfile(carol), planStatus: 'active' }), 'extra key');
});

await step('email is stripped from the public user doc', () =>
  waitFor(async () => (await userDoc(alice, bob)).get('email') === undefined, 'email removed'));

await step('users can be read one at a time but not listed', async () => {
  await allowed(userDoc(alice, bob), 'get');
  await denied(getDocs(collection(bob.db, 'users')), 'list');
});

await step('raising own credits, downloads or premium is denied', async () => {
  const ref_ = doc(alice.db, 'users', alice.uid);
  await denied(updateDoc(ref_, { credits: 999 }), 'credits 999');
  await denied(updateDoc(ref_, { credits: increment(1) }), 'credits +1');
  await denied(updateDoc(ref_, { credits: -1 }), 'negative credits');
  await denied(updateDoc(ref_, { downloadsRemaining: 50 }), 'downloads up');
  await denied(updateDoc(ref_, { isPremium: true }), 'premium');
  await denied(updateDoc(ref_, { planStatus: 'active' }), 'planStatus');
  await denied(updateDoc(ref_, { email: 'x@y.z' }), 'email');
});

await step('live-bundle profile writes are allowed', async () => {
  const ref_ = doc(alice.db, 'users', alice.uid);
  await allowed(updateDoc(ref_, { credits: 4 }), 'spend a credit');
  await allowed(updateDoc(ref_, { downloadsRemaining: 4 }), 'spend a download');
  await allowed(updateDoc(ref_, { profileComplete: true, updatedAt: serverTimestamp() }), 'profile complete');
  await allowed(updateDoc(ref_, {
    displayName: 'Alice', photoURL: 'https://firebasestorage.googleapis.com/v0/b/x/o/p.webp',
    photoFileName: 'p.webp', storagePath: `user_uploads/${alice.uid}/p.webp`, updatedAt: serverTimestamp(),
  }), 'profile update');
  await allowed(updateDoc(ref_, { blessedSketchIds: arrayUnion('s1') }), 'bless id');
});

await step('bad profile fields are denied', async () => {
  const ref_ = doc(alice.db, 'users', alice.uid);
  await denied(updateDoc(ref_, { displayName: 'x'.repeat(101) }), 'long name');
  await denied(updateDoc(ref_, { photoURL: 'https://evil.example/x.png' }), 'photo host');
  await denied(updateDoc(ref_, { blessedSketchIds: [] }), 'shrinking bless ids');
});

await step('transactions: only the welcome bonus and usage entries', async () => {
  const col = collection(alice.db, 'users', alice.uid, 'transactions');
  await allowed(addDoc(col, { userId: alice.uid, amount: -1, description: 'Generated', type: 'usage', timestamp: serverTimestamp() }), 'usage');
  await allowed(addDoc(col, { userId: alice.uid, amount: 5, description: 'Welcome Bonus', type: 'bonus', timestamp: serverTimestamp() }), 'bonus');
  await denied(addDoc(col, { userId: alice.uid, amount: 200, description: 'x', type: 'credit_purchase' }), 'purchase');
});

// ---------------------------------------------------------------- sketches
const sketchId = `sk-${run}`;
await step('sketch rules: owner edits visibility/tags only, others can only bless', async () => {
  await denied(setDoc(doc(alice.db, 'sketches', `${sketchId}-x`), { userId: alice.uid, isPublic: true, blessCount: 50 }), 'blessCount 50');
  await allowed(setDoc(doc(alice.db, 'sketches', sketchId), {
    userId: alice.uid, isPublic: false, blessCount: 0, isBookmark: false, type: 'scene',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/x/o/s.png', storagePath: '', thumbnailPath: '',
    createdAt: serverTimestamp(),
    promptData: { book: '"><img src=x onerror=alert(1)>', chapter: 1, start_verse: 1, age_group: 'Teen', art_style: 'Classic' },
  }), 'create');
  await allowed(updateDoc(doc(alice.db, 'sketches', sketchId), { isPublic: true }), 'owner isPublic');
  await allowed(updateDoc(doc(alice.db, 'sketches', sketchId), { tags: ['advent'] }), 'owner tags');
  await denied(updateDoc(doc(alice.db, 'sketches', sketchId), { blessCount: 100 }), 'owner blessCount');
  await denied(updateDoc(doc(alice.db, 'sketches', sketchId), { userId: bob.uid }), 'owner userId');
  await allowed(updateDoc(doc(bob.db, 'sketches', sketchId), { blessCount: increment(1) }), 'bless');
  await denied(updateDoc(doc(bob.db, 'sketches', sketchId), { isPublic: false }), 'other isPublic');
});

// ---------------------------------------------------------------- generateContent
const textReq = { model: 'gemini-2.5-flash', contents: { parts: [{ text: 'hi' }] }, config: { responseMimeType: 'application/json' } };
const imageReq = {
  model: 'gemini-3-pro-image-preview', contents: { role: 'user', parts: [{ text: 'draw' }] },
  config: { responseModalities: ['IMAGE'], imageConfig: { imageSize: '2K', aspectRatio: '3:4' } },
};

await step('generateContent rejects signed-out, anonymous and unverified callers', async () => {
  const guest = clientApp('guest');
  await callFails(guest.call(textReq), 'unauthenticated', 'signed out');
  await signInAnonymously(guest.auth);
  await callFails(guest.call(textReq), 'unauthenticated', 'anonymous');
  const unverified = await makeUser('unverified', { verified: false });
  await callFails(unverified.call(textReq), 'permission-denied', 'unverified email');
});

await step('generateContent rejects unknown models, config keys and oversized contents', async () => {
  await callFails(alice.call({ ...textReq, model: 'gemini-1.5-pro' }), 'invalid-argument', 'model');
  await callFails(alice.call({ ...textReq, config: { tools: [{ googleSearch: {} }] } }), 'invalid-argument', 'config key');
  await callFails(alice.call({ ...textReq, contents: { parts: Array.from({ length: 13 }, () => ({ text: 'x' })) } }), 'invalid-argument', 'too many parts');
  await callFails(alice.call({ ...textReq, contents: { parts: [{ text: 'x'.repeat(60001) }] } }), 'invalid-argument', 'too much text');
  await callFails(alice.call({ ...textReq, contents: { parts: [{ inlineData: { mimeType: 'text/html', data: 'PGh0bWw+' } }] } }), 'invalid-argument', 'non-image data');
});

await step('generateContent lets valid calls through to Gemini', async () => {
  // The local key is a dummy, so reaching Gemini (an "internal" Gemini error) means every gate passed.
  await assert.rejects(alice.call(textReq), (e) => e.code === 'functions/internal' && /Gemini Error/.test(e.message), 'text call');
  await assert.rejects(alice.call(imageReq), (e) => e.code === 'functions/internal' && /Gemini Error/.test(e.message), 'image call');
});

await step('image calls need at least one credit', async () => {
  const zero = await makeUser('zero');
  await allowed(setDoc(doc(zero.db, 'users', zero.uid), liveProfile(zero)), 'create');
  await allowed(updateDoc(doc(zero.db, 'users', zero.uid), { credits: 0 }), 'spend all');
  await callFails(zero.call(imageReq), 'failed-precondition', 'no credits');
});

await step('per-user daily image cap stops the 61st call', async () => {
  const heavy = await makeUser('heavy');
  await allowed(setDoc(doc(heavy.db, 'users', heavy.uid), liveProfile(heavy)), 'create');
  let stoppedAt = 0;
  for (let i = 1; i <= 61 && !stoppedAt; i++) {
    try { await heavy.call(imageReq); } catch (e) { if (e.code === 'functions/resource-exhausted') stoppedAt = i; }
  }
  assert.equal(stoppedAt, 61);
});

// ---------------------------------------------------------------- Zoho webhook
const hook = (query, body, headers = {}) => fetch(`${FN}/handleZohoWebhook?${new URLSearchParams(query)}`, {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
});
const token = { 'x-webhook-token': ZOHO_SECRET };
// Zoho's real default payload (${JSONString}): only a `subscription` object. A pack purchase is a new $0
// subscription; the Firebase UID is also in the customer's custom field.
const zohoSub = (id, uid, extra = {}) => ({ subscription: {
  subscription_id: id, status: 'live', current_term_starts_at: '2026-09-21',
  customer: { customer_id: 'c1', custom_field_hash: { cf_cf_firebase_uid: uid } }, ...extra,
} });

await step('webhook rejects requests without a valid token or signature', async () => {
  assert.equal((await hook({ pack: 'beacon', uid: alice.uid }, {})).status, 401);
  assert.equal((await hook({ pack: 'beacon', uid: alice.uid }, {}, { 'x-webhook-token': 'wrong' })).status, 401);
  assert.equal((await hook({ uid: alice.uid }, { subscription: { subscription_id: 's', status: 'live' } }, { 'x-zoho-webhook-signature': 'bad' })).status, 401);
});

await step('webhook grants a credit pack once per purchase (Zoho retries and resends are ignored)', async () => {
  const c0 = await credits(alice);
  const body = zohoSub(`pack-${run}`, alice.uid);
  assert.equal((await hook({ uid: alice.uid, pack: 'spark' }, body, token)).status, 200);
  assert.equal(await credits(alice), c0 + 20);
  assert.equal(await (await hook({ uid: alice.uid, pack: 'spark' }, body, token)).text(), 'Already processed');
  assert.equal(await credits(alice), c0 + 20);
});

await step('webhook falls back to the customer UID field when ?uid= is empty', async () => {
  const c0 = await credits(alice);
  assert.equal((await hook({ uid: '', pack: 'spark' }, zohoSub(`pack-nouid-${run}`, alice.uid), token)).status, 200);
  assert.equal(await credits(alice), c0 + 20);
  // No UID anywhere: fail visibly (Zoho logs the delivery as failed) instead of a silent 200.
  assert.equal((await hook({ uid: '', pack: 'spark' }, zohoSub(`pack-none-${run}`, ''), token)).status, 400);
  assert.equal((await hook({ uid: '' }, zohoSub(`sub-none-${run}`, ''), token)).status, 400);
});

await step('webhook grants a subscription once per billing term, renewals included', async () => {
  const sub = (term) => zohoSub(`sub-${run}`, alice.uid, { current_term_starts_at: term });
  const c0 = await credits(alice);
  assert.equal((await hook({ uid: alice.uid }, sub('2026-09-01'), token)).status, 200);
  assert.equal(await credits(alice), c0 + 10);
  assert.equal((await userDoc(alice)).get('isPremium'), true);
  await hook({ uid: alice.uid }, sub('2026-09-01'), token);
  assert.equal(await credits(alice), c0 + 10, 'a retry must not grant again');
  await hook({ uid: alice.uid }, sub('2026-10-01'), token);
  assert.equal(await credits(alice), c0 + 20, 'a renewal grants again');
});

await step('webhook accepts a valid Zoho HMAC signature', async () => {
  const query = { pack: 'torch', uid: alice.uid };
  const raw = JSON.stringify(zohoSub(`pack-signed-${run}`, alice.uid));
  const signed = Object.keys(query).sort().map((k) => k + query[k]).join('') + raw;
  const signature = crypto.createHmac('sha256', ZOHO_SECRET).update(signed).digest('hex');
  const c0 = await credits(alice);
  const res = await fetch(`${FN}/handleZohoWebhook?${new URLSearchParams(query)}`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-zoho-webhook-signature': signature }, body: raw,
  });
  assert.equal(res.status, 200);
  assert.equal(await credits(alice), c0 + 80);
});

// ---------------------------------------------------------------- delete-and-recreate
await step('deleting your user doc and signing back in keeps your balance and premium', async () => {
  const balance = await credits(alice);
  await allowed(deleteDoc(doc(alice.db, 'users', alice.uid)), 'delete');
  await waitFor(() => adminDocExists(`deletedUsers/${alice.uid}`), 'tombstone written');
  await allowed(setDoc(doc(alice.db, 'users', alice.uid), liveProfile(alice)), 'recreate with 5 credits');
  await waitFor(async () => (await credits(alice)) === balance, 'balance restored');
  assert.equal((await userDoc(alice)).get('isPremium'), true);
});

// ---------------------------------------------------------------- rendered pages
await step('profile page escapes the display name and the uid from the URL', async () => {
  await allowed(updateDoc(doc(bob.db, 'users', bob.uid), { displayName: '"><script>alert(1)</script>', updatedAt: serverTimestamp() }), 'evil name');
  const html = await (await fetch(`${HOSTING}/profile/${bob.uid}`)).text();
  assert.ok(html.includes('og:title'), 'profile page was rendered');
  assert.ok(!html.includes('<script>alert(1)'), 'raw script tag in profile page');
  assert.ok(html.includes('&lt;script&gt;alert(1)'), 'escaped name present');
  const reflected = await (await fetch(`${HOSTING}/profile/%22%3E%3Cscript%3Ealert(2)%3C%2Fscript%3E`)).text();
  assert.ok(!reflected.includes('<script>alert(2)'), 'uid reflected unescaped');
});

await step('sketch page escapes user-controlled prompt data', async () => {
  const html = await (await fetch(`${HOSTING}/coloring-page/x/${sketchId}`)).text();
  assert.ok(html.includes('og:title'), 'sketch page was rendered');
  assert.ok(!html.includes('<img src=x onerror'), 'raw payload in sketch page');
});

// ---------------------------------------------------------------- status codes and redirects
const get = (url, headers = {}) => fetch(url.startsWith('http') ? url : `${HOSTING}${url}`, { redirect: 'manual', headers });
const isShell = (html) => html.includes('<div id="root">') && html.includes('/assets/index-DHKtGwi1.js');

await step('missing pages are real 404s that still boot the app', async () => {
  for (const url of ['/coloring-page/x/doesnotexist123', '/blog/does-not-exist', '/tags/nope', '/profile/doesnotexist123']) {
    const res = await get(url);
    assert.equal(res.status, 404, url);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex', url);
    assert.match(res.headers.get('cache-control'), /s-maxage=3600/, url);
    assert.ok(isShell(await res.text()), `${url} body is the SPA shell`);
  }
});

await step('reserved Firestore ids are 404s, and thin pages stay working 200s', async () => {
  for (const url of ['/coloring-page/x/__x__', '/profile/__x__']) assert.equal((await get(url)).status, 404, url);
  for (const url of [`/profile/${bob.uid}`, '/tags/pentecost']) {
    const res = await get(url);
    assert.equal(res.status, 200, url);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex', url);
  }
});

await step('a private sketch is an uncached 404 shell, without a redirect that would leak its slug', async () => {
  const privateId = `${sketchId}-private`;
  await allowed(setDoc(doc(alice.db, 'sketches', privateId), {
    userId: alice.uid, isPublic: false, blessCount: 0, isBookmark: false, type: 'scene',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/x/o/p.png', storagePath: '', thumbnailPath: '',
    createdAt: serverTimestamp(), promptData: { book: 'Ruth', chapter: 2, start_verse: 17, age_group: 'Teen', art_style: 'Classic' },
  }), 'create private');
  const res = await get(`/coloring-page/wrong/${privateId}`);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('cache-control'), 'private');
  assert.equal(res.headers.get('location'), null);
  assert.ok(isShell(await res.text()), 'owner still gets the app shell');
});

await step('wrong slugs, trailing slashes and default hosts 301 to the canonical URL', async () => {
  const wrong = await get(`/coloring-page/x/${sketchId}?ref=pin`);
  assert.equal(wrong.status, 301);
  assert.match(wrong.headers.get('location'), new RegExp(`^/coloring-page/[a-z0-9-]+-1-1/${sketchId}\\?ref=pin$`));
  assert.match(wrong.headers.get('cache-control'), /s-maxage=7200/);
  assert.equal((await get(wrong.headers.get('location'))).status, 200, 'canonical sketch URL');
  const slash = await get('/pricing/');
  assert.equal(slash.status, 301);
  assert.equal(slash.headers.get('location'), '/pricing');
  assert.equal((await get('/pricing')).status, 200, 'no redirect loop');
  const webApp = await get(`${FN}/pricingRender`, { 'x-forwarded-host': 'biblesketch-5104c.web.app' });
  assert.equal(webApp.status, 301);
  assert.match(webApp.headers.get('location'), /^https:\/\/biblesketch\.app\//);
  const viaCloudflare = await get(`${FN}/pricingRender`, { 'x-forwarded-host': 'biblesketch-5104c.web.app', 'cf-ray': 'x' });
  assert.equal(viaCloudflare.status, 200, 'Cloudflare traffic is never redirected');
});

await step('thin pages are noindexed; real ones are not', async () => {
  const verified = await get('/verified');
  assert.equal(verified.status, 200);
  assert.equal(verified.headers.get('x-robots-tag'), 'noindex');
  assert.match(await verified.text(), /<title>Email Verified \| Bible Sketch<\/title>/);
  assert.equal((await get(`/profile/${bob.uid}`)).headers.get('x-robots-tag'), 'noindex', 'profile with nothing public');
  const aliceProfile = await get(`/profile/${alice.uid}`);
  assert.equal(aliceProfile.headers.get('x-robots-tag'), null, 'profile with a public sketch');
  assert.match(await aliceProfile.text(), /<h1>.*Bible Coloring Pages<\/h1>/);
  assert.equal((await get('/tags/pentecost')).headers.get('x-robots-tag'), 'noindex', 'tag with no public sketches');
  assert.equal((await get('/tags/advent')).headers.get('x-robots-tag'), null, 'tag with a public sketch');
});

// ---------------------------------------------------------------- storage
await step('storage: sketches fetchable by path, folders not listable by others, images only', async () => {
  const path = `user_uploads/${alice.uid}/sketches/${run}.png`;
  await allowed(uploadString(ref(alice.storage, path), 'iVBORw0KGgo=', 'base64', { contentType: 'image/png' }), 'upload png');
  await denied(uploadString(ref(alice.storage, `user_uploads/${alice.uid}/sketches/${run}.html`), 'PGh0bWw+', 'base64', { contentType: 'text/html' }), 'upload html');
  await allowed(getBytes(ref(bob.storage, path)), 'fetch by path');
  await denied(listAll(ref(bob.storage, `user_uploads/${alice.uid}/sketches`)), 'list other user');
  await allowed(listAll(ref(alice.storage, `user_uploads/${alice.uid}`)), 'list own folder');
});

console.log(`\nAll ${passed} checks passed.`);
process.exit(0);
