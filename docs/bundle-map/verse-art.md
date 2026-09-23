# Verse Art: `/bible-verse-coloring` (bundle map)

Source of truth: `hosting-public/assets/index-DHKtGwi1.js` (offsets below are character offsets into the UTF-8 string, as `fs.readFileSync(..., 'utf8')` sees it). Server: `functions/index.js`. Old source: `components/VerseArtTool.tsx`, `components/VerseFeaturedSection.tsx`, `constants.ts:195-290`.

Correction to the task brief: Verse Art is not quite bundle-only. The old source has the page shell (`VerseArtTool.tsx`) and the community section (`VerseFeaturedSection.tsx`), and `constants.ts` has the verse prompt constants. But in the old source generation is a stub that throws `FEATURE_IN_PROGRESS` (`VerseArtTool.tsx:123-130`), and `getVerseSketches` returns `[]` (`:165-168`). The generation pipeline (`q8`, `HP`, `Y8`, `W8`, `K8`, `X8`), the verse gallery query `UP`, and `dS(..., 'verse')` exist only in the bundle.

Symbol index (bundle offsets):

| Minified | Offset | Meaning |
|---|---|---|
| `Lq` | 1075417 | Page component (old `VerseArtTool`) |
| `Oq` | 1072859 | Helmet head for the page (old `VerseSEO`) |
| `Dq` | 1075064 | Font style option list (label + short description) |
| `Rq` | 1064360 | Community Verse Art section (old `VerseFeaturedSection`); `Ky=8` page size at 1064141, `Cq` font filter options at 1064146 |
| `L2` | 276572 | Verse picker (Book / Chapter / Verse(s)); `Oy` numeric input at 275932 |
| `ei` | 268244 | 66 Protestant book names (`BIBLE_BOOKS`) |
| `Bn` | 263807 | FontStyle enum |
| `Fc` | 263978 | Models `{ARCHITECT, ARTIST, CRITIC}` |
| `l5` | 271529 | `FONT_STYLE_LOGIC` (font rules for the prompt) |
| `Ys` | 272477 | `VERSE_LAYOUT_RULES` (EMBLEM/STACK/SCROLL, MAX_WORDS 30) |
| `c5` | 273854 | `VERSE_NEGATIVES` |
| `u5` | 274563 | `VERSE_REFERENCE_MAP` (style reference images) |
| `d5` | 274737 | `VERSE_TYPOGRAPHY_RULES` |
| `q8` | 866318 | Fetch verse text from bible-api.com |
| `HP` | 866627 | Word count → layout type |
| `Y8` | 866702 | Verse Architect (text model, JSON brief) |
| `W8` | 870361 | Verse Artist (image model) |
| `K8` | 872679 | Verse Critic (text model, image QA) |
| `X8` | 874049 | Pipeline orchestrator |
| `$P` | 859053 | "Editor": canvas shrink to 85% + threshold (post-processing) |
| `V8` | 858454 | Canvas threshold only (used after edits) |
| `T_` | 864825 | Image edit (Modify / Remove Color) |
| `Xc` | 860128 | `httpsCallable('generateContent', {timeout: 540000})` wrapper |
| `Zc` | 860196 | Retry/backoff wrapper |
| `ig` | 845836 | Deduct credits (client transaction) + transaction log |
| `P8` / `dS` | 846837 / 847545 | Upload to Storage / create `sketches` doc |
| `UP` | 850734 | Verse gallery query |
| `Ip` / `Wc` | 848646 / 849217 | Bless / read blessed ids |
| `qP` | 885646 | Result view (shared with scene art) |
| `Z8` | 877921 | Save modal (visibility → tags) |
| `Q8` | 881610 | Celebration overlay on result mount |
| `J8` | 885042 | Canvas "Add Ref" text overlay |
| `YP` / `EO` | 892493 / 891564 | Generation loading overlay / its rotating quotes |
| `Mc` | 859797 | Display name: `Psalms`→`Psalm`, `Proverbs`→`Proverb` |
| `ep` / `Kc` | 859851 / 860073 | Slug / sketch URL |
| `Gr` / `$r` | 908749 / 909035 | Share data / popup window |

---

## 1. Routes and URL behaviour

