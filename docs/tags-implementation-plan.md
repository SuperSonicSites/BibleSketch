# Implementation Plan: Liturgical Calendar Tags & Enhanced Discovery

## Overview
Add tags related to the liturgical calendar on sketches. Enhance Community Favorites section with multi-dimensional filtering (Books + Tags) and sorting (Most Popular / Newest).

## Constraints (User-Defined)
- Maximum **5 tags** per sketch
- Tags should be **searchable/filterable** in the gallery
- Include **additional tags** beyond liturgical calendar, but not too many
- Default sort: **Most Popular**

---

## Current State (from Screenshot)

```
┌─────────────────────────────────────────────────────────────┐
│                    Community Favorites                       │
│  Explore the most loved coloring pages...                   │
│                                                             │
│  [All Books] [Psalms] [Daniel] [John]  ← Book filter pills  │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
│  │  Card   │  │  Card   │  │  Card   │                     │
│  │Daniel   │  │John 1:1 │  │Psalms   │                     │
│  └─────────┘  └─────────┘  └─────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

**Current filters:** Books only (derived from sketch data)
**Current sort:** Implicit (likely by blessCount or recent)

---

## Proposed UX Enhancement: Universal Filter System

### Filter Dimensions (4 total)

| Dimension | Field | Options | UI Type |
|-----------|-------|---------|---------|
| **Book** | `promptData.book` | All 66 books (dynamic from data) | Dropdown |
| **Complexity** | `promptData.age_group` | Toddler, Young Child, Pre-Teen, Adult | Pills |
| **Art Style** | `promptData.art_style` | Sunday School, Stained Glass, Iconography, Comic Book, Classic | Pills |
| **Season/Tag** | `tags[]` | ~18 liturgical tags | Dropdown or Pills |

### Where Filters Apply

| Location | Book | Complexity | Style | Tag | Sort |
|----------|------|------------|-------|-----|------|
| Community Favorites | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gallery - My Gallery | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gallery - Saved | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gallery - Community | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tag Page | ✅ | ✅ | ✅ | 🔒 (fixed) | ✅ |

### Desktop Layout (Compact Filter Bar)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Community Favorites                              │
│  Explore the most loved coloring pages...                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📖 Book: [All Books ▼]  👶 Age: [All ▼]  🎨 Style: [All ▼]      │   │
│  │                                                                  │   │
│  │ 🏷️ Season: [All] [Advent] [Christmas] [Lent] [Easter] ...      │   │
│  │                                                                  │   │
│  │ Sort: [Most Popular] [Newest]              [Clear All Filters]  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Showing 24 results                                                     │
│                                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                    │
│  │  Card   │  │  Card   │  │  Card   │  │  Card   │                    │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (Collapsible Filter Panel)

```
┌───────────────────────────────────┐
│      Community Favorites          │
│                                   │
│  [🔽 Filters (2 active)]         │  ← Tap to expand
│                                   │
│  ┌─────────────────────────────┐ │
│  │ Sort: [Popular ▼]           │ │  ← Always visible
│  └─────────────────────────────┘ │
│                                   │
│  ┌───────┐ ┌───────┐ ┌───────┐  │
│  │ Card  │ │ Card  │ │ Card  │  │
│  └───────┘ └───────┘ └───────┘  │
└───────────────────────────────────┘

