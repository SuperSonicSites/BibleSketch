
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Printer, Download, Heart, Facebook, AlertTriangle, ArrowRight, Lock, Bookmark, Check, Loader2, Trash2, Globe } from 'lucide-react';
import { getSketchById, blessSketch, getUserBlessedSketchIds, getUserDocument, toggleBookmark, checkIsBookmarked, auth, deleteSketch, updateSketchVisibility, canDownload, deductDownload } from '../services/firebase';
import { Sketch } from '../types';
import { Button } from './ui/Button';
import { WatermarkOverlay } from './WatermarkOverlay';
import { PremiumModal } from './PremiumModal';
import { LazyImage } from './ui/LazyImage';

// Pinterest Icon
const PinterestIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.399.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.173 0 7.41 2.967 7.41 6.923 0 4.133-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.62 0 12.017 0z" />
  </svg>
);

interface SketchPageProps {
  user: any;
  onRequireAuth: (action: () => void) => void;
}

export const SketchPage: React.FC<SketchPageProps> = ({ user, onRequireAuth }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sketch, setSketch] = useState<Sketch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string>("A Bible Sketch User");

  const [isBlessed, setIsBlessed] = useState(false);
  const [blessCount, setBlessCount] = useState(0);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // Management State
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Premium Modal State
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [downloadsRemaining, setDownloadsRemaining] = useState(0);

  // 1. Fetch Sketch Data
  useEffect(() => {
    let isMounted = true;

    const performFetch = async () => {
      if (!id) return;
      setLoading(true);
      setError(null); // Clear errors before new fetch

      try {
        const data = await getSketchById(id);
        if (isMounted) {
          if (data) {
            setSketch(data);
            setBlessCount(data.blessCount || 0);

            // Fetch Author Name
            if (data.userId) {
              try {
                // Use prop user to avoid extra network request if it's the current user
                if (user && user.uid === data.userId && user.displayName) {
                  setAuthorName(user.displayName);
                } else {
                  getUserDocument(data.userId).then(userDoc => {
                    if (isMounted && userDoc) {
                      const userData = userDoc as any;
                      if (userData.displayName) {
                        setAuthorName(userData.displayName);
                      }
                    }
                  }).catch(e => {
                    console.warn("Could not fetch author details (likely permission restricted)", e);
                  });
                }
              } catch (e) {
                console.warn("Author fetch error", e);
              }
            }
          } else {
            setError("Sketch not found");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error(err);
          if (err.code === 'permission-denied' || err.message?.includes('permission')) {
            setError("This sketch is private or restricted.");
          } else {
            setError("Failed to load sketch");
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    performFetch();

    return () => {
      isMounted = false;
    };
  }, [id, user?.uid]);

  // 2. Sync User State (Bookmarks, Blessings)
  useEffect(() => {
    if (!sketch || !user) {
      setIsBlessed(false);
      setIsBookmarked(false);
      return;
    }

    let active = true;

    // Check Blessed Status
    getUserBlessedSketchIds(user.uid).then(ids => {
      if (active && ids.includes(sketch.id)) setIsBlessed(true);
    }).catch(e => console.warn("Could not fetch blessed IDs", e));

    // Check Bookmark Status
    checkIsBookmarked(user.uid, sketch.id).then(saved => {
      if (active) setIsBookmarked(saved);
    }).catch(e => console.warn("Could not fetch bookmark status", e));

    return () => { active = false; };
  }, [user?.uid, sketch?.id]);

  // SEO Meta Tags Effect
  useEffect(() => {
    if (!sketch || !sketch.isPublic) return;

    const book = sketch.promptData?.book || "Bible";
    const chapter = sketch.promptData?.chapter || "";
    const startVerse = sketch.promptData?.start_verse || "";

    const title = `${book} ${chapter} Coloring Page | Bible Sketch`;
    const description = `Free printable coloring page for ${book} ${chapter}:${startVerse}. Created by ${authorName} on Bible Sketch.`;
    const url = window.location.href;
    const image = sketch.imageUrl;

    // Update Title
    document.title = title;

    // Helper to update/create meta tags
    const updateMeta = (attrName: 'name' | 'property', attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    updateMeta('name', 'description', description);

    // Open Graph
    updateMeta('property', 'og:type', 'website');
    updateMeta('property', 'og:url', url);
    updateMeta('property', 'og:title', title);
    updateMeta('property', 'og:description', description);
    updateMeta('property', 'og:image', image);

    // Twitter
    updateMeta('name', 'twitter:card', 'summary_large_image');
    updateMeta('name', 'twitter:url', url);
    updateMeta('name', 'twitter:title', title);
    updateMeta('name', 'twitter:description', description);
    updateMeta('name', 'twitter:image', image);

  }, [sketch, authorName]);

  const handleBless = async () => {
    if (isBlessed || !sketch) return;

    const performBless = async () => {
      if (!auth.currentUser) return; // Should be guaranteed by requireAuth flow
      setIsBlessed(true);
      setBlessCount(c => c + 1);
      await blessSketch(sketch.id, auth.currentUser.uid);
    };

    if (!user) {
      onRequireAuth(performBless);
    } else {
      performBless();
    }
  };

  const handleBookmark = async () => {
    if (!sketch) return;

    const performBookmark = async () => {
      if (!auth.currentUser) return;
      setBookmarkLoading(true);
      try {
        const newStatus = !isBookmarked;
        await toggleBookmark(auth.currentUser.uid, sketch);
        setIsBookmarked(newStatus);
      } catch (e) {
        console.error("Bookmark failed", e);
        alert("Failed to save to collection.");
      } finally {
        setBookmarkLoading(false);
      }
    };

    if (!user) {
      onRequireAuth(performBookmark);
    } else {
      performBookmark();
    }
  };

  const handlePrint = async () => {
    if (!sketch) return;
    if (!user) {
      onRequireAuth(() => handlePrint());
      return;
    }

    // Check download quota
    const quota = await canDownload(user.uid);
    if (!quota.allowed) {
      setDownloadsRemaining(quota.remaining);
      setShowPremiumModal(true);
      return;
    }

    const book = sketch.promptData?.book || "Bible Sketch";
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const html = `
          <html>
          <head><title>Print ${book} Coloring Page</title></head>
          <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh;">
              <img src="${sketch.imageUrl}" style="max-height:95vh; max-width:95vw;" onload="window.print();" />
          </body>
          </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();

      // Deduct from quota (skipped for premium users)
      await deductDownload(user.uid);
    }
  };

  const handleDownload = async () => {
    if (!sketch) return;
    if (!user) {
      onRequireAuth(() => handleDownload());
      return;
    }

    // Check download quota
    const quota = await canDownload(user.uid);
    if (!quota.allowed) {
      setDownloadsRemaining(quota.remaining);
      setShowPremiumModal(true);
      return;
    }

    const link = document.createElement('a');
    link.href = sketch.imageUrl;
    link.download = `bible-sketch-${sketch.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Deduct from quota (skipped for premium users)
    await deductDownload(user.uid);
  };

  const handleShare = (platform: 'facebook' | 'pinterest') => {
    if (!sketch) return;
    const url = window.location.href;
    const img = sketch.imageUrl;
    const book = sketch.promptData?.book || "Bible";
    const chapter = sketch.promptData?.chapter || "Sketch";
    const desc = `${book} ${chapter} Coloring Page`;

    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    } else {
      window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(img)}&description=${encodeURIComponent(desc)}`, '_blank');
    }
  };

  const handleToggleVisibility = async () => {
    if (!sketch) return;
    setIsUpdating(true);
    try {
      const newVisibility = !sketch.isPublic;
      await updateSketchVisibility(sketch.id, newVisibility);
      setSketch(prev => prev ? { ...prev, isPublic: newVisibility } : null);
    } catch (error) {
      console.error(error);
      alert("Failed to update visibility");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!sketch) return;
    setIsDeleting(true);
    try {
      await deleteSketch(sketch.id, sketch.storagePath, sketch.isBookmark);
      navigate('/gallery');
    } catch (error) {
      console.error("Failed to delete sketch", error);
      alert("Failed to delete sketch. Please try again.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-gray-400 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-purple-200" />
        <p>Loading sketch...</p>
      </div>
    );
  }

  if (error || !sketch) {
    return (
      <div className="max-w-md mx-auto mt-20 px-4 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">Sketch Not Found</h2>
        <p className="text-gray-500 mb-8">{error || "This coloring page may have been deleted or is private."}</p>
        <Link to="/gallery">
          <Button>Back to Gallery</Button>
        </Link>
      </div>
    );
  }

  const isOwner = user?.uid === sketch.userId;

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-12 animate-in fade-in duration-500">
        <div className="mb-8">
          <Link
            to="/gallery"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#7C3AED] font-bold transition-colors"
          >
            <div className="p-1 bg-white rounded-full border border-gray-200">
              <ArrowRight className="w-4 h-4 rotate-180" />
            </div>
            Back to Gallery
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Image Column */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 bg-[#E5E5E5] texture-paper flex items-center justify-center overflow-hidden relative">

              {/* Visual Protection Container */}
              <div className="relative bg-white shadow-2xl w-full max-w-lg aspect-[3/4] group select-none">

                {/* Image Layer Replaced with LazyImage */}
                <LazyImage
                  src={sketch.imageUrl}
                  alt={`${sketch.promptData?.book || 'Bible'} Coloring Page`}
                  thumbnailPath={sketch.thumbnailPath}
                  storagePath={sketch.storagePath}
                  className="w-full h-full relative z-0 bg-white"
                  aspectRatio="" // Parent handles aspect ratio
                />

                {/* Watermark Overlay Layer */}
                {!isOwner && <WatermarkOverlay />}
              </div>

            </div>
          </div>

          {/* Details Column */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex-1">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                {sketch.promptData?.book} {sketch.promptData?.chapter}:{sketch.promptData?.start_verse}
                {sketch.promptData?.end_verse && sketch.promptData.end_verse > sketch.promptData.start_verse && `-${sketch.promptData.end_verse}`}
              </h1>

              <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-6">
                <span className="bg-purple-50 text-[#7C3AED] px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wide">
                  {sketch.promptData?.age_group}
                </span>
                <span className="flex items-center">
                  Created by {authorName}
                </span>
                <span className="text-gray-300">•</span>
                <span>{new Date(sketch.timestamp).toLocaleDateString()}</span>
              </div>

              <div className="space-y-4 mb-10">
                <Button
                  variant="outline"
                  className={`w-full gap-2 border-2 ${isBlessed ? "bg-red-50 border-red-400 text-red-500 cursor-default opacity-80" : "border-red-400 text-red-500 hover:bg-red-50"}`}
                  onClick={handleBless}
                  disabled={isBlessed}
                >
                  <Heart className={`w-5 h-5 ${isBlessed ? "fill-current" : ""}`} />
                  {isBlessed ? "Blessed" : "Bless this Sketch"} ({blessCount})
                </Button>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full gap-2 shadow-lg shadow-purple-100"
                  onClick={handlePrint}
                >
                  <Printer className="w-5 h-5" />
                  Print PDF
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleDownload}
                >
                  <Download className="w-5 h-5" />
                  Download Image
                </Button>

                {!isOwner && (
                  <Button
                    variant={isBookmarked ? "secondary" : "outline"}
                    className={`w-full gap-2 ${isBookmarked ? "bg-purple-50 border-purple-100 text-[#7C3AED]" : ""}`}
                    onClick={handleBookmark}
                    disabled={bookmarkLoading}
                  >
                    {isBookmarked ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                    {isBookmarked ? "Saved to Collection" : "Save to Collection"}
                  </Button>
                )}
              </div>

              <div className="pt-6 border-t border-gray-100 mb-8">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Share this sketch</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleShare('facebook')}
                    className="flex-1 py-3 rounded-xl border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-200 flex items-center justify-center transition-colors gap-2 font-bold text-sm"
                  >
                    <Facebook className="w-5 h-5" />
                    Facebook
                  </button>
                  <button
                    onClick={() => handleShare('pinterest')}
                    className="flex-1 py-3 rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-200 flex items-center justify-center transition-colors gap-2 font-bold text-sm"
                  >
                    <PinterestIcon className="w-5 h-5" />
                    Pinterest
                  </button>
                </div>
              </div>

              {isOwner && (
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Owner Controls</p>

                  <div className="space-y-3">
                    <button
                      onClick={handleToggleVisibility}
                      disabled={isUpdating}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${sketch.isPublic
                        ? "bg-green-50 border-green-100 text-green-700"
                        : "bg-white border-gray-200 text-gray-600"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {sketch.isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                        <div className="text-left">
                          <p className="font-bold text-sm">{sketch.isPublic ? "Publicly Visible" : "Private"}</p>
                          <p className="text-xs opacity-80">{sketch.isPublic ? "Anyone can see this" : "Only you can see this"}</p>
                        </div>
                      </div>
                      <div className="text-xs font-bold underline">
                        {isUpdating ? "..." : "Change"}
                      </div>
                    </button>

                    {showDeleteConfirm ? (
                      <div className="p-4 rounded-xl border border-red-100 bg-red-50 animate-in fade-in">
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
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-100 bg-white text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                        <span className="font-bold text-sm">Delete Sketch</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        remainingDownloads={downloadsRemaining}
      />
    </>
  );
};
