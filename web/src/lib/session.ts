// Firebase Auth session + account operations, ported from the live bundle (minified names in comments) with
// its client-side bugs fixed. Browser-only. Every write here must satisfy firestore.rules / storage.rules as
// deployed from seo-fixes (user doc create = exactly these keys with 5 credits / 5 downloads).
import type { User } from 'firebase/auth';
import { getAuthClient, getDbClient, getStorageClient } from './firebase-client.ts';
import { $authReady, $emailChoice, $modal, $profile, $user, openModal, type Profile } from './store.ts';

// Shown next to the checkbox and the banner, and stored with each opt-in as CASL proof (plan §6.3, §7).
export const CONSENT_TEXT = 'Send me a free Bible story page to print each week, plus occasional offers, and get 5 extra prints now. Unsubscribe anytime.';
export type Persona = 'teacher' | 'family' | 'adult';
export interface EmailChoice { optIn: boolean; persona?: Persona }

declare const zaraz: { track: (name: string, payload: Record<string, unknown>) => void } | undefined;
const track = (name: string, payload: Record<string, unknown>) => {
  if (typeof zaraz !== 'undefined') zaraz.track(name, payload);
};

// Set while email sign-up runs: the new account is unverified, and the verified-email gate below would sign it
// out before its user doc is written (the live bundle's race: 62 of 182 users never got the Welcome Bonus).
let signingUp = false;
let started = false;
let unsubProfile: (() => void) | undefined;

const idle = (fn: () => void) =>
  'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500);

// `L8` + `R8`: restore the session, keep unverified email/password accounts signed out, and mirror users/{uid}
// into $profile. Anonymous sign-in (`A8`) is not ported: it is disabled in production and nothing needs it.
export function startSession() {
  if (started) return;
  started = true;
  idle(async () => {
    const { auth, fa } = await getAuthClient();
    fa.onAuthStateChanged(auth, async (u) => {
      unsubProfile?.();
      unsubProfile = undefined;
      const unverified = u && !u.isAnonymous && !u.emailVerified && u.providerData[0]?.providerId !== 'google.com';
      if (!u || u.isAnonymous || unverified) {
        if (unverified && !signingUp) await fa.signOut(auth);
        $user.set(null);
        $profile.set(null);
        $emailChoice.set('unknown');
        $authReady.set(true);
        return;
      }
      $user.set({ uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL });
      $authReady.set(true);
      const { db, fs } = await getDbClient();
      fs.getDoc(fs.doc(db, 'users', u.uid, 'private', 'profile'))
        .then((s) => $emailChoice.get() === 'unknown' && $emailChoice.set(s.exists() ? (s.get('emailOptIn') ? 'in' : 'out') : 'none'))
        .catch((e) => console.error('[session] email choice', e));
      unsubProfile = fs.onSnapshot(
        fs.doc(db, 'users', u.uid),
        (snap) => {
          // Fix: the bundle waited forever for a missing doc, so every gated action reopened the login modal.
          if (!snap.exists()) return void ensureUserDoc(u).catch((e) => console.error('[session] user doc', e));
          const p = snap.data() as Profile;
          $profile.set(p);
          if (p.profileComplete === false && !p.photoURL && !u.photoURL && !$modal.get()) {
            openModal({ name: 'completion' });
          }
        },
        (e) => console.error('[session] profile listener', e),
      );
    });
  });
}

// `uS`: create users/{uid} once, with the Welcome Bonus ledger entry. Memoised per uid so the listener and the
// sign-in paths never race each other into a second create (which the rules would reject as an update).
const ensured = new Map<string, Promise<void>>();
function ensureUserDoc(u: User, displayName?: string): Promise<void> {
  if (!ensured.has(u.uid)) {
    ensured.set(u.uid, (async () => {
      const { db, fs } = await getDbClient();
      const ref = fs.doc(db, 'users', u.uid);
      if ((await fs.getDoc(ref)).exists()) return;
      const photoURL = u.photoURL || '';
      await fs.setDoc(ref, {
        uid: u.uid,
        email: u.email,
        displayName: (u.displayName || displayName || '').slice(0, 100),
        photoFileName: '',
        photoURL,
        storagePath: '',
        credits: 5,
        downloadsRemaining: 5,
        isPremium: false,
        blessedSketchIds: [],
        profileComplete: Boolean(photoURL),
        createdAt: fs.serverTimestamp(),
      });
      // The bundle only wrote this on sign-up, so docs created later had 5 credits and no ledger entry.
      await fs.addDoc(fs.collection(db, 'users', u.uid, 'transactions'), {
        userId: u.uid, amount: 5, description: 'Welcome Bonus', type: 'bonus', timestamp: fs.serverTimestamp(),
      }).catch((e) => console.error('[session] welcome bonus', e));
    })().catch((e) => {
      ensured.delete(u.uid);
      throw e;
    }));
  }
  return ensured.get(u.uid)!;
}

