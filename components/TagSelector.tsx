import React from 'react';
import { Tag } from 'lucide-react';
import { LITURGICAL_TAGS } from '../constants';

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  compact?: boolean; // For inline/modal editing vs full display
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onChange,
  compact = false
}) => {
  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter(t => t !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  // Group tags by category
  const tagsByCategory = LITURGICAL_TAGS.reduce((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = [];
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, typeof LITURGICAL_TAGS[number][]>);

  const categoryLabels: Record<string, string> = {
    season: 'Liturgical Seasons',
    theme: 'Themes'
  };

  const categoryOrder = ['season', 'theme'];

  if (compact) {
    // Compact mode: flat list of tag chips
    return (
      <div className="flex flex-wrap gap-2">
        {LITURGICAL_TAGS.map(tag => (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium transition-all
              ${selectedTags.includes(tag.id)
                ? 'bg-[#7C3AED] text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-[#7C3AED]'
              }
            `}
          >
            {tag.label}
          </button>
        ))}
      </div>
    );
  }

  // Full mode: categorized with invitation message
  return (
    <div className="bg-gradient-to-br from-purple-50 to-amber-50 rounded-2xl p-6 border-2 border-dashed border-purple-200">
      {/* Header with invitation */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-[#7C3AED] rounded-xl">
          <Tag className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">Add Tags</h3>
          <p className="text-sm text-gray-500">
            Organize your creations & help others discover
          </p>
        </div>
      </div>

      {/* Categorized tags */}
      <div className="space-y-4">
        {categoryOrder.map(category => (
          <div key={category}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {categoryLabels[category]}
            </p>
            <div className="flex flex-wrap gap-2">
              {tagsByCategory[category]?.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium transition-all
                    ${selectedTags.includes(tag.id)
                      ? 'bg-[#7C3AED] text-white shadow-md scale-105'
                      : 'bg-white text-gray-600 hover:bg-purple-100 hover:text-[#7C3AED] border border-gray-200'
                    }
                  `}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selected count */}
      {selectedTags.length > 0 && (
        <div className="mt-4 pt-4 border-t border-purple-200">
          <p className="text-sm text-[#7C3AED] font-medium">
            {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  );
};

// Helper component to display tags (read-only)
interface TagDisplayProps {
  tags: string[];
  size?: 'sm' | 'md';
  onTagClick?: (tagId: string) => void;
}

export const TagDisplay: React.FC<TagDisplayProps> = ({
  tags,
  size = 'sm',
  onTagClick
}) => {
  if (!tags || tags.length === 0) return null;

  const getTagLabel = (tagId: string) => {
    const tag = LITURGICAL_TAGS.find(t => t.id === tagId);
    return tag?.label || tagId;
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tagId => (
        <span
          key={tagId}
          onClick={() => onTagClick?.(tagId)}
          className={`
            inline-flex items-center rounded-full font-medium
            ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
            ${onTagClick
              ? 'bg-purple-100 text-[#7C3AED] hover:bg-purple-200 cursor-pointer transition-colors'
              : 'bg-purple-100 text-[#7C3AED]'
            }
          `}
        >
          {getTagLabel(tagId)}
        </span>
      ))}
    </div>
  );
};
