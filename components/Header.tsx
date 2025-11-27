
import React, { useState, useEffect } from 'react';
import { Menu, User as UserIcon, LogOut, Settings, X, Coins, Gift } from 'lucide-react';
import { Button } from './ui/Button';
import { User } from '../services/firebase';

interface HeaderProps {
  onNavigate: (view: 'home' | 'gallery' | 'pricing') => void;
  currentView: 'home' | 'gallery' | 'pricing';
  user: User | null;
  onLoginClick: () => void;
  onSignupClick: () => void;
  onLogout: () => void;
  onProfileClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onNavigate, 
  currentView, 
  user, 
  onLoginClick, 
  onSignupClick, 
  onLogout,
  onProfileClick
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`w-full sticky top-0 z-50 transition-all duration-300 border-b ${
        isScrolled 
          ? 'bg-[#FFF7ED]/95 backdrop-blur-md border-purple-100 py-3 shadow-sm' 
          : 'bg-[#FFF7ED] border-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => {
            onNavigate('home');
            setIsMobileMenuOpen(false);
          }}
        >
          <div className="relative transition-transform duration-300 group-hover:scale-105">
            <img 
              src="/logo.png" 
              alt="Bible Sketch Logo" 
              className="w-10 h-10 md:w-12 md:h-12 object-contain"
            />
          </div>
          <span className="text-xl md:text-3xl font-display font-bold text-[#1F2937]">
            Bible Sketch
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8 lg:gap-10">
          <button 
            onClick={() => onNavigate('home')}
            className={`text-lg font-bold ${currentView === 'home' ? 'text-[#7C3AED]' : 'text-gray-500'} hover:text-[#7C3AED] transition-colors`}
          >
            Create
          </button>
          <button 
            onClick={() => onNavigate('gallery')}
            className={`text-lg font-bold ${currentView === 'gallery' ? 'text-[#7C3AED]' : 'text-gray-500'} hover:text-[#7C3AED] transition-colors`}
          >
            Gallery
          </button>
          <button 
            onClick={() => onNavigate('pricing')}
            className={`text-lg font-bold ${currentView === 'pricing' ? 'text-[#7C3AED]' : 'text-gray-500'} hover:text-[#7C3AED] transition-colors`}
          >
            Pricing
          </button>

          {user ? (
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 text-gray-700 font-bold text-lg hover:text-[#7C3AED] transition-colors focus:outline-none"
              >
                <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center text-[#7C3AED] overflow-hidden border-2 border-white shadow-sm">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-6 h-6" />
                  )}
                </div>
                <span>{user.displayName || user.email?.split('@')[0]}</span>
              </button>

              {isProfileOpen && (
                <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 animate-in fade-in zoom-in-95 duration-200 z-50">
                    <div className="px-5 py-3 border-b border-gray-100 mb-2">
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Signed in as</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{user.email}</p>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        onNavigate('pricing');
                      }}
                      className="w-full text-left px-5 py-3 text-base text-gray-700 font-medium hover:bg-purple-50 hover:text-[#7C3AED] flex items-center gap-3 transition-colors"
                    >
                      <Coins className="w-5 h-5" />
                      Buy Credits
                    </button>

                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        onProfileClick();
                      }}
                      className="w-full text-left px-5 py-3 text-base text-gray-700 font-medium hover:bg-purple-50 hover:text-[#7C3AED] flex items-center gap-3 transition-colors"
                    >
                      <Settings className="w-5 h-5" />
                      Profile Settings
                    </button>

                    <button 
                      onClick={() => {
                        onLogout();
                        setIsProfileOpen(false);
                      }}
                      className="w-full text-left px-5 py-3 text-base text-red-600 font-medium hover:bg-red-50 flex items-center gap-3 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button 
                onClick={onLoginClick}
                className="text-lg font-bold text-gray-500 hover:text-[#7C3AED] transition-colors"
              >
                Log In
              </button>
              <Button variant="primary" size="md" onClick={onSignupClick} className="font-bold shadow-md hover:shadow-lg group overflow-visible">
                <Gift className="w-4 h-4 text-yellow-300 animate-wiggle" />
                Claim Free Credits
              </Button>
            </>
          )}
        </div>

        {/* Mobile Controls */}
        <div className="md:hidden flex items-center gap-3">
          {user ? (
            <div className="relative">
               <button 
                 onClick={() => setIsProfileOpen(!isProfileOpen)}
                 className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-[#7C3AED] overflow-hidden border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-300"
               >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-6 h-6" />
                  )}
               </button>

               {/* Mobile Profile Dropdown */}
               {isProfileOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-200 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 mb-1">
                      <p className="text-xs text-gray-400 uppercase font-bold">Signed in as</p>
                      <p className="text-sm font-medium truncate">{user.email}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        onNavigate('pricing');
                      }}
                      className="w-full text-left px-4 py-3 text-base text-gray-700 hover:bg-purple-50 hover:text-[#7C3AED] flex items-center gap-2 transition-colors"
                    >
                      <Coins className="w-5 h-5" />
                      Buy Credits
                    </button>
                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        onProfileClick();
                      }}
                      className="w-full text-left px-4 py-3 text-base text-gray-700 hover:bg-purple-50 hover:text-[#7C3AED] flex items-center gap-2 transition-colors"
                    >
                      <Settings className="w-5 h-5" />
                      Profile Settings
                    </button>
                    <button 
                      onClick={() => {
                        onLogout();
                        setIsProfileOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-base text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </button>
                </div>
               )}
            </div>
          ) : (
             <button 
               onClick={onLoginClick}
               className="text-base font-bold text-[#7C3AED] mr-2"
             >
               Log In
             </button>
          )}

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-700 p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
             {isMobileMenuOpen ? (
                <X className="w-8 h-8" />
             ) : (
                <Menu className="w-8 h-8" />
             )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xl p-4 flex flex-col gap-2 md:hidden animate-in slide-in-from-top-2 z-30 rounded-b-2xl mx-2 mt-2">
            <button 
                onClick={() => { onNavigate('home'); setIsMobileMenuOpen(false); }}
                className={`text-left font-bold text-lg p-4 rounded-xl transition-colors ${currentView === 'home' ? 'bg-purple-50 text-[#7C3AED]' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                Create Coloring Page
            </button>
            <button 
                onClick={() => { onNavigate('gallery'); setIsMobileMenuOpen(false); }}
                className={`text-left font-bold text-lg p-4 rounded-xl transition-colors ${currentView === 'gallery' ? 'bg-purple-50 text-[#7C3AED]' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                View Gallery
            </button>
            <button 
                onClick={() => { onNavigate('pricing'); setIsMobileMenuOpen(false); }}
                className={`text-left font-bold text-lg p-4 rounded-xl transition-colors ${currentView === 'pricing' ? 'bg-purple-50 text-[#7C3AED]' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                Pricing & Credits
            </button>
            
            {!user && (
              <div className="pt-3 mt-1 border-t border-gray-100 flex flex-col gap-3">
                  <Button onClick={() => { onSignupClick(); setIsMobileMenuOpen(false); }} className="w-full justify-center h-12 text-lg">
                      <Gift className="w-5 h-5 text-yellow-300 animate-wiggle" />
                      Claim Free Credits
                  </Button>
              </div>
            )}
        </div>
      )}
    </nav>
  );
};
