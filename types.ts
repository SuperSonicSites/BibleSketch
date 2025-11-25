

export enum AgeGroup {
  TODDLER = "Toddler",
  YOUNG_CHILD = "Young Child",
  TEEN = "Teen",
  ADULT = "Adult"
}

export enum ArtStyle {
  SUNDAY_SCHOOL = "Sunday School",
  STAINED_GLASS = "Stained Glass",
  ICONOGRAPHY = "Iconography",
  COMIC = "Comic Book",
  CLASSIC = "Classic"
}

export interface BibleReference {
  book: string;
  chapter: number;
  startVerse: number;
  endVerse?: number;
}

export interface GenerationRequest {
  reference: BibleReference;
  ageGroup: AgeGroup;
  artStyle: ArtStyle;
}

export interface GeneratedImage {
  imageUrl: string; // Data URL or Blob URL
  originalPrompt: string;
  reference: BibleReference;
  timestamp: number;
}

export interface Sketch {
  id: string;
  userId: string;
  imageUrl: string;
  storagePath: string;
  thumbnailPath?: string; // New field for optimized loading
  // Matches Firestore Schema
  promptData: {
    book: string;
    chapter: number;
    // CHANGED: Support ranges to match BibleReference
    start_verse: number; 
    end_verse?: number; 
    
    age_group: string;
    art_style: string;
    aspect_ratio: string;
  };
  isPublic: boolean;
  blessCount: number;
  timestamp: number;
  
  // New fields for Bookmark functionality
  isBookmark?: boolean;
  originalSketchId?: string;
  originalOwnerId?: string;

  // Liturgical tags for categorization
  tags?: string[];
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number; // Negative for usage, positive for purchase
  description: string;
  timestamp: number;
  type: 'usage' | 'purchase' | 'bonus' | 'refund';
}