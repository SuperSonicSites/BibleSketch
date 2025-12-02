import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sketch, FontStyle } from '../types';
import { Heart, Facebook, ChevronLeft, ChevronRight, AlertCircle, ArrowRight } from 'lucide-react';
import { BIBLE_BOOKS } from '../constants';
import { GalleryModal } from './GalleryModal';
import { getSketchUrl } from '../utils/urlHelpers';
import { generateShareData, openSharePopup } from '../utils/socialSharing';
import { Button } from './ui/Button';
import { LazyImage } from './ui/LazyImage';
import { ArtistBadge } from './ArtistBadge';

interface VerseFeaturedSectionProps {
  user: any;
  onRequireAuth: (action: () => void) => void;
  onNavigateToGallery: () => void;
  onAuthorClick: (userId: string) => void;
  // Function to fetch verse sketches - passed from parent to avoid circular deps
  getVerseSketches: () => Promise<Sketch[]>;
  blessSketch: (sketchId: string, userId?: string) => Promise<void>;
  getUserBlessedSketchIds: (userId: string) => Promise<string[]>;
}

// Pinterest Icon SVG
const PinterestIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.399.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.173 0 7.41 2.967 7.41 6.923 0 4.133-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.62 0 12.017 0z"/>
  </svg>
);

const ITEMS_PER_PAGE = 8;

// Font style options for filter
const FONT_STYLE_OPTIONS = [
  { value: 'All', label: 'All Styles' },
  { value: FontStyle.ELEGANT_SCRIPT, label: 'Elegant Script' },
  { value: FontStyle.MODERN_BRUSH, label: 'Modern Brush' },
  { value: FontStyle.PLAYFUL, label: 'Playful' },
  { value: FontStyle.CLASSIC_SERIF, label: 'Classic Serif' }
];