Expanded Filter Panel:
┌───────────────────────────────────┐
│  [🔼 Filters (2 active)]         │
│                                   │
│  📖 Book                          │
│  [All Books                    ▼] │
│                                   │
│  👶 Complexity                    │
│  [All] [Toddler] [Young] [Teen]  │
│                                   │
│  🎨 Art Style                     │
│  [All] [Sunday School] [Comic]   │
│                                   │
│  🏷️ Season/Tag                   │
│  [All] [Advent] [Christmas] ...  │
│                                   │
│  [Clear All]        [Apply (24)] │
└───────────────────────────────────┘
```

### Filter Logic (Compound Filters)

**Example user intent:** *"I want a coloring page for toddlers for Sunday School, in the book of Luke for Advent"*

```
Book: Luke  AND  Age: Toddler  AND  Style: Sunday School  AND  Tag: Advent
```

- **Between dimensions = AND**: All 4 filters combine with AND logic
- **Within dimension = single select**: One value per dimension (simpler queries)
- **"All" selection**: No filter applied for that dimension
- **Active filter count**: Show badge "(X active)" on mobile
- **Quick response**: Filters apply immediately on change (no "Apply" button on desktop)

### Sort Options
| Option | Query | Default |
|--------|-------|---------|
| Most Popular | `orderBy('blessCount', 'desc')` | Yes |
| Newest | `orderBy('createdAt', 'desc')` | No |

---

## Pagination Strategy: "Load More" (Hybrid Infinite Scroll)

### Why NOT traditional pagination?
| Approach | SEO | UX | Firestore Fit |
|----------|-----|----|--------------|
| Page numbers (1, 2, 3...) | ✅ Good | ❌ Friction, exit points | ❌ No `offset`, needs count |
| Auto infinite scroll | ❌ Poor | ⚠️ Can feel overwhelming | ✅ Easy with cursors |
| **Load More button** | ⚠️ Okay | ✅ User-controlled, engaging | ✅ Perfect fit |

### Recommended: "Load More" Button
```
┌─────────────────────────────────────────────────────────────┐
│  [Filters...]                                               │
│                                                             │
│  Showing 24 of 156 results                                  │
│                                                             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│  │     │ │     │ │     │ │     │ │     │ │     │          │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│  │     │ │     │ │     │ │     │ │     │ │     │          │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │
│                                                             │
│              [ Load More (132 remaining) ]                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation with Firestore Cursors
```typescript
interface PaginatedResult {
  sketches: Sketch[];
  lastDoc: DocumentSnapshot | null;  // Cursor for next page
  hasMore: boolean;
}

const PAGE_SIZE = 24;

export const getFilteredSketches = async (
  filters: SketchFilters,
  startAfterDoc?: DocumentSnapshot
): Promise<PaginatedResult> => {
  let q = buildFilterQuery(filters);  // Apply all filters

  q = query(q, limit(PAGE_SIZE + 1));  // Fetch 1 extra to check hasMore

  if (startAfterDoc) {
    q = query(q, startAfter(startAfterDoc));
  }

  const snapshot = await getDocs(q);
  const docs = snapshot.docs;
  const hasMore = docs.length > PAGE_SIZE;

  return {
    sketches: docs.slice(0, PAGE_SIZE).map(d => ({ id: d.id, ...d.data() })),
    lastDoc: hasMore ? docs[PAGE_SIZE - 1] : null,
    hasMore
  };
}
```

### React State Management
```typescript
const [sketches, setSketches] = useState<Sketch[]>([]);
const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
const [hasMore, setHasMore] = useState(true);
const [loading, setLoading] = useState(false);

// Initial load & filter changes reset the list
useEffect(() => {
  setSketches([]);
  setLastDoc(null);
  loadSketches();
}, [filters]);  // Re-fetch when any filter changes

const loadSketches = async (append = false) => {
  setLoading(true);
  const result = await getFilteredSketches(filters, append ? lastDoc : undefined);

  setSketches(prev => append ? [...prev, ...result.sketches] : result.sketches);
  setLastDoc(result.lastDoc);
  setHasMore(result.hasMore);
  setLoading(false);
};

const handleLoadMore = () => loadSketches(true);
```

### SEO Considerations
- **Landing pages** (tag pages, home) are crawlable with initial 24 results
- **Filtered results** don't need SEO (users arrive via search/navigation)
- **Tag pages** (`/tags/advent`) have proper H1, meta tags for SEO
- **Optional**: Add `?page=2` URL support for direct linking (P2)

### UX Benefits
| Feature | Benefit |
|---------|---------|
| 24 items per batch | Fast initial load, ~1-2 seconds |
| "X remaining" count | Sets expectations, encourages exploration |
| Filters reset scroll | Fresh results feel instant |
| No auto-load | User controls data usage |
| Skeleton loaders | Perceived performance while loading |

