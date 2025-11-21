
import React, { useState } from 'react';
import { Printer, Download, ArrowLeft, Wand2, Save, AlertCircle, Eraser, Type, BookOpen } from 'lucide-react';
import { Button } from './ui/Button';
import { AgeGroup, ArtStyle, BibleReference } from '../types';
import { SaveModal } from './SaveModal';
import { editColoringPage } from '../services/gemini';
import { deductCredits, auth } from '../services/firebase';
import { embedLogoOnImage } from '../utils/imageProcessing';

interface ResultPageProps {
  imageUrl: string;
  reference: BibleReference;
  ageGroup: AgeGroup;
  artStyle: ArtStyle;
  onBack: () => void;
  onRequireAuth: (action: () => void) => void;
  currentUser: any;
  onSave: (isPublic: boolean, finalImage: string) => Promise<void>;
}

// Helper to draw text on image
const drawTextOnImage = (base64: string, text: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Requires CORS config on bucket
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Text Configuration
      // Responsive font size based on image width (approx 5% of width)
      const fontSize = Math.max(24, Math.floor(img.width * 0.05)); 
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      
      const padding = Math.floor(img.width * 0.04);
      const x = canvas.width - padding;
      const y = canvas.height - padding;
      
      // Stroke (Halo) for readability against black lines
      ctx.lineWidth = fontSize * 0.15;
      ctx.strokeStyle = 'white';
      ctx.strokeText(text, x, y);
      
      // Fill (Text)
      ctx.fillStyle = '#1F2937'; // Dark Gray/Black
      ctx.fillText(text, x, y);
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (e) => reject(e);
    img.src = base64;
  });
};

