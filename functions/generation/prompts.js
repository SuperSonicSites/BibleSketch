// Prompts and rules for server-side generation (createSketch / editSketch).
// Scene Art: prompt-lab rules from branch coloring-page-quality (0194652, constants.ts + services/prompts.ts).
// Verse Art: the live bundle's pipeline (hosting-public/assets/index-DHKtGwi1.js 866318-874900), verbatim.
// Edit prompt: 0194652 (keeps the framing instead of the bundle's full bleed).

const MODELS = {
  // The "writer": composition quality is the bottleneck, so it gets the strongest text model.
  ARCHITECT: 'gemini-3.1-pro-preview',
  // "Nano Banana 2": takes style references, matched Nano Banana Pro in prompt-lab reviews, cheaper and faster.
  ARTIST: 'gemini-3.1-flash-image',
  // Verse brief and critic (the bundle used gemini-2.5-flash, now limited access).
  FLASH: 'gemini-3.8-flash',
};

const AGE_GROUPS = ['Toddler', 'Young Child', 'Teen', 'Adult'];
const ART_STYLES = ['Sunday School', 'Stained Glass', 'Iconography', 'Comic Book', 'Classic', 'Doodles'];
const FONT_STYLES = ['Elegant Script', 'Modern Brush', 'Playful', 'Classic Serif'];
// Styles offered per age in the app (bundle p5); anything else is rejected.
const STYLES_BY_AGE = {
  Toddler: ['Sunday School'],
  'Young Child': ['Sunday School', 'Comic Book', 'Stained Glass', 'Iconography'],
  Teen: ['Classic', 'Stained Glass', 'Iconography', 'Comic Book'],
  Adult: ['Classic', 'Stained Glass', 'Iconography', 'Doodles'],
};

const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther',
  'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
  'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
  'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians',
  '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude',
  'Revelation',
];

// Files in functions/references/.
const REFERENCE_MAP = {
  // Our two best Pinterest pages (Genesis 3:24, Genesis 4:3-5; caption cropped): full scenes, not a lone animal.
  'Toddler_Sunday School': ['toddler-sundayschool-a.jpg', 'toddler-sundayschool-b.jpg'],
  'Young Child_Sunday School': ['child-sundayschool.jpg'],
  'Young Child_Stained Glass': ['child-stainglass.jpg', 'child-stainglass-2.jpg'],
  'Young Child_Iconography': ['child-iconography.jpg'],
  'Young Child_Comic Book': ['child-comicbook.jpg', 'child-comicbook-2.jpg'],
  'Teen_Classic': ['teen-classic.jpg', 'teen-classic-2.jpg'],
  'Teen_Stained Glass': ['teen-stainglass.jpg', 'teen-stainglass-2.jpg'],
  'Teen_Iconography': ['teen-iconography.jpg'],
  'Teen_Comic Book': ['teen-comicbook.jpg', 'teen-comicbook-2.jpg'],
  // adult-classic.jpg (hairline hatching) made outputs too fine; these two are user-approved lab renders (round 09).
  'Adult_Classic': ['adult-classic-a.jpg', 'adult-classic-b.jpg'],
  'Adult_Stained Glass': ['adult-stainglass.jpg', 'adult-stainglass-2.jpg'],
  // adult-iconography.jpg (zentangle) was too fine too; teen-iconography.jpg is a stopgap.
  'Adult_Iconography': ['teen-iconography.jpg'],
  'Adult_Doodles': ['adult-doodle.jpg', 'adult-doodle-2.jpg'],
};
const VERSE_REFERENCE_MAP = {
  // Bible Sketch's own verse pages (Scripture board Pins), two verses per font so no single text dominates.
  'Elegant Script': ['verse-elegant-a.jpg', 'verse-elegant-b.jpg'],
  'Modern Brush': ['verse-modern-a.jpg', 'verse-modern-b.jpg'],
  Playful: ['verse-playful-a.jpg', 'verse-playful-b.jpg'],
  'Classic Serif': ['verse-classic-a.jpg', 'verse-classic-b.jpg'],
};

