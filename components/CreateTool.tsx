
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { MadLibsInput } from './MadLibsInput';
import { ConfigPanel } from './ConfigPanel';
import { Button } from './ui/Button';
import { Sparkles, Zap, Printer } from 'lucide-react';
import { AgeGroup, ArtStyle, BibleReference } from '../types';
import { generateColoringPage, getVerseVisualDescription } from '../services/gemini';
import { deductCredits, saveSketch, getTotalPublicSketchCount } from '../services/firebase';
import { ResultPage } from './ResultPage';
import { GenerationLoader } from './GenerationLoader';
import { FeaturedSection } from './FeaturedSection';

interface CreateToolProps {
  user: any;
  onRequireAuth: (action: () => void, view?: 'login' | 'signup') => void;
  onNavigateToGallery: () => void;
  onNavigateToProfile: (userId: string) => void;
  setShowErrorModal: (show: boolean) => void;
  setErrorModalContent: (content: { title: string, message: string }) => void;
}

export const CreateTool: React.FC<CreateToolProps> = ({
  user,
  onRequireAuth,
  onNavigateToGallery,
  onNavigateToProfile,
  setShowErrorModal,
  setErrorModalContent
}) => {
  const [reference, setReference] = useState<BibleReference>({
    book: "Daniel",
    chapter: 6,
    startVerse: 16
  });
  const [age, setAge] = useState<AgeGroup>(AgeGroup.YOUNG_CHILD);
  const [style, setStyle] = useState<ArtStyle>(ArtStyle.SUNDAY_SCHOOL);

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [totalSketches, setTotalSketches] = useState<number>(0);

  // Fetch total sketch count for social proof
  useEffect(() => {
    getTotalPublicSketchCount().then(count => setTotalSketches(count));
  }, []);

  // Local asset
  const demoImageSrc = "/bible-sketch.png";

  const handleGenerate = () => {
    onRequireAuth(async () => {
      // Credit Check
      if (user && (user.credits === undefined || user.credits < 1)) {
        setErrorModalContent({
          title: "Out of Credits",
          message: "You need at least 1 credit to generate a coloring page. Please purchase a pack to continue."
        });
        setShowErrorModal(true);
        return;
      }

      if (!user) return;

      setIsGenerating(true);
      setLoadingStep("Reading the Bible...");

      try {
        // Step 1: Understand the Verse
        await new Promise(r => setTimeout(r, 1500));

        const description = await getVerseVisualDescription(reference, age, style);

        // Step 2: Create Art
        setLoadingStep("Sketching the scene...");
        const { imageUrl } = await generateColoringPage(description, age, style);

        // Step 3: Deduct Credit
        await deductCredits(user.uid, 1, `Generated: ${reference.book} ${reference.chapter}`);

        setGeneratedImage(imageUrl);
      } catch (error: any) {
        console.error("Generation Error:", error);
        const msg = (error.message || String(error)).toLowerCase();

        if (error.message === "INVALID_REFERENCE") {
          setErrorModalContent({
            title: "Scripture Not Found",
            message: "This bible passage does not exist. Please check the book, chapter, and verse numbers and try again."
          });
          setShowErrorModal(true);
        } else if (msg.includes("api key is missing")) {
          alert(error.message);
        } else if (msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("quota")) {
          setErrorModalContent({
            title: "Creation Failed",
            message: "There was an issue with the app. Please try again later."
          });
          setShowErrorModal(true);
        } else {
          setErrorModalContent({
            title: "Creation Failed",
            message: "Oops! Something went wrong with the divine inspiration. " + (error.message || "Unknown error")
          });
          setShowErrorModal(true);
        }
      } finally {
        setIsGenerating(false);
        setLoadingStep("");
      }
    }, 'signup');
  };

  if (generatedImage) {
    return (
      <ResultPage
        imageUrl={generatedImage}
        reference={reference}
        ageGroup={age}
        artStyle={style}
        onBack={() => setGeneratedImage(null)}
        onRequireAuth={(action) => onRequireAuth(action, 'signup')}
        currentUser={user}
        onSave={async (isPublic: boolean, finalImage: string, tags: string[]) => {
          if (!user) {
            onRequireAuth(async () => {
              // Handle post-login save if needed
            }, 'signup');
            throw new Error("WAITING_FOR_AUTH");
          } else {
            await saveSketch(user.uid, finalImage, {
              reference: reference,
              ageGroup: age,
              artStyle: style
            }, isPublic, false, tags);
            // Alert removed
          }
        }}
      />
    );
  }

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 mt-8 md:mt-16">
        <div className="text-center mb-8 md:mb-16 max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-block relative">
            <h1 className="text-4xl md:text-6xl font-display font-bold text-[#1F2937] relative z-10 leading-tight">
              Create Faith-Filled <br className="hidden md:block" /> Coloring Pages
            </h1>
            <div className="absolute -bottom-1 md:-bottom-2 left-0 w-full h-3 md:h-6 bg-[#FCD34D] opacity-50 -z-0 transform -rotate-1 rounded-full"></div>
          </div>
          <p className="mt-3 md:mt-6 text-base md:text-xl text-gray-500 font-friendly mx-auto max-w-3xl">
            Turn any bible verse into a custom, print-ready coloring page in seconds.
          </p>
          
          {/* Social Proof Stats Bar */}
          <div className="inline-flex items-center gap-2 md:gap-3 mt-4 md:mt-8 bg-white/80 backdrop-blur-sm px-4 md:px-6 py-2 md:py-2.5 rounded-full shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 text-xs md:text-sm">
              <Sparkles className="w-4 h-4 text-[#7C3AED]" />
              <span className="font-bold text-gray-800">{Math.max(totalSketches, 500).toLocaleString()}+</span>
              <span className="text-gray-500">created</span>
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

              <MadLibsInput value={reference} onChange={setReference} />

              {/* Popular Verses Quick-Select */}
              <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 mt-3 md:mt-4 text-[10px] md:text-xs relative z-10">
                <span className="text-gray-400 mr-1">Try:</span>
                <button 
                  onClick={() => setReference({ book: "Psalms", chapter: 23, startVerse: 1, endVerse: 6 })}
                  className="px-2 py-0.5 md:px-2.5 md:py-1 bg-purple-50 hover:bg-purple-100 text-[#7C3AED] rounded-full transition-colors font-medium border border-purple-100"
                >
                  Psalm 23
                </button>
                <button 
                  onClick={() => setReference({ book: "John", chapter: 3, startVerse: 16 })}
                  className="px-2 py-0.5 md:px-2.5 md:py-1 bg-purple-50 hover:bg-purple-100 text-[#7C3AED] rounded-full transition-colors font-medium border border-purple-100"
                >
                  John 3:16
                </button>
                <button 
                  onClick={() => setReference({ book: "Genesis", chapter: 1, startVerse: 1, endVerse: 5 })}
                  className="px-2 py-0.5 md:px-2.5 md:py-1 bg-purple-50 hover:bg-purple-100 text-[#7C3AED] rounded-full transition-colors font-medium border border-purple-100"
                >
                  Genesis 1:1-5
                </button>
                <button 
                  onClick={() => setReference({ book: "Daniel", chapter: 6, startVerse: 16, endVerse: 22 })}
                  className="px-2 py-0.5 md:px-2.5 md:py-1 bg-purple-50 hover:bg-purple-100 text-[#7C3AED] rounded-full transition-colors font-medium border border-purple-100"
                >
                  Daniel 6:16-22
                </button>
              </div>

              <ConfigPanel
                age={age}
                setAge={setAge}
                style={style}
                setStyle={setStyle}
              />

              <div className="mt-4 md:mt-8 flex flex-col items-center justify-center relative z-10">
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
                    {isGenerating ? "Generating..." : "Create Coloring Page"}
                    {!isGenerating && (
                      <div className="absolute inset-0 group-hover:animate-shimmer pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] md:text-xs text-gray-400 mt-1">
                  Uses 1 credit • <span className="text-gray-500">Takes ~60 seconds</span>
                </p>
              </div>

            </div>
          </div>

          <div className="hidden xl:block xl:col-span-5 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-purple-100 to-yellow-100 rounded-full opacity-50 blur-3xl"></div>
            <div className="relative transform rotate-2 hover:rotate-0 transition-transform duration-700 ease-out cursor-default mt-0">
              <div className="bg-white p-0 shadow-2xl shadow-gray-200/50 rounded-sm aspect-[3/4] flex items-center justify-center relative overflow-hidden border border-gray-100">
                <img
                  src="https://firebasestorage.googleapis.com/v0/b/coloring-book-bce53.firebasestorage.app/o/sketches%2Fbible-sketch-coloring-page.webp?alt=media&token=cea047a5-da07-4843-a6c9-f9309db8713c"
                  alt="Example Coloring Page - Daniel in Lions Den"
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full object-contain grayscale contrast-125 hover:scale-105 transition-transform duration-700 p-4 select-none"
                />
              </div>
              <div className="bg-white p-6 mt-4 rounded-xl shadow-lg border border-gray-100 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-gray-800 text-lg">Daniel 6:16-22</p>
                    <div className="flex items-center gap-8 text-sm text-gray-500 mt-1">
                      <span className="bg-purple-50 text-[#7C3AED] px-2 py-0.5 rounded-md font-bold text-xs uppercase tracking-wide">Young Child</span>
                      <span>•</span>
                      <span>Sunday School</span>
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

      <FeaturedSection
        user={user}
        onRequireAuth={(action) => onRequireAuth(action, 'signup')}
        onNavigateToGallery={onNavigateToGallery}
        onAuthorClick={onNavigateToProfile}
      />
    </>
  );
};
