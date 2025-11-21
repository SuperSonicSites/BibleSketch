
import React, { useState, useEffect } from 'react';
import { storage } from '../../services/firebase';
import { ref, getDownloadURL } from 'firebase/storage';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  thumbnailPath?: string;
  storagePath?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({ 
  src, 
  alt, 
  className = "", 
  aspectRatio = "aspect-[3/4]",
  thumbnailPath,
  storagePath
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoaded(false);
    setHasError(false);
    setCurrentSrc(null); 

    const resolveImage = async () => {
      const candidates: string[] = [];

      // 1. Explicit Thumbnail Path from DB
      if (thumbnailPath) candidates.push(thumbnailPath);

      // 2. Constructed Paths from Storage Path (if available)
      if (storagePath) {
          const ext = storagePath.split('.').pop();
          const lastSlash = storagePath.lastIndexOf('/');
          const dir = storagePath.substring(0, lastSlash);
          const name = storagePath.substring(lastSlash + 1, storagePath.lastIndexOf('.'));
          
          // A. Standard Resize Extension Path (Same Directory)
          candidates.push(`${dir}/${name}_400x533.${ext}`);
          
          // B. User Requested "user_uploads" Subfolder Path
          candidates.push(`${dir}/user_uploads/${name}_400x533.${ext}`);

          // C. Also try WebP versions for both A and B
          candidates.push(`${dir}/${name}_400x533.webp`);
          candidates.push(`${dir}/user_uploads/${name}_400x533.webp`);
      }

      // Attempt to load candidates sequentially
      for (const path of candidates) {
          try {
              const refPtr = ref(storage, path);
              const url = await getDownloadURL(refPtr);
              if (isMounted) {
                  setCurrentSrc(url);
                  return;
              }
          } catch (e) {
              // Continue to next candidate if this one fails
          }
      }
      
      // 3. Fallback to Original Source (Full Size)
      if (isMounted) {
          setCurrentSrc(src);
      }
    };

    resolveImage();

    return () => { isMounted = false; };
  }, [src, thumbnailPath, storagePath]);

  return (
    <div className={`relative overflow-hidden bg-gray-100 ${aspectRatio} ${className}`}>
      
      {/* Skeleton / Loading State */}
      {(!isLoaded || !currentSrc) && !hasError && (
        <div className="absolute inset-0 animate-pulse bg-gray-200 flex items-center justify-center z-10">
           <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
           </svg>
        </div>
      )}

      {/* Image */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
             // If the current source fails (e.g. broken URL), and it wasn't the original src,
             // try falling back to original src.
             if (currentSrc !== src) {
                 setCurrentSrc(src);
             } else {
                 setHasError(true);
             }
          }}
          onContextMenu={(e) => e.preventDefault()}
          className={`
            w-full h-full object-contain transition-all duration-700 ease-in-out select-none
            ${isLoaded ? 'opacity-100 scale-100 grayscale-0' : 'opacity-0 scale-105 grayscale'}
          `}
        />
      )}

      {/* Error State */}
      {hasError && (
         <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400 text-xs">
            Unavailable
         </div>
      )}
    </div>
  );
};
