import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackPinterestEvent } from '../utils/pinterestTracking';

export const VerifiedPage: React.FC = () => {
  const navigate = useNavigate();
  // We assume success if they reach this page via the redirect,
  // as Firebase only redirects here after successful verification.

  // Track Pinterest signup event for verified email signups
  useEffect(() => {
    trackPinterestEvent('signup');
  }, []);
  
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-8 md:p-12 relative overflow-hidden border border-purple-100">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FCD34D] via-[#7C3AED] to-[#FCD34D]"></div>
        
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl animate-bounce">
          🎉
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-4">
          Congratulations!
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your email has been verified successfully.
        </p>

        <div className="bg-[#FFF7ED] rounded-2xl p-6 md:p-8 text-left mb-8 border border-orange-100">
          <h3 className="text-lg font-bold text-[#7C3AED] mb-4 uppercase tracking-wide text-center">
            Your Free Account Includes:
          </h3>
          
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="text-2xl">🎨</span>
              <div>
                <span className="font-bold text-gray-800">5 Free Credits</span>
                <p className="text-sm text-gray-600">To create your own custom coloring pages from any Bible verse.</p>
              </div>
            </li>
            
            <li className="flex items-start gap-3">
              <span className="text-2xl">🖨️</span>
              <div>
                <span className="font-bold text-gray-800">5 Downloads or Prints</span>
                <p className="text-sm text-gray-600">High-quality exports of any creation you find on the website.</p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="text-2xl">❤️</span>
              <div>
                <span className="font-bold text-gray-800">Bless & Save</span>
                <p className="text-sm text-gray-600">Like ("Bless") and save your favorite creations to your personal collection.</p>
              </div>
            </li>
          </ul>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full md:w-auto px-8 py-4 bg-[#7C3AED] text-white text-lg rounded-full font-bold hover:bg-[#6D28D9] transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
        >
          Start Creating Now
        </button>
      </div>
    </div>
  );
};