- Route: `<Route path="/bible-verse-coloring" element={<Lq user onRequireAuth={X} onNavigateToGallery={()=>nav('/gallery')} onNavigateToProfile={uid=>nav('/profile/'+uid)} setShowErrorModal setErrorModalContent/>}>` (bundle ~2019437, inside `ene` 2016039).
- No params and no query params read. There is no URL state: the chosen verse and font are React state only, and so is the result. Reload loses the result, and there is no shareable URL for a verse or font selection.
- The header nav maps view `verse-art` ↔ `/bible-verse-coloring` (`ene`, ~2018560/2018934). The active tab is computed from `pathname === '/bible-verse-coloring'`.
- The result view (`qP`) replaces the page in place (conditional render in `Lq`). The URL does not change. "Try another scripture" clears the result with no history entry, so the browser Back button leaves the page.
- Server: `firebase.json:88-89` rewrites `/bible-verse-coloring` → function `verseRender` (`functions/index.js:1739`). `redirectToCanonical(req,res)` (`:570`) sends a 301 from the `*.web.app`/`firebaseapp.com` hosts to `https://biblesketch.app` and from path variants (trailing or double slash) to `/bible-verse-coloring`, keeping the query string, with `Cache-Control: public, max-age=300, s-maxage=3600`.
- Canonical URL: `https://biblesketch.app/bible-verse-coloring` (client and server agree).
- Sitemap: listed in the `pages` group (`functions/index.js:428`).
- Inbound links: the homepage SSR, sketch SSR, gallery SSR and about SSR all emit `<a href="/bible-verse-coloring">Create Verse Art</a>` / "Try Verse Art" (`functions/index.js:628, 1635, 2001, 2600`). The client 404/fallback page has a `navigate('/bible-verse-coloring')` "Try Verse Art" button (bundle 2012233). Blog posts link it in markdown (bundle 1124069, 1133565, 1136755).

## 2. `<head>`

### Client (`Oq`, Helmet `ua`, bundle 1072859)
- `title`: `Bible Verse Coloring Pages | Create Custom Scripture Art | Bible Sketch`
- `meta description`: "Turn any Bible verse into a beautiful coloring page. Choose from elegant script, modern brush, playful, or classic serif typography styles. Free printable scripture art."
- `meta keywords`: `Bible verse coloring pages, scripture coloring pages, printable Bible verses, Christian coloring sheets, verse art, Bible journaling, hand lettered scripture, typography coloring`
- `link canonical`: `https://biblesketch.app/bible-verse-coloring`
- `og:type` website, `og:url` canonical, `og:title` "Bible Verse Coloring Pages | Create Custom Scripture Art", `og:description` = the description without the last sentence, `og:image` `https://biblesketch.app/logo.png`.
- `twitter:card` `summary_large_image`, plus `twitter:url`, `twitter:title` and `twitter:description` (same as og), `twitter:image` logo. **All twitter tags use `property=` instead of `name=`.**
- JSON-LD: `WebPage {url, name:"Bible Verse Coloring Pages Generator", description:"Create beautiful Bible verse coloring pages with decorative typography. Choose from elegant script, modern brush, playful, or classic serif font styles.", isPartOf: WebSite{url:"https://biblesketch.app", name:"Bible Sketch"}, mainEntity: SoftwareApplication{name:"Bible Verse Coloring Page Generator", applicationCategory:"DesignApplication", operatingSystem:"Web Browser", offers: Offer{price:"0", priceCurrency:"USD"}}}`
- No robots tag from Helmet. The template sets `<meta name="robots" content="max-image-preview:large">` (`functions/index.html:8`).
- `Oq` renders only on the form view. When the result view (`qP`) replaces the page, Helmet unmounts `Oq`, so the head falls back to whatever Helmet had before (the template title "Bible Sketch Platform" plus the tags injected by the server).

