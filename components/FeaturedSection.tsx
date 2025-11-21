
import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sketch } from '../types';
import { getPublicGallery, blessSketch, getUserBlessedSketchIds, getSavedSketches } from '../services/firebase';
import { Heart, Facebook, ChevronLeft, ChevronRight, AlertCircle, User } from 'lucide-react';
import { BIBLE_BOOKS } from '../constants';
import { GalleryModal } from './GalleryModal';
import { getSketchUrl } from '../utils/urlHelpers';
import { Button } from './ui/Button';
import { LazyImage } from './ui/LazyImage';
import { ArtistBadge } from './ArtistBadge';

interface FeaturedSectionProps {
  user: any;
  onRequireAuth: (action: () => void) => void;
  onNavigateToGallery: () => void;
  onAuthorClick: (userId: string) => void;
}

// Pinterest Icon SVG
const PinterestIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.399.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.173 0 7.41 2.967 7.41 6.923 0 4.133-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.62 0 12.017 0z"/>
  </svg>
);

const ITEMS_PER_PAGE = 12;

export const FeaturedSection: React.FC<FeaturedSectionProps> = ({ 
  user, 
  onRequireAuth, 
  onNavigateToGallery,
  onAuthorClick
}) => {
  const navigate = useNavigate();
  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBookFilter, setActiveBookFilter] = useState<string>('All');
  const [blessedIds, setBlessedIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null);
  
  // Load Data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Get Top Public Sketches
        const publicData = await getPublicGallery(undefined);
        
        // 2. Load Blessings (Likes)
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

        // 3. Load Bookmarks (if logged in)
        let userBookmarks = new Set<string>();
        if (user) {
          const savedSketches = await getSavedSketches(user.uid);
          savedSketches.forEach((s: any) => {
             if (s.originalSketchId) userBookmarks.add(s.originalSketchId);
          });
        }

        setSketches(publicData as Sketch[]);
        setBookmarkedIds(userBookmarks);
      } catch (e: any) {
        console.error("Failed to load featured section", e);
        if (e.message === "PERMISSION_DENIED") {
           setError("PERMISSION_DENIED");
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeBookFilter]);

  // Derived: Available Books
  const availableBooks = useMemo(() => {
    const bookSet = new Set<string>();
    sketches.forEach(img => {
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
  }, [sketches]);

  // Derived: Filtered List
  const filteredSketches = useMemo(() => {
    if (activeBookFilter === 'All') return sketches;
    return sketches.filter(s => s.promptData?.book === activeBookFilter);
  }, [sketches, activeBookFilter]);

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
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sketch.imageUrl)}`;
    window.open(shareUrl, '_blank');
  };

  const handlePinterestShare = (e: React.MouseEvent, sketch: Sketch) => {
    e.stopPropagation();
    e.preventDefault();
    const description = `${sketch.promptData?.book} ${sketch.promptData?.chapter} - Created with Bible Sketch`;
    const shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(window.location.href)}&media=${encodeURIComponent(sketch.imageUrl)}&description=${encodeURIComponent(description)}`;
    window.open(shareUrl, '_blank');
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

  const handleSketchCreate = (newSketch: Sketch) => {
     setSelectedSketch(newSketch);
  };

  const handleBookmarkUpdate = (sketchId: string, isBookmarked: boolean) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (isBookmarked) {
        next.add(sketchId);
      } else {
        next.delete(sketchId);
      }
      return next;
    });
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-16 lg:py-24 border-t border-purple-50">
      
      <div className="text-center mb-12">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-[#1F2937] mb-4">
           Community Favorites
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
           Explore the most loved coloring pages created by the Bible Sketch community. 
           Bless your favorites or save them to your personal collection.
        </p>
      </div>

      {/* Filters */}
      {sketches.length > 0 && (
        <div className="mb-10 flex justify-center">
          <div className="flex flex-wrap justify-center gap-2 max-w-4xl">
              <button 
                  onClick={() => setActiveBookFilter('All')}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                    activeBookFilter === 'All' 
                    ? 'bg-[#7C3AED] text-white shadow-md' 
                    : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
              >
                  All Books
              </button>
              {availableBooks.slice(0, 12).map(book => (
                  <button 
                    key={book}
                    onClick={() => setActiveBookFilter(book)}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${
                        activeBookFilter === book 
                        ? 'bg-purple-50 border-[#7C3AED] text-[#7C3AED]' 
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {book}
                  </button>
              ))}
              {availableBooks.length > 12 && (
                  <button 
                    onClick={onNavigateToGallery}
                    className="px-4 py-1.5 rounded-full text-sm font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
                  >
                    + {availableBooks.length - 12} More
                  </button>
              )}
          </div>
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
             <p className="text-gray-500 mb-6 px-4">Please log in to view the community gallery and save your favorites.</p>
             <Button onClick={() => onRequireAuth(() => {})} className="gap-2">
                 Log In to View Gallery
             </Button>
         </div>
      ) : sketches.length === 0 ? (
         <div className="text-center py-12 text-gray-400">
            No public sketches found yet. Be the first to share!
         </div>
      ) : (
         <>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayedSketches.map((sketch) => (
                 <Link 
                    key={sketch.id}
                    to={getSketchUrl(sketch)}
                    className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer flex flex-col"
                 >
                    {/* Image Container Replacement */}
                    <LazyImage 
                       src={sketch.imageUrl}
                       alt="Bible Sketch"
                       aspectRatio="aspect-[3/4]"
                       className="p-4 bg-[#F9FAFB] group-hover:scale-105 transition-transform duration-500"
                       thumbnailPath={sketch.thumbnailPath}
                       storagePath={sketch.storagePath}
                    />

                    {/* Info Bar */}
                    <div className="p-3 flex-1 flex flex-col">
                      {/* Title: Bible Reference */}
                      <p className="font-bold text-sm text-gray-800 truncate">
                        {sketch.promptData 
                          ? `${sketch.promptData.book} ${sketch.promptData.chapter}:${sketch.promptData.start_verse}${sketch.promptData.end_verse && sketch.promptData.end_verse > sketch.promptData.start_verse ? '-' + sketch.promptData.end_verse : ''}` 
                          : "Bible Scene"}
                      </p>

                      {/* Subtitle: Style Reference (was Date) */}
                      <p className="text-xs text-gray-500 truncate mt-1 mb-auto">
                         {sketch.promptData 
                            ? `${sketch.promptData.art_style} • ${sketch.promptData.age_group}` 
                            : new Date(sketch.timestamp || Date.now()).toLocaleDateString()}
                      </p>
                      
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                        {/* Link to User Library */}
                        <ArtistBadge userId={sketch.userId} onAuthorClick={onAuthorClick} />

                        <button 
                            onClick={(e) => handleBless(sketch.id, e)}
                            disabled={blessedIds.has(sketch.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${
                              blessedIds.has(sketch.id) 
                                ? "bg-red-50 border-red-300 text-red-500 cursor-default" 
                                : "bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300"
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${blessedIds.has(sketch.id) ? "fill-current" : ""}`} />
                            <span>{sketch.blessCount || 0}</span>
                          </button>
                      </div>

                      {/* Share Buttons */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                          <button 
                              onClick={(e) => handleFacebookShare(e, sketch)}
                              className="flex-1 py-2 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center transition-colors border border-blue-100"
                          >
                              <Facebook className="w-4 h-4" />
                          </button>
                          <button 
                              onClick={(e) => handlePinterestShare(e, sketch)}
                              className="flex-1 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors border border-red-100"
                          >
                              <PinterestIcon className="w-4 h-4" />
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
          isOwner={user?.uid === selectedSketch.userId}
          onDelete={handleSketchDelete}
          onUpdate={handleSketchUpdate}
          onCreate={handleSketchCreate}
          onBookmark={handleBookmarkUpdate}
          currentUserId={user?.uid}
          onBless={() => handleBless(selectedSketch.id)}
          isBlessed={blessedIds.has(selectedSketch.id)}
          onAuthorClick={onAuthorClick}
        />
      )}
    </section>
  );
};