
import { AgeGroup, ArtStyle, FontStyle } from './types';

// ==========================================
// 0. APP CONFIGURATION
// ==========================================
export const APP_DOMAIN = 'https://BibleSketch.app';

// ==========================================
// 1. MODEL CONFIGURATION
// ==========================================
// "Nano Banana Pro" (gemini-3-pro-image-preview) is used for the Artist
// because it supports multimodal input (Reference Images).
export const MODELS = {
  ARCHITECT: "gemini-2.5-flash",
  ARTIST: "gemini-3-pro-image-preview",
  CRITIC: "gemini-2.5-flash"
};

export const THEME_COLORS = {
  background: "#FFF7ED",
  primary: "#7C3AED",
  secondary: "#FCD34D",
  text: "#1F2937",
  accent: "#A78BFA"
};

// ==========================================
// 2. REFERENCE ASSETS (The "ControlNets")
// ==========================================
// Pointing to local files in the public/references folder to bypass CORS/Network issues
// Ensure you have downloaded the images and placed them in 'public/references/' folder
const BASE_PATH = "/references/";

export const REFERENCE_MAP: Record<string, string | string[]> = {
  // TODDLER
  [`${AgeGroup.TODDLER}_${ArtStyle.SUNDAY_SCHOOL}`]: [`${BASE_PATH}toddler-sundayschool.jpg`, `${BASE_PATH}toddler-sundayschool-2.jpg`],

  // YOUNG CHILD
  [`${AgeGroup.YOUNG_CHILD}_${ArtStyle.SUNDAY_SCHOOL}`]: `${BASE_PATH}child-sundayschool.jpg`,
  [`${AgeGroup.YOUNG_CHILD}_${ArtStyle.STAINED_GLASS}`]: [`${BASE_PATH}child-stainglass.jpg`, `${BASE_PATH}child-stainglass-2.jpg`],
  [`${AgeGroup.YOUNG_CHILD}_${ArtStyle.ICONOGRAPHY}`]:   `${BASE_PATH}child-iconography.jpg`,
  [`${AgeGroup.YOUNG_CHILD}_${ArtStyle.COMIC}`]:         [`${BASE_PATH}child-comicbook.jpg`, `${BASE_PATH}child-comicbook-2.jpg`],

  // TEEN
  [`${AgeGroup.TEEN}_${ArtStyle.CLASSIC}`]:          [`${BASE_PATH}teen-classic.jpg`, `${BASE_PATH}teen-classic-2.jpg`],
  [`${AgeGroup.TEEN}_${ArtStyle.STAINED_GLASS}`]:    [`${BASE_PATH}teen-stainglass.jpg`, `${BASE_PATH}teen-stainglass-2.jpg`],
  [`${AgeGroup.TEEN}_${ArtStyle.ICONOGRAPHY}`]:      `${BASE_PATH}teen-iconography.jpg`,
  [`${AgeGroup.TEEN}_${ArtStyle.COMIC}`]:            [`${BASE_PATH}teen-comicbook.jpg`, `${BASE_PATH}teen-comicbook-2.jpg`],

  // ADULT
  [`${AgeGroup.ADULT}_${ArtStyle.CLASSIC}`]:             `${BASE_PATH}adult-classic.jpg`,
  [`${AgeGroup.ADULT}_${ArtStyle.STAINED_GLASS}`]:       [`${BASE_PATH}adult-stainglass.jpg`, `${BASE_PATH}adult-stainglass-2.jpg`],
  [`${AgeGroup.ADULT}_${ArtStyle.ICONOGRAPHY}`]:         `${BASE_PATH}adult-iconography.jpg`,
  [`${AgeGroup.ADULT}_${ArtStyle.DOODLE}`]:              [`${BASE_PATH}adult-doodle.jpg`, `${BASE_PATH}adult-doodle-2.jpg`]
};

