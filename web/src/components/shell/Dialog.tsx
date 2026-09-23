// Overlay + card shared by the modals (the bundle repeats this markup in each). Adds what the bundle lacked:
// dialog semantics, Escape to close, a labelled close button.
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Dialog({ label, onClose, closeDisabled, cardClass = 'max-w-md', children }: {
  label: string;
  onClose: () => void;
  closeDisabled?: boolean;
  cardClass?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !closeDisabled && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, closeDisabled]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label={label} className={`bg-white w-full rounded-3xl shadow-2xl overflow-hidden relative ${cardClass}`}>
        <button type="button" onClick={onClose} disabled={closeDisabled} aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors z-10 disabled:opacity-50">
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