export const ResultPage: React.FC<ResultPageProps> = ({ 
  imageUrl: initialImageUrl, 
  reference,
  ageGroup,
  artStyle,
  onBack, 
  onRequireAuth, 
  currentUser, 
  onSave 
}) => {
  const [currentImage, setCurrentImage] = useState(initialImageUrl);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Text Overlay State
  // Stores the image state BEFORE text was added, to allow toggling off.
  const [preOverlayImage, setPreOverlayImage] = useState<string | null>(null);

  const handlePrint = async () => {
    setIsProcessingAction(true);
    try {
      // Process image before printing (CORS check)
      const brandedImage = await embedLogoOnImage(currentImage);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const html = `
          <html>
            <head><title>Print Sketch</title></head>
            <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh;">
              <img 
                src="${brandedImage}" 
                style="max-height:95vh; max-width:95vw;" 
                onload="window.print();"
              />
            </body>
          </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
      }
    } catch (e) {
      console.error("Print failed", e);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDownload = async () => {
    setIsProcessingAction(true);
    try {
      // Process image before downloading (CORS check)
      const brandedImage = await embedLogoOnImage(currentImage);
      
      const link = document.createElement('a');
      link.href = brandedImage;
      link.download = `bible-sketch-${reference.book}-${reference.chapter}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Download failed", e);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleEdit = async () => {
    if (!editPrompt.trim()) return;
    setEditError(null);
    
    const performEdit = async () => {
        setIsProcessingEdit(true);
        try {
            // Deduct credit if user exists
            const user = auth.currentUser;
            if (user) {
                await deductCredits(user.uid, 1, "Refined Sketch");
            }
            
            // If text overlay is active, use the CLEAN image as source for AI
            // to prevent AI from hallucinating based on the text.
            const sourceImage = preOverlayImage || currentImage;

            const newImage = await editColoringPage(sourceImage, editPrompt);
            
            setCurrentImage(newImage);
            setPreOverlayImage(null); // Reset overlay state since we have a fresh image
            setIsEditing(false);
            setEditPrompt("");
        } catch (e: any) {
            console.error("Edit failed", e);
            if (e.message === "INSUFFICIENT_CREDITS") {
                setEditError("Not enough credits.");
            } else {
                setEditError("Failed to edit image. Please try again.");
            }
        } finally {
            setIsProcessingEdit(false);
        }
    };

    if (!auth.currentUser) {
        onRequireAuth(() => performEdit());
    } else {
        performEdit();
    }
  };

  const handleRemoveColor = async () => {
    setEditError(null);
    
    const performRemoveColor = async () => {
        setIsProcessingEdit(true);
        try {
             // If text overlay is active, use the CLEAN image as source
            const sourceImage = preOverlayImage || currentImage;
            
            // Free operation - No credit deduction
            const newImage = await editColoringPage(sourceImage, "Make the image black and white");
            
            setCurrentImage(newImage);
            setPreOverlayImage(null); // Reset overlay state
        } catch (e: any) {
            console.error("Remove color failed", e);
            setEditError("Failed to remove color. Please try again.");
        } finally {
            setIsProcessingEdit(false);
        }
    };

    if (!auth.currentUser) {
        onRequireAuth(() => performRemoveColor());
    } else {
        performRemoveColor();
    }
  };

  const handleToggleReference = async () => {
    if (preOverlayImage) {
      // REVERT: Restore the clean image
      setCurrentImage(preOverlayImage);
      setPreOverlayImage(null);
    } else {
      // APPLY: Add text overlay
      // Use a lightweight loading indicator if needed, though canvas is fast
      try {
         const refString = `${reference.book} ${reference.chapter}:${reference.startVerse}${reference.endVerse && reference.endVerse > reference.startVerse ? '-' + reference.endVerse : ''}`;
         
         const newImgWithText = await drawTextOnImage(currentImage, refString);
         
         setPreOverlayImage(currentImage); // Save current state as "Clean"
         setCurrentImage(newImgWithText);  // Update display to "With Text"
      } catch (e) {
         console.error("Failed to add text", e);
         setEditError("Could not add reference text. (CORS Error?)");
      }
    }
  };

  const handleSaveConfirm = async (isPublic: boolean) => {
    setIsSaving(true);
    try {
        await onSave(isPublic, currentImage);
    } catch (e) {
        console.error("Save failed", e);
    } finally {
        setIsSaving(false);
        setShowSaveModal(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-[#7C3AED] font-bold mb-6 transition-colors group"
      >
        <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md border border-gray-100 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <span>Create New</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Image Column */}
        <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl shadow-xl shadow-purple-100/50 border border-purple-50 p-4 md:p-8 flex items-center justify-center bg-[#E5E5E5] texture-paper relative overflow-hidden">
                 {/* Visual Protection Container */}
                 <div className="relative bg-white shadow-2xl w-full max-w-lg aspect-[3/4]">
                    
                    {/* No Watermark for Owner on Result Page */}
                    
                    <img 
                        src={currentImage} 
                        alt="Generated Result" 
                        onContextMenu={(e) => e.preventDefault()}
                        className="w-full h-full object-contain select-none"
                    />
                    
                    {/* Image Action Buttons Container */}
                    <div className="absolute top-3 right-3 flex gap-2 z-20">
                        {/* Toggle Reference Button */}
                        <button 
                            onClick={handleToggleReference}
                            disabled={isProcessingEdit}
                            className={`
                                backdrop-blur-sm border shadow-sm px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:scale-105
                                ${preOverlayImage 
                                    ? 'bg-[#7C3AED]/90 text-white border-[#7C3AED]' 
                                    : 'bg-white/90 text-gray-600 hover:text-[#7C3AED] border-gray-200 hover:bg-white'}
                            `}
                            title={preOverlayImage ? "Remove Reference" : "Add Reference Text"}
                        >
                            <Type className="w-4 h-4" />
                            {preOverlayImage ? "Remove Ref" : "Add Ref"}
                        </button>

                        {/* Remove Color Button */}
                        <button 
                            onClick={handleRemoveColor}
                            disabled={isProcessingEdit}
                            className="bg-white/90 backdrop-blur-sm hover:bg-white text-gray-600 hover:text-[#7C3AED] border border-gray-200 shadow-sm px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:scale-105"
                            title="Convert to Black & White (Free)"
                        >
                            <Eraser className="w-4 h-4" />
                            Remove Color
                        </button>
                    </div>

                    {(isProcessingEdit || isProcessingAction) && (
                        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center backdrop-blur-sm z-10">
                            <Wand2 className="w-12 h-12 text-[#7C3AED] animate-pulse mb-4" />
                            <p className="font-display font-bold text-[#7C3AED] text-xl">
                              {isProcessingAction ? 'Preparing file...' : 'Refining creation...'}
                            </p>
                        </div>
                    )}
                 </div>
            </div>
        </div>

        {/* Controls Column */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Masterpiece Card - Order 2 on Mobile, Order 1 on Desktop */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm order-2 lg:order-1">
                <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">
                    {reference.book} {reference.chapter}:{reference.startVerse}
                    {reference.endVerse && reference.endVerse > reference.startVerse && `-${reference.endVerse}`}
                </h2>
                <p className="text-gray-500 mb-6 text-sm font-medium">
                    {ageGroup} • {artStyle}
                </p>

                <div className="space-y-3">
                    <Button 
                        variant="primary" 
                        size="lg" 
                        className="w-full gap-2 shadow-lg shadow-purple-100"
                        onClick={handlePrint}
                        isLoading={isProcessingAction}
                    >
                        <Printer className="w-5 h-5" />
                        Print PDF
                    </Button>

                    <Button 
                        variant="outline" 
                        className="w-full gap-2"
                        onClick={handleDownload}
                        isLoading={isProcessingAction}
                    >
                        <Download className="w-5 h-5" />
                        Download Image
                    </Button>

                    <Button 
                        variant="secondary" 
                        className="w-full gap-2 bg-green-50 text-green-700 hover:bg-green-100 border-green-100"
                        onClick={() => {
                           if (!auth.currentUser) {
                               onRequireAuth(() => setShowSaveModal(true));
                           } else {
                               setShowSaveModal(true);
                           }
                        }}
                    >
                        <Save className="w-5 h-5" />
                        Save to Gallery
                    </Button>
                </div>
            </div>

            {/* Edit Section - Order 1 on Mobile, Order 2 on Desktop */}
            <div className="bg-purple-50 rounded-3xl p-6 border border-purple-100 order-1 lg:order-2">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-[#7C3AED] font-bold">
                        <Wand2 className="w-5 h-5" />
                        <span>Refine Creation</span>
                    </div>
                    <span className="text-xs font-bold bg-white text-gray-500 px-2 py-1 rounded-md border border-purple-100">
                        1 Credit
                    </span>
                </div>

                {!isEditing ? (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-gray-600 hover:text-[#7C3AED] underline underline-offset-2"
                    >
                        Make changes to this image...
                    </button>
                ) : (
                    <div className="space-y-3 animate-in slide-in-from-bottom-2">
                        {editError && (
                            <div className="flex items-center gap-2 text-xs text-red-500 font-bold bg-red-50 p-2 rounded">
                                <AlertCircle className="w-3 h-3" />
                                {editError}
                            </div>
                        )}
                        <textarea 
                            className="w-full p-3 rounded-xl border border-purple-200 text-sm focus:ring-2 focus:ring-[#7C3AED] focus:outline-none resize-none bg-white"
                            rows={3}
                            placeholder='e.g. "Add a dove in the sky" or "Make the lines thicker"'
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={handleEdit}
                                disabled={!editPrompt || isProcessingEdit}
                                className="flex-1"
                            >
                                Apply Change
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setIsEditing(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      <SaveModal 
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onConfirm={handleSaveConfirm}
        isSaving={isSaving}
      />
    </div>
  );
};
