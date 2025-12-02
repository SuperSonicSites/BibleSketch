import React from 'react';
import { Book, Users, Palette, Tag, X, ArrowUpDown } from 'lucide-react';
import { LITURGICAL_TAGS } from '../constants';
import { SearchableSelect } from './ui/SearchableSelect';

export type SortOption = 'newest' | 'popular';

interface FilterBarProps {
  // Available options
  availableBooks: string[];
  availableAges: string[];
  availableStyles: string[];
  availableTags?: { id: string; label: string }[];

  // Current values
  activeBook: string;
  activeAge: string;
  activeStyle: string;
  activeTag?: string;
  activeSort?: SortOption;

  // Setters
  onBookChange: (value: string) => void;
  onAgeChange: (value: string) => void;
  onStyleChange: (value: string) => void;
  onTagChange?: (value: string) => void;
  onSortChange?: (value: SortOption) => void;

  // Optional: hide certain filters
  hideTagFilter?: boolean;
  hideSortFilter?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  availableBooks,
  availableAges,
  availableStyles,
  availableTags = [],
  activeBook,
  activeAge,
  activeStyle,
  activeTag = 'All',
  activeSort = 'popular',
  onBookChange,
  onAgeChange,
  onStyleChange,
  onTagChange,
  onSortChange,
  hideTagFilter = false,
  hideSortFilter = false,
}) => {
  const hasActiveFilters = activeBook !== 'All' || activeAge !== 'All' || activeStyle !== 'All' || activeTag !== 'All';

  const clearAllFilters = () => {
    onBookChange('All');
    onAgeChange('All');
    onStyleChange('All');
    if (onTagChange) onTagChange('All');
  };

  // Prepare options for searchable selects
  const bookOptions = [
    { value: 'All', label: 'All Books' },
    ...availableBooks.map(book => ({ value: book, label: book }))
  ];

  const ageOptions = [
    { value: 'All', label: 'All Ages' },
    ...availableAges.map(age => ({ value: age, label: age }))
  ];

  const styleOptions = [
    { value: 'All', label: 'All Styles' },
    ...availableStyles.map(style => ({ value: style, label: style }))
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Book Filter */}
        <div className="w-full md:flex-1">
          <SearchableSelect
            value={activeBook}
            onChange={onBookChange}
            options={bookOptions}
            placeholder="All Books"
            icon={<Book className="w-4 h-4" />}
            isActive={activeBook !== 'All'}
          />
        </div>

        {/* Age Filter */}
        <div className="w-full md:flex-1">
          <SearchableSelect
            value={activeAge}
            onChange={onAgeChange}
            options={ageOptions}
            placeholder="All Ages"
            icon={<Users className="w-4 h-4" />}
            isActive={activeAge !== 'All'}
          />
        </div>

        {/* Style Filter */}
        <div className="w-full md:flex-1">
          <SearchableSelect
            value={activeStyle}
            onChange={onStyleChange}
            options={styleOptions}
            placeholder="All Styles"
            icon={<Palette className="w-4 h-4" />}
            isActive={activeStyle !== 'All'}
          />
        </div>

        {/* Tag Filter */}
        {!hideTagFilter && onTagChange && (
          <div className="w-full md:flex-1">
            <SearchableSelect
              value={activeTag}
              onChange={onTagChange}
              options={[
                { value: 'All', label: 'All Tags' },
                ...availableTags.map(tag => ({ value: tag.id, label: tag.label }))
              ]}
              placeholder="All Tags"
              icon={<Tag className="w-4 h-4" />}
              isActive={activeTag !== 'All'}
            />
          </div>
        )}

        {/* Sort Option */}
        {!hideSortFilter && onSortChange && (
          <div className="relative w-full md:flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <ArrowUpDown className="w-4 h-4" />
            </div>
            <select
              value={activeSort}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              aria-label="Sort sketches by"
              className="appearance-none w-full pl-10 pr-10 py-2.5 px-4 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 bg-amber-50 border border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest First</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 border border-red-200 transition-colors md:w-auto"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Active filters:</span>
          {activeBook !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-[#7C3AED] rounded-full text-xs font-medium">
              <Book className="w-3 h-3" />
              {activeBook}
              <button onClick={() => onBookChange('All')} className="hover:text-red-500 ml-1">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {activeAge !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-[#7C3AED] rounded-full text-xs font-medium">
              <Users className="w-3 h-3" />
              {activeAge}
              <button onClick={() => onAgeChange('All')} className="hover:text-red-500 ml-1">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {activeStyle !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-[#7C3AED] rounded-full text-xs font-medium">
              <Palette className="w-3 h-3" />
              {activeStyle}
              <button onClick={() => onStyleChange('All')} className="hover:text-red-500 ml-1">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {activeTag !== 'All' && onTagChange && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-[#7C3AED] rounded-full text-xs font-medium">
              <Tag className="w-3 h-3" />
              {availableTags.find(t => t.id === activeTag)?.label || activeTag}
              <button onClick={() => onTagChange('All')} className="hover:text-red-500 ml-1">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
