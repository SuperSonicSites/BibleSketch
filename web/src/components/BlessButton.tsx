// Bless (heart + count) on a listing card. Guests go through sign-in first; the bless then runs as the
// signed-in user. Already-blessed state comes from the live profile.
import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { Heart } from 'lucide-react';
import { $profile, $user, requireAuth } from '../lib/store.ts';

export default function BlessButton({ sketchId, count }: { sketchId: string; count: number }) {
  const profile = useStore($profile);
  const [n, setN] = useState(count);
  const [now, setNow] = useState(false);
  const blessed = now || Boolean(profile?.blessedSketchIds?.includes(sketchId));

  const bless = () => requireAuth(async () => {
    const uid = $user.get()?.uid;
    if (!uid || $profile.get()?.blessedSketchIds?.includes(sketchId)) return;
    setNow(true);
    setN((c) => c + 1);
    try {
      const { blessSketch } = await import('../lib/sketch-actions.ts');
      if (!(await blessSketch(uid, sketchId))) setN((c) => c - 1);
    } catch (e) {
      console.error('[bless]', e);
      setNow(false);
      setN((c) => Math.max(0, c - 1));
    }
  });

  return (
    <button type="button" onClick={bless} disabled={blessed} aria-label={blessed ? 'Already blessed' : 'Bless this sketch'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${blessed ? 'bg-red-50 border-red-200 text-red-500 cursor-default' : 'bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300'}`}>
      <Heart className={`w-4 h-4 ${blessed ? 'fill-current' : ''}`} /><span>{n}</span>
    </button>
  );
}
