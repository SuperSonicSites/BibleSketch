
import React, { useState } from 'react';
import { Download, Printer, Share2, X, Wand2, Edit3, BookOpen } from 'lucide-react';
import { Button } from './ui/Button';
import { editColoringPage } from '../services/gemini';
import { deductCredits, auth } from '../services/firebase';
import { embedLogoOnImage } from '../utils/imageProcessing';

interface ResultModalProps {
  imageUrl: string;
  onClose: () => void;
  promptDetails: string;
}

export const ResultModal: React.FC<ResultModalProps> = ({ imageUrl, onClose, promptDetails }) => {
  const [currentImage, setCurrentImage] = useState(imageUrl);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const handlePrint = async () => {
    setIsProcessingAction(true);
    try {
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
      const brandedImage = await embedLogoOnImage(currentImage);
      const link = document.createElement('a');
      link.href = brandedImage;
      link.download = "bible-sketch-coloring-page.png";
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
    setIsProcessingEdit(true);
    try {
      const newImage = await editColoringPage(currentImage, editPrompt);
      
      const user = auth.currentUser;
      if (user) {
         await deductCredits(user.uid, 1, "Edited Sketch via Gallery");
      }
      
      setCurrentImage(newImage);
      setIsEditing(false);
      setEditPrompt("");
    } catch (e) {
      alert("Failed to edit image. Please try again or check credits.");
    } finally {
      setIsProcessingEdit(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#FFF7ED] w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative animate-in fade-in zoom-in duration-300">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-white/80 hover:bg-white p-2 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Image Preview Area */}
        <div className="flex-1 bg-[#E5E5E5] relative flex items-center justify-center p-4 md:p-8 overflow-auto texture-paper">
           {/* Visual Protection Container */}
           <div className="relative bg-white shadow-2xl w-full max-w-lg aspect-[3/4]">
              
              {/* No Watermark for Owner Edit View */}

              <img 
                src={currentImage} 
                alt="Generated Coloring Page" 
                onContextMenu={(e) => e.preventDefault()}
                className="w-full h-full object-contain select-none"
              />
              
              {/* Loading Overlay for Edit */}
              {(isProcessingEdit || isProcessingAction) && (
                <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center backdrop-blur-sm z-30">
                  <Wand2 className="w-12 h-12 text-[#7C3AED] animate-pulse mb-4" />
                  <p className="font-display font-bold text-[#7C3AED] text-xl">
                     {isProcessingAction ? 'Preparing file...' : 'Refining creation...'}
                  </p>
                </div>
              )}
           </div>
        </div>

        {/* Sidebar / Actions */}
        <div className="w-full md:w-96 bg-white p-6 md:p-8 flex flex-col border-l border-gray-100">
          <div className="flex-1 overflow-y-auto">
            <h2 className="font-display text-3xl font-bold text-gray-800 mb-2">Your Masterpiece</h2>
            <p className="text-gray-500 text-sm mb-6">Ready to print and color!</p>

            {/* Primary Actions */}
            <div className="space-y-3 mb-8">
              <Button 
                variant="primary" 
                size="lg" 
                className="w-full gap-2 shadow-xl shadow-purple-200/50"
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
            </div>

            {/* Edit Section */}
            <div className="bg-purple-50 rounded-xl p-4 mb-6 border border-purple-100">
              <div className="flex items-center justify-between mb-3">
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
                  Want to add or change something?
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea 
                    className="w-full p-3 rounded-lg border border-purple-200 text-sm focus:ring-2 focus:ring-[#7C3AED] focus:outline-none resize-none"
                    rows={3}
                    placeholder='e.g. "Add a dove in the sky" or "Make the clouds fluffy"'
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={handleEdit}
                      disabled={!editPrompt || isProcessingEdit}
                      className="flex-1"
                    >
                      Apply
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

             {/* Details */}
             <div className="mt-auto pt-6 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Details</h3>
                <p className="text-xs text-gray-500 leading-relaxed italic">
                  {promptDetails}
                </p>
             </div>

          </div>

          {/* Footer Socials */}
          <div className="mt-6 flex justify-center gap-4 pt-6 border-t border-gray-100">
            <button className="p-2 text-gray-400 hover:text-[#7C3AED] transition-colors"><Share2 className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};
