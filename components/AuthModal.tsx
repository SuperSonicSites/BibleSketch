
import React, { useState } from 'react';
import { X, Mail, Lock, User, Image as ImageIcon, AlertCircle, CheckCircle2, ArrowRight, KeyRound, ChevronLeft } from 'lucide-react';
import { Button } from './ui/Button';
import { registerUser, loginUser, loginWithGoogle, sendPasswordReset } from '../services/firebase';
import { trackPinterestEvent } from '../utils/pinterestTracking';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'signup';
}

type ViewState = 'login' | 'signup' | 'verification_sent' | 'forgot_password' | 'reset_sent';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialView = 'login' }) => {
  const [view, setView] = useState<ViewState>(initialView);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    if (view === 'signup' && !agreedToTerms) {
        setError("You must agree to the Terms of Service to create an account.");
        return;
    }
    setIsLoading(true);
    try {
      await loginWithGoogle();
      // Track Pinterest signup event for Google signups only (not logins)
      if (view === 'signup') {
        trackPinterestEvent('signup');
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        setError("Domain not authorized. Please go to Firebase Console > Authentication > Settings > Authorized Domains and add this website's URL.");
      } else {
        setError(err.message || "Failed to sign in with Google");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (view === 'signup') {
        // Validation
        if (!agreedToTerms) {
           throw new Error("You must agree to the Terms of Service to create an account.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }

        try {
          await registerUser(email, password, name, photo);
          setView('verification_sent');
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            setError("User already exists. Sign in?");
          } else {
            setError(err.message || "Failed to sign up");
          }
        }

      } else if (view === 'login') {
        // Login
        try {
          await loginUser(email, password);
          onClose();
        } catch (err: any) {
          if (err.code === 'auth/email-not-verified') {
            setView('verification_sent');
          } else {
            setError("Password or Email Incorrect");
          }
        }
      }
    } catch (err: any) {
      if (!error) setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!email) {
      setError("Please enter your email address");
      setIsLoading(false);
      return;
    }

    try {
      await sendPasswordReset(email);
      setView('reset_sent');
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please check the address.");
    } finally {
      setIsLoading(false);
    }
  };

  const switchView = (newView: ViewState) => {
    setView(newView);
    setError(null);
    if (newView === 'login' || newView === 'signup') {
        setPassword('');
        setConfirmPassword('');
        setAgreedToTerms(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          
          {/* --- Verification Sent View --- */}
          {view === 'verification_sent' && (
             <div className="text-center py-4 animate-in slide-in-from-right duration-300">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                   <Mail className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">
                  Verify your email
                </h2>
                <p className="text-gray-500 mb-4 leading-relaxed">
                  We have sent you a verification email to <br/>
                  <span className="font-bold text-gray-800">{email}</span>.<br/>
                  Verify it and log in.
                </p>
                <p className="text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-8 text-sm">
                  <strong>Can't find it?</strong> Check your spam or junk folder.
                </p>
                <Button 
                  onClick={() => switchView('login')}
                  className="w-full h-12 text-lg gap-2"
                >
                  Go to Login <ArrowRight className="w-4 h-4" />
                </Button>
             </div>
          )}

          {/* --- Reset Sent View --- */}
          {view === 'reset_sent' && (
             <div className="text-center py-4 animate-in slide-in-from-right duration-300">
                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
                   <CheckCircle2 className="w-10 h-10 text-[#7C3AED]" />
                </div>
                <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">
                  Check your inbox
                </h2>
                <p className="text-gray-500 mb-8 leading-relaxed">
                  We have sent password reset instructions to <br/>
                  <span className="font-bold text-gray-800">{email}</span>.
                </p>
                <Button 
                  onClick={() => switchView('login')}
                  className="w-full h-12 text-lg gap-2"
                >
                  Return to Login <ArrowRight className="w-4 h-4" />
                </Button>
             </div>
          )}

          {/* --- Forgot Password View --- */}
          {view === 'forgot_password' && (
            <div className="animate-in slide-in-from-right duration-300">
                <button 
                  onClick={() => switchView('login')}
                  className="flex items-center text-gray-500 hover:text-gray-800 mb-6 text-sm font-bold group"
                >
                   <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                   Back
                </button>

                <h2 className="font-display text-2xl font-bold text-[#1F2937] mb-4">
                  Reset Password
                </h2>
                <p className="text-gray-500 mb-8">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                {error && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="font-bold">{error}</p>
                    </div>
                )}

                <form onSubmit={handlePasswordReset} className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 z-10" />
                            <input 
                            type="email" 
                            required
                            placeholder="sarah@sundayschool.com"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 outline-none transition-all placeholder-gray-400"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <Button 
                        type="submit" 
                        className="w-full h-12 text-lg shadow-lg shadow-purple-200" 
                        isLoading={isLoading}
                    >
                        Send Reset Link
                    </Button>
                </form>
            </div>
          )}

          {/* --- Login / Signup Forms --- */}
          {(view === 'login' || view === 'signup') && (
            <div className="animate-in fade-in duration-300">
              <h2 className="font-display text-3xl font-bold text-[#1F2937] text-center mb-2">
                {view === 'login' ? 'Welcome Back' : 'Join Bible Sketch'}
              </h2>
              <p className="text-center text-gray-500 mb-4">
                {view === 'login' ? 'Log in to access your gallery.' : 'Create an account to save your artwork.'}
              </p>
              
              {/* Free Credits Banner - Only on Signup */}
              {view === 'signup' && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-3 mb-6 text-center">
                  <p className="text-amber-800 font-bold flex items-center justify-center gap-2">
                    <span className="text-xl">🎁</span> Start with 5 free credits
                  </p>
                  <p className="text-xs text-amber-600 mt-1">No credit card required</p>
                </div>
              )}

              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold">{error}</p>
                    {error === "User already exists. Sign in?" && (
                      <button 
                        onClick={() => switchView('login')}
                        className="text-red-700 underline mt-1 hover:text-red-800"
                      >
                        Go to Sign In
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                  {/* Google Button */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-3 text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    {view === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
                  </button>

                  <div className="relative flex items-center justify-center">
                     <div className="absolute inset-0 flex items-center">
                       <div className="w-full border-t border-gray-100"></div>
                     </div>
                     <span className="relative bg-white px-4 text-xs text-gray-400 uppercase font-bold tracking-wider">Or continue with email</span>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {view === 'signup' && (
                      <>
                        {/* Profile Photo UI */}
                        <div className="flex justify-center mb-2">
                          <div className="w-20 h-20 rounded-full bg-purple-50 border-2 border-dashed border-purple-200 flex items-center justify-center cursor-pointer hover:border-[#7C3AED] transition-colors relative group overflow-hidden bg-white">
                            <input 
                              type="file" 
                              accept="image/*"
                              className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                            />
                            {photo ? (
                              <img src={URL.createObjectURL(photo)} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-purple-300 group-hover:text-[#7C3AED]" />
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase ml-1">Full Name</label>
                          <div className="relative">
                            <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 z-10" />
                            <input 
                              type="text" 
                              required
                              placeholder="David Goliath"
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 outline-none transition-all placeholder-gray-400"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 z-10" />
                        <input 
                          type="email" 
                          required
                          placeholder="sarah@sundayschool.com"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 outline-none transition-all placeholder-gray-400"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 z-10" />
                        <input 
                          type="password" 
                          required
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 outline-none transition-all placeholder-gray-400"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    {view === 'login' && (
                        <div className="flex justify-end">
                            <button 
                                type="button"
                                onClick={() => switchView('forgot_password')}
                                className="text-sm font-bold text-[#7C3AED] hover:text-[#6D28D9] hover:underline"
                            >
                                Forgot Password?
                            </button>
                        </div>
                    )}

                    {view === 'signup' && (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase ml-1">Repeat Password</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 z-10" />
                            <input 
                              type="password" 
                              required
                              placeholder="••••••••"
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 outline-none transition-all placeholder-gray-400"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Terms Checkbox */}
                        <div className="flex items-start gap-2 pt-2">
                            <input 
                                type="checkbox" 
                                id="terms-agree"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="mt-1 w-4 h-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer"
                            />
                            <label htmlFor="terms-agree" className="text-sm text-gray-500">
                                I agree to the <span className="font-bold text-[#7C3AED]">Terms of Service</span>. I confirm I am at least 18 years old or have parental consent.
                            </label>
                        </div>
                      </>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full mt-2 h-12 text-lg shadow-lg shadow-purple-200" 
                      isLoading={isLoading}
                    >
                      {view === 'login' ? 'Sign In' : 'Create Account'}
                    </Button>

                  </form>
              </div>

              <div className="mt-6 text-center">
                <p className="text-gray-500 text-sm">
                  {view === 'login' ? "Don't have an account?" : "Already have an account?"}
                  <button 
                    onClick={() => switchView(view === 'login' ? 'signup' : 'login')}
                    className="ml-2 font-bold text-[#7C3AED] hover:underline"
                  >
                    {view === 'login' ? 'Sign Up' : 'Log In'}
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
