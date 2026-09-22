
import { AgeGroup, ArtStyle, FontStyle } from './types';

// ==========================================
// 0. APP CONFIGURATION
// ==========================================
export const APP_DOMAIN = 'https://BibleSketch.app';

// ==========================================
// 1. MODEL CONFIGURATION
// ==========================================
// "Nano Banana 2" (gemini-3.1-flash-image) is the Artist: it takes style reference images,
// matched Nano Banana Pro in prompt-lab reviews, and is ~25% cheaper and ~2x faster.
export const MODELS = {
  // The "writer": composition quality is the bottleneck, so it gets the strongest text model.
  // 2.5-flash dropped key scene elements (the ark); 3.8-flash still misread speech passages and staging.
  ARCHITECT: "gemini-3.1-pro-preview",
  ARTIST: "gemini-3.1-flash-image",
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
  // adult-classic.jpg (hairline hatching) made outputs too fine; teen-classic-2.jpg made them look like teen pages.
  // These two are user-approved prompt-lab renders (round 09: Genesis 9:12-17 and 4:3-5) that lock in the look.
  [`${AgeGroup.ADULT}_${ArtStyle.CLASSIC}`]:             [`${BASE_PATH}adult-classic-a.jpg`, `${BASE_PATH}adult-classic-b.jpg`],
  // adult-iconography.jpg (zentangle) was too fine too; teen-iconography.jpg is a stopgap.
  [`${AgeGroup.ADULT}_${ArtStyle.STAINED_GLASS}`]:       [`${BASE_PATH}adult-stainglass.jpg`, `${BASE_PATH}adult-stainglass-2.jpg`],
  [`${AgeGroup.ADULT}_${ArtStyle.ICONOGRAPHY}`]:         `${BASE_PATH}teen-iconography.jpg`,
  [`${AgeGroup.ADULT}_${ArtStyle.DOODLE}`]:              [`${BASE_PATH}adult-doodle.jpg`, `${BASE_PATH}adult-doodle-2.jpg`]
};

// ==========================================
// 3. LOGIC RULES (The "Double-Lock" Text)
// ==========================================
// Line work + composition per audience. Keep these free of "white background" wording:
// the model reads it as "leave the background empty" and floats the subject.
export const AGE_LOGIC = {
  [AgeGroup.TODDLER]: {
    // Toddler pages need ~2 mm lines (5-7 pt); the smoke test before the r10 deploy measured 0.95 mm without this number.
    keywords: "Very bold, simple line art for ages 2-4: ultra-thick outlines as wide as a chunky marker (about 2 mm on the printed page), the same thickness everywhere including the frame. A few large simple shapes, big open areas that are easy to color, almost no small details (no fingers, toes or tiny accessories drawn separately). Friendly rounded forms with natural body proportions (no oversized heads).",
    subjectFocus: "One central subject or a simple pair, set in a simple setting (ground line, hills, a few clouds or waves) that fills the frame. Cheerful and iconic. Crowds become 1-2 representative figures. Night is an outlined moon and stars, never a dark sky."
  },
  [AgeGroup.YOUNG_CHILD]: {
    keywords: "Storybook line art for ages 5-8: consistent medium-thick outlines, clear separation between objects, a readable setting (water, sky, land) divided into large colorable areas.",
    subjectFocus: "At most two main characters with a clear action and an emotion that tells the story."
  },
  [AgeGroup.TEEN]: {
    keywords: "Coloring book line art for ages 9-15: thick outer contours and medium inner lines, moderate detail split into medium-size areas to color. Faces and garments stay simple: a few folds, no patterns covering clothing or wings.",
    subjectFocus: "Cinematic composition. Natural human height and scale: no giant figures unless the passage describes giants."
  },
  [AgeGroup.ADULT]: {
    // Adults buy density, but this user's sweet spot is rich, not maximal: r07 👍 pages had ~500-900 areas and
    // 0.4-0.5 mm lines, 👎 pages ~1000-1400 areas and 0.32-0.40 mm. Detail = closed shapes, never texture strokes.
    // What the detail depicts (ornament vs dramatic scenery) is the style's job, not this rule's.
    keywords: "Premium adult coloring page, like the bestselling adult coloring books: rich and rewarding, made for 30-90 minutes of colored-pencil or fine-marker work. Crisp, smooth, confident ink lines with a clear hierarchy: bold outer contours and solid inner lines like a 0.4 mm fine-liner, never hairline, never broken. The page is well filled with about 30-40% open space: rich, but never so dense that shapes become too small for a coloring pen. Detail is always drawn as closed shapes, never as realistic texture: no wood grain, no strand-by-strand hair, straw or fur, no hatching, no sketchy strokes.",
    subjectFocus: "A scene with one clear focal action that reads at a glance, with enough surrounding detail to make the whole page a pleasure to color. Frame-worthy. The frame stays slim; the richness lives inside the scene."
  }
};

