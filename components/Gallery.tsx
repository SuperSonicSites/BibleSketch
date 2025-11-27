import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getUserGallery, getPublicGallery, blessSketch, getSavedSketches, getUserPublicGallery, getUserDocument, getUserBlessedSketchIds } from '../services/firebase';
import { Sketch } from '../types';
import { Heart, AlertTriangle, Globe, User, ExternalLink, Bookmark, ArrowLeft, Facebook, ChevronLeft, ChevronRight } from 'lucide-react';
import { GalleryModal } from './GalleryModal';
import { BIBLE_BOOKS, LITURGICAL_TAGS } from '../constants';
import { FilterBar, SortOption } from './FilterBar';
import { getSketchUrl } from '../utils/urlHelpers';
import { generateShareData, openSharePopup } from '../utils/socialSharing';
import { LazyImage } from './ui/LazyImage';
import { ArtistBadge } from './ArtistBadge';
import { APP_DOMAIN } from '../constants';
import { ProfileSEO } from './ProfileSEO';

interface GalleryProps {
  userId?: string;
  publicProfileId?: string;
  onBack?: () => void;
  onAuthorClick?: (userId: string) => void;
}

// Pinterest Icon SVG
const PinterestIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.399.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.173 0 7.41 2.967 7.41 6.923 0 4.133-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.62 0 12.017 0z"/>
  </svg>
);

const ITEMS_PER_PAGE = 12;