// Line work + composition per audience. Keep these free of "white background" wording:
// the model reads it as "leave the background empty" and floats the subject.
const AGE_LOGIC = {
  Toddler: {
    keywords: 'Very bold, simple line art for ages 2-4: ultra-thick outlines as wide as a chunky marker (about 2 mm on the printed page), the same thickness everywhere including the frame. A few large simple shapes, big open areas that are easy to color, almost no small details (no fingers, toes or tiny accessories drawn separately). Friendly rounded forms with natural body proportions (no oversized heads).',
    subjectFocus: "A Bible storybook scene: the story's characters (up to 3 main figures, plus the animals or objects the story is known for) doing its key action, with friendly, expressive faces, large in the middle of the page. Around them, the story's place drawn as big simple shapes fills the frame to the border: trees, bushes and flowers, rolling hills, clouds, arches, a stable roof or palace columns. No large empty areas and never a lone figure on blank ground. Crowds become 2-3 representative figures. Night is an outlined moon and stars, never a dark sky.",
  },
  'Young Child': {
    keywords: 'Storybook line art for ages 5-8: consistent medium-thick outlines, clear separation between objects, a readable setting (water, sky, land) divided into large colorable areas.',
    subjectFocus: 'At most two main characters with a clear action and an emotion that tells the story.',
  },
  Teen: {
    keywords: 'Coloring book line art for ages 9-15: thick outer contours and medium inner lines, moderate detail split into medium-size areas to color. Faces and garments stay simple: a few folds, no patterns covering clothing or wings.',
    subjectFocus: 'Cinematic composition. Natural human height and scale: no giant figures unless the passage describes giants.',
  },
  Adult: {
    keywords: 'Premium adult coloring page, like the bestselling adult coloring books: rich and rewarding, made for 30-90 minutes of colored-pencil or fine-marker work. Crisp, smooth, confident ink lines with a clear hierarchy: bold outer contours and solid inner lines like a 0.4 mm fine-liner, never hairline, never broken. The page is well filled with about 30-40% open space: rich, but never so dense that shapes become too small for a coloring pen. Detail is always drawn as closed shapes, never as realistic texture: no wood grain, no strand-by-strand hair, straw or fur, no hatching, no sketchy strokes.',
    subjectFocus: 'A scene with one clear focal action that reads at a glance, with enough surrounding detail to make the whole page a pleasure to color. Frame-worthy. The frame stays slim; the richness lives inside the scene.',
  },
};

const STYLE_LOGIC = {
  'Sunday School': "Warm children's Bible storybook illustration: natural proportions, gentle faces and simple clean shapes, safe for children, not cartoonish or chibi. Expressions match the story's emotional tone.",
  'Stained Glass': 'Leaded stained-glass window design set inside the rectangular frame: figures and background alike are divided into glass panes by thick lead lines of even weight. Every pane is a closed shape, no free-floating lines. Stylized and architectural.',
  Iconography: 'Byzantine icon composition drawn as line art: round halos decorated with simple geometric line patterns, flat space with little perspective depth, a solemn mood, and an ornamental patterned border framing the icon. Figures are dignified but alive: distinct faces, clear gestures and body turns that tell the story, not stiff identical poses.',
  'Comic Book': 'Unmistakable comic-book inking: bold confident outlines, expressive faces, dynamic action poses and a few simple motion lines. Clean line inks only, no spot blacks or ink shadows.',
  // Doré (public domain) for the drama; his engraved shading is translated into outlined, sculpted shapes.
  Classic: "Classical biblical illustration with the emotional power and theatrical drama of Gustave Doré's Bible engravings, translated into clean line art for coloring. Stage the story's most dramatic moment as a grand tableau: a bold diagonal composition, a dramatic low or high viewpoint, sweeping gestures, wind-swept drapery and hair, faces full of awe, fear, grief or joy, and the story's own setting made vast and sublime (its skies, waters, landscape or architecture). Heavenly light breaks through parted clouds as bold radiating ray lines. All drama comes from composition, gesture and scale in outlines only: where Doré engraved shading, clouds, rocks, waves and heavy drapery folds become sculpted closed shapes. Faces and bodies have the restraint of academic engraving: correct proportions and noble, subtle expressions, never comic-book scowls or exaggerated features. Never cartoonish or photorealistic, and dramatic but never gory. Plain ancient Near-Eastern robes and cloaks (no embroidered patterns unless the text describes royal or priestly garments).",
  Doodles: 'Modern liturgical line art in the style of Bernardo Ramonfaur: minimalist, faceted figures built from straight lines and sharp angular corners, with angular geometric shards in the background. Areas are split into closed facets instead of being hatched. Solemn and dignified.',
};

