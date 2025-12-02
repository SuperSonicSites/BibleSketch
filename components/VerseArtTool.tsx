import React, { useState, useEffect } from 'react';
import { MadLibsInput } from './MadLibsInput';
import { Button } from './ui/Button';
import { Sparkles, Zap, Printer, AlertTriangle, Type, Check } from 'lucide-react';
import { FontStyle, BibleReference, Sketch } from '../types';
import { VERSE_LAYOUT_RULES } from '../constants';
import { ResultPage } from './ResultPage';
import { GenerationLoader } from './GenerationLoader';
import { VerseFeaturedSection } from './VerseFeaturedSection';
import { VerseSEO } from './VerseSEO';
// These will be implemented in Sprint 3
// import { generateVerseArt } from '../services/gemini';
import { deductCredits, saveSketch, blessSketch, getUserBlessedSketchIds } from '../services/firebase';

interface VerseArtToolProps {
  user: any;
  onRequireAuth: (action: () => void, view?: 'login' | 'signup') => void;
  onNavigateToGallery: () => void;
  onNavigateToProfile: (userId: string) => void;
  setShowErrorModal: (show: boolean) => void;
  setErrorModalContent: (content: { title: string, message: string }) => void;
}

// Font style options with descriptions
const FONT_OPTIONS: { value: FontStyle; label: string; description: string }[] = [
  { 
    value: FontStyle.ELEGANT_SCRIPT, 
    label: 'Elegant Script',
    description: 'Flowing calligraphy with flourishes'
  },
  { 
    value: FontStyle.MODERN_BRUSH, 
    label: 'Modern Brush',
    description: 'Trendy hand-lettered style'
  },
  { 
    value: FontStyle.PLAYFUL, 
    label: 'Playful',
    description: 'Whimsical bubble letters'
  },
  { 
    value: FontStyle.CLASSIC_SERIF, 
    label: 'Classic Serif',
    description: 'Traditional book typography'
  }
];