// ==========================================
// 3. LOGIC RULES (The "Double-Lock" Text)
// ==========================================
export const AGE_LOGIC = {
  [AgeGroup.TODDLER]: {
    keywords: "BOLD, SIMPLE LINE ART. FULL SCENE COVERAGE. Background elements (simple waves, hills, clouds) must fill the page edge-to-edge. OUTLINE ONLY. NO SOLID FILLS. Ultra-thick uniform black outlines (approx 4-5mm). NO shading. Proportions: Natural/Realistic (Simplified). NO cartoon/chibi/bobblehead style.",
    subjectFocus: "Focus on a single central subject or a simple pair interacting with the environment. Do NOT float subjects in empty space. Visuals must be iconic, cheerful, and easy to color. Simplify complex crowds to 1-2 representative figures. Do NOT use black ink to represent darkness or night; use symbols (stars, moon) on white space."
  },
  [AgeGroup.YOUNG_CHILD]: {
    keywords: "STORYBOOK LINE ART. PURE WHITE BACKGROUND. OUTLINE ONLY. NO SOLID FILLS. Consistent, medium-thick outlines (approx 2mm). Focus on clear object separation. Detailed environments are acceptable (water, sky) but must maintain large, colorable segments.",
    subjectFocus: "Interaction between maximum two characters. Clear action. Visual storytelling that reflects specific narrative emotion."
  },
  [AgeGroup.TEEN]: {
    keywords: "ENGAGING COLORING BOOK STYLE. PURE WHITE BACKGROUND. OUTLINE ONLY. NO SOLID FILLS. NO hatching, NO cross-hatching, NO shading. Variable line weight (thick outer contours, fine inner lines). Complex composition with plenty of white space for coloring. Avoid large, solid black areas.", 
    subjectFocus: "Cinematic composition. Clean outlines only. **Ensure natural human height and scale. No giant figures unless giants are explicitly mentioned.**"
  },
  [AgeGroup.ADULT]: {
    keywords: "STRESS-RELIEF COLORING BOOK STYLE. PURE WHITE BACKGROUND. OUTLINE ONLY. NO SOLID FILLS. NO hatching, NO cross-hatching, NO texture shading. Use clean contour lines and decorative ornamental borders. Generous white space within each shape for pleasant coloring.",
    subjectFocus: "Symbolic, elegant composition. Detail through ornamental flourishes and borders, NOT through texture fills or dense linework."
  }
};

export const STYLE_LOGIC = {
  [ArtStyle.SUNDAY_SCHOOL]: "Gentle aesthetic, soft rounded edges, safe for children. Expressions must reflect the narrative's emotional tone.",
  [ArtStyle.STAINED_GLASS]: "Authentic medieval leaded glass. MOSAIC SEGMENTATION. Every shape must be fully enclosed by thick black lead-lines. No free-floating lines. Geometric subdivision. Stiff, architectural style.",
  [ArtStyle.ICONOGRAPHY]: "Byzantine orthodox style, formal stiff pose, halos with geometric patterns, flat perspective, spiritual and solemn.",
  [ArtStyle.COMIC]: "Dynamic comic book style, bold clean outlines, simple action lines, expressive poses, NO shading, NO hatching, NO cross-hatching.",
  [ArtStyle.CLASSIC]: "Traditional fine art illustration. Realistic proportions, clean detailed outlines, NO hatching, NO cross-hatching, NO shading. Intricate line work for detail without fill techniques.",
  [ArtStyle.DOODLE]: "Modern liturgical vector art. Bernardo Ramonfaur style illustration. Minimalist Catholic iconography. Faceted character design using straight lines and sharp corners. Clean vector lines with decorative hatching. Solemn and dignified atmosphere. Black and white ink sketch."
};

export const BIBLE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther",
  "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon",
  "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
  "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
  "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians",
  "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
  "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude",
  "Revelation"
];

// ==========================================
// 4. CONSTRAINTS & SAFETY
// ==========================================

