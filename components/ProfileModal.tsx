
import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, Trash2, Save, AlertTriangle, Loader2, Crown, Coins, Image as ImageIcon, Receipt, Download } from 'lucide-react';
import { Button } from './ui/Button';
import { updateUserProfile, deleteUserAccount, getUserDocument, User } from '../services/firebase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdate?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUserUpdate }) => {
  // Profile State
  const [name, setName] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [downloads, setDownloads] = useState<number>(0);
  const [isPremium, setIsPremium] = useState<boolean>(false);

  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load data from Firestore when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setIsFetching(true);
      setPhotoFile(null); // Reset file input
      getUserDocument(user.uid)
        .then((docData) => {
          if (docData) {
            const data = docData as any;
            setName(data.displayName || '');
            setPhotoName(data.photoFileName || '');
            setCredits(data.credits ?? 0);
            setDownloads(data.downloads ?? 0);
            setIsPremium(data.isPremium ?? false);
          } else {
            // Fallback to Auth data if doc doesn't exist
            setName(user.displayName || '');
            setPhotoName('');
            setCredits(0);
            setDownloads(0);
            setIsPremium(false);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch profile doc", err);
          setName(user.displayName || '');
        })
        .finally(() => {
          setIsFetching(false);
        });
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateUserProfile(user.uid, {
        displayName: name,
        photoFile: photoFile || undefined
      });

      if (onUserUpdate) {
        onUserUpdate();
      }

      setSuccess("Profile updated successfully!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError("Failed to update profile. " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteUserAccount();
      onClose();
    } catch (err: any) {
      setError("Failed to delete account. You may need to re-login first.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative h-[80vh] flex flex-col">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 border-b border-gray-100">
          <h2 className="font-display text-2xl font-bold text-[#1F2937]">Account</h2>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          )}

          {isFetching ? (
            <div className="py-12 flex justify-center text-[#7C3AED]">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">

              {/* Receipt Portal Link */}
              <a
                href="https://billing.zohosecure.ca/portal/biblesketch"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-bold border border-gray-200 mb-6"
              >
                <Receipt className="w-4 h-4" />
                Receipt Portal
              </a>

              {/* Account Stats */}
              <div className="space-y-4 mb-6">
                <div className="bg-purple-50 p-3 rounded-xl flex items-center gap-3 border border-purple-100">
                  <div className="bg-white p-2 rounded-full shadow-sm">
                    <Crown className={`w-5 h-5 ${isPremium ? 'text-yellow-500' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Status</p>
                    <p className="text-sm font-bold text-[#1F2937]">{isPremium ? 'Premium' : 'Free Plan'}</p>
                  </div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-xl flex items-center gap-3 border border-yellow-100">
                  <div className="bg-white p-2 rounded-full shadow-sm">
                    <Coins className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Image Credits</p>
                    <p className="text-sm font-bold text-[#1F2937]">{credits}</p>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl flex items-center gap-3 border border-blue-100">
                  <div className="bg-white p-2 rounded-full shadow-sm">
                    <Download className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Downloads/Prints</p>
                    <p className="text-sm font-bold text-[#1F2937]">{isPremium ? 'Unlimited' : downloads}</p>
                  </div>
                </div>
              </div>

              {/* Email (Read Only) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 z-10" />
                  <input
                    type="email"
                    disabled
                    value={user.email || ''}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Display Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 z-10" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 outline-none"
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Profile Photo</label>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 z-10" />
                    <input
                      type="text"
                      placeholder="Select an image"
                      value={photoFile ? photoFile.name : (photoName || 'No file selected')}
                      readOnly
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500"
                    />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPhotoFile(file);
                        setPhotoName(file.name);
                      }
                    }}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-[#7C3AED] hover:file:bg-purple-100 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-1">Supported formats: JPG, PNG</p>
              </div>

              <div className="pt-4 space-y-4">
                <Button
                  type="submit"
                  className="w-full h-12 gap-2"
                  isLoading={isLoading}
                >
                  <Save className="w-4 h-4" />
                  Update Profile
                </Button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isFetching || isLoading}
                  className="w-full py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
