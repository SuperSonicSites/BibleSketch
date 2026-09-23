# Bundle map: Home page / Scene Art creator (`/`)

Source of truth: `hosting-public/assets/index-DHKtGwi1.js` (offsets below are character offsets into the file read as UTF-8).
Older source for naming: `App.tsx`, `components/CreateTool.tsx`, `components/ResultPage.tsx`, `components/MadLibsInput.tsx`, `components/ConfigPanel.tsx`, `components/SaveModal.tsx`, `components/FeaturedSection.tsx`, `components/GenerationLoader.tsx`, `services/gemini.ts`, `services/firebase.ts`, `constants.ts`, `utils/imageProcessing.ts`.
Unless listed under "Differences from the old source", the bundle matches the old source's logic and copy.

## Name map

| Bundle | Offset | Old source name | Role |
|---|---|---|---|
| `Iq` | 1061059 | `GlobalSEO` (`components/GlobalSEO.tsx`) | Helmet for `/` only (renders no DOM) |
| `iq` | 936216 | `CreateTool` | Page body: hero, form, loader, result swap, featured grid |
| `L2` | 276572 | `MadLibsInput` | Book / chapter / verse picker |
| `Oy` | 275932 | (numeric input in MadLibsInput) | Text input that only accepts digits |
| `p5` | 280561 | `ConfigPanel` | Age slider + art-style chips |
| `YP` | 892493 | `GenerationLoader` | Full-screen loader; quotes `EO` (891564) |
| `aq` | 927028 | `FeaturedSection` | "Community Favorites" grid |
| `mS` | 896652 | `FilterBar` | Filters used by `aq` |
| `lo` | 904756 | `LazyImage` (inside Gallery) | Thumbnail loader |
| `sg` | 925061 | `ArtistBadge` | Author chip (one Firestore read per card) |
| `gS` | 910140 | `GalleryModal` | Mounted by `aq`, effectively unreachable (see 7) |
| `qP` | 885646 | `ResultPage` | Result view |
| `Q8` | 881610 | `CelebrationEffect` | 4 s confetti overlay |
| `Z8` | 877921 | `SaveModal` | Visibility, then tags |
| `fS` | 875319 | `TagSelector` | Tag chips (`Yo` list) |
| `J8` | 885042 | `drawTextOnImage` (ResultPage.tsx:23) | Canvas "Add Ref" |
| `z8` = `$8` | 860622 | `generateCreativeBrief` = `getVerseVisualDescription` | Architect |
| `G8` | 862176 | `renderImage` | Artist |
| `H8` | 864753 | `generateColoringPage` | Artist + `$P` post-process |
| `T_` | 864825 | `editColoringPage` | Refine / Remove Color |
| `Xc` | 860128 | `callGeminiProxy` | `generateContent` callable |
| `Zc` | 860196 | `callWithRetry` | Retry with backoff |
| `$P` | 859053 | `postProcessImage` (utils/imageProcessing.ts:129) | 85 % shrink + threshold |
| `V8` | 858454 | `thresholdToBW` (utils/imageProcessing.ts:63) | Threshold only |
| `ig` | 845836 | `deductCredits` (services/firebase.ts:475) | Credit transaction |
| `dS` | 847545 | `saveSketch` (services/firebase.ts:667) | Upload + Firestore doc |
| `P8` / `M8` | 846837 / 846408 | upload helper / PNG-with-white-bg | Storage upload |
| `U8` | 853206 | `getTotalPublicSketchCount` (firebase.ts:1021) | Hero counter |
| `jP` | 849944 | `getPublicGallery` (firebase.ts:840) | Featured data |
| `Wc`, `zP`, `Ip` | 849217, 855525, 848646 | `getUserBlessedSketchIds`, `getSavedSketches`, `blessSketch` | |
| `Gr`, `$r` | 908749, 909035 | `utils/socialSharing.ts` | Share URL builder, popup opener |
| `Fc` | 263978 | `MODELS` (constants.ts:14) | Model names |
| `Ot`, `dt` | 263533, 263635 | `AgeGroup`, `ArtStyle` (types.ts) | Enums |
| `i5`, `Zt` | 264092, 264074 | `REFERENCE_MAP`, `BASE_PATH` (constants.ts:35) | Reference images |
| `R2` | 265151 | `AGE_LOGIC` (constants.ts:61) | Per-age line rules |
| `O2` | 267129 | `STYLE_LOGIC` (constants.ts:80) | Per-style rules |
| `s5` | 268945 | `CHRISTIAN_GUIDELINES` (constants.ts:108) | Theology/modesty rules |
| `o5` | 270979 | `LAYOUT_RULES` (constants.ts:173) | Framing |
| `D2` | 271202 | `CRITICAL_NEGATIVES` (constants.ts:183) | Negative list |
| `ei` | 268244 | `BIBLE_BOOKS` | 66 books, Protestant canon order |
| `Yo` | 270214 | `LITURGICAL_TAGS` | 15 tags (8 seasons, 7 themes) |
| `Dt` | 263949 | `APP_DOMAIN` | `"https://biblesketch.app"` |
| `ot` | 254078 | `ui/Button` | Button with `isLoading` |

