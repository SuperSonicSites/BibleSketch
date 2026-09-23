// The bundle's Account modal `cq`. Reads the live profile store instead of a one-shot get, and shows
// downloadsRemaining (the bundle read a `downloads` field that doesn't exist, so it always showed 0).
import { useState, type FormEvent, type ReactNode } from 'react';
import { useStore } from '@nanostores/react';
import { Coins, Crown, Download, Image, LoaderCircle, Mail, Receipt, Save, Trash2, TriangleAlert, User } from 'lucide-react';
import Button from './Button.tsx';
import Dialog from './Dialog.tsx';
import { $profile, $user, cancelModal } from '../../lib/store.ts';
import { deleteAccount, updateAccount } from '../../lib/session.ts';

function Stat({ icon, tone, label, value }: { icon: ReactNode; tone: string; label: string; value: ReactNode }) {
  return (
    <div className={`p-3 rounded-xl flex items-center gap-3 border ${tone}`}>
      <div className="bg-white p-2 rounded-full shadow-sm">{icon}</div>
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase">{label}</p>
        <p className="text-sm font-bold text-[#1F2937]">{value}</p>
      </div>
    </div>
  );
}

export default function AccountModal() {
  const user = useStore($user);
  const profile = useStore($profile);
  const [name, setName] = useState(profile?.displayName ?? user?.displayName ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  if (!user) return null;
  const premium = Boolean(profile?.isPremium);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await updateAccount({ displayName: name, photoFile: file ?? undefined });
      setDone('Profile updated successfully!');
      setTimeout(cancelModal, 1500);
    } catch (err) {
      setError('Failed to update profile. ' + (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    setBusy(true);
    try {
      await deleteAccount();
      cancelModal();
    } catch {
      setError('Failed to delete account. You may need to re-login first.');
      setBusy(false);
    }
  };

  return (
    <Dialog label="Account" onClose={cancelModal} cardClass="max-w-md h-[80vh] flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <h2 className="font-display text-2xl font-bold text-[#1F2937]">Account</h2>
      </div>
      <div className="p-6 overflow-y-auto flex-1">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2" role="alert">
            <TriangleAlert className="w-4 h-4" />{error}
          </div>
        )}
        {done && <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg text-green-600 text-sm">{done}</div>}
        {!profile ? (
          <div className="py-12 flex justify-center text-[#7C3AED]"><LoaderCircle className="w-8 h-8 animate-spin" /></div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <a href="https://billing.zohosecure.ca/portal/biblesketch" target="_blank" rel="noopener noreferrer"
              className="w-full py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-bold border border-gray-200 mb-6">
              <Receipt className="w-4 h-4" />Receipt Portal
            </a>
            <div className="space-y-4 mb-6">
              <Stat tone="bg-purple-50 border-purple-100" label="Status" value={premium ? 'Premium' : 'Free Plan'}
                icon={<Crown className={`w-5 h-5 ${premium ? 'text-yellow-500' : 'text-gray-400'}`} />} />
              <Stat tone="bg-yellow-50 border-yellow-100" label="Image Credits" value={profile.credits ?? 0}
                icon={<Coins className="w-5 h-5 text-yellow-500" />} />
              <Stat tone="bg-blue-50 border-blue-100" label="Downloads/Prints" value={premium ? 'Unlimited' : profile.downloadsRemaining ?? 0}
                icon={<Download className="w-5 h-5 text-blue-500" />} />
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-gray-500 uppercase ml-1">Email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 z-10" />
                <input type="email" disabled value={user.email ?? ''} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed" />
              </div>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-gray-500 uppercase ml-1">Display Name</span>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 z-10" />
                <input type="text" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 outline-none" />
              </div>
            </label>
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-500 uppercase ml-1">Profile Photo</span>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Image className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 z-10" />
                  <input type="text" readOnly aria-label="Selected photo" value={file?.name || profile.photoFileName || 'No file selected'}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500" />
                </div>
                <input type="file" accept="image/*" aria-label="Choose a profile photo" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-[#7C3AED] hover:file:bg-purple-100 cursor-pointer" />
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-1">Supported formats: JPG, PNG</p>
            </div>
            <div className="pt-4 space-y-4">
              <Button type="submit" className="w-full h-12 gap-2" isLoading={busy}><Save className="w-4 h-4" />Update Profile</Button>
              <button type="button" onClick={remove} disabled={busy}
                className="w-full py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50">
                <Trash2 className="w-4 h-4" />Delete Account
              </button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
