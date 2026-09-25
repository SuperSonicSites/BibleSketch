// Coloring page actions (bundle `_O`). Guests get the call-to-action (server-rendered); once the shared session
// has restored a signed-in visitor: Print PDF and Download (server-side, ROADMAP 1.2) and Save to Collection.
// Owners and premium accounts never spend a download (owner decision 2026-09-23); the server enforces the same.
import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Bookmark, Check, Download, LoaderCircle, Printer } from 'lucide-react';
import Button from './shell/Button.tsx';
import { $profile, $user, openModal, requireAuth, unlimitedPrints } from '../lib/store.ts';
import type { Sketch } from '../lib/sketch.ts';

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
const actions = () => import('../lib/sketch-actions.ts');

export default function SketchActions({ sketch }: { sketch: Sketch }) {
  const user = useStore($user);
  const profile = useStore($profile);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const isOwner = Boolean(user && user.uid === sketch.userId);

  useEffect(() => {
    if (!user || isOwner) return;
    let live = true;
    actions().then(({ isBookmarked }) => isBookmarked(user.uid, sketch.id)).then((b) => live && setSaved(b));
    return () => {
      live = false;
    };
  }, [user?.uid, sketch.id, isOwner]);

  if (!user || !profile) {
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
        <button type="button" onClick={() => requireAuth(() => {}, 'signup')} className="block text-center w-full bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold py-3 rounded-xl transition-all animate-pulseGlow">
          Create Free Account
        </button>
        <p className="text-xs text-purple-200 text-center mt-2">No credit card required</p>
      </div>
    );
  }

  const free = isOwner || unlimitedPrints(profile);
  const remaining = profile.downloadsRemaining ?? 0;
  const left = free ? null : <span className="ml-1 text-xs opacity-80">({remaining} left)</span>;
  const blocked = () => {
    if (free || remaining > 0) return false;
    openModal({ name: 'premium', remaining });
    return true;
  };
  const print = () => {
    if (blocked()) return;
    // Open the tab inside the click so it isn't treated as a popup; printSketch posts into it by name.
    window.open('about:blank', `print-${sketch.id}`);
    actions().then((m) => m.printSketch(sketch.id));
  };
  const download = () => {
    if (!blocked()) actions().then((m) => m.downloadSketch(sketch.id));
  };

  const toggleSave = async () => {
    setSaving(true);
    try {
      setSaved(await (await actions()).toggleBookmark(user.uid, sketch));
    } catch (e) {
      console.error('[save]', e);
      alert('Failed to save to collection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 mb-10">
      <Button size="lg" className="w-full gap-2 shadow-lg shadow-purple-100" onClick={print}>
        <Printer className="w-5 h-5" />Print PDF{left}
      </Button>
      <Button variant="outline" className="w-full gap-2" onClick={download}>
        <Download className="w-5 h-5" />Download Image{left}
      </Button>
      {!isOwner && (
        <Button variant={saved ? 'secondary' : 'outline'} className={`w-full gap-2 ${saved ? 'bg-purple-50 border-purple-100 text-[#7C3AED]' : ''}`}
          onClick={toggleSave} disabled={saving}>
          {saving ? <LoaderCircle className="w-5 h-5 animate-spin" /> : saved ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          {saved ? 'Saved to Collection' : 'Save to Collection'}
        </Button>
      )}
    </div>
  );
}
