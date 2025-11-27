import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getPublicGallery, blessSketch, getUserBlessedSketchIds } from '../services/firebase';
import { Sketch } from '../types';
import { Heart, ArrowLeft, Facebook, ChevronLeft, ChevronRight, Tag, Loader2 } from 'lucide-react';
import { LITURGICAL_TAGS, BIBLE_BOOKS } from '../constants';
import { FilterBar, SortOption } from './FilterBar';
import { getSketchUrl } from '../utils/urlHelpers';
import { generateShareData, openSharePopup } from '../utils/socialSharing';
import { LazyImage } from './ui/LazyImage';
import { ArtistBadge } from './ArtistBadge';

interface TagPageProps {
  userId?: string;
  onRequireAuth: (action: () => void) => void;
  onAuthorClick: (userId: string) => void;
}

// Pinterest Icon SVG
const PinterestIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.399.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.173 0 7.41 2.967 7.41 6.923 0 4.133-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.62 0 12.017 0z"/>
  </svg>
);

const ITEMS_PER_PAGE = 12;

export const TagPage: React.FC<TagPageProps> = ({ userId, onRequireAuth, onAuthorClick }) => {
  const { tagId } = useParams<{ tagId: string }>();
  const navigate = useNavigate();

  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [loading, setLoading] = useState(true);
  const [blessedIds, setBlessedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [activeBookFilter, setActiveBookFilter] = useState<string>('All');
  const [activeAgeFilter, setActiveAgeFilter] = useState<string>('All');
  const [activeStyleFilter, setActiveStyleFilter] = useState<string>('All');
  const [activeSort, setActiveSort] = useState<SortOption>('popular');

  // Get tag info
  const tagInfo = useMemo(() => {
    return LITURGICAL_TAGS.find(t => t.id === tagId);
  }, [tagId]);

  // Generate SEO content
  const seoContent = useMemo(() => {
    if (!tagInfo) return null;

    const categoryDescriptions: Record<string, string> = {
      season: `Discover beautiful ${tagInfo.label} coloring pages from Bible stories. Perfect for celebrating the ${tagInfo.label} season in Sunday School, VBS, or family devotionals. Free printable Bible coloring sheets for all ages.`,
      theme: `Explore ${tagInfo.label} coloring pages from Scripture. These Biblical coloring sheets feature stories and lessons about ${tagInfo.label.toLowerCase()}. Perfect for Sunday School, homeschool, or personal Bible study.`
    };

    return {
      title: `${tagInfo.label} Coloring Pages - Free Printable Bible Coloring Sheets | Bible Sketch`,
      description: categoryDescriptions[tagInfo.category] || `Browse ${tagInfo.label} Bible coloring pages. Free printable Christian coloring sheets for all ages.`,
      h1: `${tagInfo.label} Coloring Pages`,
      subtitle: `Browse ${sketches.length} ${tagInfo.label} coloring page${sketches.length !== 1 ? 's' : ''} from Bible stories. Perfect for ${tagInfo.category === 'season' ? `celebrating the ${tagInfo.label} season` : tagInfo.category === 'context' ? tagInfo.label : `teaching about ${tagInfo.label.toLowerCase()}`} in your church, Sunday School, or home.`
    };
  }, [tagInfo, sketches.length]);

  // Load sketches
  useEffect(() => {
    const loadSketches = async () => {
      setLoading(true);
      try {
        const allSketches = await getPublicGallery(undefined);
        // Filter by tag
        const taggedSketches = (allSketches as Sketch[]).filter(
          s => s.tags && s.tags.includes(tagId || '')
        );
        setSketches(taggedSketches);

        // Load blessings
        const localBlessings = new Set<string>();
        try {
          const saved = localStorage.getItem('blessedSketches');
          if (saved) {
            JSON.parse(saved).forEach((id: string) => localBlessings.add(id));
          }
        } catch (e) {}

        if (userId) {
          const dbBlessings = await getUserBlessedSketchIds(userId);
          dbBlessings.forEach(id => localBlessings.add(id));
        }
        setBlessedIds(localBlessings);
      } catch (error) {
        console.error("Failed to load tag page", error);
      } finally {
        setLoading(false);
      }
    };

    loadSketches();
  }, [tagId, userId]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeBookFilter, activeAgeFilter, activeStyleFilter, activeSort, tagId]);

  // Available books
  const availableBooks = useMemo(() => {
    const bookSet = new Set<string>();
    sketches.forEach(s => {
      if (s.promptData?.book) bookSet.add(s.promptData.book);
    });
    return Array.from(bookSet).sort((a, b) => {
      const indexA = BIBLE_BOOKS.indexOf(a);
      const indexB = BIBLE_BOOKS.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [sketches]);

  // Helper to normalize age group
  const normalizeAge = (age: string) => age === "Pre-Teen" ? "Teen" : age;

  // Available age groups
  const availableAges = useMemo(() => {
    const ageSet = new Set<string>();
    sketches.forEach(s => {
      if (s.promptData?.age_group) ageSet.add(normalizeAge(s.promptData.age_group));
    });
    return Array.from(ageSet).sort();
  }, [sketches]);

  // Available art styles
  const availableStyles = useMemo(() => {
    const styleSet = new Set<string>();
    sketches.forEach(s => {
      if (s.promptData?.art_style) styleSet.add(s.promptData.art_style);
    });
    return Array.from(styleSet).sort();
  }, [sketches]);

  // Filtered sketches
  const filteredSketches = useMemo(() => {
    let result = sketches;

    if (activeBookFilter !== 'All') {
      result = result.filter(s => s.promptData?.book === activeBookFilter);
    }

    if (activeAgeFilter !== 'All') {
      result = result.filter(s => normalizeAge(s.promptData?.age_group || '') === activeAgeFilter);
    }

    if (activeStyleFilter !== 'All') {
      result = result.filter(s => s.promptData?.art_style === activeStyleFilter);
    }

    // Sort
    if (activeSort === 'newest') {
      result = [...result].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else {
      // popular - sort by blessCount
      result = [...result].sort((a, b) => (b.blessCount || 0) - (a.blessCount || 0));
    }

    return result;
  }, [sketches, activeBookFilter, activeAgeFilter, activeStyleFilter, activeSort]);

  // Pagination
  const totalPages = Math.ceil(filteredSketches.length / ITEMS_PER_PAGE);
  const displayedSketches = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSketches.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSketches, currentPage]);

  const handleBless = (sketchId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (blessedIds.has(sketchId)) return;

    const executeBless = async () => {
      setBlessedIds(prev => {
        const next = new Set(prev).add(sketchId);
        localStorage.setItem('blessedSketches', JSON.stringify(Array.from(next)));
        return next;
      });

      setSketches(prev =>
        prev.map(s => (s.id === sketchId ? { ...s, blessCount: (s.blessCount || 0) + 1 } : s))
      );

      try {
        await blessSketch(sketchId, userId);
      } catch (error) {
        console.error("Bless failed", error);
      }
    };

    if (!userId) {
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

  if (!tagInfo) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tag Not Found</h1>
        <p className="text-gray-500 mb-6">This tag doesn't exist.</p>
        <Link to="/gallery" className="text-[#7C3AED] font-bold hover:underline">
          Back to Gallery
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{seoContent?.title}</title>
        <meta name="description" content={seoContent?.description} />
        <meta property="og:title" content={seoContent?.title} />
        <meta property="og:description" content={seoContent?.description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoContent?.title} />
        <meta name="twitter:description" content={seoContent?.description} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500">
        {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/gallery')}
          className="flex items-center gap-2 text-gray-500 hover:text-[#7C3AED] font-bold mb-6 transition-colors group"
        >
          <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow-md border border-gray-100 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span>Back to Gallery</span>
        </button>

        <div className="bg-gradient-to-br from-purple-50 to-amber-50 rounded-3xl p-8 border border-purple-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-[#7C3AED] flex items-center justify-center">
              <Tag className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-gray-800">{seoContent?.h1}</h1>
              <p className="text-gray-500 capitalize">{tagInfo.category}</p>
            </div>
          </div>
          <p className="text-gray-600 text-base leading-relaxed">
            {seoContent?.subtitle}
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        availableBooks={availableBooks}
        availableAges={availableAges}
        availableStyles={availableStyles}
        activeBook={activeBookFilter}
        activeAge={activeAgeFilter}
        activeStyle={activeStyleFilter}
        activeSort={activeSort}
        onBookChange={setActiveBookFilter}
        onAgeChange={setActiveAgeFilter}
        onStyleChange={setActiveStyleFilter}
        onSortChange={setActiveSort}
        hideTagFilter={true}
      />

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-12 h-12 text-purple-200 animate-spin" />
        </div>
      ) : filteredSketches.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-xl font-display font-bold text-gray-400 mb-2">No sketches found</p>
          <p className="text-gray-400">
            {activeBookFilter !== 'All'
              ? `No ${tagInfo.label} sketches from ${activeBookFilter} yet.`
              : `No sketches tagged with "${tagInfo.label}" yet.`}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedSketches.map((sketch, idx) => (
              <Link
                key={sketch.id || idx}
                to={getSketchUrl(sketch)}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col"
              >
                <LazyImage
                  src={sketch.imageUrl}
                  alt={`${sketch.promptData?.book} sketch`}
                  aspectRatio="aspect-[3/4]"
                  thumbnailPath={sketch.thumbnailPath}
                  storagePath={sketch.storagePath}
                />

                <div className="p-3 flex-1 flex flex-col">
                  <p className="font-bold text-sm text-gray-800 truncate">
                    {sketch.promptData
                      ? `${sketch.promptData.book} ${sketch.promptData.chapter}:${sketch.promptData.start_verse}${sketch.promptData.end_verse && sketch.promptData.end_verse > sketch.promptData.start_verse ? '-' + sketch.promptData.end_verse : ''}`
                      : "Bible Scene"}
                  </p>

                  <p className="text-xs text-gray-500 truncate mt-1 mb-auto">
                    {sketch.promptData
                      ? `${sketch.promptData.art_style} • ${normalizeAge(sketch.promptData.age_group)}`
                      : new Date(sketch.timestamp || Date.now()).toLocaleDateString()}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
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

          {/* Pagination */}
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
      </div>
    </>
  );
};
