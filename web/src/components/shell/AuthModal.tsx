// The bundle's auth modal `lq`: login, sign-up, password reset, and the two confirmation views.
import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, ChevronLeft, CircleAlert, CircleCheck, Lock, Mail, User } from 'lucide-react';
import Button from './Button.tsx';
import Dialog from './Dialog.tsx';
import { cancelModal, doneModal, openModal, type AuthView } from '../../lib/store.ts';
import { logInWithEmail, sendReset, signInWithGoogle, signUpWithEmail } from '../../lib/session.ts';

const INPUT = 'w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 outline-none transition-all placeholder-gray-400';
const EXISTS = 'User already exists. Sign in?';
const code = (e: unknown) => (e as { code?: string }).code;

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-bold text-gray-500 uppercase ml-1">{label}</span>
      <div className="relative">{icon}{children}</div>
    </label>
  );
}
const ICON = 'absolute left-3 top-3.5 w-5 h-5 text-gray-400 z-10';

function GoogleLogo() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function AuthModal({ view }: { view: AuthView }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);

  const go = (v: AuthView) => {
    openModal({ name: 'auth', view: v });
    setError(null);
    if (v === 'login' || v === 'signup') {
      setPassword('');
      setRepeat('');
      setAgreed(false);
    }
  };

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const google = () => run(async () => {
    if (view === 'signup' && !agreed) return setError('You must agree to the Terms of Service to create an account.');
    try {
      await signInWithGoogle();
      doneModal();
    } catch (e) {
      if (code(e) === 'auth/popup-closed-by-user' || code(e) === 'auth/cancelled-popup-request') return;
      console.error(e);
      setError(code(e) === 'auth/unauthorized-domain'
        ? 'Google sign-in is not available on this address. Please use biblesketch.app.'
        : (e as Error).message || 'Failed to sign in with Google');
    }
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      if (view === 'signup') {
        if (!agreed) return setError('You must agree to the Terms of Service to create an account.');
        if (password !== repeat) return setError('Passwords do not match');
        if (password.length < 6) return setError('Password must be at least 6 characters');
        try {
          await signUpWithEmail(email, password, name);
          go('verification_sent');
        } catch (err) {
          setError(code(err) === 'auth/email-already-in-use' ? EXISTS : (err as Error).message || 'Failed to sign up');
        }
      } else {
        try {
          await logInWithEmail(email, password);
          doneModal();
        } catch (err) {
          if (code(err) === 'auth/email-not-verified') go('verification_sent');
          else setError('Password or Email Incorrect');
        }
      }
    });
  };

  const reset = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      if (!email) return setError('Please enter your email address');
      try {
        await sendReset(email);
        go('reset_sent');
      } catch (err) {
        setError((err as Error).message || 'Failed to send reset email. Please check the address.');
      }
    });
  };

  const errorBox = error && (
    <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-sm" role="alert">
      <CircleAlert className="w-5 h-5 shrink-0" />
      <div className="flex-1">
        <p className="font-bold">{error}</p>
        {error === EXISTS && (
          <button type="button" onClick={() => go('login')} className="text-red-700 underline mt-1 hover:text-red-800">Go to Sign In</button>
        )}
      </div>
    </div>
  );

  const title = { login: 'Log in', signup: 'Sign up', forgot_password: 'Reset password', reset_sent: 'Check your inbox', verification_sent: 'Verify your email' }[view];

  return (
    <Dialog label={title} onClose={cancelModal} cardClass="max-w-md max-h-[90vh] overflow-y-auto">
      <div className="p-8">
        {view === 'verification_sent' && (
          <div className="text-center py-4">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6"><Mail className="w-10 h-10 text-green-600" /></div>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">Verify your email</h2>
            <p className="text-gray-500 mb-4 leading-relaxed">
              We have sent you a verification email to <br /><span className="font-bold text-gray-800">{email}</span>.<br />Verify it and log in.
            </p>
            <p className="text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-8 text-sm">
              <strong>Can't find it?</strong> Check your spam or junk folder.
            </p>
            <Button onClick={() => go('login')} className="w-full h-12 text-lg gap-2">Go to Login <ArrowRight className="w-4 h-4" /></Button>
          </div>
        )}

        {view === 'reset_sent' && (
          <div className="text-center py-4">
            <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6"><CircleCheck className="w-10 h-10 text-[#7C3AED]" /></div>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">Check your inbox</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              We have sent password reset instructions to <br /><span className="font-bold text-gray-800">{email}</span>.
            </p>
            <Button onClick={() => go('login')} className="w-full h-12 text-lg gap-2">Return to Login <ArrowRight className="w-4 h-4" /></Button>
          </div>
        )}

        {view === 'forgot_password' && (
          <div>
            <button type="button" onClick={() => go('login')} className="flex items-center text-gray-500 hover:text-gray-800 mb-6 text-sm font-bold group">
              <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />Back
            </button>
            <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">Reset Password</h2>
            <p className="text-gray-500 mb-8">Enter your email address and we'll send you a link to reset your password.</p>
            {errorBox}
            <form onSubmit={reset} className="space-y-6">
              <Field label="Email Address" icon={<Mail className={ICON} />}>
                <input type="email" required autoComplete="email" placeholder="sarah@sundayschool.com" className={INPUT} value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Button type="submit" className="w-full h-12 text-lg shadow-lg shadow-purple-200" isLoading={busy}>Send Reset Link</Button>
            </form>
          </div>
        )}

        {(view === 'login' || view === 'signup') && (
          <div>
            <h2 className="font-display text-3xl font-bold text-[#1F2937] text-center mb-2">{view === 'login' ? 'Welcome Back' : 'Join Bible Sketch'}</h2>
            <p className="text-center text-gray-500 mb-4">{view === 'login' ? 'Log in to access your gallery.' : 'Create an account to save your artwork.'}</p>
            {view === 'signup' && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-3 mb-6 text-center">
                <p className="text-amber-800 font-bold flex items-center justify-center gap-2"><span className="text-xl">🎁</span> Start with 5 free credits</p>
                <p className="text-xs text-amber-600 mt-1">No credit card required</p>
              </div>
            )}
            {errorBox}
            <div className="space-y-4">
              <button type="button" onClick={google} disabled={busy}
                className="w-full h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-3 text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <GoogleLogo />{view === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
              </button>
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                <span className="relative bg-white px-4 text-xs text-gray-400 uppercase font-bold tracking-wider">Or continue with email</span>
              </div>
              <form onSubmit={submit} className="space-y-4">
                {view === 'signup' && (
                  <Field label="Full Name" icon={<User className={ICON} />}>
                    <input type="text" required autoComplete="name" maxLength={100} placeholder="David Goliath" className={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                )}
                <Field label="Email Address" icon={<Mail className={ICON} />}>
                  <input type="email" required autoComplete="email" placeholder="sarah@sundayschool.com" className={INPUT} value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label="Password" icon={<Lock className={ICON} />}>
                  <input type="password" required autoComplete={view === 'login' ? 'current-password' : 'new-password'} placeholder="••••••••" className={INPUT} value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
                {view === 'login' && (
                  <div className="flex justify-end">
                    <button type="button" onClick={() => go('forgot_password')} className="text-sm font-bold text-[#7C3AED] hover:text-[#6D28D9] hover:underline">Forgot Password?</button>
                  </div>
                )}
                {view === 'signup' && (
                  <>
                    <Field label="Repeat Password" icon={<Lock className={ICON} />}>
                      <input type="password" required autoComplete="new-password" placeholder="••••••••" className={INPUT} value={repeat} onChange={(e) => setRepeat(e.target.value)} />
                    </Field>
                    <div className="flex items-start gap-2 pt-2">
                      <input type="checkbox" id="terms-agree" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer" />
                      <label htmlFor="terms-agree" className="text-sm text-gray-500">
                        I agree to the <a href="/terms" target="_blank" className="font-bold text-[#7C3AED] hover:underline">Terms of Service</a>.
                        {' '}I confirm I am at least 18 years old or have parental consent.
                      </label>
                    </div>
                  </>
                )}
                <Button type="submit" className="w-full mt-2 h-12 text-lg shadow-lg shadow-purple-200" isLoading={busy}>
                  {view === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>
            </div>
            <div className="mt-6 text-center">
              <p className="text-gray-500 text-sm">
                {view === 'login' ? "Don't have an account?" : 'Already have an account?'}
                <button type="button" onClick={() => go(view === 'login' ? 'signup' : 'login')} className="ml-2 font-bold text-[#7C3AED] hover:underline">
                  {view === 'login' ? 'Sign Up' : 'Log In'}
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
