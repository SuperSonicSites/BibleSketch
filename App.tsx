
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Header } from './components/Header';
import { CreateTool } from './components/CreateTool';
import { Gallery } from './components/Gallery';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { ErrorModal } from './components/ErrorModal';
import { TermsPage } from './components/TermsPage';
import { PrivacyPage } from './components/PrivacyPage';
import { PricingPage } from './components/PricingPage';
import { SketchPage } from './components/SketchPage';
import { TagPage } from './components/TagPage';
import { VerifiedPage } from './components/VerifiedPage';
import { GlobalSEO } from './components/GlobalSEO';
import { auth, onAuthStateChanged, logoutUser, onUserProfileChanged, ensureAnonymousSession } from './services/firebase';
import { capturePinterestClickId, trackPinterestEvent } from './utils/pinterestTracking';

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
  
  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  // Capture Pinterest Click ID (epik) from ad URLs on initial load
  useEffect(() => {
    capturePinterestClickId();
  }, []);
  
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

  const requireAuth = useCallback((action: () => void, view: 'login' | 'signup' = 'login') => {
    if (user && isProfileLoaded) {
      action();
    } else {
      setPendingAction(() => action);
      setAuthInitialView(view);
      setShowAuthModal(true);
    }
  }, [user, isProfileLoaded]);

  // Memoized requireAuth callback for SketchPage
  const handleSketchPageAuth = useCallback((action: () => void) => requireAuth(action, 'login'), [requireAuth]);

  const handlePlanSelection = (planId: string, price: number, credits: number) => {
    requireAuth(() => {
      if (!user?.uid) {
        console.error("No authenticated user");
        return;
      }

      // Zoho Hosted Payment Page URLs
      const ZOHO_PLAN_URLS: Record<string, string> = {
        'premium': 'https://billing.zohosecure.ca/subscribe/c4eda214b750306200eded5d860ee14ac337b81ca6421fdb875baa1a2a7b3c2f/bible-sketch-premium',
        'spark': 'https://billing.zohosecure.ca/subscribe/c4eda214b750306200eded5d860ee14af89aa6dc60075c271e442233279cd445/Spark?addon_code%5B0%5D=20credits&addon_quantity%5B0%5D=20',
        'torch': 'https://billing.zohosecure.ca/subscribe/c4eda214b750306200eded5d860ee14af01b06f31285bf8e05af38a9b0c1e6f3/Torch?addon_code%5B0%5D=80credits&addon_quantity%5B0%5D=80',
        'beacon': 'https://billing.zohosecure.ca/subscribe/c4eda214b750306200eded5d860ee14a60094b8252300a63400de1ca08bc5eda/200credits?addon_code%5B0%5D=200credit&addon_quantity%5B0%5D=200',
      };

      const planUrl = ZOHO_PLAN_URLS[planId];

      if (!planUrl) {
        console.error(`Unknown plan: ${planId}`);
        return;
      }

      // Build success redirect - different param for subscription vs credit pack
      const successParam = planId === 'premium' ? 'subscription=success' : `purchase=${planId}`;
      const SUCCESS_REDIRECT = encodeURIComponent(`${window.location.origin}/pricing?${successParam}`);
      
      // Build Zoho Hosted Payment Page URL with Firebase UID
      // Custom field parameter uses the API Field Name from Zoho Settings > Preferences > Customers > Field Customization
      const checkoutUrl = `${planUrl}${planUrl.includes('?') ? '&' : '?'}cf_cf_firebase_uid=${encodeURIComponent(user.uid)}&redirect_url=${SUCCESS_REDIRECT}`;

      console.log(`Redirecting to Zoho checkout: ${checkoutUrl}`);
      
      // Track Pinterest AddToCart event before redirect to Zoho checkout
      trackPinterestEvent('addtocart', {
        value: price,
        currency: 'USD',
        product_name: planId === 'premium' ? 'Premium Subscription' : `${planId} Credit Pack`
      });

      // Redirect to Zoho Checkout
      window.location.href = checkoutUrl;

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
            <>
              <GlobalSEO />
              <CreateTool 
                user={user} 
                onRequireAuth={requireAuth}
                onNavigateToGallery={() => navigate('/gallery')}
                onNavigateToProfile={(uid) => navigate(`/profile/${uid}`)}
                setShowErrorModal={setShowErrorModal}
                setErrorModalContent={setErrorModalContent}
              />
            </>
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
              isPremium={user?.isPremium || false}
            />
          } />

          <Route path="/terms" element={
            <TermsPage onBack={() => navigate('/')} />
          } />

          <Route path="/privacy" element={
            <PrivacyPage onBack={() => navigate('/')} />
          } />

          <Route path="/verified" element={<VerifiedPage />} />

          <Route path="/coloring-page/:id" element={
             <SketchPage user={user} onRequireAuth={handleSketchPageAuth} />
          } />

          <Route path="/coloring-page/:slug/:id" element={
             <SketchPage user={user} onRequireAuth={handleSketchPageAuth} />
          } />

          <Route path="/tags/:tagId" element={
             <TagPage
               userId={user?.uid}
               onRequireAuth={(action) => requireAuth(action, 'login')}
               onAuthorClick={(uid) => navigate(`/profile/${uid}`)}
             />
          } />
        </Routes>
      </div>

      <footer className="bg-[#FFF7ED] border-t border-purple-50 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
           <p className="text-gray-600 text-sm mb-4">
             © {new Date().getFullYear()} Bible Sketch. All rights reserved.
           </p>
           <div className="flex justify-center gap-6">
             <button 
               onClick={() => navigate('/terms')}
               className="text-gray-600 hover:text-[#7C3AED] text-sm font-medium transition-colors"
             >
               Terms of Service
             </button>
             <button 
               onClick={() => navigate('/privacy')}
               className="text-gray-600 hover:text-[#7C3AED] text-sm font-medium transition-colors"
             >
               Privacy Policy
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
    <HelmetProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </HelmetProvider>
  );
}
