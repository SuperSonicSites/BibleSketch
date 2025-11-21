
import React from 'react';
import { Globe, Lock, X } from 'lucide-react';
import { Button } from './ui/Button';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (isPublic: boolean) => void;
  isSaving?: boolean;
}

export const SaveModal: React.FC<SaveModalProps> = ({ isOpen, onClose, onConfirm, isSaving }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-2 text-center">Save to Gallery</h2>
          <p className="text-center text-gray-500 mb-8">Choose how you want to save your masterpiece.</p>

          <div className="space-y-4">
            <button 
              onClick={() => onConfirm(true)}
              disabled={isSaving}
              className="w-full p-4 border-2 border-purple-100 rounded-2xl hover:border-[#7C3AED] hover:bg-purple-50 transition-all group flex items-start gap-4 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 text-[#7C3AED] flex items-center justify-center shrink-0 group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Public Community</h3>
                <p className="text-xs text-gray-500 mt-1">Share your creation with everyone in the Bible Sketch gallery.</p>
              </div>
            </button>

            <button 
              onClick={() => onConfirm(false)}
              disabled={isSaving}
              className="w-full p-4 border-2 border-gray-100 rounded-2xl hover:border-gray-300 hover:bg-gray-50 transition-all group flex items-start gap-4 text-left"
            >
               <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0 group-hover:bg-gray-600 group-hover:text-white transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Private Collection</h3>
                <p className="text-xs text-gray-500 mt-1">Save it securely. Only you can see this in your gallery.</p>
              </div>
            </button>
          </div>
          
          {isSaving && (
            <div className="mt-6 flex flex-col items-center justify-center gap-2">
               <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
               <span className="text-sm font-bold text-[#7C3AED]">Saving to Cloud Storage...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
