
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MadLibsInput } from './MadLibsInput';
import { ConfigPanel } from './ConfigPanel';
import { Button } from './ui/Button';
import { Sparkles, Printer, Check, Heart } from 'lucide-react';
import { AgeGroup, ArtStyle, BibleReference } from '../types';
import { generateColoringPage, getVerseVisualDescription } from '../services/gemini';
import { deductCredits, saveSketch } from '../services/firebase';
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
    startVerse: 16,
    endVerse: 22
  });
  const [age, setAge] = useState<AgeGroup>(AgeGroup.YOUNG_CHILD);
  const [style, setStyle] = useState<ArtStyle>(ArtStyle.SUNDAY_SCHOOL);

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isDemoSaved, setIsDemoSaved] = useState(false);

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

  const handleDemoPrint = () => {
    onRequireAuth(() => {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh;">
              <img src="https://firebasestorage.googleapis.com/v0/b/coloring-book-bce53.firebasestorage.app/o/sketches%2Fbible-sketch-coloring-page.webp?alt=media&token=cea047a5-da07-4843-a6c9-f9309db8713c" style="max-height:95vh; max-width:95vw; filter: grayscale(100%) contrast(125%);" />
              <script>window.print();</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }, 'signup');
  };

  const handleDemoSave = async () => {
    onRequireAuth(async () => {
      if (!user) return;

      setIsDemoSaved(prev => !prev);

      if (!isDemoSaved) {
        try {
          const response = await fetch(demoImageSrc);
          const blob = await response.blob();

          await saveSketch(user.uid, blob, {
            reference: { book: "Daniel", chapter: 6, startVerse: 16, endVerse: 22 },
            ageGroup: AgeGroup.YOUNG_CHILD,
            artStyle: ArtStyle.SUNDAY_SCHOOL
          }, false, true);
        } catch (e) {
          console.error("Failed to save demo image", e);
          alert("Failed to save to cloud storage.");
        }
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
      <Helmet>
        <title>Bible Sketch - Create Custom Bible Coloring Pages | Free Printable Christian Coloring Sheets</title>
        <meta name="description" content="Create personalized Bible coloring pages for any verse, age group, and art style. Perfect for Sunday School, VBS, homeschool, and family devotionals. Generate free printable Christian coloring sheets in seconds." />
        <meta property="og:title" content="Bible Sketch - Create Custom Bible Coloring Pages" />
        <meta property="og:description" content="Create personalized Bible coloring pages for any verse, age group, and art style. Perfect for Sunday School, VBS, homeschool, and family devotionals." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Bible Sketch - Create Custom Bible Coloring Pages" />
        <meta name="twitter:description" content="Create personalized Bible coloring pages for any verse, age group, and art style. Perfect for Sunday School, VBS, homeschool, and family devotionals." />
        <meta name="keywords" content="bible coloring pages, christian coloring sheets, sunday school coloring pages, vbs coloring pages, printable bible coloring pages, scripture coloring pages, bible verse coloring pages" />
      </Helmet>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        <div className="text-center mb-8 md:mb-12 max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-block relative">
            <h1 className="text-4xl md:text-6xl font-display font-bold text-[#1F2937] relative z-10 leading-tight">
              Create Faith-Filled <br className="hidden md:block" /> Coloring Pages
            </h1>
            <div className="absolute -bottom-2 left-0 w-full h-4 bg-[#FCD34D] opacity-50 -z-0 transform -rotate-1 rounded-full"></div>
          </div>
          <p className="mt-4 text-lg text-gray-500 font-friendly mx-auto max-w-6xl">
            Turn any bible verse into a custom, print-ready coloring page in seconds.
            <br className="hidden md:block" /> Perfect for Sunday School teachers and parents.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-12 items-start">
          <div className="lg:col-span-7 flex flex-col">
            <div className="w-full bg-white rounded-3xl shadow-xl shadow-purple-100/50 border border-purple-50 p-6 md:p-10 relative overflow-hidden">

              <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-yellow-50 to-transparent rounded-tr-full -ml-10 -mb-10 pointer-events-none"></div>

              <MadLibsInput value={reference} onChange={setReference} />

              <ConfigPanel
                age={age}
                setAge={setAge}
                style={style}
                setStyle={setStyle}
              />

              <div className="mt-12 flex flex-col items-center justify-center relative z-10">
                <div className="relative group w-full mb-2">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#FCD34D] to-[#7C3AED] rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                  <Button
                    size="lg"
                    className="relative w-full h-16 text-xl gap-3"
                    onClick={handleGenerate}
                    isLoading={isGenerating}
                    disabled={isGenerating}
                  >
                    {!isGenerating && <Sparkles className="w-6 h-6" />}
                    {isGenerating ? "Generating..." : "Create Coloring Page"}
                  </Button>
                </div>
                <div className="text-xs text-gray-400 font-medium bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                  Cost: 1 Credit
                </div>
              </div>

            </div>
          </div>

          <div className="hidden lg:block lg:col-span-5 relative">
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
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-display font-bold text-gray-800 text-lg">Daniel 6:16-22</p>
                    <div className="flex items-center gap-8 text-sm text-gray-500 mt-1">
                      <span className="bg-purple-50 text-[#7C3AED] px-2 py-0.5 rounded-md font-bold text-xs uppercase tracking-wide">Young Child</span>
                      <span>•</span>
                      <span>Sunday School</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-8">
                  <button
                    onClick={handleDemoPrint}
                    className="flex-1 bg-[#7C3AED] text-white text-sm font-bold py-3 px-4 rounded-full hover:bg-[#6D28D9] transition-all shadow-md shadow-purple-200 active:scale-95 flex items-center justify-center gap-2 group"
                  >
                    <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Print PDF
                  </button>
                  <button
                    onClick={handleDemoSave}
                    className={`flex-1 bg-white text-[#7C3AED] border-2 border-purple-50 text-sm font-bold py-3 px-4 rounded-full hover:bg-purple-50 transition-all flex items-center justify-center gap-2 group ${isDemoSaved ? 'opacity-50 cursor-default' : ''}`}
                  >
                    {isDemoSaved ? <Check className="w-4 h-4" /> : <Heart className="w-4 h-4 group-hover:fill-current" />}
                    {isDemoSaved ? 'Saved' : 'Save'}
                  </button>
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
