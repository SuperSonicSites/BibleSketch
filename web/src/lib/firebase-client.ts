// Browser-only Firebase, loaded on first use: Auth for everyone once the page is idle, Firestore and Storage only
// when a signed-in visitor needs them. Same emulator switch as the live bundle: exactly `localhost` talks to the
// local emulators, every other host (127.0.0.1 included) talks to production.
import type { FirebaseApp } from 'firebase/app';
import { FIREBASE } from './config.ts';

const useEmulators = () => location.hostname === 'localhost';

let appP: Promise<FirebaseApp> | undefined;
const getApp = () =>
  (appP ??= import('firebase/app').then(({ initializeApp, getApps }) => getApps()[0] ?? initializeApp(FIREBASE)));

let authP: Promise<{ auth: import('firebase/auth').Auth; fa: typeof import('firebase/auth') }> | undefined;
export const getAuthClient = () =>
  (authP ??= Promise.all([getApp(), import('firebase/auth')]).then(([app, fa]) => {
    // Not getAuth(): it wires the popup/redirect resolver, which loads gapi + /__/auth/iframe (~140 KB) on every
    // page. The Google sign-in call passes browserPopupRedirectResolver itself.
    const auth = fa.initializeAuth(app, { persistence: [fa.indexedDBLocalPersistence, fa.browserLocalPersistence] });
    if (useEmulators()) fa.connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    return { auth, fa };
  }));

let dbP: Promise<{ db: import('firebase/firestore').Firestore; fs: typeof import('firebase/firestore') }> | undefined;
export const getDbClient = () =>
  (dbP ??= Promise.all([getApp(), import('firebase/firestore')]).then(([app, fs]) => {
    const db = fs.getFirestore(app);
    if (useEmulators()) fs.connectFirestoreEmulator(db, 'localhost', 8080);
    return { db, fs };
  }));

let storageP: Promise<{ storage: import('firebase/storage').FirebaseStorage; st: typeof import('firebase/storage') }> | undefined;
export const getStorageClient = () =>
  (storageP ??= Promise.all([getApp(), import('firebase/storage')]).then(([app, st]) => {
    const storage = st.getStorage(app);
    if (useEmulators()) st.connectStorageEmulator(storage, 'localhost', 9199);
    return { storage, st };
  }));