## 1. Routes and URL behaviour

- Route `path:"/"` (app shell `ene`, offset ~2018900) renders `<Iq/>` + `<iq user onRequireAuth=X onNavigateToGallery onNavigateToProfile setShowErrorModal setErrorModalContent/>`. `X(fn, view="login")` is the requireAuth helper (2016039+). `iq` always calls it with `"signup"`.
- There are no params. `iq` reads no query params. The shell's `Qte()` (2015450) runs on every first load. If the URL has `?epik=`, it writes the `_epik` cookie (7 days, `SameSite=Lax`) and `localStorage.pinterest_epik` (`{value, expiry}`). Pinterest ad landings on `/` need this.
- The result view has no URL. `iq` swaps to `qP` in place when `A` (the image data URL) is set. The URL stays `/`, and nothing is pushed to history. Browser Back leaves the page and loses the unsaved image. "Try another scripture" is `C(null)`, which keeps the reference, age and style.
- Header nav value for `/` is `"home"` (shell `R()`).
- Server: `firebase.json` rewrites `/` to the `homeRender` function (functions/index.js:584). `redirectToCanonical(req,res)` (functions/index.js:570) sends a 301 from `biblesketch-5104c.web.app` / `.firebaseapp.com` to `https://biblesketch.app` and keeps the query string. `/` itself never redirects.
- Canonical: the server sets `https://biblesketch.app/` (with a trailing slash). The client never sets a canonical for `/` (see 2).
- 404: no catch-all route in the bundle. Unknown paths fall through to Hosting's `** → /index.html` (status 200, empty main area). Outside this area.

## 2. `<head>`

### Server (`homeRender`, functions/index.js:584-731)
- `<title>`: `Create Faith-Filled Coloring Pages | Bible Sketch`
- `description`: `Turn any bible verse into a custom, print-ready coloring page in seconds. AI-powered Bible coloring pages for Sunday School, VBS, and personal devotion.`
- `<link rel="canonical" href="https://biblesketch.app/">`
- `og:title`/`og:description` use the same text as the title and description. `og:type=website`, `og:url=https://biblesketch.app/`, `og:site_name`, `og:image=/og.png` (1200×630, png, alt=title), `twitter:card=summary_large_image`, plus twitter title, description and image.
- The template (`functions/index.html`) has `<meta name="robots" content="max-image-preview:large">`.
- No JSON-LD from the server.
- `Cache-Control: public, max-age=3600, s-maxage=7200`. On error it calls `sendShell(res,503)`.

### Client (`Iq`, 1061059, react-helmet-async)
- `<title>`: `Bible Sketch - Create Custom Bible Coloring Pages | Free Printable Christian Coloring Sheets` (95 chars)
- `description`: `Create free printable Bible coloring pages using AI. Custom Bible illustrations for Sunday School, VBS, and homeschool. Download high-quality Christian line art.`
- `keywords` meta (obsolete).
- `og:type`, `og:url=https://biblesketch.app` (no trailing slash), `og:title="Bible Sketch - AI Bible Coloring Pages"`, `og:description="Create custom Bible coloring pages with AI. Free printable Christian art for kids and adults."`, `og:image=${Dt}/og.png` + alt/width/height/type, `og:site_name`, `twitter:card/url/title/description/image` (all `name=`).
- JSON-LD `@graph`: a `WebSite` with `SearchAction` target `https://biblesketch.app/gallery?search={search_term_string}`, plus an `Organization` with logo `/logo.png`.
- No canonical and no robots.

### Mismatches
- The title and description differ between server and client. Helmet replaces `<title>`. Helmet only manages its own `data-rh` tags, so the server's `description`/`og:*`/`twitter:*` tags stay, and the DOM ends up with **two** of each (`description` ×2, `og:title` ×2, and so on) with different values. Google renders JS, so it sees duplicates.
- `og:url` differs: server has `/` (trailing slash), client has none.
- The `SearchAction` target does not work: `/gallery` (`QP`) reads only `?tag=` and ignores `?search=`. Either drop it or implement search.
- The canonical exists only because the server injects it.

## 3. Page structure (`iq` render, 936216+; DOM order)

