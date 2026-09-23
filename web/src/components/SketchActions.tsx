// Guest call-to-action on the server; swaps to the signed-in buttons once Firebase Auth has restored the
// session. Auth is imported when the browser is idle so it never competes with the first paint.
// ponytail: Phase 0 buttons are read-only (they show the quota). Print/download/save writes land in rollout
// phase 2 together with the server-side print PDF (ROADMAP 1.2).
import { useEffect, useState } from 'react';
import { FIREBASE } from '../lib/config.ts';
import { getDoc } from '../lib/firestore.ts';

type Viewer = { uid: string; remaining: number; isPremium: boolean } | null;

const idle = (fn: () => void) =>
  'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500);

const icon = (d: string[]) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-300" aria-hidden="true">
    {d.map((p) => <path key={p} d={p} />)}
  </svg>
);
const PRINTER = ['M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2', 'M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6', 'M6 14h12v8H6z'];
const DOWNLOAD = ['M12 15V3', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5'];
const BOOKMARK = ['m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z'];
const CHECK = ['M20 6 9 17l-5-5'];

export default function SketchActions({ ownerId }: { ownerId?: string }) {
  const [viewer, setViewer] = useState<Viewer>(null);

  useEffect(() => {
    idle(async () => {
      const [{ initializeApp }, { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence }] =
        await Promise.all([import('firebase/app'), import('firebase/auth')]);
      // Not getAuth(): it wires the popup/redirect resolver, which loads gapi + /__/auth/iframe (~140 KB) on
      // every page. Sign-in popups pass browserPopupRedirectResolver at call time instead.
      const auth = initializeAuth(initializeApp(FIREBASE), {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      });
      await auth.authStateReady();
      const u = auth.currentUser;
      if (!u || u.isAnonymous) return;
      const doc = await getDoc('users', u.uid);
      setViewer({ uid: u.uid, remaining: doc?.downloadsRemaining ?? 0, isPremium: Boolean(doc?.isPremium) });
    });
  }, []);

  if (!viewer) {
    const items: [string[], string][] = [
      [PRINTER, 'Print this page (PDF)'],
      [DOWNLOAD, 'Download HD image'],
      [BOOKMARK, 'Save to your collection'],
      [CHECK, '5 credits to create your own'],
    ];
    return (
      <div className="bg-[#7C3AED] rounded-2xl p-6 mb-6 text-white overflow-hidden">
        <h2 className="text-xl font-display font-bold mb-3 flex items-center gap-2">
          <span className="text-2xl animate-float inline-block">🎁</span>Unlock This Coloring Page
        </h2>
        <p className="text-purple-200 text-sm mb-4">Create a free account to:</p>
        <ul className="text-white text-sm space-y-2 mb-5">
          {items.map(([d, label], i) => (
            <li key={label} className="flex items-center gap-2 animate-slideIn" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
              {icon(d)}{label}
            </li>
          ))}
        </ul>
        <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 mb-4 text-center">
          <p className="text-white font-bold text-sm">✨ Includes 5 free prints!</p>
        </div>
        <a href="/" className="block text-center w-full bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold py-3 rounded-xl transition-all animate-pulseGlow">
          Create Free Account
        </a>
        <p className="text-xs text-purple-200 text-center mt-2">No credit card required</p>
      </div>
    );
  }

  const isOwner = viewer.uid === ownerId;
  const left = !isOwner && !viewer.isPremium ? <span className="ml-1 text-xs opacity-80">({viewer.remaining} left)</span> : null;
  const btn = 'inline-flex items-center justify-center rounded-full font-bold transition-all duration-200 w-full gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
  return (
    <div className="space-y-4 mb-10" title="Prototype: actions arrive in rollout phase 2">
      <button disabled className={`${btn} bg-[#7C3AED] text-white shadow-lg shadow-purple-100 px-8 py-4 text-lg`}>
        Print PDF{left}
      </button>
      <button disabled className={`${btn} border-2 border-[#7C3AED] text-[#7C3AED] px-6 py-3 text-base`}>
        Download Image{left}
      </button>
      {!isOwner && (
        <button disabled className={`${btn} border-2 border-[#7C3AED] text-[#7C3AED] px-6 py-3 text-base`}>
          Save to Collection
        </button>
      )}
    </div>
  );
}
