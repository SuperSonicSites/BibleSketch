

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
  CLASSIC = "Classic",
  DOODLE = "Doodles"
}

// Font styles for Bible Verse coloring pages
export enum FontStyle {
  ELEGANT_SCRIPT = "Elegant Script",
  MODERN_BRUSH = "Modern Brush",
  PLAYFUL = "Playful",
  CLASSIC_SERIF = "Classic Serif"
}

// Sketch type discriminator
export type SketchType = 'scene' | 'verse';

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
  
  // Sketch type: 'scene' (default/legacy) or 'verse' (typography-focused)
  type?: SketchType;
  
  // Matches Firestore Schema
  promptData: {
    book: string;
    chapter: number;
    // CHANGED: Support ranges to match BibleReference
    start_verse: number; 
    end_verse?: number; 
    
    // Scene-specific fields
    age_group?: string;
    art_style?: string;
    
    // Verse-specific fields
    font_style?: string;
    
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

// Pinterest Tag type declaration
declare global {
  interface Window {
    pintrk?: (
      action: 'load' | 'page' | 'track',
      eventOrTagId?: string,
      data?: Record<string, any>
    ) => void;
  }
}