export const STYLE_LOGIC = {
  [ArtStyle.SUNDAY_SCHOOL]: "Warm children's Bible storybook illustration: natural proportions, gentle faces and simple clean shapes, safe for children, not cartoonish or chibi. Expressions match the story's emotional tone.",
  [ArtStyle.STAINED_GLASS]: "Leaded stained-glass window design set inside the rectangular frame: figures and background alike are divided into glass panes by thick lead lines of even weight. Every pane is a closed shape, no free-floating lines. Stylized and architectural.",
  [ArtStyle.ICONOGRAPHY]: "Byzantine icon composition drawn as line art: round halos decorated with simple geometric line patterns, flat space with little perspective depth, a solemn mood, and an ornamental patterned border framing the icon. Figures are dignified but alive: distinct faces, clear gestures and body turns that tell the story, not stiff identical poses.",
  [ArtStyle.COMIC]: "Unmistakable comic-book inking: bold confident outlines, expressive faces, dynamic action poses and a few simple motion lines. Clean line inks only, no spot blacks or ink shadows.",
  // Doré (public domain) for the drama; his engraved shading is translated into outlined, sculpted shapes.
  [ArtStyle.CLASSIC]: "Classical biblical illustration with the emotional power and theatrical drama of Gustave Doré's Bible engravings, translated into clean line art for coloring. Stage the story's most dramatic moment as a grand tableau: a bold diagonal composition, a dramatic low or high viewpoint, sweeping gestures, wind-swept drapery and hair, faces full of awe, fear, grief or joy, and the story's own setting made vast and sublime (its skies, waters, landscape or architecture). Heavenly light breaks through parted clouds as bold radiating ray lines. All drama comes from composition, gesture and scale in outlines only: where Doré engraved shading, clouds, rocks, waves and heavy drapery folds become sculpted closed shapes. Faces and bodies have the restraint of academic engraving: correct proportions and noble, subtle expressions, never comic-book scowls or exaggerated features. Never cartoonish or photorealistic, and dramatic but never gory. Plain ancient Near-Eastern robes and cloaks (no embroidered patterns unless the text describes royal or priestly garments).",
  [ArtStyle.DOODLE]: "Modern liturgical line art in the style of Bernardo Ramonfaur: minimalist, faceted figures built from straight lines and sharp angular corners, with angular geometric shards in the background. Areas are split into closed facets instead of being hatched. Solemn and dignified."
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
   - **The Angel of the LORD / God's glory appearing** in a bush, fire, cloud or light (e.g. Exodus 3:2): draw only the fire, cloud or light itself, never a figure inside it.
2. **Subject Count:** Draw EXACTLY the number of characters described.
3. **Biblical Accuracy:** - **Exodus:** Water walls must be liquid waves, not rock.
   - **Eden:** Serpents on ground/trees only (no wings/legs).
4. **Chronological Consistency:** - **Pre-Fall (Gen 1-2):** NO SNAKES, NO APPLES, NO THORNS. NO CLOTHING. Use strategic visual modesty: foreground plants/flowers covering lower body, long hair, waist-deep water, or waist-up framing.
   - **After the fall, Genesis 3:7-20:** Adam and Eve wear aprons of fig leaves (3:7).
   - **From Genesis 3:21 on:** Clothing is animal skins (rough), which God made for them.
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

// ==========================================
// 6. COLORING PAGE RULES (V3)
// ==========================================
// Gemini image models have no negative-prompt parameter, and a long list of banned
// words primes the very concepts it names. So the rules describe the target positively
// and name each unwanted technique once.
export const COLORING_PAGE_RULES = `
1. FLAT ARTWORK ONLY: the image is the drawing itself, edge to edge. Never a photo or mockup: no book, paper sheet, page curl, desk, table, wall, background surface or drop shadow.
2. INK ONLY: pure black lines on pure white. The image has exactly two tones, black and white (1-bit), like a crisp vector drawing.
3. NO BLACK AREAS: black is used only for lines, never to fill an area (filled areas waste printer ink). Skies stay white even at night: the moon and stars are outlined. Hair, clothing, doorways, caves and dark objects are outlined, not filled.
4. EMPTY SHAPES: every area enclosed by lines stays plain white, ready to be colored. Volume, depth, light and texture are shown with outlines only: no shading, shadows, hatching, cross-hatching, stippling, gradients or gray tones, and no texture strokes (wood grain, straw, fur or hair strands, brick mortar lines).
5. CLOSED SHAPES: lines are clean and continuous and meet, so every shape is closed and can be bucket-filled. Every line belongs to the outline of a shape: no loose strokes.
6. FRAME (every style, stained glass included): a clean, slim rectangular border runs around the scene, close to the image edges and even in width on all four sides. Any ornament in it stays narrow and never crowds the scene. Nothing in the scene overlaps or crosses it. It is outlined, never a solid black band. Outside the border there is only plain white. The scene fills the whole frame: ground, sky and setting reach the border on all four sides, never a subject floating on empty white.
7. BIG, CLEAR SUBJECT: the main subject is large and fills most of the frame (about 80%). One clear focal action that reads at a glance; any decorative detail supports it and never competes with it.
8. STEADY CAMERA: the horizon is level and vertical lines stay vertical, no tilted or Dutch angles. Dramatic low or high viewpoints are fine.
9. NO TEXT: no letters, words, numbers, captions, signatures or watermarks anywhere.
`;

// References set the look (kinds of shapes, motifs, mood), not the density: several of them
// are far more detailed than a comfortable coloring page, and some contain hatching.
export const REFERENCE_INSTRUCTION = `
STYLE REFERENCES: the attached images show the target look (the kind of shapes, motifs and mood). Do not copy their subject matter. Do not copy their density either: line weight and amount of detail follow the LINE WORK rule above, even when a reference is more detailed. Ignore any hatching, gray tones or black areas in them.
`;

// ==========================================
// 7. CRITICAL NEGATIVES (edit prompt only)
// ==========================================
export const CRITICAL_NEGATIVES = [
  "color", "shading", "hatching", "3d", "solid black", "sketch", "noise",
  "text", "watermark", "rotated image", "tilted frame",
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
// ALLOWS text but blocks solid fills
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