const CHRISTIAN_GUIDELINES = `
1. **TRINITY VISUAL RULES (STRICT):** - **God the Father:** NEVER depict as a human/man. Focus on the *effect* of His presence (light rays, wind, reaction of nature/people). Do NOT use a physical representation (like a hand) unless specifically appropriate for Genesis Creation scenes.
   - **Jesus:** Depict as a historical human male (Middle Eastern descent).
   - **Holy Spirit:** Depict as a Dove or Tongues of Fire.
   - **The Angel of the LORD / God's glory appearing** in a bush, fire, cloud or light (e.g. Exodus 3:2): draw only the fire, cloud or light itself, never a figure inside it.
2. **Subject Count:** Draw EXACTLY the number of characters the text states. Where the text gives no number, use the traditional one (three wise men).
3. **Biblical Accuracy:** - **Exodus:** Water walls must be liquid waves, not rock.
   - **Eden:** Serpents on ground/trees only (no wings/legs).
4. **Chronological Consistency:** - **Pre-Fall (Gen 1-2):** NO SNAKES, NO APPLES, NO THORNS. NO CLOTHING. Use strategic visual modesty: foreground plants/flowers covering lower body, long hair, waist-deep water, or waist-up framing.
   - **After the fall, Genesis 3:7-20:** Adam and Eve wear aprons of fig leaves (3:7).
   - **From Genesis 3:21 on:** Clothing is animal skins (rough), which God made for them.
5. **Modesty:** Private areas must ALWAYS be concealed. Pre-Fall: use environmental/natural elements (NOT clothing). Post-Fall+: use period-appropriate attire.
6. **Scale:** Humans should always be depicted in natural, realistic scale. NO GIANT FIGURES, except the giants the Bible names: Goliath towers over David, his head near the top of the frame while David's head reaches only Goliath's belt. Adults stay adults even when the text says they are short (Zacchaeus is a small grown man with a beard).
7. **Digital Safety:** ALL SHAPES MUST BE CLOSED PATHS (for bucket fill).
8. **Beloved traditions:** where the text is silent, draw what Christian tradition and children's Bibles have made familiar, as long as the text does not contradict it: three wise men with crowns, each offering one gift (gold, frankincense, myrrh); the star shining over Bethlehem; the ox, donkey and sheep at the manger; Mary riding a donkey to Bethlehem; shepherds with crooks and lambs; angels with wings; Jonah's great fish as a whale; the forbidden fruit as an apple (from Genesis 3 on); Noah's animals two by two; David as a shepherd boy with a sling and five smooth stones; Moses with his staff and two round-topped stone tablets; palm branches on the road into Jerusalem; three crosses on the hill; the round stone rolled away from the tomb.
`;

