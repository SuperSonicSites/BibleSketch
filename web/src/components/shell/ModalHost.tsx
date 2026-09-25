// One island per page that renders whichever modal the store asks for, and starts the Firebase session.
// Includes the bundle's error modal `dq`.
import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { TriangleAlert } from 'lucide-react';
import AuthModal from './AuthModal.tsx';
import AccountModal from './AccountModal.tsx';
import CompletionModal from './CompletionModal.tsx';
import PremiumModal from './PremiumModal.tsx';
import OptInBanner from './OptInBanner.tsx';
import Button, { buttonClass } from './Button.tsx';
import Dialog from './Dialog.tsx';
import { $modal, cancelModal } from '../../lib/store.ts';
import { startSession } from '../../lib/session.ts';

export default function ModalHost() {
  const modal = useStore($modal);
  useEffect(startSession, []);
  if (!modal) return <OptInBanner />;
  if (modal.name === 'auth') return <AuthModal view={modal.view} />;
  if (modal.name === 'account') return <AccountModal />;
  if (modal.name === 'completion') return <CompletionModal />;
  if (modal.name === 'premium') return <PremiumModal remaining={modal.remaining} />;
  return (
    <Dialog label={modal.title} onClose={cancelModal} cardClass="max-w-sm p-6 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><TriangleAlert className="w-8 h-8 text-red-500" /></div>
      <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-2">{modal.title}</h2>
      <p className="text-gray-500 mb-6 leading-relaxed">{modal.message}</p>
      {modal.link && <a href={modal.link.href} className={buttonClass('primary', 'md', 'w-full mb-3')}>{modal.link.label}</a>}
      <Button onClick={cancelModal} variant={modal.link ? 'ghost' : 'primary'} className="w-full">{modal.link ? 'Close' : 'Try Again'}</Button>
    </Dialog>
  );
}
