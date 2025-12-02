
import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../../services/firebase';
import { ref, getDownloadURL } from 'firebase/storage';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  thumbnailPath?: string;
  storagePath?: string;
  // Add data-pin-description prop to allow overriding default behavior
  // This is used by Pinterest's "Save" button logic or when pins are created
  'data-pin-description'?: string;
  // Use eager loading for hero/main images that should load immediately
  eager?: boolean;
}

export const LazyImage: React.FC<LazyImageProps> = ({ 
  src, 
  alt, 
  className = "", 
  aspectRatio = "aspect-[3/4]",
  thumbnailPath,
  storagePath,
  'data-pin-description': dataPinDescription,
  eager = false
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Fix for cached images: Check if image is already loaded after render
  // This handles the race condition where cached images load before React attaches onLoad
  useEffect(() => {
    if (currentSrc && imgRef.current?.complete && imgRef.current?.naturalHeight > 0) {
      setIsLoaded(true);
    }
  }, [currentSrc]);

  useEffect(() => {
    let isMounted = true;
    setIsLoaded(false);
    setHasError(false);
    
    // OPTIMIZATION: Trust explicit thumbnail path immediately (0-latency)
    if (thumbnailPath) {
       // We trust the DB provided path, so we don't "check" it first.
       // We just convert the Storage Path (gs:// or relative) to a Download URL.
       // Note: If thumbnailPath is already a full http URL, we could use it directly, 
       // but our DB stores relative storage paths usually.
       
       const resolveDirect = async () => {
         try {
             const refPtr = ref(storage, thumbnailPath);
             const url = await getDownloadURL(refPtr);
             if (isMounted) setCurrentSrc(url);
         } catch (e) {
             console.warn("Direct thumbnail load failed, falling back to src", e);
             if (isMounted) setCurrentSrc(src);
         }
       };
       resolveDirect();
       return () => { isMounted = false; };
    }
    
    setCurrentSrc(null); 

    const resolveImage = async () => {
      const candidates: string[] = [];

      // 1. Explicit Thumbnail Path from DB - HANDLED ABOVE in Direct Optimization
      // if (thumbnailPath) candidates.push(thumbnailPath);
      
      // 2. Legacy Fallback: Construct Standard Thumbnail Path (if explicit path missing)
      // Only try this if we have a storage path and no explicit thumbnail path
      if (storagePath && !thumbnailPath) {
          const ext = storagePath.split('.').pop();
          const lastSlash = storagePath.lastIndexOf('/');
          const dir = storagePath.substring(0, lastSlash);
          const name = storagePath.substring(lastSlash + 1, storagePath.lastIndexOf('.'));
          
          // Standard Resize Extension Path (Matches saveSketch prediction)
          candidates.push(`${dir}/${name}_400x533.${ext}`);
      }

      // Attempt to load candidates sequentially
      for (const path of candidates) {
          try {
              console.time(`LazyImage:resolve:${path}`);
              const refPtr = ref(storage, path);
              const url = await getDownloadURL(refPtr);
              console.timeEnd(`LazyImage:resolve:${path}`);
              if (isMounted) {
                  setCurrentSrc(url);
                  return;
              }
          } catch (e) {
              console.timeEnd(`LazyImage:resolve:${path}`);
              console.warn(`[LazyImage] Failed to load candidate: ${path}`, e);
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
  }, [src, thumbnailPath]);

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
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          data-pin-description={dataPinDescription || alt} // Use passed description or fallback to alt
          loading={eager ? "eager" : "lazy"}
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