export const CHRISTIAN_GUIDELINES = `
1. **TRINITY VISUAL RULES (STRICT):** - **God the Father:** NEVER depict as a human/man. Focus on the *effect* of His presence (light rays, wind, reaction of nature/people). Do NOT use a physical representation (like a hand) unless specifically appropriate for Genesis Creation scenes.
   - **Jesus:** Depict as a historical human male (Middle Eastern descent).
   - **Holy Spirit:** Depict as a Dove or Tongues of Fire.
2. **Subject Count:** Draw EXACTLY the number of characters described.
3. **Biblical Accuracy:** - **Exodus:** Water walls must be liquid waves, not rock.
   - **Eden:** Serpents on ground/trees only (no wings/legs).
4. **Chronological Consistency:** - **Pre-Fall (Gen 1-2):** NO SNAKES, NO APPLES, NO THORNS. NO CLOTHING. Use strategic visual modesty: foreground plants/flowers covering lower body, long hair, waist-deep water, or waist-up framing.
   - **Post-Fall (Gen 3+):** Clothing is animal skins (rough).
5. **Modesty:** Private areas must ALWAYS be concealed. Pre-Fall: use environmental/natural elements (NOT clothing). Post-Fall+: use period-appropriate attire.
6. **Scale:** Humans should always be depicted in natural, realistic scale. NO GIANT FIGURES.
7. **Digital Safety:** ALL SHAPES MUST BE CLOSED PATHS (for bucket fill).
`;

// ==========================================
// 5. LITURGICAL TAGS
// ==========================================
export const LITURGICAL_TAGS = [
  // Liturgical Seasons
  { id: 'advent', label: 'Advent', category: 'season' },
  { id: 'christmas', label: 'Christmas', category: 'season' },
  { id: 'epiphany', label: 'Epiphany', category: 'season' },
  { id: 'lent', label: 'Lent', category: 'season' },
  { id: 'holy-week', label: 'Holy Week', category: 'season' },
  { id: 'easter', label: 'Easter', category: 'season' },
  { id: 'pentecost', label: 'Pentecost', category: 'season' },
  { id: 'ordinary-time', label: 'Ordinary Time', category: 'season' },

  // Themes
  { id: 'creation', label: 'Creation', category: 'theme' },
  { id: 'the-fall', label: 'The Fall', category: 'theme' },
  { id: 'exile', label: 'Exile', category: 'theme' },
  { id: 'prophets', label: 'Prophets', category: 'theme' },
  { id: 'miracles', label: 'Miracles', category: 'theme' },
  { id: 'parables', label: 'Parables', category: 'theme' },
  { id: 'resurrection', label: 'Resurrection', category: 'theme' },
] as const;

export type LiturgicalTagId = typeof LITURGICAL_TAGS[number]['id'];

export const GOLDEN_NEGATIVES = [
  // THEOLOGY NEGATIVES
  "face of god, old man in sky, bearded god, zeus, human god figure, anthropomorphic father",

  // STYLE NEGATIVES
  "color, colored, colorful, polychrome, chromatic, red, blue, green, yellow, pink, purple, orange, brown, gold, silver, rainbow",
  "shading, grayscale, gradient, 3d render, photo, realistic texture, filled colors, grey, shadows, sketchiness, charcoal, smudge, blurry, dithering, noise, hatching, cross-hatching, wood grain texture, stippling",
  "duplicate characters, twins, clones, multiple versions of same character, crowd, extra people, collage, split screen, comic panels",
  "extra fingers, extra limbs, fused fingers, malformed hands, floating hands, anatomy disconnected, bad anatomy, mutation, missing limbs",
  "text, watermark, signature, writing, letters, numbers, bible verse numbers, chapter numbers, bottom text, footer, date, copyright",
  "modern clothing, suits, zippers, cars, buildings, glasses, wristwatches, tattoos",
  "smiling angels (in judgment scenes), happy expressions on sad characters, laughing, celebrating, party, wedding",
  "wings on serpents, dragons, surrealism, people merging with objects",

  // Ratio & Scale
  "hierarchical scaling, symbolic perspective, giant leader, giant moses, giant jesus, figure larger than mountains, scale mismatch, tiny crowd, forced perspective",

  // Coloring Book Physics
  "solid black areas, filled black shapes, heavy black background, dense cross-hatching, ink wash, filled hair, silhouette, inverted colors, night mode",
  "broken lines, gaps in lines, open shapes, sketching artifacts, unfinished lines"
].join(", ");