---

### Active Filter Pills (Below filter bar)
When filters are applied, show removable pills:
```
Active: [📖 Psalms ✕] [👶 Young Child ✕] [🏷️ Advent ✕]  [Clear All]
```

### Tag Page with Locked Tag Filter
On `/tags/advent`, the tag filter is pre-set and locked:
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back to Gallery                                                      │
│                                                                         │
│  🕯️ Advent Coloring Pages                                              │
│  Explore coloring pages perfect for the Advent season                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📖 Book: [All Books ▼]  👶 Age: [All ▼]  🎨 Style: [All ▼]      │   │
│  │                                                                  │   │
│  │ 🏷️ Season: [🔒 Advent]  ← Locked, shows current tag             │   │
│  │                                                                  │   │
│  │ Sort: [Most Popular] [Newest]                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tag List (~18 tags)

### Liturgical Season
- Advent, Christmas, Epiphany, Lent, Holy Week, Easter, Pentecost, Ordinary Time

### Special Days
- Palm Sunday, Good Friday, Ash Wednesday, All Saints, Thanksgiving

### Testament/Category
- Old Testament, New Testament, Parables, Miracles, Prophets

---

## Implementation Steps

### Phase 1: Data Model & Tag Creation

#### 1.1 Update Sketch Interface
**File:** `types.ts`
```typescript
export interface Sketch {
  // ... existing fields
  tags?: string[];  // Array of tag IDs (max 5)
}
```

#### 1.2 Create Tag Constants
**File:** `constants.ts`
```typescript
export const LITURGICAL_TAGS = [
  { id: 'advent', label: 'Advent', category: 'season' },
  { id: 'christmas', label: 'Christmas', category: 'season' },
  // ... etc
];

export const TAG_CATEGORIES = ['season', 'special', 'testament'];
```

#### 1.3 Create TagSelector Component
**File:** `components/ui/TagSelector.tsx`
- Reusable chip-based multi-select
- Props: `selectedTags`, `onChange`, `maxTags={5}`, `disabled`
- Grouped by category with labels
- Shows "(X/5 selected)" helper text

---

### Phase 2: Tag Assignment (Create & Edit)

#### 2.1 Add Tags on ResultPage
**File:** `components/ResultPage.tsx`
- Add `TagSelector` in the save flow
- Pass tags to `onSave()` callback
- Optional - user can skip

**UX Strategy: Highlighted Tag Box with Dual Benefit Messaging**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏷️ Add Tags                                        │   │
│  │                                                      │   │
│  │  Organize your creations & help others discover     │   │
│  │                                                      │   │
│  │  [Advent] [Christmas] [Lent] [Easter] [Pentecost]  │   │
│  │  [Old Testament] [New Testament] [Parables] ...    │   │
│  │                                                      │   │
│  │                                        0/5 selected │   │
│  └─────────────────────────────────────────────────────┘   │
│          ↑ Highlighted box (purple border/bg)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Visual Design:**
```tsx
<div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5 mb-6">
  <div className="flex items-center gap-2 mb-2">
    <Tag className="w-5 h-5 text-purple-600" />
    <h3 className="font-bold text-purple-900">Add Tags</h3>
  </div>
  <p className="text-sm text-purple-700 mb-4">
    Organize your creations & help others discover
  </p>
  <TagSelector
    selectedTags={selectedTags}
    onChange={setSelectedTags}
    maxTags={5}
  />
</div>
```

**Key UX Principles:**
- **Highlighted box**: Purple border/background draws attention without being aggressive
- **Dual benefit**: "Organize YOUR creations" (personal) + "help others discover" (community)
- **Simple**: Just the tag selector, no complex conditional logic
- **Non-blocking**: User can skip entirely

#### 2.2 Update Save Function
**File:** `services/firebase.ts`
```typescript
export const saveSketch = async (
  // ... existing params
  tags?: string[]  // NEW
) => {
  // Include tags in document
}
```

#### 2.3 Add Tag Editing in GalleryModal
**File:** `components/GalleryModal.tsx`
- Show `TagSelector` for `isOwner` only
- "Edit Tags" button → inline editing mode
- New function: `updateSketchTags(sketchId, tags[])`