1. `<main class="max-w-7xl …">`
   - Hero: `<h1>` "Create Faith-Filled <br class=hidden md:block> Coloring Pages" with a yellow underline div. `<p>` "Turn any bible verse into a custom, print-ready coloring page in seconds."
   - Stats pill: `{Math.max(q,500).toLocaleString()}+ created` (where `q` comes from `U8()`) · "60s to generate" · "Print-ready".
   - Grid `xl:grid-cols-12`:
     - Left `xl:col-span-7` card:
       - `L2` picker. Default `{book:"Daniel", chapter:6, startVerse:16}`, no endVerse.
       - "Try:" chips (buttons that set state): Psalm 23 → `{Psalms,23,1,6}`, John 3:16 → `{John,3,16}`, Genesis 1:1-5 → `{Genesis,1,1,5}`, Daniel 6:16-22 → `{Daniel,6,16,22}`.
       - `p5` options.
       - Logged-out only: banner "🎁 Get 5 free credits when you sign up" / "No credit card required".
       - CTA `ot` button with a Sparkles icon: "Create Coloring Page". While generating it reads "Generating..." with `isLoading` and `disabled`.
       - Caption "Uses 1 credit • Takes ~60 seconds".
     - Right `hidden xl:block xl:col-span-5`: example card with a rotated image. `src` is `https://firebasestorage.googleapis.com/v0/b/coloring-book-bce53.firebasestorage.app/o/sketches%2Fbible-sketch-coloring-page.webp?alt=media&token=cea047a5-…` (this is a **different, old Firebase project**, `coloring-book-bce53`). `alt="Example Coloring Page - Daniel in Lions Den"`, context menu blocked, CSS `grayscale contrast-125`. Caption "Daniel 6:16-22", "Young Child • Sunday School", plus an "Example" badge.
2. `YP` loader (fixed overlay, only while generating).
3. `aq` "Community Favorites" `<section>`:
   - `<h2>` "Community Favorites", then the intro `<p>` "Explore the most loved coloring pages created by the Bible Sketch community. Bless your favorites or save them to your personal collection."
   - `mS` filter bar: book, age, style and tag dropdowns (`yf`), plus sort ("Most Popular" default / "Newest First") and an "Active filters:" chip row.
   - Grid of 2 columns (4 at `lg`), 12 per page (`Yy=12`).
   - Each card is a react-router `<Link to={Kc(s)}>`, where `Kc` gives `/coloring-page/{ep(s)}/{id}` when public, else `#`. The link is a **real `<a href>`**. Card contents:
     - `lo` thumbnail, `alt="Bible Sketch"` (generic alt).
     - Title `Book ch:v[-v2]` (a plain `<p>`, not a heading).
     - Subtitle `{art_style} • {age}` (Pre-Teen shown as Teen) or `font_style` for verse sketches.
     - `sg` author button (onClick → `/profile/{uid}`, **not a link**).
     - Bless button with count.
     - Facebook/Pinterest share buttons.
   - Pager (Prev / "Page N of M" / Next), shown when there is more than one page.
   - "Explore All Sketches" `ot` button (onClick → `/gallery`, **not a link**).
   - Empty state: "No public sketches found yet. Be the first to share!" Permission-denied state: "Gallery Access Restricted" + "Log In to View Gallery".

Server HTML body (for crawlers, removed by an inline script before React boots):
- `<h1>` and `<p>` with the same copy as the client.
- An `<ol>` of links: /gallery "Browse Gallery", /bible-verse-coloring "Create Verse Art", /blog "Read Blog", /pricing "View Pricing", then the top 15 sketches. Those come from the 50 newest public sketches, with bookmarks and `type=='verse'` excluded, sorted by blessCount then createdAt. Each links to `/coloring-page/{slug}/{id}` with the text "Book ch:v Coloring Page".

The client hero image, form, stats and featured grid are client-only.

Result view (`qP`, 885646), which replaces all of the above except the Helmet:
- `Q8` confetti with "✨ Your creation is ready! ✨". It lasts 4 s, is `pointer-events-none`, and runs on each mount of `qP`.
- A "Try another scripture" back button.
- Left `lg:col-span-8`: the image (`alt="Generated Result"`, 3:4, context menu blocked). Overlay buttons at top right:
  - "Add Ref" / "Remove Ref" (`title` "Add Reference Text"/"Remove Reference").
  - "Remove Color" (`title` "Convert to Black & White (Free)").
  - While processing, an overlay shows "Refining creation...".
- Right column:
  - `<h2>` `Mc(book) ch:v[-v2]`. `Mc` shows Psalms as "Psalm" and Proverbs as "Proverb".
  - Subtitle `{age} • {style}`.
  - "Save to Collection" button.
  - "Modify" panel with a "1 Credit" badge. The link "Make changes to this image..." opens a textarea (placeholder `e.g. "Add a dove in the sky" or "Make the lines thicker"`), "Apply Change" and "Cancel".
- There is **no Download or Print** on the result view. Downloads only exist after saving, on the sketch page and in the gallery.

## 4. Interactive behaviour

### Picker `L2`
- The Book button toggles a dropdown with an autofocused "Search book..." filter over `ei`. The list shows "No books found" when empty. Selecting a book keeps chapter and verses. Clicking outside closes it (`mousedown` listener).
- Chapter, start verse and end verse are `Oy` digit-only text inputs (`inputMode=numeric`, `pattern=[0-9]*`).
  - Chapter and start verse fall back to 1 when empty.
  - End verse `allowEmpty` sets `undefined` on blur.