// ==========================================
// 6. LAYOUT RULES (V2)
// ==========================================
export const LAYOUT_RULES = `
CANVAS: FULL BLEED. Extend content to all 4 edges. NO margins. NO padding.
ORIENTATION: Camera must be level. Keep vertical lines vertical. NO Dutch angles. NO camera tilt.
NO decorative frames, borders, or margins.
`;

// ==========================================
// 7. CRITICAL NEGATIVES (V2 - Optimized)
// ==========================================
// Reduced from ~800 to ~150 chars for faster generation
export const CRITICAL_NEGATIVES = [
  "color", "shading", "hatching", "3d", "solid black", "sketch", "noise",
  "text", "watermark", "border", "rotated image", "tilted frame", "diagonal border",
  "white border", "margin", "padding", "inset image",
  "cartoon proportions", "chibi", "big head",
  "face of god", "modern", "anachronism",
  "bad anatomy", "extra limbs", "giant figure"
].join(", ");

// ==========================================
// 8. BIBLE VERSE COLORING - FONT STYLES
// ==========================================
export const FONT_STYLE_LOGIC: Record<FontStyle, string> = {
  [FontStyle.ELEGANT_SCRIPT]: "Elegant calligraphy script with flowing letters and decorative flourishes. Sophisticated swashes and ornamental curves. DOUBLE OUTLINE letters with white interior. Surrounded by delicate floral elements, graceful vines, and botanical decorations.",
  [FontStyle.MODERN_BRUSH]: "Contemporary brush lettering with varied stroke weights. Trendy hand-lettered style mixing cursive and print. DOUBLE OUTLINE hollow letters. Botanical illustrations, geometric patterns, and modern florals as decoration.",
  [FontStyle.PLAYFUL]: "Whimsical hand-drawn BUBBLE LETTERS with playful, chunky shapes. Fun, bouncy character with white interior space. Decorated with stars, hearts, simple flowers, clouds, and cheerful doodle elements.",
  [FontStyle.CLASSIC_SERIF]: "Traditional serif typography with elegant proportions. Timeless book-style HOLLOW lettering with decorative serifs. Framed with ornate borders, classical scrollwork, and decorative corner flourishes."
};

// ==========================================
// 9. BIBLE VERSE COLORING - LAYOUT RULES
// ==========================================
// Layout selection based on verse word count
export const VERSE_LAYOUT_RULES = {
  // 1-5 words: THE EMBLEM
  EMBLEM: {
    maxWords: 5,
    description: "Text contained inside a central decorative shape (circle, heart, shield, banner). The shape is the hero element. Background outside the shape is empty or simple pattern. Text is large and bold.",
    prompt: "Place the verse text inside a central decorative shape like a circle, heart, shield, or banner. The shape should be ornate with detailed borders. Keep background simple outside the main shape."
  },
  // 6-15 words: THE STACK
  STACK: {
    maxWords: 15,
    description: "Vertical hierarchy layout. KEYWORDS (nouns, verbs) are rendered 2x larger. Connector words (and, the, of, in, to) are 0.5x size in scripted style. Fills the page top-to-bottom.",
    prompt: "Arrange text in vertical stacked layout. Make important words (nouns, verbs) TWICE as large. Make connector words (the, and, of, in, to, for) half-size in a different script style. Fill the page from top to bottom with decorative elements between lines."
  },
  // 15-29 words: THE SCROLL
  SCROLL: {
    maxWords: 29,
    description: "Text block placed inside a parchment scroll graphic OR illuminated manuscript border. Center area remains white for text legibility. Ornate border frames the entire page.",
    prompt: "Place the verse text inside an ornate parchment scroll or illuminated manuscript border. The text area should be white/empty for legibility. Add detailed decorative borders with floral motifs, vines, or geometric patterns around the edges."
  },
  // 30+ words: BLOCKED
  MAX_WORDS: 30
};