#### 2.4 Update Security Rules
**File:** `firestore.rules`
- Ensure owner can update `tags` field
- Validate tags is array of strings

---

### Phase 3: Enhanced Discovery UI

#### 3.1 Create FilterBar Component
**File:** `components/ui/FilterBar.tsx`

**Props:**
```typescript
interface FilterBarProps {
  // Filter values
  selectedBook: string | null;
  selectedAge: string | null;
  selectedStyle: string | null;
  selectedTag: string | null;
  sortBy: 'popular' | 'newest';

  // Callbacks
  onBookChange: (book: string | null) => void;
  onAgeChange: (age: string | null) => void;
  onStyleChange: (style: string | null) => void;
  onTagChange: (tag: string | null) => void;
  onSortChange: (sort: 'popular' | 'newest') => void;
  onClearAll: () => void;

  // Configuration
  lockedTag?: string;        // For TagPage - lock tag filter
  availableBooks?: string[]; // Dynamic from data
  showResultCount?: number;  // "Showing 24 results"
}
```

**Features:**
- Desktop: Compact bar with dropdowns + tag pills
- Mobile: Collapsible panel with "(X active)" badge
- Active filter pills with remove (✕) buttons
- "Clear All Filters" button
- Result count display
- Locked tag mode for TagPage

#### 3.2 Update FeaturedSection Component
**File:** `components/FeaturedSection.tsx`
- Replace inline book pills with `<FilterBar />`
- Add state: `selectedBook`, `selectedTag`, `sortBy`
- Update query based on filters

#### 3.3 Update Firestore Queries
**File:** `services/firebase.ts`

```typescript
interface SketchFilters {
  book?: string;
  ageGroup?: string;
  artStyle?: string;
  tag?: string;
  sortBy?: 'popular' | 'newest';
  isPublic?: boolean;       // true for community, undefined for own
  userId?: string;          // for "My Gallery"
  isBookmark?: boolean;     // for "Saved" tab
}

export const getFilteredSketches = async (filters: SketchFilters) => {
  const {
    book,
    ageGroup,
    artStyle,
    tag,
    sortBy = 'popular',
    isPublic,
    userId,
    isBookmark
  } = filters;

  let q = query(collection(db, 'sketches'));

  // Base filters (determines which "pool" of sketches)
  if (isPublic !== undefined) {
    q = query(q, where('isPublic', '==', isPublic));
  }
  if (userId) {
    q = query(q, where('userId', '==', userId));
  }
  if (isBookmark !== undefined) {
    q = query(q, where('isBookmark', '==', isBookmark));
  }

  // Dimension filters (all AND logic)
  if (book) {
    q = query(q, where('promptData.book', '==', book));
  }
  if (ageGroup) {
    q = query(q, where('promptData.age_group', '==', ageGroup));
  }
  if (artStyle) {
    q = query(q, where('promptData.art_style', '==', artStyle));
  }
  if (tag) {
    q = query(q, where('tags', 'array-contains', tag));
  }

  // Sort
  const orderField = sortBy === 'popular' ? 'blessCount' : 'createdAt';
  q = query(q, orderBy(orderField, 'desc'), limit(50));

  return getDocs(q);
}

// Usage examples:
// Community Favorites: getFilteredSketches({ isPublic: true, book: 'Psalms', tag: 'advent' })
// My Gallery: getFilteredSketches({ userId: 'xxx', ageGroup: 'Young Child' })
// Saved: getFilteredSketches({ userId: 'xxx', isBookmark: true, artStyle: 'Comic Book' })
// Tag Page: getFilteredSketches({ isPublic: true, tag: 'easter', book: 'John' })
```

**Note on Firestore limitations:**
- Firestore requires composite indexes for multi-field queries
- `array-contains` can only be used once per query
- May need to do some client-side filtering for complex combinations

#### 3.4 Create Firestore Indexes
**File:** `firestore.indexes.json`

Due to the 4-dimensional filter system, we need several composite indexes.
Firestore will prompt you to create missing indexes when queries fail.

