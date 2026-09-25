// One-time email opt-in for signed-in accounts that were never asked (everyone who signed up before the checkbox,
// and new Google accounts made from the login view). Either answer is stored, so it never shows again.
import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { Mail } from 'lucide-react';
import Button from './Button.tsx';
import { $emailChoice, $modal, $user } from '../../lib/store.ts';
import { CONSENT_TEXT, saveEmailChoice } from '../../lib/session.ts';

export default function OptInBanner() {
  const user = useStore($user);
  const choice = useStore($emailChoice);
  const modal = useStore($modal);
  const [busy, setBusy] = useState(false);
  if (!user || choice !== 'none' || modal) return null;

  const answer = (optIn: boolean) => {
    setBusy(true);
    saveEmailChoice(user.uid, { optIn }, 'banner').catch((e) => {
      console.error('[opt-in]', e);
      setBusy(false);
    });
  };

  return (
    <div role="region" aria-label="Email sign-up" className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-xl rounded-2xl border border-purple-100 bg-white p-4 shadow-xl">
      <p className="flex items-start gap-2 text-sm text-gray-700">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#7C3AED]" aria-hidden="true" />
        <span>{CONSENT_TEXT} <a href="/privacy" className="font-bold text-[#7C3AED] hover:underline">Privacy</a></span>
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => answer(false)} disabled={busy}>No thanks</Button>
        <Button size="sm" onClick={() => answer(true)} isLoading={busy}>Yes, sign me up</Button>
      </div>
    </div>
  );
}