// ==========================================
// 10. BIBLE VERSE COLORING - NEGATIVES
// ==========================================
// Different from GOLDEN_NEGATIVES - ALLOWS text but blocks solid fills
export const VERSE_NEGATIVES = [
  // Color negatives (same as scene)
  "color", "colored", "colorful", "red", "blue", "green", "yellow", "pink", "purple", "orange", "brown", "gold", "silver", "rainbow",
  
  // Shading negatives (same as scene)
  "shading", "grayscale", "gradient", "grey", "shadows", "3d render", "photo", "realistic texture",
  
  // CRITICAL: Anti-solid-text (text must be HOLLOW/OUTLINE)
  "solid filled letters", "filled text", "solid black text", "silhouette text", "black filled typography",
  "solid black letters", "filled in letters", "opaque text", "dark text fill",
  
  // Layout problems
  "text off canvas", "text cut off", "text running off edge", "no margins",
  "decorations behind text", "overlapping decorations on text", "text obscured",
  "tiny text", "small font", "illegible text", "blurry text",
  
  // General quality
  "watermark", "signature", "copyright", "misspelled", "typo",
  "broken lines", "gaps in outlines", "incomplete shapes"
].join(", ");

// ==========================================
// 11. BIBLE VERSE COLORING - REFERENCE IMAGES
// ==========================================
export const VERSE_REFERENCE_MAP: Record<FontStyle, string | string[]> = {
  [FontStyle.ELEGANT_SCRIPT]: `${BASE_PATH}verse-elegant.jpg`,
  [FontStyle.MODERN_BRUSH]: `${BASE_PATH}verse-modern.jpg`,
  [FontStyle.PLAYFUL]: `${BASE_PATH}verse-playful.jpg`,
  [FontStyle.CLASSIC_SERIF]: `${BASE_PATH}verse-classic.jpg`
};

// ==========================================
// 12. BIBLE VERSE COLORING - TYPOGRAPHY RULES
// ==========================================
export const VERSE_TYPOGRAPHY_RULES = `
CRITICAL TYPOGRAPHY RULES FOR BIBLE VERSE COLORING:

1. **HOLLOW TEXT ONLY (MANDATORY)**
   - ALL letters must be OUTLINE/HOLLOW style with WHITE INTERIOR
   - Use "Double Outline" or "Bubble Letter" technique
   - NEVER use solid black filled letters - they cannot be colored and waste ink
   - The white space inside each letter is where users will color

2. **TEXT HIERARCHY**
   - KEYWORDS (nouns, verbs, names) = LARGE, prominent
   - Connector words (the, and, of, in, to, for, a) = smaller, scripted
   - Bible reference = small, positioned at bottom or corner

3. **LAYOUT REQUIREMENTS**
   - Text must have MARGINS - never run off canvas edges
   - Decorative elements go AROUND text, never BEHIND or OVERLAPPING
   - Minimum "24pt equivalent" sizing - text must be large enough to color
   - All shapes must be CLOSED PATHS for bucket-fill coloring

4. **BACKGROUND**
   - PURE WHITE background only
   - NO grey washes, NO gradients, NO textures behind text

5. **DECORATIVE ELEMENTS**
   - Florals, vines, geometric patterns SURROUNDING the text
   - All decorations must also be OUTLINE only (hollow, colorable)
   - Decorations should complement, not compete with, the text
`;