**Core indexes needed:**
```json
{
  "indexes": [
    // Community + Tag + Popular
    {
      "collectionGroup": "sketches",
      "fields": [
        { "fieldPath": "isPublic", "order": "ASCENDING" },
        { "fieldPath": "tags", "arrayConfig": "CONTAINS" },
        { "fieldPath": "blessCount", "order": "DESCENDING" }
      ]
    },
    // Community + Tag + Newest
    {
      "collectionGroup": "sketches",
      "fields": [
        { "fieldPath": "isPublic", "order": "ASCENDING" },
        { "fieldPath": "tags", "arrayConfig": "CONTAINS" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // Community + Book + Popular
    {
      "collectionGroup": "sketches",
      "fields": [
        { "fieldPath": "isPublic", "order": "ASCENDING" },
        { "fieldPath": "promptData.book", "order": "ASCENDING" },
        { "fieldPath": "blessCount", "order": "DESCENDING" }
      ]
    },
    // Community + Age + Popular
    {
      "collectionGroup": "sketches",
      "fields": [
        { "fieldPath": "isPublic", "order": "ASCENDING" },
        { "fieldPath": "promptData.age_group", "order": "ASCENDING" },
        { "fieldPath": "blessCount", "order": "DESCENDING" }
      ]
    },
    // Community + Style + Popular
    {
      "collectionGroup": "sketches",
      "fields": [
        { "fieldPath": "isPublic", "order": "ASCENDING" },
        { "fieldPath": "promptData.art_style", "order": "ASCENDING" },
        { "fieldPath": "blessCount", "order": "DESCENDING" }
      ]
    },
    // User's own sketches + filters
    {
      "collectionGroup": "sketches",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "isBookmark", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**Strategy for complex multi-filter queries:**
- Create indexes for most common single-filter + sort combinations
- For 2+ filters simultaneously, fetch with primary filter then filter client-side
- Or: Denormalize data (store flattened filter fields)

#### 3.5 Display Tags on Sketch Cards
**File:** `components/FeaturedSection.tsx` (or card component)
- Show 1-3 tag badges below the reference
- Truncate with "+2 more" if many tags
- Click tag badge → navigate to tag page

#### 3.6 Create Tag Landing Pages
**New Route:** `/tags/:tagId` (e.g., `/tags/advent`)
**File:** `components/TagPage.tsx` (new)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Gallery                                          │
│                                                             │
│  🎄 Advent Coloring Pages                    ← H1 Title    │
│  Explore coloring pages perfect for the Advent season       │
│                                                             │
│  Sort: [Most Popular ▼] [Newest]                           │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
│  │  Card   │  │  Card   │  │  Card   │                     │
│  └─────────┘  └─────────┘  └─────────┘                     │
│                                                             │
│  [Load More]                                                │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Dynamic H1: `{Tag Label} Coloring Pages` (SEO friendly)
- Optional tag icon/emoji
- Sort toggle (Most Popular / Newest)
- Reuses sketch card component from FeaturedSection
- Query: `where('tags', 'array-contains', tagId)`

**Tag Metadata (in constants.ts):**
```typescript
export const LITURGICAL_TAGS = [
  {
    id: 'advent',
    label: 'Advent',
    category: 'season',
    emoji: '🕯️',
    description: 'Explore coloring pages perfect for the Advent season'
  },
  {
    id: 'easter',
    label: 'Easter',
    category: 'season',
    emoji: '✝️',
    description: 'Celebrate the resurrection with these coloring pages'
  },
  // ... etc
];
```

---

### Phase 3.5: SketchPage Tag Display & Editing

#### Location in SketchPage Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Daniel 6:16-22                              ← H1 Title     │
│  [Young Child] Created by Renaud • Nov 22   ← Metadata     │
│                                                             │
│  ┌─────────────────────────────────────────┐               │
│  │ 🏷️ Tags                         [Edit] │  ← Owner only  │
│  │ [Advent] [Old Testament] [Prophets]     │  ← Clickable  │
│  └─────────────────────────────────────────┘               │
│                                                             │
│  [♥ Bless this Sketch (2)]                                 │
│  [🖨️ Print PDF]                                            │
│  [⬇️ Download Image]                                       │
│  [🔖 Save to Collection]                                   │
└─────────────────────────────────────────────────────────────┘
```