export const VerseFeaturedSection: React.FC<VerseFeaturedSectionProps> = ({ 
  user, 
  onRequireAuth, 
  onNavigateToGallery,
  onAuthorClick,
  getVerseSketches,
  blessSketch,
  getUserBlessedSketchIds
}) => {
  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBookFilter, setActiveBookFilter] = useState<string>('All');
  const [activeFontFilter, setActiveFontFilter] = useState<string>('All');
  const [blessedIds, setBlessedIds] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null);
  
  // Load Data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get verse sketches only
        const verseData = await getVerseSketches();
        
        // Load Blessings (Likes)
        const localBlessings = new Set<string>();
        try {
          const saved = localStorage.getItem('blessedSketches');
          if (saved) {
            JSON.parse(saved).forEach((id: string) => localBlessings.add(id));
          }
        } catch(e) {}
        
        if (user) {
          const dbBlessings = await getUserBlessedSketchIds(user.uid);
          dbBlessings.forEach(id => localBlessings.add(id));
        }
        setBlessedIds(localBlessings);

        setSketches(verseData);
      } catch (e: any) {
        console.error("Failed to load verse featured section", e);
        if (e.message === "PERMISSION_DENIED") {
          setError("PERMISSION_DENIED");
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, getVerseSketches, getUserBlessedSketchIds]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeBookFilter, activeFontFilter]);

  // Derived: Available Books from verse sketches
  const availableBooks = useMemo(() => {
    const bookSet = new Set<string>();
    sketches.forEach(s => {
      if (s.promptData?.book) {
        bookSet.add(s.promptData.book);
      }
    });

    return Array.from(bookSet).sort((a, b) => {
      const indexA = BIBLE_BOOKS.indexOf(a);
      const indexB = BIBLE_BOOKS.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [sketches]);

  // Derived: Available Font Styles
  const availableFontStyles = useMemo(() => {
    const styleSet = new Set<string>();
    sketches.forEach(s => {
      if (s.promptData?.font_style) {
        styleSet.add(s.promptData.font_style);
      }
    });
    return Array.from(styleSet);
  }, [sketches]);

  // Derived: Filtered List
  const filteredSketches = useMemo(() => {
    let result = sketches;

    // Filter by book
    if (activeBookFilter !== 'All') {
      result = result.filter(s => s.promptData?.book === activeBookFilter);
    }

    // Filter by font style
    if (activeFontFilter !== 'All') {
      result = result.filter(s => s.promptData?.font_style === activeFontFilter);
    }

    // Sort by popularity then recency
    return [...result].sort((a, b) => {
      const blessDiff = (b.blessCount || 0) - (a.blessCount || 0);
      if (blessDiff !== 0) return blessDiff;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [sketches, activeBookFilter, activeFontFilter]);

  // Derived: Paginated List
  const totalPages = Math.ceil(filteredSketches.length / ITEMS_PER_PAGE);
  const displayedSketches = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSketches.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSketches, currentPage]);

  // Actions
  const handleBless = (sketchId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (e) e.preventDefault();
    if (blessedIds.has(sketchId)) return;

    const executeBless = async () => {
      // UI Optimistic Update
      setBlessedIds(prev => {
        const next = new Set(prev).add(sketchId);
        localStorage.setItem('blessedSketches', JSON.stringify(Array.from(next)));
        return next;
      });

      // Update the list
      setSketches(prev => prev.map(s => 
        s.id === sketchId ? { ...s, blessCount: (s.blessCount || 0) + 1 } : s
      ));

      // Also update the modal if open
      if (selectedSketch?.id === sketchId) {
        setSelectedSketch(prev => prev ? { ...prev, blessCount: (prev.blessCount || 0) + 1 } : null);
      }

      try {
        await blessSketch(sketchId, user?.uid);
      } catch (error) {
        console.error("Bless failed", error);
      }
    };

    // Require Auth
    if (!user) {
      onRequireAuth(executeBless);
    } else {
      executeBless();
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
    setSketches(prev => prev.filter(s => s.id !== deletedId));
    setSelectedSketch(null);
  };

  const handleSketchUpdate = (sketchId: string, updates: Partial<Sketch>) => {
    setSketches(prev => prev.map(s => 
      s.id === sketchId ? { ...s, ...updates } : s
    ));
    if (selectedSketch && selectedSketch.id === sketchId) {
      setSelectedSketch(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // Don't render if no verse sketches exist yet
  if (!loading && sketches.length === 0) {
    return null;
  }

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-8 md:py-16 lg:py-24 border-t border-purple-50">
      
      <div className="text-center mb-6 md:mb-12">
        <h2 className="font-display text-2xl md:text-4xl font-bold text-[#1F2937] mb-2 md:mb-4">
          Community Verse Art
        </h2>
        <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto">
          Explore beautiful Bible verse coloring pages created by the community. 
          Bless your favorites or save them to your collection.
        </p>
      </div>

      {/* Filters */}
      {sketches.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6 justify-center">
          {/* Book Filter */}
          <select
            value={activeBookFilter}
            onChange={(e) => setActiveBookFilter(e.target.value)}
            className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="All">All Books</option>
            {availableBooks.map(book => (
              <option key={book} value={book}>{book}</option>
            ))}
          </select>

          {/* Font Style Filter */}
          <select
            value={activeFontFilter}
            onChange={(e) => setActiveFontFilter(e.target.value)}
            className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            {FONT_STYLE_OPTIONS.filter(opt => 
              opt.value === 'All' || availableFontStyles.includes(opt.value)
            ).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Grid or Fallback */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-[#7C3AED] rounded-full animate-spin"></div>
        </div>
      ) : error === "PERMISSION_DENIED" ? (
        <div className="text-center py-16 bg-gray-50 rounded-3xl border border-gray-100 max-w-xl mx-auto">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">Gallery Access Restricted</h3>
          <p className="text-gray-500 mb-6 px-4">Please log in to view the community gallery.</p>
          <Button onClick={() => onRequireAuth(() => {})} className="gap-2">
            Log In to View Gallery
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {displayedSketches.map((sketch) => (
              <Link 
                key={sketch.id}
                to={getSketchUrl(sketch)}
                className="group bg-white rounded-xl md:rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer flex flex-col"
              >
                {/* Image Container */}
                <LazyImage 
                  src={sketch.imageUrl}
                  alt={`${sketch.promptData?.book} ${sketch.promptData?.chapter}:${sketch.promptData?.start_verse} Verse Art`}
                  aspectRatio="aspect-[3/4]"
                  className="p-2 md:p-4 bg-[#F9FAFB] group-hover:scale-105 transition-transform duration-500"
                  thumbnailPath={sketch.thumbnailPath}
                  storagePath={sketch.storagePath}
                />

                {/* Info Bar */}
                <div className="p-2 md:p-3 flex-1 flex flex-col">
                  {/* Title: Bible Reference */}
                  <p className="font-bold text-xs md:text-sm text-gray-800 truncate">
                    {sketch.promptData?.book} {sketch.promptData?.chapter}:{sketch.promptData?.start_verse}
                  </p>

                  {/* Subtitle: Font Style */}
                  <p className="text-[10px] md:text-xs text-gray-500 truncate mt-0.5 md:mt-1 mb-auto">
                    {sketch.promptData?.font_style || 'Verse Art'}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2 md:mt-3 pt-1.5 md:pt-2 border-t border-gray-50">
                    {/* Link to User Library */}
                    <ArtistBadge userId={sketch.userId} onAuthorClick={onAuthorClick} />

                    <button 
                      onClick={(e) => handleBless(sketch.id, e)}
                      disabled={blessedIds.has(sketch.id)}
                      className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-md md:rounded-lg text-xs md:text-sm font-bold transition-all border ${
                        blessedIds.has(sketch.id) 
                          ? "bg-red-50 border-red-300 text-red-500 cursor-default" 
                          : "bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300"
                      }`}
                    >
                      <Heart className={`w-3 h-3 md:w-4 md:h-4 ${blessedIds.has(sketch.id) ? "fill-current" : ""}`} />
                      <span>{sketch.blessCount || 0}</span>
                    </button>
                  </div>

                  {/* Share Buttons */}
                  <div className="flex gap-1.5 md:gap-2 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-50">
                    <button 
                      onClick={(e) => handleFacebookShare(e, sketch)}
                      className="flex-1 py-1.5 md:py-2 rounded-md md:rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center transition-colors border border-blue-100"
                      aria-label="Share on Facebook"
                    >
                      <Facebook className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                    <button 
                      onClick={(e) => handlePinterestShare(e, sketch)}
                      className="flex-1 py-1.5 md:py-2 rounded-md md:rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors border border-red-100"
                      aria-label="Share on Pinterest"
                    >
                      <PinterestIcon className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-6 mt-10">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
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
                aria-label="Next page"
                className="p-3 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-[#7C3AED] hover:border-purple-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* CTA to Explore Page */}
          <div className="text-center mt-10">
            <Button 
              onClick={onNavigateToGallery} 
              variant="outline" 
              size="lg"
              className="gap-2 font-bold"
            >
              Explore All Verse Art
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}

      {selectedSketch && (
        <GalleryModal 
          isOpen={!!selectedSketch}
          onClose={() => setSelectedSketch(null)}
          sketch={selectedSketch}
          isOwner={user?.uid === selectedSketch.userId}
          onDelete={handleSketchDelete}
          onUpdate={handleSketchUpdate}
          onCreate={() => {}}
          onBookmark={() => {}}
          currentUserId={user?.uid}
          onBless={() => handleBless(selectedSketch.id)}
          isBlessed={blessedIds.has(selectedSketch.id)}
          onAuthorClick={onAuthorClick}
        />
      )}
    </section>
  );
};