// Gemini image models have no negative-prompt parameter, and a long list of banned words primes the very
// concepts it names. So the rules describe the target positively and name each unwanted technique once.
const COLORING_PAGE_RULES = `
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

// References set the look (kinds of shapes, motifs, mood), not the density.
const REFERENCE_INSTRUCTION = `
STYLE REFERENCES: the attached images show the target look (the kind of shapes, motifs and mood). Do not copy their subject matter. Do not copy their density either: line weight and amount of detail follow the LINE WORK rule above, even when a reference is more detailed. Ignore any hatching, gray tones or black areas in them.
`;

const CRITICAL_NEGATIVES = [
  'color', 'shading', 'hatching', '3d', 'solid black', 'sketch', 'noise',
  'text', 'watermark', 'rotated image', 'tilted frame',
  'cartoon proportions', 'chibi', 'big head',
  'face of god', 'modern', 'anachronism',
  'bad anatomy', 'extra limbs', 'giant figure',
].join(', ');

const FONT_STYLE_LOGIC = {
  'Elegant Script': 'Elegant calligraphy script with flowing letters and decorative flourishes. Sophisticated swashes and ornamental curves. DOUBLE OUTLINE letters with white interior. Surrounded by delicate floral elements, graceful vines, and botanical decorations.',
  'Modern Brush': 'Contemporary brush lettering with varied stroke weights. Trendy hand-lettered style mixing cursive and print. DOUBLE OUTLINE hollow letters. Botanical illustrations, geometric patterns, and modern florals as decoration.',
  Playful: 'Whimsical hand-drawn BUBBLE LETTERS with playful, chunky shapes. Fun, bouncy character with white interior space. Decorated with stars, hearts, simple flowers, clouds, and cheerful doodle elements.',
  'Classic Serif': 'Traditional serif typography with elegant proportions. Timeless book-style HOLLOW lettering with decorative serifs. Framed with ornate borders, classical scrollwork, and decorative corner flourishes.',
};

const VERSE_LAYOUT_RULES = {
  EMBLEM: {
    maxWords: 5,
    description: 'Text contained inside a central decorative shape (circle, heart, shield, banner). The shape is the hero element. Background outside the shape is empty or simple pattern. Text is large and bold.',
    prompt: 'Place the verse text inside a central decorative shape like a circle, heart, shield, or banner. The shape should be ornate with detailed borders. Keep background simple outside the main shape.',
  },
  STACK: {
    maxWords: 15,
    description: 'Vertical hierarchy layout. KEYWORDS (nouns, verbs) are rendered 2x larger. Connector words (and, the, of, in, to) are 0.5x size in scripted style. Fills the page top-to-bottom.',
    prompt: 'Arrange text in vertical stacked layout. Make important words (nouns, verbs) TWICE as large. Make connector words (the, and, of, in, to, for) half-size in a different script style. Fill the page from top to bottom with decorative elements between lines.',
  },
  SCROLL: {
    maxWords: 29,
    description: 'Text block placed inside a parchment scroll graphic OR illuminated manuscript border. Center area remains white for text legibility. Ornate border frames the entire page.',
    prompt: 'Place the verse text inside an ornate parchment scroll or illuminated manuscript border. The text area should be white/empty for legibility. Add detailed decorative borders with floral motifs, vines, or geometric patterns around the edges.',
  },
  MAX_WORDS: 30,
};

// One is picked at random per page so verse pages don't all look alike (EMBLEM = short verses, TEXT = the rest).
const VERSE_COMPOSITIONS = {
  EMBLEM: [
    'the words inside a large round medallion with an ornate border',
    'the words inside a big heart shape with a decorative outline',
    'the words across one wide ribbon banner, with a few large motifs above and below',
    'huge full-page lettering with small motifs tucked around the letters',
    'the words inside a laurel or floral wreath',
    'the words inside a shield or crest shape',
  ],
  TEXT: [
    'full-page stacked lettering with no inner frame; motifs fill the gaps between lines and the corners',
    'lettering under a tall arched window or doorway frame',
    'lettering in the open sky above a wide illustrated landscape across the bottom third of the page',
    'lettering inside an oval wreath or garland made of the motifs',
    'lettering on a few ribbon banners of different lengths stacked down the page, motifs between them',
    'lettering inside an inner panel with ornate corner pieces',
    'lettering inside an unrolled parchment scroll',
  ],
};
const pickComposition = (layout) => {
  const list = VERSE_COMPOSITIONS[layout === 'EMBLEM' ? 'EMBLEM' : 'TEXT'];
  return list[Math.floor(Math.random() * list.length)];
};

const VERSE_NEGATIVES = [
  'color', 'colored', 'colorful', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'orange', 'brown', 'gold', 'silver', 'rainbow',
  'shading', 'grayscale', 'gradient', 'grey', 'shadows', '3d render', 'photo', 'realistic texture',
  'solid filled letters', 'filled text', 'solid black text', 'silhouette text', 'black filled typography',
  'solid black letters', 'filled in letters', 'opaque text', 'dark text fill',
  'text off canvas', 'text cut off', 'text running off edge', 'no margins',
  'decorations behind text', 'overlapping decorations on text', 'text obscured',
  'tiny text', 'small font', 'illegible text', 'blurry text',
  'watermark', 'signature', 'copyright', 'misspelled', 'typo',
  'broken lines', 'gaps in outlines', 'incomplete shapes',
].join(', ');

const VERSE_TYPOGRAPHY_RULES = `
CRITICAL TYPOGRAPHY RULES FOR BIBLE VERSE COLORING:

1. **HOLLOW TEXT ONLY (MANDATORY)**
   - ALL letters must be OUTLINE/HOLLOW style with WHITE INTERIOR
   - Use "Double Outline" or "Bubble Letter" technique
   - NEVER use solid black filled letters - they cannot be colored and waste ink
   - The white space inside each letter is where users will color

2. **TEXT HIERARCHY**
   - Emphasis goes on whole LINES: a keyword may get its own large line, the lines around it stay smaller
   - Never scatter small connector words (the, and, of, for) as separate fragments: keep them in their phrase
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
   - NEVER fill an area with black, even for darkness, night, shadows, thorns or storm clouds: draw them as outlines
   - Decorations contain NO letters, numbers or symbols made of letters (no Alpha/Omega, no Chi-Rho, no labels)

6. **FRAME AND CLOSED SHAPES**
   - A clean, slim rectangular border runs around the whole page, close to the edges and even on all four sides
   - Every line ends on another line or on the border: no loose strokes, so every area is closed for bucket-fill
   - Decorations should complement, not compete with, the text
`;

const formatReference = (r) =>
  `${r.book} ${r.chapter}:${r.startVerse}${r.endVerse && r.endVerse > r.startVerse ? '-' + r.endVerse : ''}`;
// Bundle Mc: "Psalm 23:1", "Proverb 3:5".
const displayBook = (book) => (book === 'Psalms' ? 'Psalm' : book === 'Proverbs' ? 'Proverb' : book);

const buildBriefPrompt = (reference, ageGroup, artStyle, passage) => `
ROLE: Biblical art director for a coloring book.
TASK: Write a JSON brief that an image generator will turn into a black-and-white line-art coloring page.
PASSAGE: "${formatReference(reference)}"
${passage.text ? `TEXT (WEB): "${passage.text}"\n` : ''}${passage.context ? `CONTEXT (surrounding verses, only to understand who speaks to whom, where and when; depict the PASSAGE): "${passage.context}"\n` : ''}
AUDIENCE (${ageGroup}): ${AGE_LOGIC[ageGroup].subjectFocus}
ART STYLE (${artStyle}): ${STYLE_LOGIC[artStyle]}

RULES:
1. ${CHRISTIAN_GUIDELINES}
2. FAITHFUL TO THE TEXT: depict what the passage describes, understood in its context. Include every concrete visual detail it states (who is present, what they hold, what happens, e.g. John 19:34: blood and water flow from Jesus' side) and nothing it contradicts. Do not add named or prominent characters the text does not mention (no extra angels or companions), except those rule 1.8's traditions attach to the scene; background figures only where the text or context implies them (a census crowd, a multitude).
   SPEECH PASSAGES: when the passage is mainly words (a prophecy, curse, promise, blessing, teaching, prayer), draw the moment they are spoken: the speaker, the listeners and their reactions, in the place the context gives. Then make the words' meaning visible through who is addressed and one clear symbolic element, never as if the future were already happening (e.g. Genesis 3:15: God's light falls on Eve, her hand on her womb for the promised offspring, while the serpent recoils in the dust at her heel).
   SETTING FROM THE STORY: use the place the text and context give (Bethlehem's hill country, Eden's gate, the palace court). Never invent landmarks such as cliffs, mountains or cities the story doesn't have.
