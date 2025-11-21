import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative p-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
           <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-2">{title}</h2>
        <p className="text-gray-500 mb-6 leading-relaxed">{message}</p>
        <Button onClick={onClose} className="w-full">
          Try Again
        </Button>
      </div>
    </div>
  );
};