// Header auth slot (bundle header `a5`): guest buttons on the server and until Firebase has restored the
// session, then the avatar menu. `variant` picks the desktop or the mobile markup.
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Coins, Gift, LogOut, Settings, User } from 'lucide-react';
import Button from './Button.tsx';
import { $profile, $user, openModal } from '../../lib/store.ts';
import { signOutUser } from '../../lib/session.ts';

export default function AuthControls({ variant }: { variant: 'desktop' | 'mobile' }) {
  const user = useStore($user);
  const profile = useStore($profile);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Fix: the bundle's menu only closed through its own buttons.
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', away);
    document.addEventListener('keydown', away);
    return () => {
      document.removeEventListener('click', away);
      document.removeEventListener('keydown', away);
    };
  }, [open]);

  if (!user) {
    return variant === 'desktop' ? (
      <>
        <button type="button" onClick={() => openModal({ name: 'auth', view: 'login' })} className="text-lg font-bold text-gray-500 hover:text-[#7C3AED] transition-colors">Log In</button>
        <Button onClick={() => openModal({ name: 'auth', view: 'signup' })} className="font-bold shadow-md hover:shadow-lg group overflow-visible gap-2">
          <Gift className="w-4 h-4 text-yellow-300 animate-wiggle" />Claim Free Credits
        </Button>
      </>
    ) : (
      <button type="button" onClick={() => openModal({ name: 'auth', view: 'login' })} className="text-base font-bold text-[#7C3AED] mr-2">Log In</button>
    );
  }

  const photo = profile?.photoURL || user.photoURL;
  const name = profile?.displayName || user.displayName || user.email?.split('@')[0];
  const avatar = (size: string) => (
    <div className={`${size} rounded-full bg-purple-100 flex items-center justify-center text-[#7C3AED] overflow-hidden border-2 border-white shadow-sm`}>
      {photo ? <img src={photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className="w-6 h-6" />}
    </div>
  );
  const item = 'w-full text-left px-5 py-3 text-base font-medium flex items-center gap-3 transition-colors';

  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu"
        className="flex items-center gap-3 text-gray-700 font-bold text-lg hover:text-[#7C3AED] transition-colors focus:outline-none">
        {avatar(variant === 'desktop' ? 'w-11 h-11' : 'w-10 h-10')}
        {variant === 'desktop' ? <span>{name}</span> : <span className="sr-only">Account menu</span>}
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 z-50">
          <div className="px-5 py-3 border-b border-gray-100 mb-2">
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Signed in as</p>
            <p className="text-sm font-bold text-gray-900 truncate">{user.email}</p>
          </div>
          <a role="menuitem" href="/pricing" className={`${item} text-gray-700 hover:bg-purple-50 hover:text-[#7C3AED]`}><Coins className="w-5 h-5" />Buy Credits</a>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); openModal({ name: 'account' }); }}
            className={`${item} text-gray-700 hover:bg-purple-50 hover:text-[#7C3AED]`}><Settings className="w-5 h-5" />Profile Settings</button>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); signOutUser(); }}
            className={`${item} text-red-600 hover:bg-red-50`}><LogOut className="w-5 h-5" />Sign Out</button>
        </div>
      )}
    </div>
  );
}
