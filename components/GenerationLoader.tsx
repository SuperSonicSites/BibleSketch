
import React, { useState, useEffect } from 'react';
import { Sparkles, BookOpen, PenTool, Loader2 } from 'lucide-react';

interface GenerationLoaderProps {
  isVisible: boolean;
  statusMessage: string;
}

const VERSES = [
  { text: "But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles.", ref: "Isaiah 40:31" },
  { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you.", ref: "Jeremiah 29:11" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you.", ref: "Joshua 1:9" },
  { text: "He makes everything beautiful in its time.", ref: "Ecclesiastes 3:11" },
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  { text: "Be still, and know that I am God.", ref: "Psalm 46:10" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
  { text: "Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.", ref: "Matthew 5:16" }
];

export const GenerationLoader: React.FC<GenerationLoaderProps> = ({ isVisible, statusMessage }) => {
  const [verseIndex, setVerseIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }

    // Cycle verses every 8 seconds (was 4)
    const verseInterval = setInterval(() => {
      setVerseIndex((prev) => (prev + 1) % VERSES.length);
    }, 8000);

    // Fake progress bar for visual feedback
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.random() * 3;
      });
    }, 500);

    return () => {
      clearInterval(verseInterval);
      clearInterval(progressInterval);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const currentVerse = VERSES[verseIndex];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#FFF7ED]/95 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="max-w-2xl w-full flex flex-col items-center text-center">
        
        {/* Animated Icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-purple-200 rounded-full blur-xl animate-pulse"></div>
          <div className="relative bg-white p-4 rounded-full shadow-xl border-2 border-purple-100">
             {statusMessage.toLowerCase().includes("reading") ? (
               <BookOpen className="w-10 h-10 text-[#7C3AED] animate-bounce-slight" />
             ) : statusMessage.toLowerCase().includes("sketching") ? (
               <PenTool className="w-10 h-10 text-[#7C3AED] animate-pulse" />
             ) : (
               <Sparkles className="w-10 h-10 text-[#7C3AED] animate-spin-slow" />
             )}
          </div>
        </div>

        {/* Status Text */}
        <h2 className="font-display text-2xl md:text-3xl font-bold text-[#1F2937] mb-2 animate-pulse">
          {statusMessage}
        </h2>
        
        {/* Progress Bar */}
        <div className="w-64 h-1.5 bg-gray-200 rounded-full mb-12 overflow-hidden">
          <div 
            className="h-full bg-[#7C3AED] transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Verse Card */}
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-purple-50 max-w-xl w-full transform transition-all duration-500">
          <div className="mb-4 flex justify-center text-purple-200">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <p className="font-display text-xl md:text-2xl text-gray-700 leading-relaxed mb-4 transition-opacity duration-500">
            "{currentVerse.text}"
          </p>
          <p className="text-sm font-bold text-[#7C3AED] uppercase tracking-widest">
            {currentVerse.ref}
          </p>
        </div>

      </div>
    </div>
  );
};
