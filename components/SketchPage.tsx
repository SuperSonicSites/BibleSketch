
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Printer, Download, Heart, Facebook, AlertTriangle, ArrowRight, Lock, Bookmark, Check, Loader2, Trash2, Globe, Tag, Twitter, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { getSketchById, blessSketch, getUserBlessedSketchIds, getUserDocument, toggleBookmark, checkIsBookmarked, auth, deleteSketch, updateSketchVisibility, canDownload, deductDownload, updateSketchTags } from '../services/firebase';
import { Sketch } from '../types';
import { generateSketchSlug } from '../utils/urlHelpers';
import { generateShareData, openSharePopup } from '../utils/socialSharing';
import { Button } from './ui/Button';
import { WatermarkOverlay } from './WatermarkOverlay';
import { PremiumModal } from './PremiumModal';
import { LazyImage } from './ui/LazyImage';
import { TagDisplay, TagSelector } from './TagSelector';

import { SketchSEO } from './SketchSEO';
import { APP_DOMAIN } from '../constants';

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
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  // Tag Editing State
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Fetch download quota on mount
  useEffect(() => {
    if (user?.uid) {
      canDownload(user.uid).then(quota => {
        setDownloadsRemaining(quota.remaining);
        setIsPremiumUser(quota.isPremium);
      });
    }
  }, [user?.uid]);

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
            setLocalTags(data.tags || []);

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
      // Update displayed count
      if (!isPremiumUser) {
        setDownloadsRemaining(prev => Math.max(0, prev - 1));
      }
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
    // Update displayed count
    if (!isPremiumUser) {
      setDownloadsRemaining(prev => Math.max(0, prev - 1));
    }
  };

  const handleShare = (platform: 'facebook' | 'pinterest' | 'twitter') => {
    if (!sketch) return;
    
    const { url, description, title } = generateShareData(sketch, platform);
    const img = sketch.imageUrl;

    if (platform === 'facebook') {
      openSharePopup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
    } else if (platform === 'twitter') {
      const text = `Check out this free ${title} coloring page! Created with Bible Sketch.`;
      openSharePopup(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=BibleSketch,ChristianArt,ColoringPage`);
    } else {
      openSharePopup(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(img)}&description=${encodeURIComponent(description)}`);
    }
  };

  const handleCopyLink = async () => {
     if (!sketch) return;
     const slug = generateSketchSlug(sketch);
     const url = `${APP_DOMAIN}/coloring-page/${slug}/${sketch.id}`;
     
     try {
        await navigator.clipboard.writeText(url);
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 2000);
     } catch (err) {
        console.error("Failed to copy", err);
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

  const handleSaveTags = async () => {
    if (!sketch) return;
    setIsSavingTags(true);
    try {
      await updateSketchTags(sketch.id, localTags);
      setSketch(prev => prev ? { ...prev, tags: localTags } : null);
      setIsEditingTags(false);
    } catch (error) {
      console.error("Failed to save tags:", error);
      alert("Failed to save tags. Please try again.");
    } finally {
      setIsSavingTags(false);
    }
  };

  const handleCancelTagEdit = () => {
    setLocalTags(sketch?.tags || []);
    setIsEditingTags(false);
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

  // Calculate SEO content (Primitive values passed to Memoized Component)
  let title = 'Bible Coloring Page | Bible Sketch';
  let description = 'Free printable Bible coloring page. Perfect for Sunday School, VBS, homeschool, and family devotionals.';
  let imageUrl = sketch?.imageUrl;

  // Helper to display "Teen" instead of legacy "Pre-Teen"
  const displayAgeGroup = (age: string | undefined) => {
    if (age === "Pre-Teen") return "Teen";
    return age;
  };

  // Use the shared utility to generate SEO content
  let pinterestDescription = '';
  if (sketch?.promptData) {
    const shareData = generateShareData(sketch, 'default');
    title = shareData.title;
    description = shareData.description;
    
    // Get Pinterest-specific description (includes title prepended)
    const pinterestData = generateShareData(sketch, 'pinterest');
    pinterestDescription = pinterestData.description;
  }

  const keywords = sketch?.tags ? sketch.tags.join(', ') : "Bible, Coloring Page, Christian Art";
  const genre = sketch?.promptData?.art_style || "Religious Art";

  return (
    <>
      <SketchSEO 
        title={title} 
        description={description} 
        imageUrl={imageUrl} 
        url={`${APP_DOMAIN}/coloring-page/${generateSketchSlug(sketch)}/${sketch.id}`}
        authorName={authorName}
        authorProfileUrl={`${APP_DOMAIN}/profile/${sketch.userId}`}
        datePublished={new Date(sketch.timestamp).toISOString()}
        blessCount={blessCount}
        keywords={keywords}
        genre={genre}
      />

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
                  data-pin-description={pinterestDescription}
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

              <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-4">
                <span className="bg-purple-50 text-[#7C3AED] px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wide">
                  {displayAgeGroup(sketch.promptData?.age_group)}
                </span>
                <span className="flex items-center gap-1">
                  Created by 
                  <Link 
                    to={`/profile/${sketch.userId}`}
                    className="font-bold hover:text-[#7C3AED] hover:underline transition-colors"
                  >
                    {authorName}
                  </Link>
                </span>
                <span className="text-gray-300">•</span>
                <span>{new Date(sketch.timestamp).toLocaleDateString()}</span>
              </div>

              {/* Tags Display */}
              {sketch.tags && sketch.tags.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    <Tag className="w-3 h-3" />
                    <span>Tags</span>
                  </div>
                  <TagDisplay
                    tags={sketch.tags}
                    size="md"
                    onTagClick={(tagId) => navigate(`/tags/${tagId}`)}
                  />
                </div>
              )}

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
                  {!isOwner && !isPremiumUser && user && (
                    <span className="ml-1 text-xs opacity-80">({downloadsRemaining} left)</span>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleDownload}
                >
                  <Download className="w-5 h-5" />
                  Download Image
                  {!isOwner && !isPremiumUser && user && (
                    <span className="ml-1 text-xs opacity-80">({downloadsRemaining} left)</span>
                  )}
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
                    <span className="hidden sm:inline">Facebook</span>
                  </button>
                  <button
                    onClick={() => handleShare('pinterest')}
                    className="flex-1 py-3 rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-200 flex items-center justify-center transition-colors gap-2 font-bold text-sm"
                  >
                    <PinterestIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Pinterest</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-colors gap-2 font-bold text-sm"
                  >
                    {showCopySuccess ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <LinkIcon className="w-5 h-5" />}
                    <span className="hidden sm:inline">{showCopySuccess ? "Copied!" : "Copy Link"}</span>
                  </button>
                </div>
              </div>

              {isOwner && (
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Owner Controls</p>

                  {/* Tag Editing Section */}
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 mb-4">
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

