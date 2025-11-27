
import React, { useState, useEffect } from 'react';
import { X, Printer, Download, Trash2, Globe, Lock, Heart, AlertTriangle, Bookmark, Check, User as UserIcon, Wand2, AlertCircle, Facebook, Save, RotateCcw, Tag } from 'lucide-react';
import { Button } from './ui/Button';
import { Sketch, AgeGroup, ArtStyle } from '../types';
import { deleteSketch, updateSketchVisibility, toggleBookmark, checkIsBookmarked, getUserDocument, deductCredits, saveSketch, canDownload, deductDownload, auth, updateSketchTags } from '../services/firebase';
import { TagSelector, TagDisplay } from './TagSelector';
import { editColoringPage } from '../services/gemini';
import { embedLogoOnImage } from '../utils/imageProcessing';
import { WatermarkOverlay } from './WatermarkOverlay';
import { PremiumModal } from './PremiumModal';
import { LazyImage } from './ui/LazyImage';
import { generateShareData, openSharePopup } from '../utils/socialSharing';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sketch: Sketch;
  isOwner: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Sketch>) => void;
  onCreate?: (newSketch: Sketch) => void;
  onBookmark: (id: string, isBookmarked: boolean) => void;
  currentUserId?: string;
  onBless: () => void;
  isBlessed: boolean;
  onAuthorClick?: (userId: string) => void;
}

// Pinterest Icon SVG
const PinterestIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.399.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.173 0 7.41 2.967 7.41 6.923 0 4.133-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.62 0 12.017 0z" />
  </svg>
);