export const VerseArtTool: React.FC<VerseArtToolProps> = ({
  user,
  onRequireAuth,
  onNavigateToGallery,
  onNavigateToProfile,
  setShowErrorModal,
  setErrorModalContent
}) => {
  // Form state - single verse only (no endVerse)
  const [reference, setReference] = useState<BibleReference>({
    book: "Psalms",
    chapter: 23,
    startVerse: 1
  });
  const [fontStyle, setFontStyle] = useState<FontStyle>(FontStyle.ELEGANT_SCRIPT);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [wordCountError, setWordCountError] = useState<string | null>(null);

  // Ensure single verse mode - clear endVerse if set
  useEffect(() => {
    if (reference.endVerse !== undefined) {
      setReference(prev => ({ ...prev, endVerse: undefined }));
    }
  }, [reference.endVerse]);

  // Handler for reference changes that enforces single verse
  const handleReferenceChange = (newRef: BibleReference) => {
    // Always clear endVerse for verse art (single verse only)
    setReference({ ...newRef, endVerse: undefined });
  };

  const handleGenerate = () => {
    onRequireAuth(async () => {
      // Credit Check
      if (user && (user.credits === undefined || user.credits < 1)) {
        setErrorModalContent({
          title: "Out of Credits",
          message: "You need at least 1 credit to generate verse art. Please purchase a pack to continue."
        });
        setShowErrorModal(true);
        return;
      }

      if (!user) return;

      setIsGenerating(true);
      setLoadingStep("Fetching verse text...");
      setWordCountError(null);

      try {
        // Step 1: Fetch verse text to check word count
        const refString = `${reference.book}+${reference.chapter}:${reference.startVerse}`;
        const response = await fetch(`https://bible-api.com/${encodeURIComponent(refString)}`);
        
        if (!response.ok) {
          throw new Error("INVALID_REFERENCE");
        }
        
        const data = await response.json();
        const verseText = data.text?.trim() || "";
        
        // Word count check
        const wordCount = verseText.split(/\s+/).filter((w: string) => w.length > 0).length;
        
        if (wordCount >= VERSE_LAYOUT_RULES.MAX_WORDS) {
          setWordCountError(`This verse has ${wordCount} words. Please choose a shorter verse (under ${VERSE_LAYOUT_RULES.MAX_WORDS} words) for best results.`);
          setIsGenerating(false);
          setLoadingStep("");
          return;
        }

        // Step 2: Generate Art (placeholder until Sprint 3)
        setLoadingStep("Creating verse art...");
        
        // TODO: Replace with actual generateVerseArt call in Sprint 3
        // const { imageUrl } = await generateVerseArt(reference, fontStyle);
        
        // Placeholder: Show error that feature is coming
        throw new Error("FEATURE_IN_PROGRESS");

        // Step 3: Deduct Credit (will be enabled in Sprint 3)
        // await deductCredits(user.uid, 1, `Verse Art: ${reference.book} ${reference.chapter}:${reference.startVerse}`);

        // setGeneratedImage(imageUrl);
      } catch (error: any) {
        console.error("Generation Error:", error);
        
        if (error.message === "INVALID_REFERENCE") {
          setErrorModalContent({
            title: "Verse Not Found",
            message: "This Bible verse does not exist. Please check the book, chapter, and verse number and try again."
          });
          setShowErrorModal(true);
        } else if (error.message === "FEATURE_IN_PROGRESS") {
          setErrorModalContent({
            title: "Coming Soon",
            message: "Verse Art generation is being finalized. Check back soon!"
          });
          setShowErrorModal(true);
        } else {
          setErrorModalContent({
            title: "Creation Failed",
            message: "Oops! Something went wrong. " + (error.message || "Unknown error")
          });
          setShowErrorModal(true);
        }
      } finally {
        setIsGenerating(false);
        setLoadingStep("");
      }
    }, 'signup');
  };

  // Placeholder function for fetching verse sketches (will connect to firebase in Sprint 3)
  const getVerseSketches = async (): Promise<Sketch[]> => {
    // TODO: Implement in Sprint 3 with getVerseGallery from firebase
    return [];
  };

  if (generatedImage) {
    return (
      <ResultPage
        imageUrl={generatedImage}
        reference={reference}
        ageGroup={undefined as any} // Not used for verses
        artStyle={undefined as any} // Not used for verses
        onBack={() => setGeneratedImage(null)}
        onRequireAuth={(action) => onRequireAuth(action, 'signup')}
        currentUser={user}
        onSave={async (isPublic: boolean, finalImage: string, tags: string[]) => {
          if (!user) {
            onRequireAuth(async () => {}, 'signup');
            throw new Error("WAITING_FOR_AUTH");
          } else {
            // TODO: Sprint 3 will update saveSketch to properly handle verse type
            // For now, using placeholder values for required scene fields
            await saveSketch(user.uid, finalImage, {
              reference: reference,
              ageGroup: undefined as any, // Will be fixed in Sprint 3
              artStyle: undefined as any  // Will be fixed in Sprint 3
            }, isPublic, false, tags);
          }
        }}
      />
    );
  }

  return (
    <>
      <VerseSEO />
      
      <main className="max-w-7xl mx-auto px-4 mt-8 md:mt-16">
        <div className="text-center mb-8 md:mb-16 max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-block relative">
            <h1 className="text-4xl md:text-6xl font-display font-bold text-[#1F2937] relative z-10 leading-tight">
              Bible Verse <br className="hidden md:block" /> Coloring Pages
            </h1>
            <div className="absolute -bottom-1 md:-bottom-2 left-0 w-full h-3 md:h-6 bg-[#FCD34D] opacity-50 -z-0 transform -rotate-1 rounded-full"></div>
          </div>
          <p className="mt-3 md:mt-6 text-base md:text-xl text-gray-500 font-friendly mx-auto max-w-3xl">
            Turn any Bible verse into beautiful, decorative typography coloring art.
          </p>
          
          {/* Social Proof Stats Bar */}
          <div className="inline-flex items-center gap-2 md:gap-3 mt-4 md:mt-8 bg-white/80 backdrop-blur-sm px-4 md:px-6 py-2 md:py-2.5 rounded-full shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 text-xs md:text-sm">
              <Type className="w-4 h-4 text-[#7C3AED]" />
              <span className="font-bold text-gray-800">4</span>
              <span className="text-gray-500">font styles</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-xs md:text-sm">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-gray-800">60s</span>
              <span className="text-gray-500">to generate</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-xs md:text-sm">
              <Printer className="w-4 h-4 text-green-500" />
              <span className="text-gray-500">Print-ready</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 xl:gap-12 items-start">
          <div className="xl:col-span-7 flex flex-col">
            <div className="w-full bg-white rounded-2xl md:rounded-3xl shadow-xl shadow-purple-100/50 border border-purple-50 p-4 md:p-10 relative overflow-visible">

              <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-yellow-50 to-transparent rounded-tr-full -ml-10 -mb-10 pointer-events-none"></div>

              {/* Verse Input - Single verse only */}
              <div className="mb-6">
                <label className="text-xs md:text-sm font-bold text-gray-600 tracking-wide uppercase mb-2 block">
                  Select a Verse
                </label>
                <MadLibsInput 
                  value={reference} 
                  onChange={handleReferenceChange}
                  singleVerseMode={true}
                />
              </div>

              {/* Popular Verses Quick-Select */}
              <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 mt-3 md:mt-4 text-[10px] md:text-xs relative z-10">
                <span className="text-gray-600 mr-1">Popular:</span>
                <button 
                  onClick={() => setReference({ book: "Jeremiah", chapter: 29, startVerse: 11 })}
                  className="px-2 py-0.5 md:px-2.5 md:py-1 bg-purple-50 hover:bg-purple-100 text-[#7C3AED] rounded-full transition-colors font-medium border border-purple-100"
                >
                  Jeremiah 29:11
                </button>
                <button 
                  onClick={() => setReference({ book: "Philippians", chapter: 4, startVerse: 13 })}
                  className="px-2 py-0.5 md:px-2.5 md:py-1 bg-purple-50 hover:bg-purple-100 text-[#7C3AED] rounded-full transition-colors font-medium border border-purple-100"
                >
                  Philippians 4:13
                </button>
                <button 
                  onClick={() => setReference({ book: "Proverbs", chapter: 3, startVerse: 5 })}
                  className="px-2 py-0.5 md:px-2.5 md:py-1 bg-purple-50 hover:bg-purple-100 text-[#7C3AED] rounded-full transition-colors font-medium border border-purple-100"
                >
                  Proverbs 3:5
                </button>
                <button 
                  onClick={() => setReference({ book: "Joshua", chapter: 1, startVerse: 9 })}
                  className="px-2 py-0.5 md:px-2.5 md:py-1 bg-purple-50 hover:bg-purple-100 text-[#7C3AED] rounded-full transition-colors font-medium border border-purple-100"
                >
                  Joshua 1:9
                </button>
              </div>

              {/* Word Count Error */}
              {wordCountError && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">Verse Too Long</p>
                    <p className="text-xs text-amber-700 mt-1">{wordCountError}</p>
                  </div>
                </div>
              )}

              {/* Font Style Selector */}
              <div className="mt-6 md:mt-10">
                <label className="text-xs md:text-sm font-bold text-gray-600 tracking-wide uppercase mb-3 block">
                  Choose Font Style
                </label>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  {FONT_OPTIONS.map((font) => (
                    <button
                      key={font.value}
                      onClick={() => setFontStyle(font.value)}
                      className={`
                        relative px-3 py-3 md:px-4 md:py-4 rounded-xl border-2 text-left transition-all duration-200
                        ${fontStyle === font.value 
                          ? "bg-[#7C3AED] border-[#7C3AED] text-white shadow-lg scale-[1.02]" 
                          : "bg-white border-gray-200 text-gray-700 hover:border-purple-200 hover:bg-purple-50"}
                      `}
                    >
                      <div className="font-bold text-sm md:text-base">{font.label}</div>
                      <div className={`text-xs mt-0.5 ${fontStyle === font.value ? "text-purple-200" : "text-gray-500"}`}>
                        {font.description}
                      </div>
                      {fontStyle === font.value && (
                        <div className="absolute -top-2 -right-2 bg-[#FCD34D] rounded-full p-1">
                          <Check className="w-3 h-3 text-[#7C3AED]" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 md:mt-10 flex flex-col items-center justify-center relative z-10">
                {/* Free Credits Incentive */}
                {!user && (
                  <div className="w-full max-w-md bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg md:rounded-xl p-2 md:p-3 mb-3 md:mb-4 text-center">
                    <p className="text-xs md:text-sm text-amber-800 font-bold flex items-center justify-center gap-1.5">
                      <span className="text-base md:text-lg">🎁</span> Get 5 free credits when you sign up
                    </p>
                    <p className="text-[10px] md:text-xs text-amber-600 mt-0.5">No credit card required</p>
                  </div>
                )}

                <div className="relative group w-full mb-2">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#FCD34D] to-[#7C3AED] rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                  <Button
                    size="lg"
                    className="relative w-full h-11 md:h-16 text-sm md:text-xl gap-2 md:gap-3 overflow-hidden group"
                    onClick={handleGenerate}
                    isLoading={isGenerating}
                    disabled={isGenerating}
                  >
                    {!isGenerating && <Sparkles className="w-4 h-4 md:w-6 md:h-6" />}
                    {isGenerating ? "Creating..." : "Create Verse Art"}
                    {!isGenerating && (
                      <div className="absolute inset-0 group-hover:animate-shimmer pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] md:text-xs text-gray-600 mt-1">
                  Uses 1 credit • <span className="text-gray-500">Takes ~60 seconds</span>
                </p>
              </div>

            </div>
          </div>

          {/* Example Preview */}
          <div className="hidden xl:block xl:col-span-5 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-purple-100 to-yellow-100 rounded-full opacity-50 blur-3xl"></div>
            <div className="relative transform rotate-2 hover:rotate-0 transition-transform duration-700 ease-out cursor-default mt-0">
              <div className="bg-white p-0 shadow-2xl shadow-gray-200/50 rounded-sm aspect-[3/4] flex items-center justify-center relative overflow-hidden border border-gray-100">
                {/* Placeholder for verse art example */}
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-gray-50 to-white">
                  <Type className="w-16 h-16 text-purple-200 mb-4" />
                  <p className="text-gray-400 text-sm">Verse Art Example</p>
                  <p className="text-gray-300 text-xs mt-2">Coming Soon</p>
                </div>
              </div>
              <div className="bg-white p-6 mt-4 rounded-xl shadow-lg border border-gray-100 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-gray-800 text-lg">Joshua 1:9</p>
                    <div className="flex items-center gap-8 text-sm text-gray-500 mt-1">
                      <span className="bg-purple-50 text-[#7C3AED] px-2 py-0.5 rounded-md font-bold text-xs uppercase tracking-wide">Elegant Script</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-[#FCD34D] text-[#7C3AED] font-display font-bold text-xs uppercase px-3 py-1 rounded-full transform rotate-12 shadow-md border border-white">
                Example
              </div>
            </div>
          </div>
        </div>
      </main>

      <GenerationLoader
        isVisible={isGenerating}
        statusMessage={loadingStep}
      />

      {/* Verse Community Gallery - separate from homepage */}
      <VerseFeaturedSection
        user={user}
        onRequireAuth={(action) => onRequireAuth(action, 'signup')}
        onNavigateToGallery={onNavigateToGallery}
        onAuthorClick={onNavigateToProfile}
        getVerseSketches={getVerseSketches}
        blessSketch={blessSketch}
        getUserBlessedSketchIds={getUserBlessedSketchIds}
      />
    </>
  );
};

