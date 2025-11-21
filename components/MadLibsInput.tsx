
import React, { useState, useEffect, useRef } from 'react';
import { BibleReference } from '../types';
import { BIBLE_BOOKS } from '../constants';
import { ChevronDown, Search } from 'lucide-react';

interface MadLibsInputProps {
  value: BibleReference;
  onChange: (val: BibleReference) => void;
}

export const MadLibsInput: React.FC<MadLibsInputProps> = ({ value, onChange }) => {
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredBooks = BIBLE_BOOKS.filter(b => 
    b.toLowerCase().includes(bookSearch.toLowerCase())
  );

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBookOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="text-2xl md:text-4xl md:leading-normal font-display font-bold text-gray-800 text-center max-w-4xl mx-auto">
      <span className="inline-block">Today I'll draw a scene from</span>
      
      {/* Book Selector */}
      <div className="relative inline-block mx-2 md:mx-3 align-bottom" ref={dropdownRef}>
        <button 
          onClick={() => setIsBookOpen(!isBookOpen)}
          className="border-b-2 border-[#7C3AED] text-[#7C3AED] px-2 hover:bg-purple-50 transition-colors flex items-center gap-1"
        >
          {value.book}
          <ChevronDown className="w-5 h-5 md:w-8 md:h-8" />
        </button>

        {isBookOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 max-h-80 overflow-y-auto bg-white shadow-xl rounded-xl z-50 border border-gray-100 p-2 text-base font-normal">
             <div className="relative mb-2 sticky top-0 bg-white p-1 z-10">
               <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
               <input 
                type="text" 
                placeholder="Search book..." 
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#7C3AED] bg-white text-black placeholder-gray-500 shadow-sm"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                autoFocus
               />
             </div>
             {filteredBooks.map(book => (
               <div 
                 key={book} 
                 className="px-3 py-2 hover:bg-purple-50 cursor-pointer rounded-lg text-left text-gray-700"
                 onClick={() => {
                   onChange({ ...value, book });
                   setIsBookOpen(false);
                   setBookSearch("");
                 }}
               >
                 {book}
               </div>
             ))}
             {filteredBooks.length === 0 && (
                <div className="px-3 py-2 text-gray-400 text-center text-sm">No books found</div>
             )}
          </div>
        )}
      </div>

      <span className="inline-block">chapter</span>

      {/* Chapter Input */}
      <div className="inline-block mx-2 md:mx-3 w-16 md:w-24 align-bottom">
        <input 
          type="number" 
          min="1"
          className="w-full border-b-2 border-[#7C3AED] text-[#7C3AED] text-center bg-transparent focus:outline-none focus:bg-purple-50 rounded-t-md"
          value={value.chapter}
          onChange={(e) => onChange({ ...value, chapter: parseInt(e.target.value) || 1 })}
        />
      </div>

      <span className="inline-block">verses</span>

      {/* Start Verse Input */}
      <div className="inline-block ml-2 md:ml-3 w-14 md:w-20 align-bottom">
        <input 
          type="number" 
          min="1"
          className="w-full border-b-2 border-[#7C3AED] text-[#7C3AED] text-center bg-transparent focus:outline-none focus:bg-purple-50 rounded-t-md"
          value={value.startVerse}
          onChange={(e) => {
             const newStart = parseInt(e.target.value) || 1;
             // Ensure end verse isn't less than start verse
             let newEnd = value.endVerse;
             if (newEnd !== undefined && newEnd < newStart) {
               newEnd = undefined;
             }
             onChange({ ...value, startVerse: newStart, endVerse: newEnd });
          }}
        />
      </div>
      
      <span className="inline-block mx-1 text-gray-400 font-bold">-</span>

      {/* End Verse Input */}
      <div className="inline-block mr-2 md:mr-3 w-14 md:w-20 align-bottom">
        <input 
          type="number" 
          min={value.startVerse}
          placeholder="#"
          className="w-full border-b-2 border-[#7C3AED] text-[#7C3AED] text-center bg-transparent focus:outline-none focus:bg-purple-50 rounded-t-md placeholder-purple-200/50"
          value={value.endVerse || ''}
          onChange={(e) => {
             const val = parseInt(e.target.value);
             onChange({ ...value, endVerse: isNaN(val) ? undefined : val })
          }}
          onBlur={(e) => {
             const val = parseInt(e.target.value);
             // Clean up invalid ranges on blur
             if (!isNaN(val) && val < value.startVerse) {
                onChange({ ...value, endVerse: undefined });
             }
          }}
        />
      </div>
    </div>
  );
};