### Server (`verseRender`, `functions/index.js:1841-1858`)
- `<title>Create Bible Verse Coloring Pages | Bible Sketch</title>` (replaces the template's "Bible Sketch Platform", `functions/index.html:9`).
- `description`: "Turn any Bible verse into beautiful, decorative typography coloring art. Choose from 4 font styles and generate print-ready verse art in 60 seconds."
- `canonical`, `og:title`/`og:description` (same text as title/description), `og:type` website, `og:url`, `og:site_name` "Bible Sketch", `og:image` logo, `twitter:card` **`summary`**, `twitter:title`/`description`/`image` (with `name=`).
- No JSON-LD, no keywords.

### Mismatches
| | Server | Client |
|---|---|---|
| title | Create Bible Verse Coloring Pages \| Bible Sketch | Bible Verse Coloring Pages \| Create Custom Scripture Art \| Bible Sketch |
| description | "…decorative typography coloring art. Choose from 4 font styles…60 seconds." | "…beautiful coloring page. Choose from elegant script…Free printable scripture art." |
| twitter:card | summary | summary_large_image |
| twitter attr | `name=` | `property=` (wrong) |
| JSON-LD | none | WebPage + SoftwareApplication |
| og:site_name | yes | no |

Helmet appends its tags, and the server's tags stay in `<head>`, so after hydration the page has **duplicate** description, canonical, og and twitter tags. Google indexes the rendered page (see CLAUDE.md).

## 3. Page structure

### Server HTML (crawler-only; `functions/index.js:1830-1835, 1863-1887`)
The server injects `<div id="root"><h1>Create Bible Verse Coloring Pages</h1><p>Turn any Bible verse into beautiful, decorative typography coloring art.</p><ol>…</ol><script>root.innerHTML=''</script></div>`. The inline script wipes it synchronously, before React boots. The `<ol>` holds: Create Scene Art `/`, Browse Gallery `/gallery`, Read Blog `/blog`, then the top 15 public verse sketches as `<a href="https://biblesketch.app/coloring-page/{slug}/{id}">{Book} {ch}:{v[-end]} Verse Art</a>`. The book name is raw ("Psalms"); the client shows "Psalm" via `Mc`. Data: `sketches` where `isPublic==true` and `type=='verse'`, ordered by `createdAt desc`, limit 50, with bookmarks dropped, sorted by blessCount desc then createdAt desc, sliced to 15. If the query fails (for example a missing composite index) it falls back to `isPublic==true orderBy createdAt desc limit 50` filtered to `type==='verse'`. Response `Cache-Control: public, max-age=3600, s-maxage=7200`; errors → `sendShell(res, 503)`.

### Client form view (`Lq`, bundle 1075417)
1. Header `a5` (App shell).
2. `<main class="max-w-7xl mx-auto px-4 mt-8 md:mt-16">`
   - Hero: `<h1>` "Create Bible Verse <br md> Coloring Pages" over a yellow highlight bar. Subtitle `<p>` "Turn any Bible verse into beautiful, decorative typography coloring art." Stats pill: "**4** font styles | **60s** to generate | Print-ready" (icons `C2`, `Q_`, `Fd`).
   - Grid `xl:grid-cols-12`:
     - Left (`xl:col-span-7`) white card:
       - Label "Select a Verse" + `L2 value onChange singleVerseMode`.
       - Chips: "Popular:" then buttons Jeremiah 29:11, Philippians 4:13, Proverbs 3:5, Joshua 1:9 (onClick set reference; they are not links).
       - Amber "Verse Too Long" alert (when state `A` is set): heading "Verse Too Long" plus the message.
       - Label "Choose Font Style" + a 2-column grid of 4 buttons from `Dq`: Elegant Script "Flowing calligraphy with flourishes"; Modern Brush "Trendy hand-lettered style"; Playful "Whimsical bubble letters"; Classic Serif "Traditional book typography". The selected one is purple with a yellow check badge.
       - When logged out: promo box "🎁 Get 5 free credits when you sign up" / "No credit card required".
       - CTA button `ot size=lg`: "Create Verse Art" (icon `Bi`); while running, "Creating..." with `isLoading`/`disabled`.
       - Note: "Uses 1 credit • Takes ~60 seconds".
     - Right (`hidden xl:block xl:col-span-5`): tilted example card, `<img src="/references/verse-example.webp" alt="Bible verse coloring page example">` (aspect 3/4), caption "**Philippains 4:13**" (sic, typo) with badge "Elegant Script", corner sticker "Example".
3. `YP` full-screen loading overlay (see §4).
4. `Rq` "Community Verse Art" section (below `</main>`).
5. Footer (App shell).

`L2` verse picker (bundle 276572):
- Book: a `<button>` showing "Book" and the current book. It opens a dropdown (absolute, max-h 400) with a "Search book..." input (autoFocus) that filters `ei` by case-insensitive substring. Picking a book closes the dropdown and clears the search; the selected book shows a purple dot. Empty state: "No books found". Clicking outside closes it (mousedown listener).
- Chapter: `Oy` numeric text input (`inputMode=numeric`, `pattern=[0-9]*`, digits only). An empty or `0` value becomes `1`.
- Verse: in `singleVerseMode` one input, labelled "Verse" (the label is "Verses" plus a `-` end input otherwise). An empty or `0` value becomes 1.
- There is no upper-bound validation for chapter or verse; bible-api decides (§5).

`Rq` Community Verse Art (bundle 1064360):
- Returns `null` when loaded and the list is empty, so the section is hidden.
- `<section>` with `<h2>` "Community Verse Art" and `<p>` "Explore beautiful Bible verse coloring pages created by the community. Bless your favorites or save them to your collection."
- Two `<select>` filters: Book ("All Books" plus the books present, in canonical `ei` order) and Font ("All Styles" plus only the styles present, from `Cq`). Changing a filter resets to page 1.
- Grid 2/4 columns of 8 per page. Each card is a react-router `<Link to={Kc(s)}>` (a real `<a href="/coloring-page/{slug}/{id}">`) containing:
  - `lo` LazyImage (`thumbnailPath`/`storagePath`, aspect 3/4), alt "{Mc(book)} {ch}:{v} Verse Art";
  - title "{Mc(book)} {ch}:{v}" (the end verse is never shown here) and a subtitle with `font_style` or "Verse Art";
  - `sg` ArtistBadge (author click → `navigate('/profile/'+uid)`, onClick);
  - a bless button (heart + count);
  - Facebook and Pinterest share buttons.
  All buttons inside the link call `preventDefault`/`stopPropagation`.
- Pagination: prev/next icon buttons and "Page X of N" (not links).
- "Explore All Verse Art" `ot` button → `navigate('/gallery')` (onClick, not a link). `/gallery` has no verse filter; it shows scene and verse art mixed.
- Loading: spinner. `PERMISSION_DENIED`: "Gallery Access Restricted" / "Please log in to view the community gallery." / button "Log In to View Gallery" → `onRequireAuth(()=>{})`.
- `gS` GalleryModal is rendered when state `X` is set, but nothing ever sets it (no `Y(sketch)` call). This is dead code.

### Client result view (`qP`, bundle 885646), with `sketchType="verse"`
- `Q8` celebration overlay (confetti, sparkles, rings, text "Your creation is ready! ✨"), auto-hides after 4 s.
- Back button "Try another scripture" (`onBack` → clear the result; the form state is kept).
- Left: image on a paper-textured panel (`<img alt="Generated Result">`, right-click disabled). Overlay buttons: "Add Ref"/"Remove Ref" and "Remove Color" (title "Convert to Black & White (Free)"). A "Refining creation..." overlay shows while editing.
- Right: `<h2>` "{Mc(book)} {ch}:{v}", subtitle = `fontStyle` (or "Verse Art"), button "Save to Collection". Modify card ("Modify" / "1 Credit"): link-button "Make changes to this image..." opens a textarea (placeholder `e.g. "Add a dove in the sky" or "Make the lines thicker"`) with "Apply Change" and "Cancel".
- `Z8` save modal.
- No Helmet on the result view.

## 4. Interactive behaviour

### Auth helper (App shell `X`, bundle ~2016900)
`X(fn, mode='login')`: if `user && profileLoaded`, it runs `fn()` now. Otherwise it stores `fn` as pending, opens the auth modal in `mode`, and runs the pending `fn` once both `user` and `profileLoaded` are true (effect). The Lq page always calls it with `'signup'`.

Also in the shell: `onAuthStateChanged` signs out unverified email/password users (`!emailVerified && provider !== 'google.com' && !isAnonymous → signOut`, bundle ~845700). So a fresh email sign-up never reaches the pending action; only Google sign-in does.

### Create Verse Art (`j` in `Lq`)
```
X(async () => {
  if (user && (user.credits === undefined || user.credits < 1)) → error modal {title:"Out of Credits", message:"You need at least 1 credit to generate verse art. Please purchase a pack to continue."}; return
  if (!user) return                       // stale-closure: see §7
  loading=true; status="Fetching verse text..."; tooLong=null
  status="Creating verse art..."          // set synchronously, so the first message never shows
  r = await X8(reference, fontStyle)
  if (!r.passed && r.logs.some(l=>l.includes('VERSE_TOO_LONG'))) {...}   // dead: X8 rethrows VERSE_TOO_LONG
  if (!r.passed || !r.imageUrl) throw new Error(last log || "Generation failed")
  await ig(uid, 1, `Verse Art: ${book} ${chapter}:${startVerse}`)          // charge AFTER success
  result = r.imageUrl
} catch → see error table; finally loading=false, status=""
}, 'signup')
```
Error mapping (catch; `D` = lower-cased message):
| Condition | UI |
|---|---|
| `message === 'INVALID_REFERENCE'` or D contains `invalid_reference` | error modal "Verse Not Found" / "This Bible verse does not exist. Please check the book, chapter, and verse number and try again." |
| D contains `verse_too_long` | inline amber alert: "This verse is too long. Please choose a shorter verse (under 30 words) for best results." (no word count, because the count branch is dead) |
| D contains `429`, `resource_exhausted` or `quota` | modal "Creation Failed" / "There was an issue with the app. Please try again later." |
| anything else (Gemini failure, critic rejection, `INSUFFICIENT_CREDITS` from `ig`, server daily-limit HttpsError) | modal "Creation Failed" / "Oops! Something went wrong. " + message (for pipeline failures the message is e.g. `ERROR: Verse Artist Failed: …` or `ERROR: Maximum retries exceeded. The Verse Critic rejected all drafts.`) |

### Reference state rules (`Lq`)
- Initial state `{book:'Psalms', chapter:23, startVerse:1}`, font `Elegant Script`.
- An effect forces `endVerse` back to `undefined` whenever it is set; `onChange` also strips `endVerse`. Single verse only.

### Loading overlay `YP`
Full-screen `fixed z-[200]` cream overlay with:
- an icon chosen by the status text: contains "reading" → book icon, contains "sketching" → pencil icon, otherwise a spinning sparkle. Verse statuses match neither, so it is always the sparkle;
- `<h2>` with the status message;
- a fake progress bar (+0-3% every 500 ms, capped at 95%);
- a rotating quote card (`EO`, 9 verses, every 8 s): Isaiah 40:31, Jeremiah 29:11, Joshua 1:9, Ecclesiastes 3:11, Philippians 4:13, Psalm 23:1, Psalm 46:10, Proverbs 3:5, Matthew 5:16. Their text is NIV/NKJV-like, not WEB.

### Result view actions (`qP`)
- **Add Ref / Remove Ref** (`ge`): if a pre-ref image is stored, restore it. Otherwise `J8(img, "Book ch:v[-e]")` draws bold sans-serif text (size `max(16, 3% width)`, fill `#1F2937`, white stroke) centred at the bottom via canvas and keeps the original for undo. On failure: "Could not add reference text. (CORS Error?)". It uses the raw book name ("Psalms"). Verse art already contains the reference, so this duplicates it.
- **Remove Color** (`F`): requires auth (`Ht.currentUser`, otherwise `onRequireAuth`), then `T_(img, "Make the image black and white")` (Gemini image call, **no charge**). Error: "Failed to remove color. Please try again."
- **Modify** (`H`): requires auth, then `ig(uid, 1, "Refined Sketch")` **before** `T_(img, prompt)`, with no refund if `T_` fails. `INSUFFICIENT_CREDITS` → "Not enough credits."; other errors → "Failed to edit image. Please try again.". `T_` result goes through `V8` (threshold only).
- **Save to Collection**: requires auth (`Ht.currentUser` or `onRequireAuth(()=>openModal)`), then opens `Z8`:
  - Step "visibility": `<h2>` "Save to Gallery", "Choose how you want to save your masterpiece.", button "Public Community" ("Share your creation with everyone in the Bible Sketch gallery.") or "Private Collection" ("Save it securely. Only you can see this in your gallery.").
  - Step "tags": "Back", `<h2>` "Add Tags", "Help others find your creation (optional)", tag picker `fS`, buttons "Skip" / "Save" or "Save with N Tag(s)".
  - Confirm → `qP.pe(isPublic, tags)` → `onSave(isPublic, currentImage, tags)` → `Lq.onSave` → `dS(uid, image, {reference, fontStyle}, isPublic, false, tags, 'verse')`. When `user` is null it calls `onRequireAuth(async()=>{}, 'signup')` and throws `WAITING_FOR_AUTH`.
  - After saving, the modal closes. **There is no success message, no navigation and no link to the saved sketch**, and saving again creates duplicates. Errors are only `console.error`'d.
  - "Saving to Cloud Storage..." spinner shows only if saving while on the visibility step.
- **Bless** (in `Rq`): if already blessed (local Set) it is a no-op. Otherwise it optimistically adds the id to the Set, writes `localStorage.blessedSketches`, increments the count, then calls `Ip(id, uid)`. Logged out → `onRequireAuth(ke)` with 'signup'.
- **Share**: Facebook `https://www.facebook.com/sharer/sharer.php?u={url}`; Pinterest `https://pinterest.com/pin/create/button/?url={url}&media={imageUrl}&description={desc}`. Both open via `$r` (`window.open` 600×700 popup named "shareWindow"). `url` = `https://biblesketch.app/coloring-page/{slug}/{id}`. For a verse sketch the Pinterest description comes from `Gr`/`tq`, which reads `age_group` → "All Ages" and `art_style` → "Coloring Page". The title is "{Book ch:v} Coloring Page | Printable Scripture for All Ages".

## 5. Backend contract

### Generation pipeline (full algorithm)

**Models** (`Fc`, 263978; same as old `constants.ts:14-18`): ARCHITECT `gemini-2.5-flash`, ARTIST `gemini-3-pro-image-preview`, CRITIC `gemini-2.5-flash`. The Scene Art z8 architect prompt (INVALID_REFERENCE check via LLM) is **not** used for verse.

**Transport** `Xc(payload)` = `httpsCallable(functions, 'generateContent', {timeout: 540000})(payload).data`. The payload is `{model, contents, config}`; the server whitelist is in `functions/index.js:244-330` (config keys `responseMimeType|responseModalities|imageConfig|safetySettings`, ≤12 parts, ≤60k text chars, ≤9 MB inline base64, daily caps image 60/user and 500 global, text 300/user; the user must be verified and non-anonymous). The server returns the raw Gemini response (`candidates[0].content.parts`).

**Retry** `Zc(fn, 5, 3000)`: up to 5 attempts, delay 3 s doubling (3, 6, 12, 24 s). It retries when `err.status||err.code` is 429/503/500 or the message contains "Resource has been exhausted", "overloaded" or "quota". Callable HttpsErrors carry string codes, so in practice only message matches trigger a retry.

**`X8(reference, fontStyle)`** (874049):
1. `text = await q8(reference)`
   - `ref = "${book}+${chapter}:${startVerse}"` (raw book name, e.g. `Song of Solomon+2:1`).
   - `GET https://bible-api.com/${encodeURIComponent(ref)}?translation=web`
   - `!res.ok` → throw `INVALID_REFERENCE`; `json.text.trim()` empty → throw `INVALID_REFERENCE`. The text comes back as-is (may contain `\n`). **Translation is the World English Bible, which renders the divine name as "Yahweh"** (e.g. Ps 23:1 "Yahweh is my shepherd…").
   - The old source (`VerseArtTool.tsx:104`) had no `translation` param (bible-api default = WEB anyway).
2. `words = text.split(/\s+/).filter(nonEmpty).length`; if `words >= 30` (`Ys.MAX_WORDS`) → throw `VERSE_TOO_LONG: ${words} words exceeds maximum of 29`.
3. `layout = HP(words)`: `≤5 → EMBLEM`, `≤15 → STACK`, else `SCROLL`.
4. `brief = await Y8(reference, text, fontStyle)`, the Verse Architect:
   - `reference_string = "${Mc(book)} ${chapter}:${startVerse}"` (e.g. "Psalm 23:1").
   - Prompt (verbatim template at bundle 866857-869706): role "Creative Art Director for Bible Verse Typography Coloring Pages". It embeds the verse in quotes plus `- {reference_string}`. STEP 1 analyses themes (core message, natural imagery, symbolic elements). STEP 2 picks thematic decorations, with 6 examples (Ps 23, John 3:16, Prov 3:5, Isa 40:31, Phil 4:13, Ps 46:10) and "CRITICAL: Do NOT use generic florals/vines unless the verse specifically mentions gardens, flowers, or growth." TECHNICAL SPECIFICATIONS: `WORD COUNT`, `LAYOUT TYPE`, `LAYOUT RULES: Ys[layout].description`, `FONT STYLE`, `FONT RULES: l5[font]`, then `d5` (typography rules). It asks for OUTPUT JSON `{verse_themes[2-3], decorative_motifs[3-5], positive_prompt, negative_prompt, validation_criteria[3]}`.
   - Call: `{model: ARCHITECT, contents:{parts:[{text}]}, config:{responseMimeType:'application/json'}}` via `Zc`. It parses `candidates[0].content.parts[0].text` as JSON; an empty response → "Verse Architect returned empty response"; any error → `Verse Architect Failed: …`.
   - Returns `{verse_text, reference_string, layout_type, verse_themes, decorative_motifs, positive_prompt, negative_prompt, validation_criteria}`.
5. Loop, `attempt` 1..2:
   - a. `raw = await W8(brief, fontStyle)`, the Verse Artist:
     - Reference image: `u5[font]` = `/references/verse-{elegant|modern|playful|classic}.jpg` (same-origin, files in `hosting-public/references/`). It fetches the image, checks `blob.type` starts with `image/`, reads it as a data URL, strips a leading `77+9` (UTF-8 BOM/replacement artefact) once, and adds it as `{inlineData:{mimeType, data}}`. On failure it warns and goes text-only (with no alternate "style emulation" text, unlike Scene Art).
     - Prompt:
       ```
       Create a BIBLE VERSE COLORING PAGE with decorative typography.
       THE VERSE TEXT TO RENDER (EXACT spelling required):
       "{verse_text}"
       - {reference_string}
       {positive_prompt}
       --- LAYOUT ---
       {Ys[layout_type].prompt}
       --- CRITICAL TYPOGRAPHY RULES ---
       1. ALL LETTERS MUST BE HOLLOW/OUTLINE STYLE with white interior space for coloring
       2. Use DOUBLE OUTLINE technique - every letter has a visible white interior
       3. NO solid black filled letters - this is a COLORING PAGE
       4. Text must have MARGINS - do not run off canvas edges
       5. Decorative elements go AROUND text, never overlapping
       6. Pure BLACK and WHITE only - no gray, no shading
       7. All shapes must be CLOSED PATHS for bucket-fill coloring
       NEGATIVE PROMPT: {negative_prompt}, {c5}
       ```
     - Call: `{model: ARTIST, contents:{role:'user', parts:[...refImages, {text}]}, config:{responseModalities:['IMAGE'], imageConfig:{imageSize:'2K', aspectRatio:'3:4'}, safetySettings:[{category:HARM_CATEGORY_HATE_SPEECH, threshold:BLOCK_MEDIUM_AND_ABOVE}]}}`. It returns the first `inlineData` part as a `data:` URL; none → "Verse Artist returned no image data."; errors → `Verse Artist Failed: …`.
   - b. `img = await $P(raw)`, the "Editor" (859053). It draws onto a same-size canvas filled white, **scales the art to 85% and centres it (7.5% white margin on every side)**, then thresholds each pixel: luma `0.299R+0.587G+0.114B < 160 → 0` else 255. Output is `toDataURL('image/png')`. A tainted canvas returns the un-thresholded canvas; a load error returns the input.
   - c. `qa = await K8(img, brief.validation_criteria)`, the Verse Critic. Prompt role "Quality Assurance Bot for Bible Verse Coloring Pages": numbered criteria, a fixed VERSE-SPECIFIC VALIDATION list (text present, hollow letters, no solid letters, white background, margins, no overlap), FAILURES (color, solid letters, missing or illegible text, grayscale), and OUTPUT JSON `{passed, failure_reason}`. Call `{model: CRITIC, contents:{parts:[{text},{inlineData:{mimeType:'image/png', data}}]}, config:{responseMimeType:'application/json'}}`. **Any error → `{passed:true}`** (fail-open).
   - d. On pass, return `{imageUrl: img, passed:true, logs, verseText:text}`. On fail, log it; if attempt < 2, append to `brief.positive_prompt`: ` (CRITICAL FIX: {failure_reason}. Ensure all letters are HOLLOW/OUTLINE with white interior.)`.
6. After 2 failures it throws "Maximum retries exceeded. The Verse Critic rejected all drafts."
7. Outer catch: `INVALID_REFERENCE` and `VERSE_TOO_LONG…` are **rethrown**. Everything else is **returned** as `{imageUrl:'', passed:false, logs:[..., 'ERROR: '+msg], verseText:''}`.

Cost per generation: 1 text call + 1-2 image calls + 1-2 text calls. All of them count against the per-user daily caps. The Zc retries count too.

The prompt constants `l5`, `Ys`, `c5`, `u5`, `d5`, `Bn` are identical to old `constants.ts:195-290` (`FONT_STYLE_LOGIC`, `VERSE_LAYOUT_RULES`, `VERSE_NEGATIVES`, `VERSE_REFERENCE_MAP`, `VERSE_TYPOGRAPHY_RULES`), so port them from there. The `Y8`/`W8`/`K8` prompt templates must be copied from the bundle offsets above.

### Credits (`ig`, 845836)
`runTransaction`: `get users/{uid}`; missing → throw "User does not exist!"; `credits||0 < amount` → throw `INSUFFICIENT_CREDITS`; `update users/{uid} {credits: credits-amount}`. Then a lazy import of the `transactions-CpWNcXvd.js` chunk runs `addDoc(users/{uid}/transactions, {userId, amount:-1, description, type:'usage', timestamp: serverTimestamp()})`. A failure there is only logged. Descriptions: `Verse Art: {Book} {ch}:{v}` (raw book), `Refined Sketch`. Firestore rules allow a client to decrease its own `credits` (`firestore.rules:67-69`).

### Save (`dS`, 847545, via `P8`, 846837)
- Requires `auth.currentUser`.
- Upload: the image goes through `M8` (redraw on a white canvas → PNG). Storage path `user_uploads/{uid}/sketches/{Date.now()}.png`, `uploadString(data_url)` with metadata `{contentType:'image/png', contentDisposition:'attachment; filename="bible-sketch.png"'}`, then `getDownloadURL`.
- `thumbnailPath = user_uploads/{uid}/sketches/{ts}_400x533.png` (assumed to be produced by the resize extension; the client never writes it).
- `addDoc(sketches, {userId, imageUrl, storagePath, thumbnailPath, isPublic, blessCount:0, createdAt: serverTimestamp(), isBookmark:false, type:'verse', promptData:{book, chapter, start_verse, aspect_ratio:'3:4', font_style}, tags?})`. `end_verse` is included only if defined (never, for verse). `age_group`/`art_style` are omitted for verse. `tags` are included only if non-empty.
- Old source difference: `VerseArtTool.tsx:185-193` called `saveSketch` without a type (it would have saved as scene with undefined age/style).

### Reads
- `UP(excludeUid)` (850734): `sketches` where `isPublic==true` and `type=='verse'`, orderBy `createdAt desc`, limit 50 (composite index needed). Drops `isBookmark`, and **drops the viewer's own sketches** (`Lq` passes `user?.uid`), then sorts by blessCount desc, timestamp desc. `permission-denied` → `PERMISSION_DENIED`.
- `Wc(uid)`: `getDoc users/{uid}` → `blessedSketchIds || []`.
- User profile: live `onSnapshot users/{uid}` in the App shell (`R8`), which supplies `user.credits`.

### Writes (other than save/credits)
- `Ip(sketchId, uid)`: with no uid, `updateDoc sketches/{id} {blessCount: increment(1)}`. With a uid, a transaction: missing user doc → increment only; `blessedSketchIds` contains the id → `ALREADY_BLESSED` (swallowed); else increment the sketch and `arrayUnion` the id to `users/{uid}.blessedSketchIds`.

### External URLs
- `https://bible-api.com/{ref}?translation=web` (browser `fetch`, CORS, no key).
- Same-origin `/references/verse-*.jpg`, `/references/verse-example.webp`.
- Facebook sharer, Pinterest pin builder (above).
- The Storage download URL is loaded into canvas with `crossOrigin='anonymous'` in `J8`/`V8`. The bucket has no GET CORS (ROADMAP 1.1, "Storage CORS"), so this only works on the in-memory `data:` URL, which is always the case on this page.

### Browser storage
- `localStorage.blessedSketches`: JSON array of sketch ids (read in `Rq` on load, written on bless). No sessionStorage or cookies on this page.

## 6. Tracking
None on this page. There are no `zaraz.track`/`zaraz.ecommerce` or Pinterest tag calls in `Lq`, `Rq`, `qP`, `X8`, `ig` or `dS`. The only related event is App-wide: `zaraz.track('CompleteRegistration', {em, external_id})` in the auth modal on sign-up (bundle ~964789), which fires when sign-up is triggered from this page. Generation, save, bless and share are **not tracked**.

## 7. Known bugs and oddities
1. **Stale closure after sign-up.** A logged-out user clicks "Create Verse Art" and `X` stores the callback, which closed over `user = null`. After Google sign-in the callback runs, both `if (t…)` checks fail, and nothing happens: the user must click again. (Email sign-ups are signed out until verified, so for them nothing is pending anyway.)
2. **VERSE_TOO_LONG word count never shown.** `X8` rethrows, so `Lq`'s `logs.some('VERSE_TOO_LONG')` branch (with the count) is dead. The user sees the generic "This verse is too long…" (the old source showed the count).
3. **"Fetching verse text..." never visible**: it is overwritten synchronously by "Creating verse art...". `YP` icon keywords ("reading"/"sketching") never match verse statuses.
4. **Community section refetches on every `Lq` render.** `getVerseSketches` is an inline arrow (`Q`), which is an effect dependency in `Rq`. Each keystroke, chip, font click or status change re-queries 50 sketches and the user doc and flashes the spinner.
5. **Community section hides the viewer's own verse art** (`UP(user?.uid)`), so the section can vanish for a prolific user. Server SSR does not exclude.
6. **WEB translation**: verse text uses "Yahweh" in the OT, while all UI copy and loading quotes use "the Lord". There is no translation choice.
7. **Charging** (ROADMAP.md 1.1): the client deducts after a successful generation (`ig` after `X8`). The server only checks `credits >= 1`, so with 1 credit many generations are possible until the deduction lands. Two tabs at 1 credit: both generate, the second `ig` throws `INSUFFICIENT_CREDITS`, and its image is discarded after Gemini was paid. "Modify" charges before `T_` with no refund. "Remove Color" is a free Gemini image call. The critic fails open.
8. **`$P` adds a 7.5% white frame** by shrinking the art to 85%. That matches "slim frame" for verse art, but it is applied blindly after the model was asked for margins, so margins double up.
9. **Prompt conflict**: `Y8` says "Do NOT use generic florals/vines…", while `l5` (Elegant Script, Modern Brush) and `d5` §5 prescribe florals and vines.
10. **Save has no feedback** and can create duplicates. There is no link to the new sketch.
11. **Head**: twitter tags use `property=`; server and client titles and descriptions differ; tags are duplicated after hydration; the result view has no Helmet.
12. **Typos and copy**: example caption "Philippains 4:13"; the H1 differs from old source ("Bible Verse Coloring Pages" in `VerseArtTool.tsx:~205`, now "Create Bible Verse Coloring Pages").
13. **`gS` modal in `Rq` is dead code.**
14. **Pinterest description for verse sketches** says "for All Ages" / "Coloring Page" (scene-oriented template).
15. **"Add Ref"** stamps a second reference onto verse art, which already contains it, using the raw book name ("Psalms 23:1").
16. **Chapter and verse have no upper bound** client-side; bible-api 404 → "Verse Not Found" only after the user clicks Create (no charge).
17. **`bible-api.com` is a free third-party service** with per-IP rate limits (exact figure unverified; check its docs) and no SLA, called from the browser.

## 8. Rebuild notes
- **Server-rendered (Astro page, static per request or edge-cached):**
  - one `<head>`: pick one title and description, `twitter:*` with `name=`, JSON-LD from `Oq`;
  - the hero, stats pill, font style descriptions and example image;
  - "Community Verse Art" as real `<a href>` cards. Data at request time: the `UP` query without the uid exclusion (public read via Firestore REST, composite index `isPublic+type+createdAt`), the same sort, the first 8 or all ≤50. Pagination and filters can be query params (`?book=&font=&page=`) so they are crawlable. This replaces `verseRender`'s hidden `<ol>` with visible content.
- **Islands:**
  - (a) the form + generation + result view (auth, credits, Gemini, canvas);
  - (b) bless/share buttons on cards;
  - (c) optional client-side filtering.
  The result view is shared with Scene Art (`qP`), so build it once with a `sketchType` prop.
- **Pipeline**: port `X8` as-is first (behaviour parity), including `$P` (85% + threshold 160), the critic fail-open, 2 attempts and the `CRITICAL FIX` suffix. Moving it server-side (Worker or Function) fixes charging (ROADMAP 1.1), but the live bundle's client `ig` must be retired at the same cutover or users pay twice. Consider proxying bible-api through the Worker with a long cache (verse text is immutable) to avoid browser rate limits. Decide the translation (WEB "Yahweh") with the owner and record it in ROADMAP.
- **URL state**: put the selection in the URL (`?ref=Psalms+23:1&font=elegant-script`) so a verse form is linkable. After save, link or redirect to `/coloring-page/{slug}/{id}`.
- **Fix during rebuild**: bugs 1-5, 10, 11, 14-15 are front-end only and safe to fix. Bugs 7-8 need an owner decision and the backend on `seo-fixes` first.
- **Risks**:
  - `generateContent` payload limits (9 MB inline): a 2K PNG after `$P` can be large, but the critic sends one image, so it is fine; keep it under the limit.
  - The client callable timeout is 540 s against a 300 s server timeout.
  - The reference images must stay at `/references/verse-*.jpg` on the Worker origin (or be inlined server-side).
  - Cloudflare edge caching of the SSR page must be purged when new public verse sketches appear (`onSketchWritten` purge tags already exist on this branch).
