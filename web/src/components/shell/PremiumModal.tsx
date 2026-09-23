// The bundle's upgrade modal `KP`: shown when a free account has no downloads/prints left.
import { Crown, Sparkles } from 'lucide-react';
import Dialog from './Dialog.tsx';
import { cancelModal } from '../../lib/store.ts';

export default function PremiumModal({ remaining }: { remaining: number }) {
  const perks = ['Unlimited prints & downloads', 'Priority support', 'Early access to new features'];
  return (
    <Dialog label="Upgrade to Premium" onClose={cancelModal}>
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-8 text-center">
        <div className="inline-block p-4 bg-white/20 rounded-full mb-4"><Crown className="w-12 h-12 text-yellow-300" /></div>
        <h2 className="font-display text-3xl font-bold text-white mb-2">Upgrade to Premium</h2>
        <p className="text-purple-100">Unlock unlimited prints &amp; downloads</p>
      </div>
      <div className="p-8">
        {remaining > 0 ? (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
            <p className="text-sm text-yellow-800 text-center font-bold">
              ⚠️ You have <span className="text-yellow-900">{remaining}</span> free {remaining === 1 ? 'download' : 'downloads'} remaining
            </p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-800 text-center font-bold">❌ You've used all your free downloads</p>
          </div>
        )}
        <div className="space-y-3 mb-6">
          {perks.map((p) => (
            <div key={p} className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
              <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <span className="text-sm font-bold text-gray-700">{p}</span>
            </div>
          ))}
        </div>
        <a href="/pricing" className="w-full h-12 gap-2 inline-flex items-center justify-center rounded-full font-bold bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-lg shadow-purple-100">
          <Crown className="w-5 h-5" />View Premium Options
        </a>
        <button type="button" onClick={cancelModal} className="w-full mt-3 py-3 text-gray-500 hover:text-gray-700 font-bold text-sm transition-colors">Maybe Later</button>
      </div>
    </Dialog>
  );
}