3. GAZE AND ACTION: characters face and look at what they react to, speak to or act on (e.g. Moses looks at the burning bush), unless the text says otherwise. Actions make contact: the hand grips, the spear touches the side, the crown rests on the head.
4. DISTINCT, LIVING CHARACTERS: every person has their own face, age, hair, beard and clothing (never clones or twins), and their own pose or gesture showing how they react. Give the scene movement and emotion. People look their biblical age, role and period (Noah and Abraham as aged patriarchs in plain ancient robes; kings and priests in their garments only when the text calls for it).
5. positive_prompt describes only what is DRAWN, written as a composition map in 3-6 plain sentences: the characters (how many, clothing, pose, expression), key objects and the setting; where each element sits (left or right, foreground, middle ground or background); which way each figure faces and moves relative to the viewer (e.g. Adam and Eve walk toward the viewer, away from the guarded gate behind them); and what the eye lands on first. The story's key setting or object is always visible and whole, not cropped (the ark in any Noah passage, the stable roof, the tomb). Do not restate the art style rules.
6. This is line art. Never mention color, light, lighting, shadows, glow, darkness, fog, smoke, mist or texture. Draw light sources as outlined shapes (a sun disc with ray lines, outlined flames, star shapes, heavenly light as radiating ray lines through parted clouds). Show night as an outlined moon and stars on a white sky.
7. negative_prompt lists only scene content to leave out (wrong objects, anachronisms, extra characters). Genesis 1-2 (before the fall) must include "thorns, dead plants, snakes, apples".
8. If the passage does not exist in the standard Protestant Bible, return only {"error": "INVALID_REFERENCE"}.

OUTPUT JSON:
{
  "positive_prompt": "...",
  "negative_prompt": "...",
  "validation_criteria": ["3 specific checks a reviewer can verify in the image"],
  "reasoning": "One sentence"
}
`;

const buildArtistPrompt = (brief, ageGroup, artStyle, hasReferences) => `
Create the artwork for a premium coloring book page (${ageGroup} level): clean black outlines on white, with large, well-defined shapes that are a joy to color. Output only the flat artwork filling the whole image, not a photo of a page.
SCENE: ${brief.positive_prompt}

