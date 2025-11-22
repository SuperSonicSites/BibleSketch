
import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, Trash2, Save, AlertTriangle, Loader2, Crown, Coins, Image as ImageIcon, Clock, Plus, Minus, Receipt } from 'lucide-react';
import { Button } from './ui/Button';
import { updateUserProfile, deleteUserAccount, getUserDocument, getPurchaseHistory, User } from '../services/firebase';
import { CreditTransaction } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdate?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');

  // Profile State
  const [name, setName] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [isPremium, setIsPremium] = useState<boolean>(false);

  // History State
  const [history, setHistory] = useState<CreditTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
            setIsPremium(data.isPremium ?? false);
          } else {
            // Fallback to Auth data if doc doesn't exist
            setName(user.displayName || '');
            setPhotoName('');
            setCredits(0);
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

      // Load Purchase History immediately as well
      setHistoryLoading(true);
      getPurchaseHistory(user.uid).then(data => {
        setHistory(data as any);
        setHistoryLoading(false);
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

          {/* Tabs */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'profile' ? 'text-[#7C3AED] border-[#7C3AED]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
            >
              Profile Settings
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'text-[#7C3AED] border-[#7C3AED]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
            >
              Purchase History
            </button>
          </div>
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
          ) : activeTab === 'profile' ? (
            <form onSubmit={handleUpdate} className="space-y-4">

              {/* Account Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
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
                    <p className="text-xs font-bold text-gray-500 uppercase">Credits</p>
                    <p className="text-sm font-bold text-[#1F2937]">{credits} Available</p>
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
                  className="w-full py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-bold border border-gray-200"
                  onClick={(e) => e.preventDefault()}
                >
                  <Receipt className="w-4 h-4" />
                  Receipt Portal
                </button>

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
          ) : (
            <div className="space-y-2">
              {historyLoading ? (
                <div className="py-10 flex justify-center text-gray-300">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No history yet.</p>
                </div>
              ) : (
                history.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 p-1.5 rounded-full ${tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {tx.amount > 0 ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{tx.description}</p>
                        <p className="text-xs text-gray-400">{new Date(tx.timestamp).toLocaleDateString()} • {new Date(tx.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
