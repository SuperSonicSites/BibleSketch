import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Sketch } from '../types';
import { LazyImage } from './ui/LazyImage';
import { getSketchUrl } from '../utils/urlHelpers';
import { getRelatedSketches } from '../services/firebase';

interface RelatedSketchesProps {
  currentSketchId: string;
  ageGroup: string;
  artStyle: string;
}

export const RelatedSketches: React.FC<RelatedSketchesProps> = ({ 
  currentSketchId,
  ageGroup,
  artStyle
}) => {
  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Helper to display "Teen" instead of legacy "Pre-Teen"
  const displayAge = ageGroup === "Pre-Teen" ? "Teen" : ageGroup;

  // PERFORMANCE: Only fetch when section becomes visible
  useEffect(() => {
    if (hasLoaded) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setLoading(true);
          getRelatedSketches(currentSketchId, ageGroup, artStyle, 8)
            .then(setSketches)
            .finally(() => {
              setLoading(false);
              setHasLoaded(true);
            });
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading 200px before visible
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [currentSketchId, ageGroup, artStyle, hasLoaded]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    // Get the width of a single card (first child) + gap
    const firstCard = scrollRef.current.firstElementChild as HTMLElement;
    const gap = 16; // gap-4 = 1rem = 16px
    const scrollAmount = firstCard ? firstCard.offsetWidth + gap : scrollRef.current.offsetWidth * 0.5;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // Hide section if no results after loading
  if (hasLoaded && sketches.length === 0) return null;

  return (
    <section ref={sectionRef} className="mt-16 mb-8">
      {/* SEO-optimized H2 heading */}
      <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-800 mb-6 px-4 md:px-0">
        More {displayAge} Coloring Pages
      </h2>
      
      {/* Skeleton Loading State */}
      {loading && (
        <div className="flex gap-4 px-4 md:px-0 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[calc(50%-8px)] md:w-[calc(25%-12px)]">
              <div className="bg-gray-100 rounded-xl aspect-[3/4] animate-pulse" />
              <div className="h-4 bg-gray-100 rounded mt-3 w-3/4 animate-pulse" />
              <div className="h-3 bg-gray-100 rounded mt-2 w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Loaded Content */}
      {!loading && sketches.length > 0 && (
        <div className="relative group">
          {/* Desktop Navigation Arrows - Purple with Yellow */}
          <button
            onClick={() => scroll('left')}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-[#7C3AED] rounded-full shadow-lg items-center justify-center text-amber-400 hover:bg-[#6D28D9] hover:scale-110 transition-all opacity-0 group-hover:opacity-100 -translate-x-4"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => scroll('right')}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-[#7C3AED] rounded-full shadow-lg items-center justify-center text-amber-400 hover:bg-[#6D28D9] hover:scale-110 transition-all opacity-0 group-hover:opacity-100 translate-x-4"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Swipeable Container */}
          <div
            ref={scrollRef}
            className="related-scroll flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 px-4 md:px-0"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {/* Inline style for webkit scrollbar hiding */}
            <style>{`.related-scroll::-webkit-scrollbar { display: none; }`}</style>
            
            {sketches.map((sketch) => (
              <Link
                key={sketch.id}
                to={getSketchUrl(sketch)}
                className="flex-shrink-0 w-[calc(50%-8px)] md:w-[calc(25%-12px)] snap-start group/card"
                style={{ scrollSnapStop: 'always' }}
              >
                <article className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
                  <LazyImage
                    src={sketch.imageUrl}
                    alt={`${sketch.promptData?.book} ${sketch.promptData?.chapter}:${sketch.promptData?.start_verse} Coloring Page`}
                    aspectRatio="aspect-[3/4]"
                    className="group-hover/card:scale-105 transition-transform duration-500"
                    thumbnailPath={sketch.thumbnailPath}
                    storagePath={sketch.storagePath}
                  />
                  <div className="p-3">
                    <h3 className="font-bold text-sm text-gray-800 truncate">
                      {sketch.promptData?.book} {sketch.promptData?.chapter}:{sketch.promptData?.start_verse}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {sketch.promptData?.art_style}
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