// users/{uid}/private/profile (plan §6.2): the email choice, time zone and language, plus the first visit that
// Base.astro kept in the browser (sign-up only: for older accounts it would just be today's page). The server
// grants the opt-in bonus prints.
function firstVisit() {
  try {
    const f = JSON.parse(localStorage.getItem('bs_first') || 'null');
    if (!f || typeof f !== 'object') return null;
    // Rebuilt from known keys: the rules reject the whole write (the consent too) on anything else.
    const s = (k: string, n: number) => String(f[k] ?? '').slice(0, n);
    return { path: s('path', 300), utmSource: s('utmSource', 100), utmMedium: s('utmMedium', 100),
      utmCampaign: s('utmCampaign', 100), referrer: s('referrer', 100), epik: f.epik === true, at: s('at', 30) };
  } catch {
    return null; // no storage (private mode)
  }
}

export async function saveEmailChoice(uid: string, choice: EmailChoice, source: 'signup' | 'banner') {
  const { db, fs } = await getDbClient();
  const first = source === 'signup' ? firstVisit() : null;
  await fs.setDoc(fs.doc(db, 'users', uid, 'private', 'profile'), {
    emailOptIn: choice.optIn,
    ...(choice.optIn && { optInAt: fs.serverTimestamp(), optInText: CONSENT_TEXT, optInSource: source }),
    ...(choice.persona && { persona: choice.persona, personaSource: source }),
    timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 64),
    locale: (navigator.language || '').slice(0, 35),
    ...(first && { signup: first }),
    updatedAt: fs.serverTimestamp(),
  }, { merge: true });
  $emailChoice.set(choice.optIn ? 'in' : 'out');
}
const saveChoiceQuietly = (uid: string, choice?: EmailChoice) =>
  choice && saveEmailChoice(uid, choice, 'signup').catch((e) => console.error('[session] email choice', e));

// `N8`: create the account, write its doc while still signed in, send the verification link, sign out.
export async function signUpWithEmail(email: string, password: string, name: string, choice?: EmailChoice) {
  const { auth, fa } = await getAuthClient();
  signingUp = true;
  try {
    const { user } = await fa.createUserWithEmailAndPassword(auth, email, password);
    try {
      await fa.updateProfile(user, { displayName: name });
      await ensureUserDoc(user, name);
      await fa.sendEmailVerification(user, { url: `${location.origin}/verified` });
    } catch (e) {
      await fa.deleteUser(user).catch((d) => console.error('[session] rollback', d));
      throw e;
    }
    await saveChoiceQuietly(user.uid, choice);
    // Fix: the bundle fired CompleteRegistration only for Google sign-ups started from the sign-up view.
    track('CompleteRegistration', { em: user.email, external_id: user.uid, event_id: `signup_${user.uid}` });
    await fa.signOut(auth);
  } finally {
    signingUp = false;
  }
}

// `I8`. Fix: an unverified login now really re-sends the verification email the modal says it sent.
export async function logInWithEmail(email: string, password: string) {
  const { auth, fa } = await getAuthClient();
  const { user } = await fa.signInWithEmailAndPassword(auth, email, password);
  if (!user.emailVerified) {
    await fa.sendEmailVerification(user, { url: `${location.origin}/verified` }).catch(() => {});
    await fa.signOut(auth);
    throw Object.assign(new Error('Email not verified'), { code: 'auth/email-not-verified' });
  }
}

