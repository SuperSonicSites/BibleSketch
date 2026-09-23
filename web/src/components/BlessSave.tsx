// Bless and Save buttons of a blog sketch embed (bundle `Wte`). Guests are sent through sign-in and the action
// runs afterwards with the signed-in user (the bundle's queued action captured `user = null` and did nothing).
import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Bookmark, Heart, LoaderCircle } from 'lucide-react';
import { $profile, $user, requireAuth } from '../lib/store.ts';
import type { Sketch } from '../lib/sketch.ts';

export default function BlessSave({ sketch, blessCount }: { sketch: Sketch; blessCount: number }) {
  const user = useStore($user);
  const profile = useStore($profile);
  const [count, setCount] = useState(blessCount);
  const [blessedNow, setBlessedNow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const blessed = blessedNow || Boolean(profile?.blessedSketchIds?.includes(sketch.id));

  useEffect(() => {
    if (!user) return setSaved(false);
    let live = true;
    import('../lib/sketch-actions.ts').then(({ isBookmarked }) => isBookmarked(user.uid, sketch.id)).then((b) => live && setSaved(b));
    return () => {
      live = false;
    };
  }, [user?.uid, sketch.id]);

  const bless = () => requireAuth(async () => {
    const uid = $user.get()?.uid;
    if (!uid || $profile.get()?.blessedSketchIds?.includes(sketch.id)) return;
    setBlessedNow(true);
    setCount((c) => c + 1);
    try {
      const { blessSketch } = await import('../lib/sketch-actions.ts');
      if (!(await blessSketch(uid, sketch.id))) setCount((c) => c - 1);
    } catch (e) {
      console.error('[bless]', e);
      setBlessedNow(false);
      setCount((c) => Math.max(0, c - 1));
    }
  });

  const save = () => requireAuth(async () => {
    const uid = $user.get()?.uid;
    if (!uid) return;
    setSaving(true);
    try {
      const { toggleBookmark } = await import('../lib/sketch-actions.ts');
      setSaved(await toggleBookmark(uid, sketch));
    } catch (e) {
      console.error('[save]', e);
      alert('Failed to save to collection.');
    } finally {
      setSaving(false);
    }
  });

  const base = 'flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors w-full';
  return (
    <>
      <button type="button" onClick={bless} disabled={blessed} aria-label={blessed ? 'Already blessed' : 'Bless this sketch'}
        className={`${base} ${blessed ? 'bg-purple-100 text-[#7C3AED] cursor-default' : 'bg-gray-100 text-gray-700 hover:bg-purple-50 hover:text-[#7C3AED]'}`}>
        <Heart className={`w-5 h-5 ${blessed ? 'fill-current' : ''}`} /><span>{count}</span>
      </button>
      <button type="button" onClick={save} disabled={saving} aria-label={saved ? 'Remove from collection' : 'Save to collection'}
        className={`${base} ${saved ? 'bg-purple-100 text-[#7C3AED]' : 'bg-gray-100 text-gray-700 hover:bg-purple-50 hover:text-[#7C3AED]'} ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {saving ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />}
        <span>{saved ? 'Saved' : 'Save'}</span>
      </button>
    </>
  );
}