#### Display Mode (Default)
- Section with label "Tags" and subtle background
- Tags shown as clickable pill badges
- Clicking tag navigates to `/tags/{tagId}`
- If no tags: Show "No tags" (owner sees "+ Add Tags" button)

#### Edit Mode (Owner Only)
- "Edit" button toggles to edit mode
- Shows `TagSelector` component inline
- "Save" / "Cancel" buttons
- Max 5 tags enforced
- Saves via `updateSketchTags(sketchId, tags)`

#### Visual Design
```tsx
// Display Mode
<div className="bg-gray-50 rounded-xl p-4 mb-6">
  <div className="flex items-center justify-between mb-3">
    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
      Tags
    </span>
    {isOwner && (
      <button className="text-xs text-[#7C3AED] hover:underline">
        Edit
      </button>
    )}
  </div>
  <div className="flex flex-wrap gap-2">
    {tags.map(tag => (
      <Link
        to={`/tags/${tag.id}`}
        className="px-3 py-1 bg-purple-100 text-[#7C3AED] rounded-full text-sm font-medium hover:bg-purple-200 transition-colors"
      >
        {tag.emoji} {tag.label}
      </Link>
    ))}
    {tags.length === 0 && !isOwner && (
      <span className="text-gray-400 text-sm italic">No tags</span>
    )}
    {tags.length === 0 && isOwner && (
      <button className="text-[#7C3AED] text-sm hover:underline">
        + Add Tags
      </button>
    )}
  </div>
</div>

// Edit Mode
<div className="bg-purple-50 rounded-xl p-4 mb-6 border-2 border-[#7C3AED]">
  <div className="flex items-center justify-between mb-3">
    <span className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider">
      Edit Tags (max 5)
    </span>
    <span className="text-xs text-gray-500">{selectedTags.length}/5</span>
  </div>
  <TagSelector
    selectedTags={selectedTags}
    onChange={setSelectedTags}
    maxTags={5}
  />
  <div className="flex gap-2 mt-4">
    <Button size="sm" onClick={handleSaveTags}>Save</Button>
    <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
  </div>
</div>
```

#### Navigation Flow
```
User clicks [Advent] tag on SketchPage
        ↓
Navigate to /tags/advent
        ↓
TagPage loads with:
  - H1: "Advent Coloring Pages"
  - Query: sketches where tags array-contains 'advent'
  - Sort: Most Popular (default)
```

---

### Phase 4: Polish & Edge Cases

#### 4.1 Empty States
- "No sketches found for [Advent] in [Daniel]"
- Suggest removing a filter

#### 4.2 URL State (Optional Enhancement)
- Persist filters in URL: `?book=psalms&tag=advent&sort=newest`
- Enables sharing filtered views

#### 4.3 Mobile Optimization
- Horizontal scroll for filter pills
- Or collapsible accordion sections

---

## Stress Testing

### Data Integrity

| Scenario | Expected | Mitigation |
|----------|----------|------------|
| Old sketches without tags | Display normally | Use `tags ?? []` fallback |
| User saves with 0 tags | Works fine | `tags` field is optional |
| User tries 6+ tags | Blocked by UI | TagSelector enforces max 5 |

### Query Performance

| Scenario | Expected | Mitigation |
|----------|----------|------------|
| Filter by book + tag + sort | Needs composite index | Pre-create indexes |
| Filter by 3-4 dimensions | May not have exact index | Primary filter server-side, rest client-side |
| Large result sets | Slow render | Limit to 50, load more button |
| No matching results | Empty state | Show helpful message + clear filters
| Switching filters rapidly | Multiple requests | Debounce filter changes (300ms) |

### Security

| Scenario | Expected | Mitigation |
|----------|----------|------------|
| Non-owner edits tags | Blocked | Security rules check `userId` |
| Invalid tag values | Reject | Validate in rules or function |

