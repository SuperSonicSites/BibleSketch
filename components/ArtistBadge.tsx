import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { getUserDocument } from '../services/firebase';

interface ArtistBadgeProps {
  userId: string;
  onAuthorClick?: (userId: string) => void;
  className?: string;
}

export const ArtistBadge: React.FC<ArtistBadgeProps> = ({ userId, onAuthorClick, className = "" }) => {
  const [name, setName] = useState("Artist");
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (userId) {
      getUserDocument(userId).then(doc => {
        if (mounted && doc) {
           const data = doc as any;
           if (data.displayName) setName(data.displayName);
           if (data.photoURL) setPhoto(data.photoURL);
        }
      }).catch(() => {
          // Ignore errors, fallback to defaults
      });
    }
    return () => { mounted = false; };
  }, [userId]);

  return (
    <button 
        onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (onAuthorClick) onAuthorClick(userId);
        }}
        className={`flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#7C3AED] transition-colors group/artist z-10 ${className}`}
        title={name}
    >
        <div className="w-6 h-6 rounded-full bg-gray-100 group-hover/artist:bg-purple-100 flex items-center justify-center border border-gray-200 group-hover/artist:border-purple-200 transition-colors overflow-hidden shrink-0">
            {photo ? (
              <img src={photo} alt={name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-3 h-3" />
            )}
        </div>
        <span className="group-hover/artist:underline decoration-purple-300 underline-offset-2 truncate max-w-[100px] text-left">{name}</span>
    </button>
  );
};