- No range validation: chapter 999 or end < start are accepted. The Architect decides validity (see Pipeline). end ≤ start is dropped from the reference string, but `end_verse` is still saved if set.
- `singleVerseMode` (a single "Verse" field) is used only by Verse Art.

### Options `p5`
- Age slider: an `input[type=range]` 0-3 (Toddler, Young Child, Teen, Adult), label "Complexity Level", with `aria-valuetext`. Default Young Child.
- Style chips per age. Default Sunday School. Changing age resets the style to that age's first style when the current one isn't allowed.
  - Toddler: [Sunday School]
  - Young Child: [Sunday School, Comic Book, Stained Glass, Iconography]
  - Teen: [Classic, Stained Glass, Iconography, Comic Book]
  - Adult: [Classic, Stained Glass, Iconography, Doodles]
- Enum values: Ot = "Toddler" | "Young Child" | "Teen" | "Adult". dt = "Sunday School" | "Stained Glass" | "Iconography" | "Comic Book" | "Classic" | "Doodles". The stored `age_group` may also be the legacy "Pre-Teen".

### Create (`Q` in `iq`)
1. `e(fn,"signup")`. If logged out, this queues `fn` and opens the auth modal on Sign Up.
2. If `t.credits` is undefined or less than 1, show the error modal "Out of Credits" / "You need at least 1 credit to generate a coloring page. Please purchase a pack to continue." There is no link to /pricing.
3. `x(true)`. Loader text "Reading the Bible...". **Fixed 1500 ms sleep**.
4. `$8(ref, age, style)` (Architect). Loader text "Sketching the scene...". `H8(brief, age, style)` (Artist + `$P`).
5. `ig(uid, 1, "Generated: {book} {chapter}")` deducts **after** the image exists.
6. `C(imageUrl)` shows `qP`.

Errors (catch; the loader always clears in `finally`):
- `INVALID_REFERENCE`: modal "Scripture Not Found" / "This bible passage does not exist. Please check the book, chapter, and verse numbers and try again."
- Message contains "api key is missing": `alert()` (legacy).
- Contains "429" / "resource_exhausted" / "quota": "Creation Failed" / "There was an issue with the app. Please try again later."
- Anything else: "Creation Failed" / "Oops! Something went wrong with the divine inspiration. " + the raw message. Raw messages that reach users this way include "Artist Failed (Gemini 3): INSUFFICIENT_CREDITS", "Architect Failed: …", "Daily generation limit reached…", and "INSUFFICIENT_CREDITS" from `ig`.

### requireAuth (`X`, shell 2016039)
- `X` runs `fn` now if the user and profile are loaded (`n && a`).
- Otherwise it stores `fn` and opens the auth modal (`lq`). An effect runs the stored `fn` once `n && a`.
- `a` becomes true on the first `users/{uid}` snapshot (`R8`).
- Email/password sign-ups stay signed out until they verify: `L8` signs out unverified non-Google users.

### Loader `YP`
- `fixed inset-0 z-[200]`.
- The icon follows the status text ("reading" → book icon, "sketching" → pencil, otherwise spinner).
- `<h2>` shows the status text.
- Fake progress: +0-3 % every 500 ms, capped at 95.
- Rotates one of 9 verse quotes (`EO`) every 8 s.

### Result view `qP`
- **Add Ref** (`ge`): `J8(currentImage, "Book ch:v[-v2]")` draws the text in canvas.
  - Bold sans-serif, `max(16, 3 % of width)` px, centered at the bottom with a 2 % padding, white halo, fill `#1F2937`.
  - It keeps the pre-text image in `k`. Toggling again restores it.
  - Error: "Could not add reference text. (CORS Error?)".
  - It uses the unscaled `Book` name, not `Mc`.
  - If the ref is on at save time, the text is part of the saved image.
- **Remove Color** (`F`): auth-gated, then `T_(k||m, "Make the image black and white")`. That is a full Gemini image call, **free** (no `ig`). Error: "Failed to remove color. Please try again."
- **Make changes** (`H`): no-op on empty text. Auth-gated, then `ig(uid,1,"Refined Sketch")` **before** `T_(k||m, prompt)`, with no refund on failure. Errors: "Not enough credits." (INSUFFICIENT_CREDITS), otherwise "Failed to edit image. Please try again."
- **Save to Collection**: auth-gated, opens `Z8`.
  - Step 1 "Save to Gallery" / "Choose how you want to save your masterpiece." has two buttons: "Public Community" ("Share your creation with everyone in the Bible Sketch gallery.") and "Private Collection" ("Save it securely. Only you can see this in your gallery.").
  - Step 2 "Add Tags" / "Help others find your creation (optional)" shows `fS` grouped by Season/Theme. Buttons "Skip" and "Save" / "Save with N Tag(s)". "Skip" sends the selected tags anyway: both buttons call the same `_`. There is a "Back" link.
  - While saving, "Saving to Cloud Storage..." shows.
  - `onConfirm(isPublic, tags)` → `qP.pe` → `onSave(isPublic, currentImage, tags)` → `dS(...)`. `finally` closes the modal.
  - **No success message, no navigation to the new sketch, errors only go to the console.** Saving again creates a duplicate upload and doc.
  - The `WAITING_FOR_AUTH` branch in `iq.onSave` is unreachable, because the button is already auth-gated.

