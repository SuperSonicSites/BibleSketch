// "Owner Controls" on the coloring page (bundle `_O`): tags, visibility, delete. Renders nothing for anyone
// but the sketch's owner. Changes reach the cached page through onSketchWritten's purge (once deployed).
import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { Globe, Lock, Tag, Trash2, TriangleAlert } from 'lucide-react';
import Button from './shell/Button.tsx';
import TagPicker from './TagPicker.tsx';
import { $user } from '../lib/store.ts';
import { TAG_LABELS, type Sketch } from '../lib/sketch.ts';

const actions = () => import('../lib/sketch-actions.ts');

export default function OwnerControls({ sketch, onChange, onDelete }: {
  sketch: Sketch;
  onChange?: (patch: Partial<Sketch>) => void; // gallery dialog / result view keep their copy in sync
  onDelete?: () => void; // default: back to the gallery
}) {
  const user = useStore($user);
  const [isPublic, setIsPublic] = useState(sketch.isPublic !== false);
  const [tags, setTagList] = useState<string[]>(sketch.tags ?? []);
  const [draft, setDraft] = useState<string[]>(sketch.tags ?? []);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<'tags' | 'visibility' | 'delete' | null>(null);
  const [confirming, setConfirming] = useState(false);
  if (!user || user.uid !== sketch.userId) return null;

  const saveTags = async () => {
    setBusy('tags');
    try {
      await (await actions()).setTags(sketch.id, draft);
      setTagList(draft);
      onChange?.({ tags: draft });
      setEditing(false);
    } catch (e) {
      console.error('[tags]', e);
      alert('Failed to save tags. Please try again.');
    } finally {
      setBusy(null);
    }
  };
  const toggleVisibility = async () => {
    setBusy('visibility');
    try {
      await (await actions()).setVisibility(sketch.id, !isPublic);
      setIsPublic(!isPublic);
      onChange?.({ isPublic: !isPublic });
    } catch (e) {
      console.error('[visibility]', e);
      alert('Failed to update visibility');
    } finally {
      setBusy(null);
    }
  };
  const remove = async () => {
    setBusy('delete');
    try {
      await (await actions()).deleteSketch(sketch);
      if (onDelete) onDelete();
      else location.href = '/gallery';
    } catch (e) {
      console.error('[delete]', e);
      alert('Failed to delete sketch. Please try again.');
      setBusy(null);
      setConfirming(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Owner Controls</p>
      <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[#7C3AED] font-bold text-sm"><Tag className="w-4 h-4" /><span>Tags</span></div>
          {!editing && (
            <button type="button" onClick={() => { setDraft(tags); setEditing(true); }} className="text-xs font-bold text-gray-500 hover:text-[#7C3AED] underline underline-offset-2">
              {tags.length ? 'Edit' : 'Add Tags'}
            </button>
          )}
        </div>
        {editing ? (
          <div className="space-y-3">
            <TagPicker selected={draft} onChange={setDraft} />
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={saveTags} isLoading={busy === 'tags'} className="flex-1 text-xs py-1 h-8">Save Tags</Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="text-xs py-1 h-8">Cancel</Button>
            </div>
          </div>
        ) : tags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => <span key={t} className="inline-flex items-center rounded-full font-medium px-2 py-0.5 text-xs bg-purple-100 text-[#7C3AED]">{TAG_LABELS[t] ?? t}</span>)}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No tags yet. Add tags to help others discover this sketch.</p>
        )}
      </div>
      <div className="space-y-3">
        <button type="button" onClick={toggleVisibility} disabled={busy !== null}
          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isPublic ? 'bg-green-50 border-green-100 text-green-700' : 'bg-white border-gray-200 text-gray-600'}`}>
          <div className="flex items-center gap-3">
            {isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            <div className="text-left">
              <p className="font-bold text-sm">{isPublic ? 'Publicly Visible' : 'Private'}</p>
              <p className="text-xs opacity-80">{isPublic ? 'Anyone can see this' : 'Only you can see this'}</p>
            </div>
          </div>
          <div className="text-xs font-bold underline">{busy === 'visibility' ? '...' : 'Change'}</div>
        </button>
        {confirming ? (
          <div className="p-4 rounded-xl border border-red-100 bg-red-50" role="alert">
            <div className="flex items-center gap-2 text-red-600 mb-3"><TriangleAlert className="w-5 h-5" /><p className="text-xs font-bold">Are you sure? Cannot undo.</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={remove} disabled={busy === 'delete'} className="flex-1 bg-red-500 text-white py-2 rounded-lg text-xs font-bold hover:bg-red-600 transition-colors">
                {busy === 'delete' ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="flex-1 bg-white text-gray-600 border border-gray-200 py-2 rounded-lg text-xs font-bold hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} disabled={busy !== null}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-100 bg-white text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-5 h-5" /><span className="font-bold text-sm">Delete Sketch</span>
          </button>
        )}
      </div>
    </div>
  );
}
