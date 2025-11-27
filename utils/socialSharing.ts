import { Sketch } from '../types';
import { generateSketchSlug } from './urlHelpers';
import { APP_DOMAIN } from '../constants';

interface ShareData {
  url: string;
  title: string;
  description: string;
  imageUrl: string;
}

/**
 * Generates a formatted Bible reference string.
 * e.g., "John 3:16", "Genesis 1:1-5"
 */
const formatBibleReference = (sketch: Sketch): string => {
  const { book, chapter, start_verse, end_verse } = sketch.promptData;
  let verseRange = "";
  if (start_verse) {
    verseRange = `:${start_verse}`;
    if (end_verse && end_verse > start_verse) {
      verseRange += `-${end_verse}`;
    }
  }
  return `${book} ${chapter}${verseRange}`;
};

// Map for pluralizing Audience strings
const PLURAL_AUDIENCE: Record<string, string> = {
  "Toddler": "Toddlers",
  "Young Child": "Young Children",
  "Pre-Teen": "Pre-Teens",
  "Teen": "Teens",
  "Adult": "Adults",
  "All Ages": "All Ages"
};

/**
 * Helper to display pluralized audience for templates (e.g., "Teens" instead of "Teen")
 */
const formatAudience = (ageGroup: string | undefined): string => {
  if (!ageGroup) return "All Ages";
  
  // Return plural form if available, otherwise default to original
  return PLURAL_AUDIENCE[ageGroup] || ageGroup;
};

/**
 * Generates the dynamic description based on rotating templates.
 */
const generateDescription = (sketch: Sketch): string => {
  const reference = formatBibleReference(sketch);
  const { book, age_group, art_style } = sketch.promptData;
  const audience = formatAudience(age_group);
  const style = art_style || "Coloring Page";
  
  // Tags
  const sketchTags = sketch.tags ? sketch.tags.map(t => `#${t.replace(/\s+/g, '')}`).join(' ') : '';
  const staticTags = "#biblecoloringpages #scripturecoloring #sundayschool #christiancoloring #biblecoloring #BibleSketch #aigenerated";
  // Create dynamic tags without spaces
  const dynamicTags = `#{Book} #{Audience}BibleStudy`
    .replace('{Book}', book.replace(/\s+/g, ''))
    .replace('{Audience}', audience.replace(/\s+/g, ''));
  
  const allTags = `${sketchTags} ${staticTags} ${dynamicTags}`.trim();
  const disclaimer = "Disclaimer: This design was created with the help of AI tools.";
  const brand = "BibleSketch";

  // Templates (Removed 's' suffix since formatAudience provides plural)
  const templates = [
    // Template 1
    "{Book} {Verse} Coloring Page – Printable {Style} design. This scripture coloring sheet features text from the Book of {Book} and is perfect for {Audience}. Download this and other books of the bible coloring pages for free at {Brand}. \n\n{aidisclaimer}",
    
    // Template 2
    "Need a meaningful activity for {Audience}? 🖍️ This {Book} {Verse} coloring page is a perfect lesson supplement for Sunday School or home Bible study. A beautiful {Style} way to help them memorize scripture. Get this printable for free from {Brand}. \n\n{aidisclaimer}",
    
    // Template 3
    "Relax and meditate on God's word with this {Style} {Book} {Verse} coloring sheet. 🌿 Designed specifically for {Audience}, this printable art helps you focus on scripture while you color. Instant download available at {Brand}. \n\n{aidisclaimer}"
  ];

  // Deterministic rotation based on Sketch ID
  const index = sketch.id.charCodeAt(0) % templates.length;
  const template = templates[index];

  // Extract Verse part from reference (or just use the whole reference if that fails)
  // "John 3:16" -> replace "John " -> "3:16"
  const versePart = reference.replace(`${book} `, '') || reference; 

  let desc = template
    .replace(/\{Book\}/g, book)
    .replace(/\{Verse\}/g, versePart)
    .replace(/\{Style\}/g, style)
    .replace(/\{Audience\}/g, audience)
    .replace(/\{Brand\}/g, brand)
    .replace(/\{aidisclaimer\}/g, disclaimer);

  // Append tags at the end
  return `${desc}\n\n${allTags}`;
};

export const generateShareData = (sketch: Sketch, platform: 'facebook' | 'pinterest' | 'twitter' | 'default'): ShareData => {
  const slug = generateSketchSlug(sketch);
  const url = `${APP_DOMAIN}/coloring-page/${slug}/${sketch.id}`;
  const reference = formatBibleReference(sketch);
  // Use singular/standard age for Title if possible, or just use the formatted one?
  // "Printable Scripture for Teens" looks good.
  const audience = formatAudience(sketch.promptData?.age_group);
  
  // Title Logic: "{Book} {Verse} Coloring Page | Printable Scripture for {Audience}"
  const title = `${reference} Coloring Page | Printable Scripture for ${audience}`;
  
  // Description Logic - body content from templates
  const bodyDescription = generateDescription(sketch);
  
  // For Pinterest: UNCONDITIONALLY prepend title to description.
  // This is the most robust way to ensure the title appears in the description field,
  // which is the only place Pinterest reliably displays text from the URL.
  // We do this for 'pinterest' OR 'default' (used for SEO) but not necessarily others if they use og:title.
  // However, to simplify and fix the bug where platform might be mismatched, we will force it if platform is 'pinterest'.
  
  let description = bodyDescription;
  
  if (platform === 'pinterest') {
      description = `${title}\n\n${bodyDescription}`;
  }

  return {
    url,
    title,
    description,
    imageUrl: sketch.imageUrl
  };
};

/**
 * Opens a centered popup window for social sharing.
 */
export const openSharePopup = (url: string) => {
  const width = 600;
  const height = 700;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;
  
  window.open(
    url, 
    'shareWindow', 
    `width=${width},height=${height},menubar=no,location=no,resizable=yes,scrollbars=yes,status=no,left=${left},top=${top}`
  );
};
