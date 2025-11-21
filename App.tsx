
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Header } from './components/Header';
import { CreateTool } from './components/CreateTool';
import { Gallery } from './components/Gallery';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { ErrorModal } from './components/ErrorModal';
import { TermsPage } from './components/TermsPage';
import { PricingPage } from './components/PricingPage';
import { SketchPage } from './components/SketchPage';
import { auth, onAuthStateChanged, logoutUser, onUserProfileChanged, ensureAnonymousSession } from './services/firebase';

// Wrapper to extract ID from params for the Gallery component
const PublicProfileGallery = ({ currentUserId, onBack, onAuthorClick }: { currentUserId?: string, onBack: () => void, onAuthorClick: (id: string) => void }) => {
  const { uid } = useParams<{ uid: string }>();
  return (
    <Gallery 
      userId={currentUserId} 
      publicProfileId={uid}
      onBack={onBack}
      onAuthorClick={onAuthorClick}
    />
  );
};

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Auth State
  const [user, setUser] = useState<any | null>(null);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialView, setAuthInitialView] = useState<'login' | 'signup'>('login');
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Keep track of latest user state to avoid stale closures in pendingAction
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Error State
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalContent, setErrorModalContent] = useState({ title: "", message: "" });
  
  // Queue actions that require auth to run after login
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      if (authUser && !authUser.isAnonymous) {
        // Fully authenticated user
        setUser(prev => ({ ...prev, ...authUser, uid: authUser.uid, email: authUser.email, photoURL: authUser.photoURL, displayName: authUser.displayName }));
        
        // Subscribe to real-time profile changes (credits, etc)
        unsubscribeProfile = onUserProfileChanged(authUser.uid, (data) => {
           setUser(prev => ({
             ...prev,
             ...data, 
             uid: authUser.uid,
             email: authUser.email,
             photoURL: data.photoURL || authUser.photoURL
           }));
           setIsProfileLoaded(true);
        });
      } else {
        // Not logged in OR Anonymous
        setUser(null);
        setIsProfileLoaded(false);
        if (unsubscribeProfile) unsubscribeProfile();
        
        // Ensure anonymous session if completely logged out
        // This enables reading public data from Firestore rules that require auth
        if (!authUser) {
          ensureAnonymousSession();
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Execute pending action once user is logged in AND profile is loaded (for credits)
  useEffect(() => {
    if (user && isProfileLoaded && pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [user, isProfileLoaded, pendingAction]);

  const requireAuth = (action: () => void, view: 'login' | 'signup' = 'login') => {
    if (user && isProfileLoaded) {
      action();
    } else {
      setPendingAction(() => action);
      setAuthInitialView(view);
      setShowAuthModal(true);
    }
  };

  const handlePlanSelection = (planId: string, price: number, credits: number) => {
    requireAuth(() => {
      console.log(`Init checkout for plan: ${planId} (${credits} credits for $${price})`);
      alert(`Redirecting to Stripe Checkout for ${credits} credits ($${price})... (Mock)`);
    }, 'signup');
  };

  // Determine current view for navigation highlighting
  const getCurrentNav = () => {
    const path = location.pathname;
    if (path === '/pricing') return 'pricing';
    if (path.startsWith('/gallery') || path.startsWith('/profile')) return 'gallery';
    return 'home';
  };

  return (
    <div className="min-h-screen bg-[#FFF7ED] text-[#1F2937] pb-0 font-sans selection:bg-[#FCD34D] selection:text-[#7C3AED] flex flex-col">
      <Header 
        onNavigate={(target) => {
           if (target === 'home') navigate('/');
           else navigate(`/${target}`);
        }} 
        currentView={getCurrentNav()}
        user={user}
        onLoginClick={() => {
          setAuthInitialView('login');
          setShowAuthModal(true);
        }}
        onSignupClick={() => {
          setAuthInitialView('signup');
          setShowAuthModal(true);
        }}
        onLogout={logoutUser}
        onProfileClick={() => setShowProfileModal(true)}
      />
      
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={
            <CreateTool 
              user={user} 
              onRequireAuth={requireAuth}
              onNavigateToGallery={() => navigate('/gallery')}
              onNavigateToProfile={(uid) => navigate(`/profile/${uid}`)}
              setShowErrorModal={setShowErrorModal}
              setErrorModalContent={setErrorModalContent}
            />
          } />
          
          <Route path="/gallery" element={
            <Gallery 
              userId={user?.uid} 
              onAuthorClick={(uid) => navigate(`/profile/${uid}`)}
            />
          } />

          <Route path="/profile/:uid" element={
            <PublicProfileGallery 
               currentUserId={user?.uid} 
               onBack={() => navigate('/gallery')}
               onAuthorClick={(uid) => navigate(`/profile/${uid}`)}
            />
          } />

          <Route path="/pricing" element={
            <PricingPage 
              onBack={() => navigate('/')} 
              onSelectPlan={handlePlanSelection}
            />
          } />

          <Route path="/terms" element={
            <TermsPage onBack={() => navigate('/')} />
          } />

          <Route path="/coloring-page/:id" element={
             <SketchPage user={user} onRequireAuth={(action) => requireAuth(action, 'login')} />
          } />
        </Routes>
      </div>

      <footer className="bg-[#FFF7ED] border-t border-purple-50 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
           <p className="text-gray-400 text-sm mb-4">
             © {new Date().getFullYear()} Bible Sketch. All rights reserved.
           </p>
           <div className="flex justify-center gap-6">
             <button 
               onClick={() => navigate('/terms')}
               className="text-gray-400 hover:text-[#7C3AED] text-sm font-medium transition-colors"
             >
               Terms of Service
             </button>
           </div>
        </div>
      </footer>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        initialView={authInitialView}
      />
      
      {user && (
        <ProfileModal 
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={user}
          onUserUpdate={() => {}}
        />
      )}
      
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={errorModalContent.title}
        message={errorModalContent.message}
      />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
