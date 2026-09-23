// A sketch seen by its owner: the result view after generating (bundle `qP`) and the My Gallery dialog (`gS`).
// Every generation is already saved as a private sketch (owner decision 2026-09-23), so there is no Save step:
// the owner publishes, tags, prints, edits with AI or deletes. Edits that cost a credit (Make changes, Remove
// Color) produce a new private sketch, which `onSwitch` shows; Add Ref is free and changes this one in place.
import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { ExternalLink, Palette, Type, Wand2 } from 'lucide-react';
import Button from './shell/Button.tsx';
import SketchActions from './SketchActions.tsx';
import OwnerControls from './OwnerControls.tsx';
import { $profile } from '../lib/store.ts';
import { ageDisplay, bookDisplay, canonicalPath, type Sketch } from '../lib/sketch.ts';

const gen = () => import('../lib/generate.ts');

export default function SketchOwnerView({ sketch, onSwitch, onChange, onDelete, inGallery }: {
  sketch: Sketch;
  inGallery?: boolean; // opened from My Gallery: no "saved in My Gallery" note
  onSwitch: (next: Sketch) => void; // a paid edit made a new sketch
  onChange: (patch: Partial<Sketch>) => void;
  onDelete: () => void;
}) {
  const profile = useStore($profile);
  const [busy, setBusy] = useState<'addRef' | 'removeColor' | 'refine' | null>(null);
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [sharing, setSharing] = useState(false);
  const share = async (isPublic: boolean) => {
    setSharing(true);
    try {
      await (await import('../lib/sketch-actions.ts')).setVisibility(sketch.id, isPublic);
      onChange({ isPublic });
    } catch (e) {
      console.error('[visibility]', e);
      alert('Failed to update visibility');
    } finally {
      setSharing(false);
    }
  };
  const p = sketch.promptData ?? {};
  const ref = `${bookDisplay(p.book ?? '')} ${p.chapter}:${p.start_verse}${p.end_verse && p.end_verse > (p.start_verse ?? 0) ? `-${p.end_verse}` : ''}`;
  const subtitle = sketch.type === 'verse' ? p.font_style || 'Verse Art' : [ageDisplay(p.age_group), p.art_style].filter(Boolean).join(' • ');

  const paidEdit = async (op: 'removeColor' | 'refine') => {
    const m = await gen();
    if ((profile?.credits ?? 0) < 1) return m.showOutOfCredits('edit a coloring page');
    setBusy(op);
    try {
      const r = await m.editSketch(sketch.id, op, op === 'refine' ? instruction.trim() : undefined);
      if (r.status === 'done') {
        const next = await m.loadSketch(r.sketchId);
        if (next) onSwitch(next);
        setEditing(false);
        setInstruction('');
      } else if (r.status === 'refunded') m.showRefund(r.error);
    } catch (e) {
      m.showGenerationError(e, 'edit a coloring page');
    } finally {
      setBusy(null);
    }
  };
  const addRef = async () => {
    const m = await gen();
    setBusy('addRef');
    try {
      const r = await m.editSketch(sketch.id, 'addRef');
      if (r.status === 'done') {
        const next = await m.loadSketch(sketch.id);
        if (next) onChange({ imageUrl: next.imageUrl, storagePath: next.storagePath, thumbnailPath: next.thumbnailPath, refAdded: true });
      }
    } catch (e) {
      m.showGenerationError(e, 'change this page');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-7">
        <div className="relative bg-white rounded-3xl shadow-xl border border-gray-100 p-4">
          <img src={sketch.imageUrl} alt={`${ref} coloring page`} className="w-full aspect-[3/4] max-h-[80vh] object-contain rounded-2xl bg-white" />
          {busy && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center gap-3" role="status">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-[#7C3AED] rounded-full animate-spin" />
              <p className="font-bold text-[#7C3AED]">{busy === 'addRef' ? 'Adding the reference...' : 'Refining creation... (about a minute)'}</p>
            </div>
          )}
        </div>
      </div>
      <div className="lg:col-span-5 space-y-6">
        <div>
          <h2 className="font-display text-3xl font-bold text-gray-800">{ref}</h2>
          <p className="text-gray-500 font-medium mt-1">{subtitle}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {sketch.isPublic ? (
              <p className="text-sm font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-3 py-1">✓ Shared with the community</p>
            ) : (
              <>
                <p className="text-sm text-gray-500">{inGallery ? 'Private: only you can see it.' : <>Saved privately in <a href="/gallery#my" className="underline">My Gallery</a>.</>}</p>
                <Button size="sm" variant="secondary" onClick={() => share(true)} isLoading={sharing}>Share with the community</Button>
              </>
            )}
          </div>
        </div>

        <SketchActions sketch={sketch} />

        <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-[#7C3AED] flex items-center gap-2"><Wand2 className="w-4 h-4" />Edit with AI</p>
            <span className="text-xs font-bold bg-white text-[#7C3AED] px-2 py-1 rounded-full border border-purple-100">1 Credit each</span>
          </div>
          {editing ? (
            <div className="space-y-2">
              <label htmlFor={`refine-${sketch.id}`} className="sr-only">Describe the change</label>
              <textarea id={`refine-${sketch.id}`} autoFocus value={instruction} maxLength={500} rows={3} onChange={(e) => setInstruction(e.target.value)}
                placeholder={'e.g. "Add a dove in the sky" or "Make the lines thicker"'}
                className="w-full rounded-xl border border-purple-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => paidEdit('refine')} isLoading={busy === 'refine'} disabled={!instruction.trim() || busy !== null}>Apply Change</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy !== null}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setEditing(true)} disabled={busy !== null}
              className="w-full text-left text-sm font-medium text-gray-600 bg-white rounded-xl border border-purple-100 px-4 py-3 hover:border-purple-300">
              Make changes to this image...
            </button>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 gap-2 bg-white" onClick={() => paidEdit('removeColor')} disabled={busy !== null} isLoading={busy === 'removeColor'}>
              <Palette className="w-4 h-4" />Remove Color
            </Button>
            {sketch.type !== 'verse' && !sketch.refAdded && (
              <Button size="sm" variant="outline" className="flex-1 gap-2 bg-white" onClick={addRef} disabled={busy !== null} isLoading={busy === 'addRef'} title="Print the Bible reference at the bottom (free)">
                <Type className="w-4 h-4" />Add Ref (free)
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500">Edits are saved as a new page in My Gallery; this one stays as it is. If an edit fails, the credit is refunded. You have {profile?.credits ?? 0} credit{profile?.credits === 1 ? '' : 's'}.</p>
        </div>

        <OwnerControls key={`${sketch.id}-${sketch.isPublic}`} sketch={sketch} onChange={onChange} onDelete={onDelete} />

        {sketch.isPublic && (
          <a href={canonicalPath(sketch)} className="inline-flex items-center gap-2 text-sm font-bold text-[#7C3AED] hover:underline">
            <ExternalLink className="w-4 h-4" />Open the public page
          </a>
        )}
      </div>
    </div>
  );
}
