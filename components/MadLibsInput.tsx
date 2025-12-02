
import React, { useState, useEffect, useRef } from 'react';
import { BibleReference } from '../types';
import { BIBLE_BOOKS } from '../constants';
import { ChevronDown, Search } from 'lucide-react';

interface MadLibsInputProps {
  value: BibleReference;
  onChange: (val: BibleReference) => void;
  /** When true, hides end verse selector for single verse selection (used by Verse Art) */
  singleVerseMode?: boolean;
}

const NumericInput = ({ 
  value, 
  onChange, 
  className,
  placeholder,
  autoFocus,
  allowEmpty = false
}: { 
  value: number | undefined, 
  onChange: (val: number | undefined) => void, 
  className?: string,
  placeholder?: string,
  autoFocus?: boolean,
  allowEmpty?: boolean
}) => {
  const [localValue, setLocalValue] = useState(value?.toString() ?? "");
  const [isFocused, setIsFocused] = useState(false);

  // Sync with external prop changes only when not focused to avoid fighting the user
  useEffect(() => {
    if (!isFocused) {
       setLocalValue(value?.toString() ?? "");
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    
    // Allow empty string or digits only
    if (newVal === "" || /^\d+$/.test(newVal)) {
      setLocalValue(newVal);
      
      if (newVal === "") {
         // Do not update parent on empty string while typing
         // Wait for blur or valid number
      } else {
        const num = parseInt(newVal);
        if (!isNaN(num)) {
          // We propagate the change immediately so other UI can react,
          // BUT we rely on the parent component NOT to clamp it while typing
          // or we remove the clamping logic from the parent's onChange handler.
          onChange(num);
        }
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (localValue === "" || isNaN(parseInt(localValue))) {
       // If empty/invalid on blur:
       if (allowEmpty) {
         // For optional fields, clear the value
         onChange(undefined);
       } else {
         // For required fields, revert to current prop value
         setLocalValue(value?.toString() ?? "");
       }
    } else {
       // Ensure formatted correctly
       const num = parseInt(localValue);
       setLocalValue(num.toString());
       onChange(num);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      className={className}
      value={localValue}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      placeholder={placeholder}
      autoFocus={autoFocus}
    />
  );
};

export const MadLibsInput: React.FC<MadLibsInputProps> = ({ value, onChange, singleVerseMode = false }) => {
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
    <div className="w-full">
      <div className="bg-white shadow-xl shadow-purple-100/50 rounded-2xl border-2 border-purple-50 flex flex-col md:flex-row items-stretch md:items-center p-2 md:p-3 gap-4 md:gap-0">
        
        {/* Section 1: Book Selector (Left/Top) */}
        <div className="relative flex-grow md:flex-grow-[1.5] flex items-center" ref={dropdownRef}>
           <button 
             onClick={() => setIsBookOpen(!isBookOpen)}
             className="w-full text-left px-4 py-3 md:px-6 md:py-4 rounded-xl hover:bg-purple-50/80 transition-all group flex items-center gap-4"
           >
             <div className="flex flex-col">
               <span className="text-xs md:text-sm font-bold text-gray-600 uppercase tracking-wider">Book</span>
               <span className="text-2xl md:text-3xl font-bold text-gray-800 truncate">{value.book}</span>
             </div>
             <ChevronDown className="w-5 h-5 text-gray-400 ml-auto" />
           </button>

           {/* Dropdown */}
           {isBookOpen && (
            <div className="absolute top-full left-0 mt-4 w-full md:w-[300px] max-h-[400px] overflow-y-auto bg-white shadow-2xl shadow-purple-900/10 rounded-2xl z-50 border border-gray-100 p-3 animate-in fade-in zoom-in-95 duration-200">
               <div className="relative mb-3 sticky top-0 bg-white p-1 z-10 border-b border-gray-50 pb-3">
                 <Search className="absolute left-4 top-5 w-5 h-5 text-gray-400" />
                 <input 
                  type="text" 
                  placeholder="Search book..." 
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border-transparent rounded-xl text-base focus:bg-white focus:border-purple-200 focus:ring-4 focus:ring-purple-100/50 outline-none transition-all placeholder-gray-400 font-medium text-gray-800"
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  autoFocus
                 />
               </div>
               <div className="space-y-1">
                 {filteredBooks.map(book => (
                   <button 
                     key={book} 
                     className="w-full px-4 py-3 hover:bg-purple-50 rounded-xl text-left text-gray-700 font-bold flex items-center justify-between group transition-colors"
                     onClick={() => {
                       onChange({ ...value, book });
                       setIsBookOpen(false);
                       setBookSearch("");
                     }}
                   >
                     {book}
                     {value.book === book && <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />}
                   </button>
                 ))}
               </div>
               {filteredBooks.length === 0 && (
                  <div className="px-4 py-8 text-gray-400 text-center font-medium">No books found</div>
               )}
            </div>
           )}
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-16 bg-gray-100 mx-2"></div>
        <div className="md:hidden w-full h-px bg-gray-100 my-2"></div>

        {/* Section 2: Reference (Right/Bottom) */}
        <div className="flex-grow flex items-center gap-4 px-2 md:px-6">
           {/* Chapter */}
           <div className="flex-1 flex flex-col items-center">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Chapter</span>
              <NumericInput 
                className="w-full text-center text-2xl md:text-3xl font-bold text-gray-800 bg-transparent focus:outline-none placeholder-gray-300"
                placeholder="1"
                value={value.chapter}
                onChange={(val) => onChange({ ...value, chapter: val || 1 })}
              />
           </div>

           <div className="text-2xl font-light text-gray-300 pb-4">:</div>

           {/* Verses */}
           <div className="flex-[1.5] flex flex-col items-center">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                {singleVerseMode ? 'Verse' : 'Verses'}
              </span>
              <div className="flex items-center gap-2 w-full justify-center">
                <NumericInput 
                  className={`${singleVerseMode ? 'w-full max-w-24' : 'w-16'} text-center text-2xl md:text-3xl font-bold text-gray-800 bg-transparent focus:outline-none placeholder-gray-300`}
                  placeholder="1"
                  value={value.startVerse}
                  onChange={(val) => {
                    const newStart = val || 1;
                    onChange({ ...value, startVerse: newStart });
                  }}
                />
                {!singleVerseMode && (
                  <>
                    <span className="text-gray-300 font-medium">-</span>
                    <NumericInput 
                      className="w-16 text-center text-2xl md:text-3xl font-bold text-gray-800 bg-transparent focus:outline-none placeholder-gray-300"
                      placeholder="#"
                      value={value.endVerse}
                      allowEmpty={true}
                      onChange={(val) => {
                        onChange({ ...value, endVerse: val });
                      }}
                    />
                  </>
                )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};