### UI/UX

| Scenario | Expected | Mitigation |
|----------|----------|------------|
| Many books in filter | Horizontal scroll | Scrollable pill container |
| Mobile cramped | Responsive | Stack filters vertically or collapse |
| Filter + no results | Clear feedback | "No results" + clear filters button |

### Backward Compatibility

| Scenario | Expected | Mitigation |
|----------|----------|------------|
| Existing sketches | Work without tags | Optional field, handled gracefully |
| Old app version | No tag features | Progressive enhancement |

---

## Implementation Order

### Phase 1: Core Tag System (P0)
| Step | File(s) | Description |
|------|---------|-------------|
| 1 | `types.ts` | Add `tags?: string[]` to Sketch interface |
| 2 | `constants.ts` | Define LITURGICAL_TAGS with id, label, emoji, description |
| 3 | `TagSelector.tsx` | Create reusable tag picker component (max 5) |
| 4 | `firebase.ts` | Update saveSketch to accept tags |
| 5 | `ResultPage.tsx` | Add TagSelector before save |

### Phase 2: Tag Display & Editing (P1)
| Step | File(s) | Description |
|------|---------|-------------|
| 6 | `firebase.ts` | Add updateSketchTags function |
| 7 | `SketchPage.tsx` | Display tags + edit mode for owner |
| 8 | `GalleryModal.tsx` | Add tag editing for owner |

### Phase 3: Universal Filter System (P1)
| Step | File(s) | Description |
|------|---------|-------------|
| 9 | `FilterBar.tsx` | Create 4-dimension filter component |
| 10 | `firebase.ts` | Add getFilteredSketches with all dimensions |
| 11 | `FeaturedSection.tsx` | Integrate FilterBar (Community Favorites) |
| 12 | `Gallery.tsx` | Integrate FilterBar (My/Saved/Community tabs) |
| 13 | `firestore.indexes.json` | Create composite indexes |
| 14 | `firestore.rules` | Ensure tags can be updated by owner |

### Phase 4: Tag Navigation (P1)
| Step | File(s) | Description |
|------|---------|-------------|
| 15 | `TagPage.tsx` | Create tag landing page with locked filter |
| 16 | `App.tsx` | Add /tags/:tagId route |

### Phase 5: Polish (P2)
| Step | File(s) | Description |
|------|---------|-------------|
| 17 | Sketch cards | Display tag badges on cards |
| 18 | URL state | Persist filters in URL |
| 19 | Mobile | Collapsible filter panel |
| 20 | Empty states | "No results" + clear filters UX |

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `types.ts` | Modify | Add `tags?: string[]` |
| `constants.ts` | Modify | Add LITURGICAL_TAGS + AGE_GROUPS + ART_STYLES constants |
| `components/ui/TagSelector.tsx` | Create | Reusable tag picker (max 5) |
| `components/ui/FilterBar.tsx` | Create | 4-dimension filter: Book, Age, Style, Tag + Sort |
| `components/TagPage.tsx` | Create | Tag landing page ("/tags/:tagId") |
| `services/firebase.ts` | Modify | saveSketch, updateSketchTags, getFilteredSketches |
| `components/ResultPage.tsx` | Modify | Add TagSelector before save |
| `components/SketchPage.tsx` | Modify | Display tags + edit mode for owner |
| `components/GalleryModal.tsx` | Modify | Add tag editing for owner |
| `components/FeaturedSection.tsx` | Modify | Integrate FilterBar |
| `components/Gallery.tsx` | Modify | Integrate FilterBar for all 3 tabs |
| `App.tsx` | Modify | Add route for /tags/:tagId |
| `firestore.rules` | Modify | Allow tags update by owner |
| `firestore.indexes.json` | Create | Composite indexes for filtered queries |

---

## Open Decisions

1. **Filter persistence**: Reset on page reload or persist in URL?
2. **Tag display on cards**: Show all tags or limit to 2-3?
3. **Filter combination UI**: Separate rows vs unified bar?

---

## Status: PENDING IMPLEMENTATION