ART STYLE: ${STYLE_LOGIC[artStyle]}
LINE WORK: ${AGE_LOGIC[ageGroup].keywords}
${hasReferences ? REFERENCE_INSTRUCTION : ''}
COLORING PAGE RULES (all mandatory):
${COLORING_PAGE_RULES}
${brief.negative_prompt ? `Leave out: ${brief.negative_prompt}` : ''}
`;

const layoutFor = (words) =>
  words <= VERSE_LAYOUT_RULES.EMBLEM.maxWords ? 'EMBLEM' : words <= VERSE_LAYOUT_RULES.STACK.maxWords ? 'STACK' : 'SCROLL';

const buildVerseBriefPrompt = (verseText, referenceString, words, layout, font, composition) => `
    ROLE: Creative Art Director for Bible Verse Typography Coloring Pages.
    TASK: Create a visually stunning, thematically cohesive typography coloring page.

    THE VERSE (render this text EXACTLY):
    "${verseText}"
    - ${referenceString}

    ═══════════════════════════════════════════════════════════
    STEP 1: ANALYZE THE VERSE THEMES
    ═══════════════════════════════════════════════════════════
    Read the verse carefully and identify:
    - What is the CORE MESSAGE? (faith, love, strength, peace, guidance, protection, praise, trust, hope, etc.)
    - What NATURAL IMAGERY appears or is implied? (water, mountains, light, animals, plants, sky, earth)
    - What SYMBOLIC ELEMENTS fit this verse? (cross, crown, shield, dove, lamb, flame, heart, anchor, etc.)

    ═══════════════════════════════════════════════════════════
    STEP 2: DESIGN THEMATIC DECORATIONS
    ═══════════════════════════════════════════════════════════
    Based on your theme analysis, choose decorative elements that REINFORCE the verse meaning.

    EXAMPLES OF THEMATIC MATCHING:
    - Psalm 23 "The Lord is my shepherd" → sheep, shepherd's crook, green rolling hills, still waters, peaceful meadow
    - John 3:16 "God so loved the world" → cross with radiant light beams, heart, dove descending, globe
    - Proverbs 3:5 "Trust in the Lord" → open book, oil lamp, crown of wisdom, winding path, steady rock
    - Isaiah 40:31 "Wings like eagles" → soaring eagle, dramatic clouds, sunrise over mountain peaks
    - Philippians 4:13 "I can do all things" → strong arms, mountain summit, rising sun, victory wreath
    - Psalm 46:10 "Be still and know" → calm lake, peaceful sunrise, quiet forest, resting dove

    CRITICAL: Do NOT use generic florals/vines unless the verse specifically mentions gardens, flowers, or growth.
    Every decorative element should have a DIRECT CONNECTION to the verse's meaning.

    ═══════════════════════════════════════════════════════════
    TECHNICAL SPECIFICATIONS
    ═══════════════════════════════════════════════════════════
    WORD COUNT: ${words} words
    COMPOSITION (mandatory, build the page around it): ${composition}

    FONT STYLE: ${font}
    FONT RULES: ${FONT_STYLE_LOGIC[font]}

    ${VERSE_TYPOGRAPHY_RULES}

    ═══════════════════════════════════════════════════════════
    STEP 3: SPLIT THE VERSE INTO LINES
    ═══════════════════════════════════════════════════════════
    Split the verse into ${words <= 5 ? '1 to 3' : '3 to 8'} lines, in order. Every word of the verse appears exactly once, spelled
    exactly as above, with its punctuation. Keep each phrase together (e.g. "for your light has come", not "for your" / "light").
    A keyword may stand alone on a large line. You may write keywords in CAPITALS.

    ═══════════════════════════════════════════════════════════
    OUTPUT JSON
    ═══════════════════════════════════════════════════════════
    {
      "verse_themes": ["List 2-3 core themes identified in this verse"],
      "decorative_motifs": ["List 3-5 specific decorative elements chosen for THIS verse based on its themes"],
      "lines": [{ "text": "one line of the verse (the verse only, not the reference)", "size": "large | medium | small" }],
      "positive_prompt": "Vivid description of the composition, the lettering style and the decorations. Do NOT quote or mention any word of the verse or the reference here: the text is given separately.",
      "negative_prompt": "Specific exclusions including generic unrelated decorations..."
    }
    Mix the sizes: the key words or phrases get "large" lines (short, 1-3 words), the rest "medium" or "small".
  `;

const buildVerseArtistPrompt = (brief) => `
    Create a BIBLE VERSE COLORING PAGE with decorative typography.
    The attached images are LETTERING STYLE references only: do not copy their words, verses, layouts, decorations or any signature/watermark.

    The lettering is the ${brief.lines.length} quoted lines below, top to bottom, each drawn once and spelled exactly as quoted,
    followed by the Bible reference in small letters, centered directly under the last line and drawn only there.
    The words in brackets are sizes, not text to draw. Nothing else on the page is lettering: the page corners stay free of text.

