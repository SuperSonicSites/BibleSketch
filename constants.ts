
import { AgeGroup, ArtStyle } from './types';

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

  // PRE_TEEN
  [`${AgeGroup.PRE_TEEN}_${ArtStyle.CLASSIC}`]:          [`${BASE_PATH}teen-classic.jpg`, `${BASE_PATH}teen-classic-2.jpg`],
  [`${AgeGroup.PRE_TEEN}_${ArtStyle.STAINED_GLASS}`]:    [`${BASE_PATH}teen-stainglass.jpg`, `${BASE_PATH}teen-stainglass-2.jpg`],
  [`${AgeGroup.PRE_TEEN}_${ArtStyle.ICONOGRAPHY}`]:      `${BASE_PATH}teen-iconography.jpg`,
  [`${AgeGroup.PRE_TEEN}_${ArtStyle.COMIC}`]:            [`${BASE_PATH}teen-comicbook.jpg`, `${BASE_PATH}teen-comicbook-2.jpg`],

  // ADULT
  [`${AgeGroup.ADULT}_${ArtStyle.CLASSIC}`]:             `${BASE_PATH}adult-classic.jpg`,
  [`${AgeGroup.ADULT}_${ArtStyle.STAINED_GLASS}`]:       [`${BASE_PATH}adult-stainglass.jpg`, `${BASE_PATH}adult-stainglass-2.jpg`],
  [`${AgeGroup.ADULT}_${ArtStyle.ICONOGRAPHY}`]:         `${BASE_PATH}adult-iconography.jpg`
};

// ==========================================
// 3. LOGIC RULES (The "Double-Lock" Text)
// ==========================================
export const AGE_LOGIC = {
  [AgeGroup.TODDLER]: {
    keywords: "SUNDAY SCHOOL COLORING ART. PURE WHITE BACKGROUND. OUTLINE ONLY. NO SOLID FILLS. Ultra-thick uniform black outlines (approx 4-5mm). NO shading, NO gradients, NO texture, NO fill. Do NOT use black ink to represent darkness or night; use symbols (stars, moon) on white space.",
    subjectFocus: "Focus on a single central subject or a simple pair. Visuals must be iconic, cheerful, and easy to color. Simplify complex crowds to 1-2 representative figures."
  },
  [AgeGroup.YOUNG_CHILD]: {
    keywords: "STORYBOOK LINE ART. PURE WHITE BACKGROUND. OUTLINE ONLY. NO SOLID FILLS. Consistent, medium-thick outlines (approx 2mm). Focus on clear object separation. Detailed environments are acceptable (water, sky) but must maintain large, colorable segments.",
    subjectFocus: "Interaction between maximum two characters. Clear action. Visual storytelling that reflects specific narrative emotion."
  },
  [AgeGroup.PRE_TEEN]: {
    keywords: "ENGAGING COLORING BOOK STYLE. PURE WHITE BACKGROUND. OUTLINE ONLY. NO SOLID FILLS. Variable line weight (thick outer contours, ultra-fine inner lines). Complex, full-page environment with intricate detail while leaving plenty of white space for drawing. Avoid large, solid black areas.", 
    subjectFocus: "Dramatic angles, cinematic composition. **Ensure natural human height and scale. No giant figures unless giants are explicitly mentioned.**"
  },
  [AgeGroup.ADULT]: {
    keywords: "STRESS-RELIEF COLORING BOOK STYLE. PURE WHITE BACKGROUND. OUTLINE ONLY. NO SOLID FILLS. Intricate texture rendering (e.g., wood grain, knotwork). The resulting line work must be highly detailed and visually overwhelming, suitable for meditative coloring. Leaving enough white space for coloring.",
    subjectFocus: "Symbolic, complex, full-page composition, highly detailed patterns filling the negative space."
  }
};

export const STYLE_LOGIC = {
  [ArtStyle.SUNDAY_SCHOOL]: "Gentle aesthetic, soft rounded edges, safe for children. Expressions must reflect the narrative's emotional tone.",
  [ArtStyle.STAINED_GLASS]: "Authentic medieval leaded glass. MOSAIC SEGMENTATION. Every shape must be fully enclosed by thick black lead-lines. No free-floating lines. Geometric subdivision. Stiff, architectural style.",
  [ArtStyle.ICONOGRAPHY]: "Byzantine orthodox style, formal stiff pose, halos with geometric patterns, flat perspective, spiritual and solemn.",
  [ArtStyle.COMIC]: "Dynamic comic book shading, simple action lines, simple sketching lines,dramatic lighting, minimal inking.",
  [ArtStyle.CLASSIC]: "Traditional fine art illustration. Realistic proportions, detailed hatching and cross-hatching, engraving aesthetic, high detail line work."
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
1. **TRINITY VISUAL RULES (STRICT):** - **God the Father:** NEVER depict as a human/man. Use SYMBOLS only: A Hand reaching from clouds (Manus Dei), a Bright Light, or Clouds.
   - **Jesus:** Depict as a historical human male (Middle Eastern descent).
   - **Holy Spirit:** Depict as a Dove or Tongues of Fire.
2. **Subject Count:** Draw EXACTLY the number of characters described.
3. **Biblical Accuracy:** - **Exodus:** Water walls must be liquid waves, not rock.
   - **Eden:** Serpents on ground/trees only (no wings/legs).
4. **Chronological Consistency:** - **Pre-Fall (Gen 1-2):** NO SNAKES, NO APPLES, NO THORNS.
   - **Post-Fall (Gen 3+):** Clothing is animal skins (rough).
5. **Modesty:** Women must be depicted modestly with respectful attire.
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
  { id: 'lent', label: 'Lent', category: 'season' },
  { id: 'holy-week', label: 'Holy Week', category: 'season' },
  { id: 'easter', label: 'Easter', category: 'season' },
  { id: 'pentecost', label: 'Pentecost', category: 'season' },

  // Teaching Context
  { id: 'sunday-school', label: 'Sunday School', category: 'context' },
  { id: 'vbs', label: 'VBS', category: 'context' },
  { id: 'family-devotional', label: 'Family Devotional', category: 'context' },
  { id: 'youth-group', label: 'Youth Group', category: 'context' },
  { id: 'bible-study', label: 'Bible Study', category: 'context' },

  // Themes
  { id: 'miracles', label: 'Miracles', category: 'theme' },
  { id: 'parables', label: 'Parables', category: 'theme' },
  { id: 'prophets', label: 'Prophets', category: 'theme' },
  { id: 'creation', label: 'Creation', category: 'theme' },
  { id: 'the-fall', label: 'The Fall', category: 'theme' },
  { id: 'faith-heroes', label: 'Faith Heroes', category: 'theme' },
  { id: 'prayer', label: 'Prayer', category: 'theme' },
  { id: 'worship', label: 'Worship', category: 'theme' },
] as const;

export type LiturgicalTagId = typeof LITURGICAL_TAGS[number]['id'];

export const GOLDEN_NEGATIVES = [
  // THEOLOGY NEGATIVES
  "face of god, old man in sky, bearded god, zeus, human god figure, anthropomorphic father",

  // STYLE NEGATIVES
  "color, colored, colorful, polychrome, chromatic, red, blue, green, yellow, pink, purple, orange, brown, gold, silver, rainbow",
  "shading, grayscale, gradient, 3d render, photo, realistic texture, filled colors, grey, shadows, sketchiness, charcoal, smudge, blurry, dithering, noise",
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