export const Gallery: React.FC<GalleryProps> = ({ userId, publicProfileId, onBack, onAuthorClick }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Fix: Default to 'community' if no userId is provided (Guest Mode)
  const [activeTab, setActiveTab] = useState<'my' | 'community' | 'saved'>(() => {
    if (publicProfileId) return 'my'; // Actually viewing someone else's profile
    return userId ? 'my' : 'community';
  });

  const [activeBookFilter, setActiveBookFilter] = useState<string>('All');
  const [activeTagFilter, setActiveTagFilter] = useState<string>(() => {
    return searchParams.get('tag') || 'All';
  });
  const [activeAgeFilter, setActiveAgeFilter] = useState<string>('All');
  const [activeStyleFilter, setActiveStyleFilter] = useState<string>('All');
  const [activeSort, setActiveSort] = useState<SortOption>('newest');
  
  const [images, setImages] = useState<Sketch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blessedIds, setBlessedIds] = useState<Set<string>>(new Set());
  const [indexErrorLink, setIndexErrorLink] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null);
  const [profileData, setProfileData] = useState<{ name: string, photo: string } | null>(null);

  // Generate SEO content
  const seoContent = useMemo(() => {
    if (publicProfileId && profileData) {
      return {
        title: `${profileData.name}'s Bible Coloring Pages | Bible Sketch Gallery`,
        description: `Browse ${profileData.name}'s collection of Bible coloring pages. Free printable Christian coloring sheets created with Bible Sketch.`
      };
    }
    return {
      title: 'Bible Coloring Pages Gallery - Free Printable Christian Coloring Sheets | Bible Sketch',
      description: 'Browse thousands of free printable Bible coloring pages. Discover coloring sheets for every Bible book, age group, and art style. Perfect for Sunday School, VBS, homeschool, and family devotionals.'
    };
  }, [publicProfileId, profileData?.name]);

  // Reset book filter and pagination when main tab changes
  useEffect(() => {
    setActiveBookFilter('All');
    setActiveTagFilter('All');
    setActiveAgeFilter('All');
    setActiveStyleFilter('All');
    setActiveSort('newest');
    setCurrentPage(1);
  }, [activeTab, publicProfileId]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeBookFilter, activeTagFilter, activeAgeFilter, activeStyleFilter, activeSort]);

  // Sync URL params with tag filter
  useEffect(() => {
    const tagParam = searchParams.get('tag');
    if (tagParam && tagParam !== activeTagFilter) {
      setActiveTagFilter(tagParam);
    } else if (!tagParam && activeTagFilter !== 'All') {
      // If tag param is removed from URL, reset filter
      setActiveTagFilter('All');
    }
  }, [searchParams, activeTagFilter]);

  // Watch userId changes to switch tabs if user logs in/out
  useEffect(() => {
    if (!publicProfileId) {
      if (userId && activeTab === 'community') {
        // Optional: Stay on community or switch to my? Let's keep current selection
      } else if (!userId && (activeTab === 'my' || activeTab === 'saved')) {
        setActiveTab('community');
      }
    }
  }, [userId, publicProfileId]);

  // Load Public Profile Header Data
  useEffect(() => {
     if (publicProfileId) {
        getUserDocument(publicProfileId).then(doc => {
           if (doc) {
              const userData = doc as any;
              setProfileData({
                 name: userData.displayName || "Unknown User",
                 photo: userData.photoURL || ""
              });
           }
        }).catch(e => console.warn("Could not load profile header", e));
     } else {
        setProfileData(null);
     }
  }, [publicProfileId]);

  useEffect(() => {
    const fetchGallery = async () => {
      setLoading(true);
      setError(null);
      setIndexErrorLink(null);
      setImages([]); 
      
      try {
        let data: any[] = [];
        
        if (publicProfileId) {
           // Public Profile Mode
           data = await getUserPublicGallery(publicProfileId);
        } else if (activeTab === 'my') {
          if (!userId) {
             setImages([]);
             return; // Should be handled by view state, but safety check
          }
          data = await getUserGallery(userId);
        } else if (activeTab === 'saved') {
          if (!userId) {
             setImages([]);
             return;
          }
          data = await getSavedSketches(userId);
        } else {
          // Community Gallery - Pass userId to exclude own images
          data = await getPublicGallery(userId);
        }
        
        setImages(data as unknown as Sketch[]);
        
        // Initialize Blessings
        const localBlessings = new Set<string>();
        
        // 1. From LocalStorage (for guest or optimistic UI)
        try {
            const saved = localStorage.getItem('blessedSketches');
            if (saved) {
                JSON.parse(saved).forEach((id: string) => localBlessings.add(id));
            }
        } catch(e) {}

        // 2. From Database (if logged in)
        if (userId) {
            try {
                const dbBlessings = await getUserBlessedSketchIds(userId);
                dbBlessings.forEach(id => localBlessings.add(id));
            } catch (e) {
                console.warn("Could not fetch user blessings", e);
            }
        }

        setBlessedIds(localBlessings);

      } catch (error: any) {
        console.error("Failed to load gallery", error);
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
          setError("Database Configuration Required");
          const linkMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
          if (linkMatch) setIndexErrorLink(linkMatch[0]);
        } else if (error.code === 'permission-denied') {
           // Suppress loud errors for public gallery if rules aren't perfect yet
           // setError("Access denied. Public gallery requires updated Firestore Rules.");
           console.warn("Public gallery permission denied. Ensure Firestore rules allow public reads.");
        } else {
          setError("Failed to load gallery. " + (error.message || "Unknown error"));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, [userId, activeTab, publicProfileId]);

  // --- Derived State: Available Books ---
  const availableBooks = useMemo(() => {
    const bookSet = new Set<string>();
    images.forEach(img => {
      if (img.promptData && img.promptData.book) {
        bookSet.add(img.promptData.book);
      }
    });

    return Array.from(bookSet).sort((a, b) => {
      const indexA = BIBLE_BOOKS.indexOf(a);
      const indexB = BIBLE_BOOKS.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [images]);

  // --- Derived State: Available Tags ---
  const availableTags = useMemo(() => {
    const tagCount = new Map<string, number>();
    images.forEach(img => {
      if (img.tags && img.tags.length > 0) {
        img.tags.forEach(tagId => {
          tagCount.set(tagId, (tagCount.get(tagId) || 0) + 1);
        });
      }
    });

    return Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tagId]) => {
        const tagInfo = LITURGICAL_TAGS.find(t => t.id === tagId);
        return tagInfo ? { id: tagId, label: tagInfo.label } : { id: tagId, label: tagId };
      });
  }, [images]);

  // Helper to normalize age group for display and filtering
  const normalizeAge = (age: string) => age === "Pre-Teen" ? "Teen" : age;

  // --- Derived State: Available Age Groups ---
  const availableAges = useMemo(() => {
    const ageSet = new Set<string>();
    images.forEach(img => {
      if (img.promptData?.age_group) {
        ageSet.add(normalizeAge(img.promptData.age_group));
      }
    });
    return Array.from(ageSet).sort();
  }, [images]);

  // --- Derived State: Available Art Styles ---
  const availableStyles = useMemo(() => {
    const styleSet = new Set<string>();
    images.forEach(img => {
      if (img.promptData?.art_style) {
        styleSet.add(img.promptData.art_style);
      }
    });
    return Array.from(styleSet).sort();
  }, [images]);

  // --- Derived State: Filtered Images ---
  const filteredImages = useMemo(() => {
    let result = images;

    if (activeBookFilter !== 'All') {
      result = result.filter(img => img.promptData?.book === activeBookFilter);
    }

    if (activeTagFilter !== 'All') {
      result = result.filter(img => img.tags && img.tags.includes(activeTagFilter));
    }

    if (activeAgeFilter !== 'All') {
      result = result.filter(img => normalizeAge(img.promptData?.age_group || '') === activeAgeFilter);
    }

    if (activeStyleFilter !== 'All') {
      result = result.filter(img => img.promptData?.art_style === activeStyleFilter);
    }

    // Sort
    if (activeSort === 'newest') {
      result = [...result].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else {
      // popular - sort by blessCount
      result = [...result].sort((a, b) => (b.blessCount || 0) - (a.blessCount || 0));
    }

    return result;
  }, [images, activeBookFilter, activeTagFilter, activeAgeFilter, activeStyleFilter, activeSort]);

  // --- Derived State: Paginated Images ---
  const totalPages = Math.ceil(filteredImages.length / ITEMS_PER_PAGE);
  const displayedImages = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredImages.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredImages, currentPage]);

  // Memoize the onTagChange handler to prevent infinite re-renders
  const handleTagChange = useCallback((value: string) => {
    setActiveTagFilter(value);
    if (value === 'All') {
      setSearchParams({});
    } else {
      setSearchParams({ tag: value });
    }
  }, [setSearchParams]);

  const handleBless = async (sketchId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Already blessed check
    if (blessedIds.has(sketchId)) return;

    // Update UI Optimistically
    setBlessedIds(prev => {
        const next = new Set(prev).add(sketchId);
        localStorage.setItem('blessedSketches', JSON.stringify(Array.from(next)));
        return next;
    });
    
    // Update List
    setImages(prev => prev.map(img => 
      img.id === sketchId ? { ...img, blessCount: (img.blessCount || 0) + 1 } : img
    ));

    // Update Modal if open
    if (selectedSketch?.id === sketchId) {
      setSelectedSketch(prev => prev ? { ...prev, blessCount: (prev.blessCount || 0) + 1 } : null);
    }

    try {
      await blessSketch(sketchId, userId);
    } catch (error) {
      console.error("Failed to bless sketch", error);
    }
  };

  const handleFacebookShare = (e: React.MouseEvent, sketch: Sketch) => {
    e.stopPropagation();
    e.preventDefault();
    const { url } = generateShareData(sketch, 'facebook');
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    openSharePopup(shareUrl);
  };

  const handlePinterestShare = (e: React.MouseEvent, sketch: Sketch) => {
    e.stopPropagation();
    e.preventDefault();
    const { url, description } = generateShareData(sketch, 'pinterest');
    const shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(sketch.imageUrl)}&description=${encodeURIComponent(description)}`;
    openSharePopup(shareUrl);
  };

  const handleSketchDelete = (deletedId: string) => {
    setImages(prev => prev.filter(img => img.id !== deletedId));
    setSelectedSketch(null);
  };

  const handleSketchUpdate = (sketchId: string, updates: Partial<Sketch>) => {
    setImages(prev => prev.map(img => 
      img.id === sketchId ? { ...img, ...updates } : img
    ));
    if (selectedSketch && selectedSketch.id === sketchId) {
      setSelectedSketch(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleSketchCreate = (newSketch: Sketch) => {
    // Add new sketch to the beginning of the list
    setImages(prev => [newSketch, ...prev]);
    // Switch modal to the new sketch
    setSelectedSketch(newSketch);
  };

  const handleBookmarkUpdate = (sketchId: string, isBookmarked: boolean) => {
     if (activeTab === 'saved' && !isBookmarked) {
        setImages(prev => prev.filter(img => img.id !== sketchId));
        setSelectedSketch(null);
     }
  };

  const handleCardClick = (img: Sketch) => {
     if (img.isPublic) {
        navigate(getSketchUrl(img));
     } else {
        setSelectedSketch(img);
     }
  };

  // Only show the Login Prompt if we are explicitly trying to view a private tab while logged out
  // But we don't block 'community' anymore.
  if (!publicProfileId && (activeTab === 'my' || activeTab === 'saved') && !userId) {
     return (
       <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-center mb-8">
             <div className="bg-white p-1 rounded-full border border-gray-200 inline-flex shadow-sm">
                {/* Disable My Gallery / Saved if not logged in */}
                <button disabled className="px-4 md:px-6 py-2 rounded-full text-sm font-bold text-gray-300 cursor-not-allowed">My Gallery</button>
                <button disabled className="px-4 md:px-6 py-2 rounded-full text-sm font-bold text-gray-300 cursor-not-allowed">Saved</button>
                <button onClick={() => setActiveTab('community')} className="px-4 md:px-6 py-2 rounded-full text-sm font-bold transition-all bg-[#7C3AED] text-white shadow-md">Community</button>
             </div>
          </div>
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
             <h2 className="text-2xl font-display font-bold text-gray-800 mb-4">Login Required</h2>
             <p className="text-gray-500">Please log in to view your personal collection.</p>
          </div>
       </div>
     );
  }

  return (
    <>
      {publicProfileId ? (
        <ProfileSEO 
          profileId={publicProfileId}
          name={profileData?.name || "Bible Sketch User"}
          photo={profileData?.photo}
          sketchCount={images.length}
          sketches={images}
          dataReady={!!profileData && !loading}
        />
      ) : (
        <Helmet>
          <title>{seoContent.title}</title>
          <meta name="description" content={seoContent.description} />
          <meta property="og:title" content={seoContent.title} />
          <meta property="og:description" content={seoContent.description} />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={seoContent.title} />
          <meta name="twitter:description" content={seoContent.description} />
        </Helmet>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Public Profile Header */}
      {publicProfileId ? (
         <div className="mb-8 animate-in slide-in-from-top-4 fade-in duration-500">
             <button 
               onClick={() => onBack ? onBack() : navigate('/gallery')}
               className="flex items-center gap-2 text-gray-500 hover:text-[#7C3AED] font-bold mb-6 transition-colors group"
             >
                <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md border border-gray-100 transition-all">
                   <ArrowLeft className="w-5 h-5" />
                </div>
                <span>Back to Gallery</span>
             </button>
             
             <div className="bg-white rounded-3xl p-6 md:p-8 border border-purple-100 shadow-lg shadow-purple-50 flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="w-24 h-24 rounded-full bg-purple-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-[#7C3AED]">
                   {profileData?.photo ? (
                      <img src={profileData.photo} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                      <User className="w-10 h-10" />
                   )}
                </div>
                <div className="text-center md:text-left">
                   <h1 className="text-3xl font-display font-bold text-gray-800 mb-2">{profileData?.name || "User"}'s Gallery</h1>
                   <p className="text-gray-500">Viewing public sketches from this creator.</p>
                </div>
             </div>
         </div>
      ) : (
        /* Main Tabs (Standard Mode) */
        <div className="flex flex-col items-center mb-6 gap-6">
           <div className="bg-white p-1 rounded-full border border-gray-200 inline-flex shadow-sm overflow-x-auto max-w-full">
              <button 
                onClick={() => setActiveTab('my')}
                className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'my' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <User className="w-4 h-4" />
                My Gallery
              </button>
              <button 
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'saved' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Bookmark className="w-4 h-4" />
                Saved
              </button>
              <button 
                onClick={() => setActiveTab('community')}
                className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'community' ? 'bg-[#7C3AED] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Globe className="w-4 h-4" />
                Community
              </button>
           </div>
        </div>
      )}

      {/* Dynamic Filters */}
      {images.length > 0 && !loading && !error && (
        <FilterBar
          availableBooks={availableBooks}
          availableAges={availableAges}
          availableStyles={availableStyles}
          availableTags={availableTags}
          activeBook={activeBookFilter}
          activeAge={activeAgeFilter}
          activeStyle={activeStyleFilter}
          activeTag={activeTagFilter}
          activeSort={activeSort}
          onBookChange={setActiveBookFilter}
          onAgeChange={setActiveAgeFilter}
          onStyleChange={setActiveStyleFilter}
          onTagChange={handleTagChange}
          onSortChange={setActiveSort}
        />
      )}

      {/* Content Area */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 animate-pulse flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-purple-200 border-t-[#7C3AED] rounded-full animate-spin"></div>
           <p>Loading masterpieces...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 bg-red-50 rounded-3xl border border-red-100 p-8 max-w-2xl mx-auto shadow-sm">
           <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
           <h3 className="text-red-800 font-bold text-lg mb-2">Could not load gallery</h3>
           <p className="text-red-600 text-sm mb-6 max-w-md mx-auto">{error}</p>
           
           {indexErrorLink && (
             <a 
               href={indexErrorLink} 
               target="_blank" 
               rel="noopener noreferrer"
               className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
             >
               <span>Create Required Index in Firebase</span>
               <ExternalLink className="w-4 h-4" />
             </a>
           )}
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <p className="text-xl font-display font-bold text-gray-400 mb-2">
             {activeBookFilter !== 'All' ? `No sketches found for ${activeBookFilter}` : "No images found"}
          </p>
          <p className="text-gray-400">
             {publicProfileId 
               ? "This user hasn't shared any sketches publicly yet." 
               : activeTab === 'my' 
                 ? "Create your first coloring page to see it here!" 
                 : activeTab === 'saved' 
                   ? "Bookmark sketches from the community to see them here!"
                   : "Be the first to share a sketch with the community!"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
            {displayedImages.map((img, idx) => {
              const cardContent = (
                  <div 
                    className="rounded-lg md:rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow group relative cursor-pointer border border-gray-100 flex flex-col h-full"
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {/* Lazy Image Replacement with Thumbnail Support */}
                    <LazyImage 
                      src={img.imageUrl} 
                      alt={`Gallery Item ${idx}`} 
                      aspectRatio="aspect-[3/4]"
                      thumbnailPath={img.thumbnailPath}
                      storagePath={img.storagePath}
                    />

                    <div className="p-2 md:p-3 flex-1 flex flex-col">
                      {/* Title: Bible Reference */}
                      <p className="font-bold text-xs md:text-sm text-gray-800 truncate">
                        {img.promptData 
                          ? `${img.promptData.book} ${img.promptData.chapter}:${img.promptData.start_verse}${img.promptData.end_verse && img.promptData.end_verse > img.promptData.start_verse ? '-' + img.promptData.end_verse : ''}` 
                          : "Bible Scene"}
                      </p>

                      {/* Subtitle: Style Reference (was Date) */}
                      <p className="text-[10px] md:text-xs text-gray-500 truncate mt-0.5 md:mt-1 mb-auto">
                         {img.promptData 
                            ? `${img.promptData.art_style} • ${normalizeAge(img.promptData.age_group)}` 
                            : new Date(img.timestamp || Date.now()).toLocaleDateString()}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2 md:mt-3 pt-1.5 md:pt-2 border-t border-gray-50">
                        {/* Link to User Library */}
                        <ArtistBadge userId={img.userId} onAuthorClick={onAuthorClick} />

                        <button 
                            onClick={(e) => handleBless(img.id, e)}
                            disabled={blessedIds.has(img.id)}
                            className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-md md:rounded-lg text-xs md:text-sm font-bold transition-all border ${
                              blessedIds.has(img.id) 
                                ? "bg-red-50 border-red-300 text-red-500 cursor-default" 
                                : "bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300"
                            }`}
                          >
                            <Heart className={`w-3 h-3 md:w-4 md:h-4 ${blessedIds.has(img.id) ? "fill-current" : ""}`} />
                            <span>{img.blessCount || 0}</span>
                          </button>
                      </div>

                      {/* Share Buttons */}
                      <div className="flex gap-1.5 md:gap-2 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-50">
                          <button 
                              onClick={(e) => handleFacebookShare(e, img)}
                              className="flex-1 py-1.5 md:py-2 rounded-md md:rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center transition-colors border border-blue-100"
                          >
                              <Facebook className="w-3 h-3 md:w-4 md:h-4" />
                          </button>
                          <button 
                              onClick={(e) => handlePinterestShare(e, img)}
                              className="flex-1 py-1.5 md:py-2 rounded-md md:rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors border border-red-100"
                          >
                              <PinterestIcon className="w-3 h-3 md:w-4 md:h-4" />
                          </button>
                      </div>
                    </div>
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  </div>
              );

              // Conditionally wrap in Link if public
              if (img.isPublic) {
                 return (
                   <Link key={img.id || idx} to={getSketchUrl(img)}>
                      {cardContent}
                   </Link>
                 );
              } else {
                 return (
                   <div key={img.id || idx} onClick={() => setSelectedSketch(img)}>
                      {cardContent}
                   </div>
                 );
              }
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
              <div className="flex justify-center items-center gap-6 mt-10">
                 <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-3 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-[#7C3AED] hover:border-purple-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                 >
                    <ChevronLeft className="w-5 h-5" />
                 </button>
                 
                 <div className="text-sm font-bold text-gray-500">
                    Page <span className="text-[#7C3AED]">{currentPage}</span> of {totalPages}
                 </div>
                 
                 <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-3 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-[#7C3AED] hover:border-purple-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                 >
                    <ChevronRight className="w-5 h-5" />
                 </button>
              </div>
           )}
        </>
      )}

      {selectedSketch && (
        <GalleryModal 
          isOpen={!!selectedSketch}
          onClose={() => setSelectedSketch(null)}
          sketch={selectedSketch}
          isOwner={userId === selectedSketch.userId}
          onDelete={handleSketchDelete}
          onUpdate={handleSketchUpdate}
          onCreate={handleSketchCreate}
          onBookmark={handleBookmarkUpdate}
          currentUserId={userId}
          onBless={() => handleBless(selectedSketch.id)}
          isBlessed={blessedIds.has(selectedSketch.id)}
          onAuthorClick={onAuthorClick}
        />
      )}
      </div>
    </>
  );
};