### Featured section `aq`
- Client-side filter/sort/paging over the 50 loaded docs. Each filter change resets to page 1.
- **Bless** (`$`): if already blessed, nothing happens.
  - Optimistic update: add to the Set and write `localStorage.blessedSketches`, then `blessCount+1`.
  - Then `Ip(id, uid)`.
  - Logged out: `e(fn)` opens signup. After login the queued fn runs `Ip` via `Ht.currentUser`.
  - Errors: console only.
- **Share**:
  - Facebook: `https://www.facebook.com/sharer/sharer.php?u=<sketch url>`.
  - Pinterest: `https://pinterest.com/pin/create/button/?url=…&media=<imageUrl>&description=<Gr title + tq hashtags>`.
  - Both open through `$r`: `window.open` 600×700 "shareWindow".

## 5. Backend contract

### Firebase init (840663)
- Config: project `biblesketch-5104c`, `authDomain: "biblesketch.app"`, bucket `biblesketch-5104c.firebasestorage.app`.
- Emulators are used only when `location.hostname==="localhost"` (auth 9099, firestore 8080, storage 9199, functions 5001). The `location` access is at module scope.
- Anonymous sign-in `A8` runs when no user is signed in, unless `localStorage.anon_auth_disabled==="true"`.

### Page-load reads on `/`
| Call | Query | Cost |
|---|---|---|
| `U8` (853206) | `sketches where isPublic==true` (**full getDocs, no limit**), then count docs where `!isBookmark` | Reads every public sketch on every home visit |
| `jP` (849944) | `sketches where isPublic==true orderBy createdAt desc limit 50`, client drops `isBookmark` and `type=="verse"`, sorts by blessCount desc then time desc | 50 reads |
| `Wc` (849217) | `users/{uid}` → `blessedSketchIds` (logged in) | 1 |
| `zP` (855525) | `sketches where userId==uid` (all of the user's docs), keep `isBookmark===true`, collect `originalSketchId` (logged in) | N |
| `sg` per visible card | `users/{userId}` via `ol` → displayName, photoURL | up to 12 per page, repeated |
| `lo` per visible card | Storage `getDownloadURL(thumbnailPath)`, else predicted `{storagePath sans ext}_400x533.{ext}`, else `imageUrl` | up to 12 |
| Shell `R8` | `onSnapshot users/{uid}` (credits etc.) | live |

### Generation: `generateContent` callable (`Xc`)
- Called as `httpsCallable(functions, "generateContent", {timeout: 540000})` with `{model, contents, config}`. Returns `.data`, which is `{candidates:[{content:{parts:[{text?, inlineData?{mimeType,data}}]}, finishReason, safetyRatings}], usageMetadata}`.
- Server (functions/index.js:317-383):
  - Rejects anonymous callers and unverified emails.
  - `ALLOWED_MODELS` = gemini-2.5-flash, gemini-3.1-pro-preview (text); gemini-3-pro-image-preview, gemini-3.1-flash-image (image).
  - Config keys limited to responseMimeType, responseModalities, imageConfig, safetySettings.
  - At most 12 parts, 60k text chars, 9 MB inline base64.
  - Image calls need `credits >= 1` (read only, no charge).
  - `reserveDailyCall`: image 60/day/user, text 300/day/user, global 500 images/day, counted before Gemini runs, so retries count too.
- `Zc(fn, 5, 3000)`: up to 5 attempts with backoff 3, 6, 12, 24 s. It retries when `status||code` is 429/503/500 or the message includes "Resource has been exhausted" / "overloaded" / "quota". Firebase callable codes are strings, so in practice only the message wording triggers it. The server keeps Gemini's message in `HttpsError('internal', 'Gemini Error: …')`, so wording such as overloaded or quota gets retried. **One generation can make up to 5 image calls.**

### Models `Fc` (263978)
`{ARCHITECT:"gemini-2.5-flash", ARTIST:"gemini-3-pro-image-preview", CRITIC:"gemini-2.5-flash"}`. The Critic is **not used by Scene Art**; it is used only by the Verse Art pipeline (873679). The old `generateWithGoldenPipeline` (services/gemini.ts:349) with Critic validation is **absent from the bundle** (tree-shaken, never called).

### Architect `z8` (860622)
- Model ARCHITECT, `contents:{parts:[{text}]}`, `config:{responseMimeType:"application/json"}`.
- Prompt: "ROLE: Biblical Art Director. TASK: Create a JSON brief…". It includes:
  - `INPUT: Passage "Book ch:v[-v2]"`.
  - `TARGET AUDIENCE SPECS`: `R2[age].keywords` and `R2[age].subjectFocus`.
  - `ART STYLE SPECS`: `O2[style]`.
  - `CRITICAL RULES`: `s5` (Trinity rules: God the Father never shown as human, Jesus as a Middle-Eastern man, the Spirit as a dove or fire; exact subject count; Exodus water walls; Eden serpent; pre/post-Fall clothing; modesty; natural scale; closed paths).
  - An added "Genesis pre-fall → add 'thorns, dead plants' to negative_prompt" rule.
  - An INVALID_REFERENCE instruction: `{"error":"INVALID_REFERENCE"}` when the passage doesn't exist in the Protestant canon.
- Output JSON: `{positive_prompt, negative_prompt, validation_criteria[3], reasoning}`.
- **No verse text is fetched**. The model works from the reference alone. The empty-text case throws "Architect returned empty response". JSON parse and other errors are wrapped as `Architect Failed: …`.

### Artist `G8` (862176)
- References: `i5["{age}_{style}"]` gives 1-2 JPEGs under `/references/` (13 combos, all covered). They are fetched from same-origin Hosting and read as base64. The base64 cleanup strips a leading `77+9` (UTF-8 BOM garbage) and seeks `/9j/` for JPEG. Files: toddler-sundayschool(-2), child-sundayschool, child-stainglass(-2), child-iconography, child-comicbook(-2), teen-classic(-2), teen-stainglass(-2), teen-iconography, teen-comicbook(-2), adult-classic, adult-stainglass(-2), adult-iconography, adult-doodle(-2). `hosting-public/references/49089630e5f257f0481a-w736.png` is unreferenced.
- Prompt: the brief's `positive_prompt` + `--- LAYOUT REQUIREMENTS ---` `o5` ("CANVAS: FULL BLEED… NO margins… Camera must be level… NO decorative frames") + `--- TECHNICAL SPECIFICATIONS (STRICT) ---` "1. LINE STYLE: R2[age].keywords 2. ART TECHNIQUE: O2[style]". Then one of two blocks:
  - "--- VISUAL REFERENCE INSTRUCTION --- Use the attached images as STRICT STYLE SOURCES…".
  - Or, when zero references loaded, "--- STYLE EMULATION MODE ---".
  The prompt ends with `NEGATIVE PROMPT: {brief.negative_prompt}, {D2}`.
- Call: `{model: ARTIST, contents:{role:"user", parts:[...refs, {text}]}, config:{responseModalities:[IMAGE], imageConfig:{imageSize:"2K", aspectRatio:"3:4"}, safetySettings:[{HATE_SPEECH, BLOCK_MEDIUM_AND_ABOVE}]}}`. It returns the first `inlineData` as a `data:` URL. Errors are wrapped `Artist Failed (Gemini 3): …`.
- `D2` = color, shading, hatching, 3d, solid black, sketch, noise, text, watermark, border, rotated image, tilted frame, diagonal border, white border, margin, padding, inset image, cartoon proportions, chibi, big head, face of god, modern, anachronism, bad anatomy, extra limbs, giant figure.

### Post-processing `$P` (859053, canvas)
- Load the image, fill the canvas white, draw it **scaled to 85 %** and centered, which leaves a 7.5 % white margin on each side.
- Then threshold with luminance `0.299R+0.587G+0.114B < 160` → 0, else 255, and `toDataURL("image/png")`.
- On a tainted canvas or error it returns the unprocessed image.
- The result is a pure 1-bit PNG data URL at about 2K resolution.

### Edit `T_` (864825)
- Strips the data-URL prefix. Prompt: "TASK: Modify this existing coloring page image…". It includes `User Instruction: "{text}"`, CRITICAL CANVAS RULES (same size, full bleed, no zoom-out) and STYLE CONSTRAINTS, and ends with `NEGATIVE PROMPT: {D2}, white margin, white border, padding, zoomed out, scaled down, empty space around image, frame`.
- Parts are `[text, inlineData]` (text first). Same ARTIST config as the Artist.
- Output → `V8` (threshold only, no shrink) → data URL.
- The input must be a `data:` URL. Result view images always are.

### Credits `ig` (845836)
- `runTransaction`: read `users/{uid}`; if `credits||0 < amount`, throw `INSUFFICIENT_CREDITS`; else `update credits = credits - amount`.
- Then, best effort (errors logged), the lazy chunk `transactions-CpWNcXvd.js` runs `addDoc(users/{uid}/transactions, {userId, amount:-1, description, type:"usage", timestamp: serverTimestamp()})`.
- Descriptions: `Generated: {book} {chapter}`, `Refined Sketch`.
- Rules allow a client decrease of credits and only a usage transaction with amount == -1 (firestore.rules:52-69).

### Save `dS` (847545) → `P8` (846837)
1. `M8`: redraw the data URL on a white canvas and output PNG.
2. Upload with `uploadString(data_url)` to Storage `user_uploads/{uid}/sketches/{Date.now()}.png` with `contentType:"image/png"` and `contentDisposition: attachment; filename="bible-sketch.png"`.
3. `imageUrl = getDownloadURL()` (tokened URL). `thumbnailPath = user_uploads/{uid}/sketches/{ts}_400x533.png`. This is a predicted path; the thumbnail must be made outside the app (a Resize Images extension is assumed; it is not in this repo).
4. `addDoc(sketches, …)` with these fields:
   - `userId`, `imageUrl`, `storagePath`, `thumbnailPath`
   - `isPublic`, `blessCount:0`, `createdAt: serverTimestamp()`, `isBookmark:false`, `type:"scene"`
   - `promptData:{book, chapter, start_verse, aspect_ratio:"3:4", end_verse?, age_group, art_style}`
   - `tags?`, set only when not empty.
5. Returns `{id, …}`. The caller ignores it.

Rules: sketch create needs only `userId==auth.uid` and `blessCount==0`. Storage: owner writes images under 15 MB, and anyone may `get` `user_uploads/*/sketches/**`. The server trigger `onSketchWritten` purges the Astro Worker cache on writes (not deployed yet).

### Bless `Ip` (848646)
- Without a uid: `update sketches/{id} {blessCount: increment(1)}`.
- With one: a transaction reads `users/{uid}`. If `blessedSketchIds` contains the id, throw ALREADY_BLESSED (swallowed). Otherwise increment and `arrayUnion` onto the user doc. If the user doc is missing, it only increments.

### External URLs
- Facebook sharer, Pinterest pin-create (4).
- Old-project Storage image `coloring-book-bce53` (hero).
- `bible-api.com` is **not** used by Scene Art. `q8` (866318, `?translation=web`) is Verse Art only.
- No Zoho calls on `/`.

### Browser storage
- `localStorage.blessedSketches` (JSON id array)
- `localStorage.anon_auth_disabled`
- `localStorage.pinterest_epik` and the `_epik` cookie (shell)
- No sessionStorage.

## 6. Tracking
- **None in the Scene Art flow.** There is no `zaraz.track`/`zaraz.ecommerce` for generate, save, refine, share or bless.
- All zaraz calls in the bundle are: CompleteRegistration (964800, auth modal), Order Completed/Purchase (1010362-1011108, pricing), Product Added/AddToCart (2018070, shell checkout).
- No `pintrk` anywhere. Pinterest attribution is only the `epik` capture above. The old `utils/pinterestTracking.ts` is not in the bundle.

## 7. Bugs and oddities
1. **Queued create doesn't run after sign-in.** `Q`'s closure captures `t` (user) at click time, when it is null. When the shell replays the queued fn, `if(t)` is false and nothing happens, so the user must click again. The shell keeps `v=useRef(n)` but doesn't use it for this. Same in the old source: CreateTool.tsx:65 `if (!user) return;`.
2. **Charge after generate, client side** (ROADMAP 1.1):
   - Gemini runs first and `ig` runs last. If `ig` fails (another tab spent the last credit), the image is thrown away and "Oops! … INSUFFICIENT_CREDITS" shows.
   - The server's `credits>=1` check allows 60 image calls/day on 1 credit.
   - Retries (`Zc`, up to 5 Artist attempts) are uncharged but count against the daily cap.
3. **Refine charges before calling Gemini, with no refund**. **Remove Color is a free Gemini image call** (ROADMAP 1.1). With 0 credits the server rejects Remove Color, and the user sees the generic "Failed to remove color".
4. `U8` downloads every public sketch document on each home visit, just to show "N+ created" (floored at 500). Cost and latency grow with the collection.
5. Featured grid N+1 reads: `sg` reads `users/{uid}` and `lo` calls `getDownloadURL` for every card, on every page change.
6. The featured grid only ranks the **50 newest** public sketches by blessings, so older popular sketches never appear. The server `<ol>` uses the same logic (top 15).
7. `$P` shrinks the art to 85 % and adds a white margin, while `o5`, `D2` and the edit prompt demand full bleed, no margin and no border. The margin (the "frame") comes from the code, not the model. Refine output skips the shrink, so frames differ between generated and refined images.
8. `O2[Doodles]` asks for "decorative hatching" while `D2` bans "hatching". Toddler `R2` says "approx 4-5mm" lines, Young Child says 2 mm.
9. Save flow: no success feedback, no link to the new sketch, errors silent, duplicates on re-save. "Skip" on the tags step still saves the selected tags.
10. The result view has no URL/history entry and no download/print. Navigating away loses unsaved work without a warning.
11. The hero example image lives in another Firebase project (`coloring-book-bce53`). It breaks if that bucket goes away.
12. `gS` (GalleryModal) is mounted in `aq`, but `M` is only set by `gS`'s own `onCreate`. Cards are Links, so the modal is dead code here.
13. Duplicate meta tags (server + Helmet) and a broken `SearchAction` (see 2).
14. The architect gets only the reference string, so the scene depends on the model's recall. `INVALID_REFERENCE` relies on the LLM judging whether the chapter or verse exists. There is no bounds data client side.
15. Error copy leaks internals ("Architect Failed: …", "Artist Failed (Gemini 3): …"). The `api key is missing` branch uses `alert()`.
16. The Add Ref label uses "Psalms 23:1", while the heading uses `Mc` ("Psalm 23:1").
17. Models: `gemini-3-pro-image-preview` is past Google's listed shutdown (2026-06-25) and `gemini-2.5-flash` is deprecated (ROADMAP 1.4 S0).

## 8. Rebuild notes

### Static vs island
- Server-render (Astro):
  - `<head>`: one title, description and canonical `https://biblesketch.app/`, og/twitter, JSON-LD (drop or fix the SearchAction).
  - Hero h1/p, stats pill, "Try:" chips as markup, and the example image (move it to our own bucket or Hosting, and give it width/height).
  - The Community Favorites grid as real `<a href="/coloring-page/{slug}/{id}">` cards with real `<img>` thumbnails (`_400x533`) and author names resolved on the server (batch-read `users` once). Also author links `<a href="/profile/{uid}">` and "Explore All Sketches" `<a href="/gallery">`.
  - The public count via a Firestore `count()` aggregate, cached at the edge.
- Islands:
  - (a) The creator: picker, options, CTA, loader, result view, save modal. `client:idle` or `client:visible`; it needs auth, so load Firebase on idle per ROADMAP 1.
  - (b) Grid interactions (bless, share, client-side filters/pager) as a small island over the server-rendered list, or plain links with query params (`?book=&age=&style=&tag=&sort=&page=`) so filter views are crawlable.
- Data needed at request time: the top N public scene sketches (the same query as homeRender, ideally more than 50 so ranking isn't newest-50 only), authors' displayName/photoURL, and the public count. All of it is cacheable; the Worker purge from `onSketchWritten` already tags pages.

### Pipeline port (ROADMAP 1.0 replaces most of it)
- The quality branch (`coloring-page-quality`, commit 0194652) replaces the following:
  - Architect prompt: `z8` → `buildBriefPrompt`, which adds verse text plus ±5 verses of context from bible-api.com WEB via `fetchPassage`.
  - Architect model: `gemini-2.5-flash` → `gemini-3.1-pro-preview`.
  - Artist prompt: `G8` text + `o5` + `D2` + reference-instruction blocks → `buildArtistPrompt` with `COLORING_PAGE_RULES` and "Leave out:".
  - Artist model: → `gemini-3.1-flash-image`.
  - `ARTIST_CONFIG`: the same 2K / 3:4 / hate-speech config, factored out.
  - `constants.ts` rules: `R2`/`O2`/`s5` rewritten, per-age line widths (toddler about 2 mm, adult 0.4 mm), Classic = Doré.
  - References: Adult · Classic becomes `adult-classic-a/b.jpg`; filenames lowercased.
- Kept by that branch: `callWithRetry`, the proxy call shape, `postProcessImage` (85 % shrink + threshold, still used), `thresholdToBW` for edits, the edit prompt, and `REFERENCE_MAP` keys.
- Add the lab QA gate (`lab/qa.ts`) after `$P`.
- Move generation server-side if possible: the Worker or `generateContent` builds prompts, fetches references and charges credits in one place (charge, then refund on failure). That removes `ig` from the client at the same moment the old bundle is retired (ROADMAP 1.1: avoid double charging during rollout).
- Keep reference fetch same-origin (`/references/*.jpg`) or inline them server-side. Canvas post-processing works on `data:` URLs, so no bucket CORS is needed. Anything that reads a saved Storage image into canvas does need bucket CORS.

### Behaviour to keep or fix
- Keep:
  - The age → style matrix.
  - The defaults (Daniel 6:16, Young Child, Sunday School).
  - The four "Try" presets.
  - The Mc() heading.
  - The Firestore `sketches` doc shape and `promptData` keys (sitemap, render functions and the Worker read them). Store `type:"scene"`.
  - The Storage path `user_uploads/{uid}/sketches/{ts}.png` and the predicted `_400x533` thumbnail.
- Fix:
  - Replay the queued create with fresh auth state.
  - Give the result a URL (or at least warn on unload).
  - Add download/print on the result.
  - Show success plus a link to the saved sketch, and prevent duplicate saves.
  - Show real error copy.
  - Add a pricing link from "Out of Credits".
- Tracking to add (none today): `generate_started`/`generate_succeeded`/`generate_failed`, `sketch_saved {isPublic, tags}`, refine, share (Zaraz, per the owner's setup).

### Risks
- Double charging during the transition while the old bundle still runs `ig`.
- Model shutdown (S0).
- 540 s client timeout vs the 300 s function timeout.
- The 9 MB inline limit: 2K PNG data URLs sent back for refine can approach it.
- Thumbnails depend on an out-of-repo extension.
- `U8`-style full scans must not move into the Worker.
