// The bundle's profile-completion modal `uq`: shown once to new email sign-ups without a photo.
import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { ArrowRight, Image, Sparkles } from 'lucide-react';
import Button from './Button.tsx';
import Dialog from './Dialog.tsx';
import { $profile, $user, doneModal } from '../../lib/store.ts';
import { markProfileComplete, updateAccount } from '../../lib/session.ts';

export default function CompletionModal() {
  const user = useStore($user);
  const profile = useStore($profile);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = (profile?.displayName || user?.displayName || '').split(' ')[0];

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (file) await updateAccount({ photoFile: file });
      await markProfileComplete();
      doneModal();
    } catch (e) {
      console.error('[completion]', e);
      setError('Failed to save profile photo. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    setBusy(true);
    await markProfileComplete().catch((e) => console.error('[completion] skip', e));
    setBusy(false);
    doneModal();
  };

  return (
    <Dialog label="Add a profile photo" onClose={skip} closeDisabled={busy}>
      <div className="p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-[#7C3AED]" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-2">Welcome{first ? `, ${first}` : ''}! 🎉</h2>
          <p className="text-gray-500">Add a profile photo to personalize your account</p>
        </div>
        {error && <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center" role="alert">{error}</div>}
        <div className="flex justify-center mb-8">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-purple-50 border-[3px] border-dashed border-purple-200 flex items-center justify-center cursor-pointer hover:border-[#7C3AED] transition-all overflow-hidden shadow-lg">
              <input type="file" accept="image/*" aria-label="Choose a profile photo" disabled={busy}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFile(f);
                    setPreview(URL.createObjectURL(f));
                  }
                }} />
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Image className="w-10 h-10 text-purple-300 group-hover:text-[#7C3AED] mx-auto transition-colors" />
                  <p className="text-xs text-purple-400 mt-2 font-medium">Click to upload</p>
                </div>
              )}
            </div>
            {preview && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-md">Looking good!</div>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <Button onClick={save} className="w-full h-12 text-lg gap-2 shadow-lg shadow-purple-200" isLoading={busy} disabled={!file}>
            Save Photo <ArrowRight className="w-4 h-4" />
          </Button>
          <button type="button" onClick={skip} disabled={busy}
            className="w-full py-3 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors text-sm font-bold disabled:opacity-50">
            Skip for now
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-6">You can always add or change your photo later in your profile settings.</p>
      </div>
    </Dialog>
  );
}
