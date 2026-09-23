// On a coloring page that answers 404 (missing, or private: the server can't tell them apart), let the owner of
// a private sketch make it public again. Everyone else sees nothing extra.
import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Lock } from 'lucide-react';
import Button from './shell/Button.tsx';
import { $user } from '../lib/store.ts';
import { getDbClient } from '../lib/firebase-client.ts';

export default function OwnerPrivate({ sketchId }: { sketchId: string }) {
  const user = useStore($user);
  const [mine, setMine] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !sketchId) return setMine(false);
    let live = true;
    getDbClient()
      .then(async ({ db, fs }) => (await fs.getDoc(fs.doc(db, 'sketches', sketchId))).data())
      .then((s) => live && setMine(Boolean(s && s.userId === user.uid && s.isPublic === false && !s.isBookmark)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [user?.uid, sketchId]);

  if (!mine) return null;
  const publish = async () => {
    setBusy(true);
    try {
      const { setVisibility } = await import('../lib/sketch-actions.ts');
      await setVisibility(sketchId, true);
      // A new query string skips the cached 404 until the purge lands.
      location.href = `${location.pathname}?published=${Date.now()}`;
    } catch (e) {
      console.error('[publish]', e);
      alert('Failed to update visibility');
      setBusy(false);
    }
  };
  return (
    <div className="mt-8 p-6 rounded-2xl bg-white border border-purple-100 text-left">
      <div className="flex items-center gap-2 text-[#7C3AED] font-bold mb-2"><Lock className="w-5 h-5" />This coloring page is private</div>
      <p className="text-sm text-gray-500 mb-4">Only you can see it in your gallery. Make it public to share this page.</p>
      <Button onClick={publish} isLoading={busy} className="w-full">Make Public</Button>
    </div>
  );
}