export const GalleryModal: React.FC<GalleryModalProps> = ({
  isOpen, onClose, sketch, isOwner, onDelete, onUpdate, onCreate, onBookmark, currentUserId, onBless, isBlessed, onAuthorClick
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [authorData, setAuthorData] = useState<{ name: string, photo: string } | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Preview State (Before Saving to Storage)
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSavingPreview, setIsSavingPreview] = useState(false);

  // Premium Modal State
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [downloadsRemaining, setDownloadsRemaining] = useState(0);
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  // Tags State
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [localTags, setLocalTags] = useState<string[]>(sketch.tags || []);
  const [isSavingTags, setIsSavingTags] = useState(false);

  // Fetch download quota on mount
  useEffect(() => {
    if (currentUserId) {
      canDownload(currentUserId).then(quota => {
        setDownloadsRemaining(quota.remaining);
        setIsPremiumUser(quota.isPremium);
      });
    }
  }, [currentUserId]);

  useEffect(() => {
    let active = true;
    const currentUser = auth.currentUser;

    if (currentUser) {
      if (sketch.isBookmark && sketch.userId === currentUser.uid) {
        setIsBookmarked(true);
      } else {
        checkIsBookmarked(currentUser.uid, sketch.id).then((saved) => {
          if (active) setIsBookmarked(saved);
        });
      }
    } else {
      setIsBookmarked(false);
    }

    // Fetch Author Data if not the owner
    if (!isOwner && sketch.userId) {
      getUserDocument(sketch.userId).then(doc => {
        if (active && doc) {
          const data = doc as any;
          setAuthorData({
            name: data.displayName || 'Unknown Artist',
            photo: data.photoURL || ''
          });
        }
      });
    }

    // Reset preview when sketch changes
    setPreviewImage(null);
    setIsEditing(false);
    setEditPrompt("");

    // Reset tags state
    setLocalTags(sketch.tags || []);
    setIsEditingTags(false);

    return () => { active = false; };
  }, [sketch.id, sketch.isBookmark, sketch.userId, isOwner]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    if (!currentUserId) {
      alert("Please log in to print.");
      return;
    }

    // Check download quota
    const quota = await canDownload(currentUserId);
    if (!quota.allowed) {
      setDownloadsRemaining(quota.remaining);
      setShowPremiumModal(true);
      return;
    }

    try {
      const source = previewImage || sketch.imageUrl;
      // Process image before printing
      const brandedImage = await embedLogoOnImage(source);

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

        // Deduct from quota (skipped for premium users)
        await deductDownload(currentUserId);
        // Update displayed count
        if (!isPremiumUser) {
          setDownloadsRemaining(prev => Math.max(0, prev - 1));
        }
      }
    } catch (e) {
      console.error("Print failed", e);
      alert("Could not print image.");
    }
  };

  const handleDownload = async () => {
    if (!currentUserId) {
      alert("Please log in to download.");
      return;
    }

    // Check download quota
    const quota = await canDownload(currentUserId);
    if (!quota.allowed) {
      setDownloadsRemaining(quota.remaining);
      setShowPremiumModal(true);
      return;
    }

    setIsDownloading(true);
    try {
      const source = previewImage || sketch.imageUrl;
      // Process image before downloading
      const brandedImage = await embedLogoOnImage(source);

      const link = document.createElement('a');
      link.href = brandedImage;
      link.download = `bible-sketch-${sketch.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Deduct from quota (skipped for premium users)
      await deductDownload(currentUserId);
      // Update displayed count
      if (!isPremiumUser) {
        setDownloadsRemaining(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Download failed", error);
      alert("Could not download image.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleToggleVisibility = async () => {
    setIsUpdating(true);
    try {
      const newVisibility = !sketch.isPublic;
      await updateSketchVisibility(sketch.id, newVisibility);
      onUpdate(sketch.id, { isPublic: newVisibility });
    } catch (error) {
      console.error(error);
      alert("Failed to update visibility");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSketch(sketch.id, sketch.storagePath, sketch.isBookmark);
      onDelete(sketch.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete sketch", error);
      alert("Failed to delete sketch. Please try again.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEdit = async () => {
    if (!editPrompt.trim()) return;
    setEditError(null);
    setIsProcessingEdit(true);

    try {
      if (currentUserId) {
        // Deduct credits for generation
        const promptDesc = sketch.promptData?.book ? `${sketch.promptData.book} ${sketch.promptData.chapter}` : 'Gallery Item';
        await deductCredits(currentUserId, 1, `Edited Sketch: ${promptDesc}`);
      } else {
        throw new Error("You must be logged in to edit.");
      }

      // Use preview as base if exists, else original
      const sourceImage = previewImage || sketch.imageUrl;
      const newImageBase64 = await editColoringPage(sourceImage, editPrompt);

      // Update Preview State (Do not save to storage yet)
      setPreviewImage(newImageBase64);

      setIsEditing(false);
      setEditPrompt("");
    } catch (e: any) {
      console.error("Edit failed", e);
      if (e.message === "INSUFFICIENT_CREDITS") {
        setEditError("Not enough credits. Please purchase more.");
      } else {
        setEditError(e.message || "Failed to edit image");
      }
    } finally {
      setIsProcessingEdit(false);
    }
  };

  const handleSavePreview = async () => {
    if (!previewImage || !currentUserId) return;

    if (!sketch.promptData) {
      console.error("Cannot save: missing promptData");
      alert("Could not save due to missing sketch metadata.");
      return;
    }

    setIsSavingPreview(true);
    try {
      const context = {
        reference: {
          book: sketch.promptData.book,
          chapter: sketch.promptData.chapter,
          startVerse: sketch.promptData.start_verse,
          endVerse: sketch.promptData.end_verse
        },
        ageGroup: (sketch.promptData.age_group === "Pre-Teen" ? AgeGroup.TEEN : sketch.promptData.age_group) as AgeGroup,
        artStyle: sketch.promptData.art_style as ArtStyle
      };

      // Now we actually upload to storage
      const newSketch = await saveSketch(currentUserId, previewImage, context, false);

      if (onCreate) {
        onCreate(newSketch);
        // The parent will likely switch the modal to the new sketch, but we clear state just in case
        setPreviewImage(null);
      } else {
        onClose();
      }
    } catch (e) {
      console.error("Failed to save preview", e);
      alert("Failed to save image to storage. Please try again.");
    } finally {
      setIsSavingPreview(false);
    }
  };

  const handleDiscardPreview = () => {
    if (window.confirm("Discard these changes? Credits used for generation will not be refunded.")) {
      setPreviewImage(null);
    }
  };

  const handleBookmarkClick = async () => {
    if (!auth.currentUser) {
      alert("Please log in to save sketches.");
      return;
    }
    setBookmarkLoading(true);
    try {
      const newStatus = !isBookmarked;
      await toggleBookmark(auth.currentUser.uid, sketch);
      setIsBookmarked(newStatus);
      onBookmark(sketch.id, newStatus);

      if (sketch.isBookmark && !newStatus) {
        onClose();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update bookmark");
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleAuthorClick = () => {
    if (onAuthorClick && sketch.userId) {
      onAuthorClick(sketch.userId);
    }
  };

  const handleSaveTags = async () => {
    setIsSavingTags(true);
    try {
      await updateSketchTags(sketch.id, localTags);
      onUpdate(sketch.id, { tags: localTags });
      setIsEditingTags(false);
    } catch (error) {
      console.error("Failed to save tags:", error);
      alert("Failed to save tags. Please try again.");
    } finally {
      setIsSavingTags(false);
    }
  };

  const handleCancelTagEdit = () => {
    setLocalTags(sketch.tags || []);
    setIsEditingTags(false);
  };

  const handleFacebookShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { url } = generateShareData(sketch, 'facebook');
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    openSharePopup(shareUrl);
  };

  const handlePinterestShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { url, description } = generateShareData(sketch, 'pinterest');
    const media = previewImage || sketch.imageUrl;
    const shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(media)}&description=${encodeURIComponent(description)}`;
    openSharePopup(shareUrl);
  };

  const promptText = sketch.promptData
    ? `${sketch.promptData.book} ${sketch.promptData.chapter}:${sketch.promptData.start_verse}${sketch.promptData.end_verse && sketch.promptData.end_verse > sketch.promptData.start_verse ? '-' + sketch.promptData.end_verse : ''}`
    : "Unknown Verse";

  const dateText = new Date(sketch.timestamp).toLocaleDateString();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-white/80 hover:bg-white p-2 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex-1 bg-[#E5E5E5] relative flex items-center justify-center p-6 md:p-12 texture-paper overflow-hidden">

          {/* Visual Protection Container */}
          <div className="relative bg-white shadow-2xl w-full max-w-lg aspect-[3/4] group">

            {/* 
                  LazyImage Replacement:
                  If we are previewing an edit (previewImage exists), we do NOT want to load the original thumbnail.
                  We only use thumbnailPath/storagePath when viewing the original sketch.
              */}
            <LazyImage
              src={previewImage || sketch.imageUrl}
              alt={promptText}
              thumbnailPath={previewImage ? undefined : sketch.thumbnailPath}
              storagePath={previewImage ? undefined : sketch.storagePath}
              className="w-full h-full relative z-0 bg-white"
              aspectRatio="" // Parent container handles aspect ratio
            />

            {/* Watermark Overlay (Full Cover) - Only for non-owners */}
            {!isOwner && <WatermarkOverlay />}

            {isProcessingEdit && (
              <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center backdrop-blur-sm z-30">
                <Wand2 className="w-12 h-12 text-[#7C3AED] animate-pulse mb-4" />
                <p className="font-display font-bold text-[#7C3AED] text-xl">Refining creation...</p>
              </div>
            )}
            {previewImage && !isProcessingEdit && (
              <div className="absolute top-4 right-4 bg-[#FCD34D] text-[#7C3AED] font-bold text-xs px-3 py-1 rounded-full shadow-md border border-white animate-pulse z-30">
                Unsaved Preview
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-96 bg-white p-8 flex flex-col border-l border-gray-100 overflow-y-auto">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-gray-800 mb-1">{promptText}</h2>
            <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-2">
              <span className="bg-purple-50 text-[#7C3AED] px-2 py-0.5 rounded-md font-bold text-xs uppercase">
                {(sketch.promptData?.age_group === "Pre-Teen" ? "Teen" : sketch.promptData?.age_group) || "General"}
              </span>
              <span className="text-gray-300">•</span>
              <span>{dateText}</span>
            </div>

            <div className="flex items-center gap-1 text-sm text-gray-400 mb-4">
              <Heart className={`w-4 h-4 ${sketch.blessCount > 0 ? 'fill-red-400 text-red-400' : ''}`} />
              {sketch.blessCount || 0} Blessings
            </div>

            {/* Creator Attribution */}
            {authorData && !isOwner && (
              <div className="p-3 bg-gray-50 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors border border-gray-100 group" onClick={handleAuthorClick}>
                <div className="w-10 h-10 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center overflow-hidden shrink-0">
                  {authorData.photo ? (
                    <img src={authorData.photo} alt={authorData.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-[#7C3AED]" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">Created By</p>
                  <p className="text-sm font-bold text-gray-800 group-hover:text-[#7C3AED] transition-colors">{authorData.name}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 mb-8">

            {/* Primary Actions */}
            {previewImage ? (
              // Preview Mode Buttons
              <div className="space-y-3 p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                <p className="text-xs font-bold text-yellow-700 text-center mb-2">You have unsaved changes</p>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleSavePreview}
                  isLoading={isSavingPreview}
                >
                  <Save className="w-5 h-5" />
                  Save New Version
                </Button>
                <Button
                  variant="ghost"
                  className="w-full gap-2 text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={handleDiscardPreview}
                >
                  <RotateCcw className="w-4 h-4" />
                  Discard Changes
                </Button>
              </div>
            ) : (
              // Standard Mode Buttons
              <>
                <Button
                  variant="outline"
                  className={`w-full gap-2 border-2 ${isBlessed ? "bg-red-50 border-red-400 text-red-500 cursor-default opacity-80" : "border-red-400 text-red-500 hover:bg-red-50"}`}
                  onClick={onBless}
                  disabled={isBlessed}
                >
                  <Heart className={`w-5 h-5 ${isBlessed ? "fill-current" : ""}`} />
                  {isBlessed ? "Blessed" : "Bless this Sketch"}
                </Button>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full gap-2 shadow-lg shadow-purple-100"
                  onClick={handlePrint}
                >
                  <Printer className="w-5 h-5" />
                  Print PDF
                  {!isOwner && !isPremiumUser && currentUserId && (
                    <span className="ml-1 text-xs opacity-80">({downloadsRemaining} left)</span>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleDownload}
                  isLoading={isDownloading}
                >
                  <Download className="w-5 h-5" />
                  Download
                  {!isOwner && !isPremiumUser && currentUserId && (
                    <span className="ml-1 text-xs opacity-80">({downloadsRemaining} left)</span>
                  )}
                </Button>

                {currentUserId && !isOwner && (
                  <Button
                    variant={isBookmarked ? "secondary" : "outline"}
                    className={`w-full gap-2 ${isBookmarked ? "bg-purple-50 border-purple-100 text-[#7C3AED]" : ""}`}
                    onClick={handleBookmarkClick}
                    disabled={bookmarkLoading}
                  >
                    {isBookmarked ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                    {isBookmarked ? "Saved to Collection" : "Save to Collection"}
                  </Button>
                )}
              </>
            )}

            {/* Share Section */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleFacebookShare}
                className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 flex items-center justify-center transition-colors"
                title="Share on Facebook"
              >
                <Facebook className="w-5 h-5" />
              </button>
              <button
                onClick={handlePinterestShare}
                className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 flex items-center justify-center transition-colors"
                title="Pin on Pinterest"
              >
                <PinterestIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {isOwner && (
            <div className="mt-auto border-t border-gray-100 pt-6 space-y-3">

              {/* Tags Section */}
              {!sketch.isBookmark && (
                <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-[#7C3AED] font-bold text-sm">
                      <Tag className="w-4 h-4" />
                      <span>Tags</span>
                    </div>
                    {!isEditingTags && (
                      <button
                        onClick={() => setIsEditingTags(true)}
                        className="text-xs font-bold text-gray-500 hover:text-[#7C3AED] underline underline-offset-2"
                      >
                        {localTags.length > 0 ? 'Edit' : 'Add Tags'}
                      </button>
                    )}
                  </div>

                  {isEditingTags ? (
                    <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                      <TagSelector
                        selectedTags={localTags}
                        onChange={setLocalTags}
                        compact
                      />
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleSaveTags}
                          isLoading={isSavingTags}
                          className="flex-1 text-xs py-1 h-8"
                        >
                          Save Tags
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelTagEdit}
                          className="text-xs py-1 h-8"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {localTags.length > 0 ? (
                        <TagDisplay tags={localTags} size="sm" />
                      ) : (
                        <p className="text-xs text-gray-400 italic">No tags yet. Add tags to help others discover this sketch.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Edit Section (Refine Creation) */}
              <div className={`bg-purple-50 rounded-2xl p-4 border border-purple-100 mb-4 ${previewImage ? 'ring-2 ring-[#FCD34D]' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-[#7C3AED] font-bold text-sm">
                    <Wand2 className="w-4 h-4" />
                    <span>{previewImage ? 'Refine Preview' : 'Refine Creation'}</span>
                  </div>
                  <span className="text-xs font-bold bg-white text-gray-500 px-2 py-0.5 rounded-md border border-purple-100">
                    1 Credit
                  </span>
                </div>

                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-bold text-gray-500 hover:text-[#7C3AED] underline underline-offset-2 w-full text-left"
                  >
                    Modify this image...
                  </button>
                ) : (
                  <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-200">
                    {editError && (
                      <div className="flex items-center gap-2 text-xs text-red-500 font-bold bg-red-50 p-2 rounded">
                        <AlertCircle className="w-3 h-3" />
                        {editError}
                      </div>
                    )}
                    <textarea
                      className="w-full p-2 rounded-lg border border-purple-200 text-xs focus:ring-2 focus:ring-[#7C3AED] focus:outline-none resize-none bg-white"
                      rows={2}
                      placeholder='e.g. "Add a dove"'
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
                        className="flex-1 text-xs py-1 h-8"
                      >
                        Generate Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(false)}
                        className="text-xs py-1 h-8"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Management</p>

              {!sketch.isBookmark && !previewImage && (
                <button
                  onClick={handleToggleVisibility}
                  disabled={isUpdating}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${sketch.isPublic
                    ? "bg-green-50 border-green-100 text-green-700"
                    : "bg-gray-50 border-gray-200 text-gray-600"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {sketch.isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    <span className="font-bold text-sm">{sketch.isPublic ? "Public" : "Private"}</span>
                  </div>
                  <div className="text-xs font-bold underline">
                    {isUpdating ? "..." : "Change"}
                  </div>
                </button>
              )}

              {showDeleteConfirm ? (
                <div className="p-4 rounded-xl border border-red-100 bg-red-50 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 text-red-600 mb-3">
                    <AlertTriangle className="w-5 h-5" />
                    <p className="text-xs font-bold">Are you sure? Cannot undo.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-1 bg-red-500 text-white py-2 rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
                    >
                      {isDeleting ? "Deleting..." : "Yes, Delete"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 bg-white text-gray-600 border border-gray-200 py-2 rounded-lg text-xs font-bold hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={!!previewImage}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="font-bold text-sm">
                    {sketch.isBookmark ? "Remove Bookmark" : "Delete Sketch"}
                  </span>
                </button>
              )}
            </div>
          )}

        </div>
      </div>

      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        remainingDownloads={downloadsRemaining}
      />
    </div>
  );
};
