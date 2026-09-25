// The payment form on /checkout/<plan>: once someone is signed in, the createCheckout function opens a Zoho Billing
// hosted page for this plan (USD, their email and uid already set) and it's shown here in an iframe, so the buyer
// never leaves biblesketch.app. Email offers pass their token (?t=) and the account it was sent to (?u=).
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $authReady, $profile, $user, requireAuth } from '../lib/store.ts';

const MESSAGES: Record<string, string> = {
  OFFER_ENDED: 'This offer has ended, or it was sent to a different account. If you have more than one account, sign in with the one the email went to.',
  ALREADY_PREMIUM: 'You’re already a Premium member, so there’s nothing to buy here.',
  EMAIL_NOT_VERIFIED: 'Please verify your email address first: open the link we emailed you, then come back to this page.',
};
const FALLBACK = 'Checkout isn’t available right now. Please try again in a minute, or write to hello@biblesketch.app.';

export default function Checkout({ plan, offer, offerUid }: { plan: string; offer?: string; offerUid?: string }) {
  const ready = useStore($authReady);
  const user = useStore($user);
  const profile = useStore($profile);
  const started = useRef(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    const u = $user.get();
    if (!u) return;
    setError(null);
    if (offerUid && u.uid !== offerUid) return setError(MESSAGES.OFFER_ENDED);
    setBusy(true);
    try {
      const { callFunction } = await import('../lib/generate.ts');
      const r = await callFunction<{ url: string }>('createCheckout', { plan, ...(offer && { offer }) });
      setUrl(r.url);
    } catch (e) {
      setError(MESSAGES[(e as Error).message] ?? FALLBACK);
    } finally {
      setBusy(false);
    }
  };
  // Once the session is restored (and a signed-in user's profile has loaded, or requireAuth would open the sign-in
  // dialog), open the form, or the sign-in dialog first.
  useEffect(() => {
    if (!ready || started.current || (user && !profile)) return;
    started.current = true;
    requireAuth(start, offer ? 'login' : 'signup');
  }, [ready, user, profile]);

  if (url) {
    return <iframe src={url} title="Secure payment form" className="w-full h-[980px] md:h-[900px] border-0 rounded-2xl bg-white" allow="payment" />;
  }
  return (
    <div className="min-h-[420px] flex flex-col items-center justify-center text-center gap-4 p-6" role="status" aria-live="polite">
      {error ? (
        <>
          <p className="text-gray-700 max-w-sm">{error}</p>
          {!Object.values(MESSAGES).includes(error) && <button type="button" onClick={start} className="font-bold text-[#7C3AED] underline">Try again</button>}
        </>
      ) : ready && !user ? (
        <>
          <p className="text-gray-700">Sign in to continue to payment.</p>
          <button type="button" onClick={() => requireAuth(start, offer ? 'login' : 'signup')}
            className="px-6 py-3 rounded-full bg-[#7C3AED] text-white font-bold shadow-md hover:bg-[#6D28D9]">Sign in</button>
        </>
      ) : (
        <>
          <div className="w-10 h-10 border-4 border-purple-200 border-t-[#7C3AED] rounded-full animate-spin" />
          <p className="font-bold text-gray-600">{busy ? 'Opening the secure payment form...' : 'Loading...'}</p>
        </>
      )}
    </div>
  );
}