// `k8`. CompleteRegistration fires for genuinely new accounts only (the bundle keyed it on the modal view). Its
// event_id (one per account) lets Pinterest drop duplicates (Zaraz Pinterest "Signup" action). The email choice
// comes from the sign-up view; a new account made from the login view gets the opt-in banner instead.
export async function signInWithGoogle(choice?: EmailChoice) {
  const { auth, fa } = await getAuthClient();
  const res = await fa.signInWithPopup(auth, new fa.GoogleAuthProvider(), fa.browserPopupRedirectResolver);
  if (fa.getAdditionalUserInfo(res)?.isNewUser) {
    await ensureUserDoc(res.user);
    await saveChoiceQuietly(res.user.uid, choice);
    track('CompleteRegistration', { em: res.user.email, external_id: res.user.uid, event_id: `signup_${res.user.uid}` });
  }
}

// `C8`
export async function sendReset(email: string) {
  const { auth, fa } = await getAuthClient();
  await fa.sendPasswordResetEmail(auth, email);
}

// `D8`
export async function signOutUser() {
  const { auth, fa } = await getAuthClient();
  await fa.signOut(auth);
}

// `v8`: shrink a profile photo to at most 96 px, WebP 0.85.
function resizeImage(file: File, max = 96): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > h && w > max) [h, w] = [Math.round((h * max) / w), max];
      else if (h > max) [w, h] = [Math.round((w * max) / h), max];
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d')?.drawImage(img, 0, 0, w, h);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))), 'image/webp', 0.85);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// `T8`: upload with retries (a fresh sign-in can hit storage/unauthorized before the token propagates).
async function uploadProfilePhoto(uid: string, file: File) {
  const { storage, st } = await getStorageClient();
  const blob = await resizeImage(file);
  for (let attempt = 1; ; attempt++) {
    const path = `user_uploads/${uid}/profile_${Date.now()}.webp`;
    const ref = st.ref(storage, path);
    try {
      await st.uploadBytes(ref, blob, { contentType: 'image/webp' });
      return { url: await st.getDownloadURL(ref), storagePath: path };
    } catch (e) {
      if ((e as { code?: string }).code !== 'storage/unauthorized' || attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }
}

// `MP`
export async function updateAccount(opts: { displayName?: string; photoFile?: File }) {
  const [{ auth, fa }, { db, fs }] = await Promise.all([getAuthClient(), getDbClient()]);
  const u = auth.currentUser;
  if (!u) throw new Error('Unauthorized');
  let photoURL = u.photoURL;
  const update: Record<string, unknown> = { updatedAt: fs.serverTimestamp() };
  if (opts.photoFile) {
    const up = await uploadProfilePhoto(u.uid, opts.photoFile);
    photoURL = up.url;
    Object.assign(update, { photoURL, photoFileName: opts.photoFile.name, storagePath: up.storagePath });
  }
  if (opts.displayName) update.displayName = opts.displayName;
  // Only send what has a value: Auth rejects photoURL: null (accounts without a photo), which the bundle sent.
  const authUpdate: { displayName?: string; photoURL?: string } = {};
  if (opts.displayName) authUpdate.displayName = opts.displayName;
  if (photoURL) authUpdate.photoURL = photoURL;
  await fa.updateProfile(u, authUpdate);
  await fs.updateDoc(fs.doc(db, 'users', u.uid), update);
  await u.reload();
  $user.set({ uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL });
}

// `bO`
export async function markProfileComplete() {
  const [{ auth }, { db, fs }] = await Promise.all([getAuthClient(), getDbClient()]);
  const u = auth.currentUser;
  if (!u) throw new Error('Unauthorized');
  await fs.updateDoc(fs.doc(db, 'users', u.uid), { profileComplete: true, updatedAt: fs.serverTimestamp() });
}

// `O8` + `PP`, unchanged from the live app (it also deletes the user's sketch images; open owner question).
export async function deleteAccount() {
  const [{ auth, fa }, { db, fs }, { storage, st }] = await Promise.all([getAuthClient(), getDbClient(), getStorageClient()]);
  const u = auth.currentUser;
  if (!u) return;
  const wipe = async (path: string): Promise<void> => {
    try {
      const list = await st.listAll(st.ref(storage, path));
      await Promise.all([...list.items.map((i) => st.deleteObject(i)), ...list.prefixes.map((p) => wipe(p.fullPath))]);
    } catch (e) {
      console.warn(`[session] could not delete ${path}`, e);
    }
  };
  await wipe(`user_uploads/${u.uid}`);
  await fs.deleteDoc(fs.doc(db, 'users', u.uid));
  await fa.deleteUser(u);
}