${brief.lines.map((l) => `    [${l.size}] "${l.text}"`).join('\n')}
    [small] "${brief.reference_string}"

    --- COMPOSITION ---
    ${brief.composition}

    ${brief.positive_prompt}

    --- CRITICAL TYPOGRAPHY RULES ---
    1. ALL LETTERS MUST BE HOLLOW/OUTLINE STYLE with white interior space for coloring
    2. Use DOUBLE OUTLINE technique - every letter has a plain white interior (no hatching, stripes or patterns inside letters)
    3. NO solid black filled letters - this is a COLORING PAGE
    4. Text must have MARGINS - do not run off canvas edges
    5. Decorative elements go AROUND text, never overlapping
    6. Pure BLACK and WHITE only - no gray, no shading, no solid black areas (darkness, night and clouds are outlines too)
    7. All shapes must be CLOSED PATHS for bucket-fill coloring
    8. Render ONLY the lines above and the reference (once): no other words, labels or letters in the decorations, no repeated or missing words
    9. NO signature, copyright notice, watermark or artist name anywhere on the page
    10. FRAME: a clean, slim rectangular border around the whole page, close to the edges and even on all four sides,
        outlined (never a solid black band), plain white outside it. Rays, landscapes and decorations stop at the border.
        Every line ends on another line or on the border, so every area is a closed shape.

    NEGATIVE PROMPT: ${brief.negative_prompt}, ${VERSE_NEGATIVES}
  `;

const buildVerseCriticPrompt = (verseText, referenceString) => `
    ROLE: Quality Assurance Bot for Bible Verse Coloring Pages.
    TASK: Validate this TYPOGRAPHY-BASED coloring page.

    THE PAGE MUST SHOW EXACTLY THIS VERSE:
    "${verseText}"
    - ${referenceString}

    STEP 1: Transcribe every word written anywhere on the page, in reading order, exactly as drawn
    (including small text in corners and along the edges). Do not correct it toward the verse.
    STEP 2: Compare your transcription with the verse word by word. Ignore capitalization, punctuation,
    line breaks and "&" for "and". The reference (${referenceString}) is expected and is not an extra word.
    FAIL if any word is missing, added, repeated, swapped or misspelled, or if text from another verse appears.
    FAIL if there is any signature, copyright mark (©), watermark, artist name, logo or URL.

    VERSE-SPECIFIC VALIDATION (Critical):
    - Text IS present (this is a typography design - text is REQUIRED)
    - Letters are HOLLOW/OUTLINE style (white interior visible for coloring); the small reference may be plain solid text
    - NO solid black filled letters (they cannot be colored)
    - Background is pure white
    - Text has margins (not running off edges)
    - Decorative elements don't overlap/obscure text

    FAILURES:
    - Color detected (Must be B&W).
    - Solid black filled letters in the verse (Must be hollow/outline). Double outlines are fine.
    - Text missing or illegible.
    - Grayscale shading.
    - Large solid black areas anywhere (behind the lettering, in the background or in the decorations).
    - Wrong words (STEP 2) or a signature/copyright/artist name.

    OUTPUT JSON:
    {
      "transcription": "string",
      "passed": boolean,
      "failure_reason": "string or null"
    }
  `;

const buildEditPrompt = (instruction) => `
    TASK: Modify this existing coloring page image according to the user's instruction.

    User Instruction: "${instruction}"

    --- CRITICAL CANVAS RULES (MANDATORY) ---
    1. PRESERVE EXACT CANVAS SIZE: The output must have the SAME dimensions as the input.
    2. KEEP THE FRAMING: same border, same margins, same position and scale of the artwork as the input.
    3. DO NOT zoom in, zoom out, crop, shrink or scale the artwork.

    --- STYLE CONSTRAINTS ---
    - Keep clean black-and-white line art: no shading, gray tones, hatching or solid black fills.
    - Output ONLY the modified image.

    NEGATIVE PROMPT: ${CRITICAL_NEGATIVES}, zoomed out, zoomed in, cropped, scaled down
  `;

// Bundle "Remove Color" instruction.
const REMOVE_COLOR_INSTRUCTION = 'Make the image black and white';

const ARTIST_CONFIG = {
  responseModalities: ['IMAGE'],
  imageConfig: { imageSize: '2K', aspectRatio: '3:4' },
  safetySettings: [{ category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }],
};

module.exports = {
  MODELS, AGE_GROUPS, ART_STYLES, FONT_STYLES, STYLES_BY_AGE, BIBLE_BOOKS, REFERENCE_MAP, VERSE_REFERENCE_MAP,
  VERSE_LAYOUT_RULES, ARTIST_CONFIG, REMOVE_COLOR_INSTRUCTION,
  formatReference, displayBook, layoutFor, pickComposition, buildBriefPrompt, buildArtistPrompt, buildVerseBriefPrompt,
  buildVerseArtistPrompt, buildVerseCriticPrompt, buildEditPrompt,
};
