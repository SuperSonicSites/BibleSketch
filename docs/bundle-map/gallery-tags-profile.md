# Bundle map: `/gallery`, gallery modal, `/tags/:tagId`, `/profile/:uid`

Source of truth: `hosting-public/assets/index-DHKtGwi1.js` (offsets below are UTF-16 string indexes from `readFileSync(...,'utf8')`). Older source for names/intent: `components/Gallery.tsx`, `components/GalleryModal.tsx`, `components/TagPage.tsx`, `components/ProfileSEO.tsx`, `components/FilterBar.tsx`, `services/firebase.ts`. Server: `functions/index.js`.

## Name map

| Minified | Offset | Old source name | What |
|---|---|---|---|
| `QP` | 947867 | `Gallery` (components/Gallery.tsx) | `/gallery` page and, with `publicProfileId`, the profile page body |
| `Wy=12` | 947861 | `ITEMS_PER_PAGE` (Gallery.tsx:32) | page size for my/saved/profile client pagination |
| `Jte` | 2015898 | inline in App.tsx:225 | `/profile/:uid` wrapper: `useParams().uid` -> `QP{userId, publicProfileId:uid}` |
| `sq` | 945109 | `ProfileSEO` | Helmet for profile + ProfilePage JSON-LD |
| `Aq` | 1047848 | `TagPage` | `/tags/:tagId` |
| `wq/xq/Sq/vq` | 1046790 | (new, not in old TagPage) | URL param parsers for tag page (book/age/style/sort) |
| `gS` | 910140 | `GalleryModal` | sketch modal (bless, print, download, bookmark, tags, AI edit, visibility, delete) |
| `mS` | 896652 | `FilterBar` | book/age/style/tag dropdowns + sort select + active chips |
| `yf` | - | `FilterDropdown` (ui) | custom dropdown used by `mS` |
| `sg` | 925061 | `ArtistBadge` | author avatar + name button (fetches `users/{uid}`) |
| `lo` | 904756 | `LazyImage` | image with Storage thumbnail resolution |
| `WP` | 900953 | `WatermarkOverlay` | repeated "Bible Sketch" SVG text overlay (non-owners) |
| `KP` | 901488 | `PremiumModal` | "Upgrade to Premium" (downloads exhausted) |
| `fS` | 875319 | `TagSelector` | tag picker (compact mode in modal) |
| `A_` | 877347 | `TagList` | tag chips |
| `Yo` | 270214 | `LITURGICAL_TAGS` | 15 tags: 8 `season` (advent, christmas, epiphany, lent, holy-week, easter, pentecost, ordinary-time), 7 `theme` (creation, the-fall, exile, prophets, miracles, parables, resurrection). Same list server-side `functions/index.js:223` |
| `ei` | 268244 | `BIBLE_BOOKS` | 66 books, canonical order |
| `Ot` | 263537 | `AgeGroup` | Toddler, Young Child, Teen, Adult (legacy data also has `Pre-Teen`, displayed as Teen) |
| `dt` | 263635 | `ArtStyle` | Sunday School, Stained Glass, Iconography, Comic Book, Classic, Doodles |
| `Dt` | 263949 | `SITE_URL` | `https://biblesketch.app` |
| `ep` / `Kc` | 859851 / 860073 | `generateSketchSlug` / `getSketchUrl` (utils/urlHelpers.ts:4,15) | slug `book-chapter-start[-end]` lowercased, `[^a-z0-9-]` stripped; URL `/coloring-page/{slug}/{id}` if `isPublic`, else `"#"` |
| `Gr` / `$r` / `tq` | 908749 / 909035 / 907237 | `getShareData` / `openSharePopup` / pin description builder (utils/socialSharing.ts) | share URLs |
| `mm` | 851566 | `getFilteredPublicGallery` (services/firebase.ts:904) | cursor-paginated public query |
| `F8` | 853408 | `getUserPublicGallery` (:1038) | profile sketches |
| `j8` | 849391 | `getUserGallery` (:808) | "My Gallery" |
| `zP` | 855525 | `getSavedSketches` (:1228) | "Saved" |
| `Wc` | 849217 | `getUserBlessedSketchIds` (:792) | |
| `Ip` | 848646 | `blessSketch` (:749) | |
| `ol` | 844163 | `getUserDocument` (:347) | `users/{uid}` getDoc, null on error |
| `hS` / `pS` | 855898 / 854854 | `checkIsBookmarked` / `toggleBookmark` (:1254/:1186) | |
| `BP` / `VP` / `FP` | 854574 / 854712 / 853806 | `updateSketchVisibility` / `updateSketchTags` / `deleteSketch` | |
| `Ec` / `fm` | 839659 / 839994 | `canDownload` / `deductDownload` (services/downloads.ts:10,42) | |
| `ig` | 845836 | `deductCredits` (:475) | client-side credit charge |
| `dS` / `P8` | 847545 / 846837 | `saveSketch` (:667) / upload helper | |
| `T_` | 864825 | `editColoringPage` (services/gemini.ts) | AI edit via `generateContent` |
| `Xc` / `Zc` | 860128 / 860196 | callable wrapper / retry | `httpsCallable(functions,'generateContent',{timeout:540000})`; retry x5, 3 s doubling on 429/500/503/quota |
| `yO` / `V8` | 857879 | `processImageForDownload`-like / threshold | canvas re-encode for print/download |
| `Fi` | 217043 | react-router `Link` | renders a real `<a href>` |
| `ua` | 230757 | react-helmet-async `Helmet` | |

## 1. Routes and URL behaviour

Route table at ~2019637 (inside `ene`):
- `/gallery` -> `QP{userId:user?.uid, onAuthorClick: uid => navigate('/profile/'+uid)}`. No `onBack`.
- `/profile/:uid` -> `Jte{currentUserId, onBack: () => navigate('/gallery'), onAuthorClick}`.
- `/tags/:tagId` -> `Aq{userId, onRequireAuth: fn => X(fn,'login'), onAuthorClick}`.
- There is **no catch-all route**: `/tags/advent/x`, `/profile/a/b`, `/gallery/x` render header + footer with an empty main area (client). Server: `/gallery/x` falls to the `**` -> `/index.html` rewrite (200, shell); `/tags/advent/x` and `/profile/a/b` hit the render function, which reads only segment [1] and serves a normal 200 page (canonical points at `/tags/advent` or `/profile/a`); `redirectToCanonical` (functions/index.js:570) only collapses trailing/double slashes.
- `ene` scrolls to top on every pathname change.

### `/gallery` query params (QP)
- `?tag=<tagId>` is the only URL-synced state. Initial state `g = searchParams.get('tag') || 'All'` (947867). An effect keeps `g` in sync with the URL (`[s,g]`). Choosing a tag in the filter bar calls `bn`: `setSearchParams(tag==='All' ? {} : {tag})` — **push** (not replace), and it drops every other query param (utm_*, etc.).
- The tag value is not validated: an unknown `?tag=foo` queries `tags array-contains 'foo'` and shows the raw id in the active chip.
- Tab (`community|my|saved`), book, age, style, sort, page are **not** in the URL. Refresh loses them.
- `?search=` is ignored, although the homepage WebSite JSON-LD (`Iq`, 1061346) advertises `SearchAction target: /gallery?search={search_term_string}`.
- Server: `galleryRender` ignores all query params; canonical is always `https://biblesketch.app/gallery`.

### `/tags/:tagId` query params (Aq) — bundle-only (old TagPage.tsx has no URL sync)
- `?book=` (must be in `ei`, else All), `?age=` (must be in `Ot` values; `Pre-Teen` -> `Teen`; else All), `?style=` (in `dt`, else All), `?sort=` (`popular|newest`, default `popular`). Parsers at 1046790.
- An effect on `[book,age,style,sort]` rewrites the query string with `setSearchParams(params,{replace:true})`, writing only non-default values. It runs on mount, so **it strips every other param (utm_*, fbclid...) from the URL on load** and normalizes invalid values away.
- Unknown `tagId` (not in `Yo`): client renders "Tag Not Found"; server `tagRender` sends the shell with 404 + `X-Robots-Tag: noindex` (functions/index.js:1931-1935).

### `/profile/:uid`
- `uid` is used as-is. Client: if `users/{uid}` does not exist, header shows "User's Gallery" and the empty state. Server `profileRender`: invalid doc id -> 404 shell; no user doc **and** no public sketches -> 404 shell (cacheable); user with 0 public sketches -> 200 + `X-Robots-Tag: noindex` (functions/index.js:1332). Sitemap lists a profile only with >= 3 public sketches (`MIN_PROFILE_SKETCHES`, :394).

### Canonicals
- `/gallery`: server only (`<link rel=canonical href=/gallery>`, :1675). Client Helmet has none.
- `/tags/:id`: server only (`/tags/{id}`, :2046). Client Helmet has none; filtered URLs (`?book=...`) inherit the unfiltered canonical from the server HTML.
- `/profile/:uid`: both server (:1306, `encodeURIComponent(uid)`) and client `sq` (`${Dt}/profile/${uid}`, not encoded).
- Server-injected tags carry no `data-rh`, so Helmet never removes them: after an SPA navigation the first page's server canonical/description stay in `<head>` next to the new page's Helmet tags (e.g. land on `/profile/x`, click "Back to Gallery" -> canonical still `/profile/x`). Only matters for non-initial renders.

## 2. `<head>`

### `/gallery`
| | Server `galleryRender` (functions/index.js:1591) | Client Helmet in QP (947867, `De` memo) |
|---|---|---|
| title | "Bible Coloring Pages Gallery - Free Printable Christian Coloring Sheets \| Bible Sketch" | same |
| description | "Browse thousands of free printable Bible coloring pages. Discover coloring sheets for every Bible book, age group, and art style. Perfect for Sunday School, VBS, homeschool, and family devotionals." | same |
| canonical | `/gallery` | none |
| og | title, description, type=website, url=/gallery, site_name, image=/logo.png | og:title, og:description, og:type=website (no url, no image) |
| twitter | card=**summary**, title, description, image=/logo.png | card=**summary_large_image**, title, description (no image) |
| JSON-LD | none | none |
| robots | inherits `max-image-preview:large` from functions/index.html:8 | none |
| Cache | `public, max-age=3600, s-maxage=7200` | |

Mismatch: twitter:card summary vs summary_large_image; both end up in the DOM (duplicate meta description/og tags after hydration because server tags lack `data-rh`).

### `/tags/:tagId`
| | Server `tagRender` (:1912) | Client Aq (`J` memo, 1047848) |
|---|---|---|
| title | `${label} Coloring Pages \| Bible Sketch` | unfiltered: `${label} Coloring Pages \| Free Printable Bible Coloring Sheets \| Bible Sketch`; filtered: `[style ]${label} Coloring Pages[ For Adults/Teens/Young Children/Toddlers][ From ${book}] \| Bible Sketch` |
| description | season: "Discover beautiful {L} coloring pages from Bible stories. Perfect for celebrating the {L} season in Sunday School, VBS, or family devotionals. Free printable Bible coloring sheets." theme: "Explore {L} coloring pages from Scripture. These Biblical coloring sheets feature stories and lessons about {l}. Perfect for Sunday School, homeschool, or personal Bible study." | same templates with filter phrase `Pe` inserted after "coloring pages" (` for teens, in Comic Book style, from the book of Daniel`) |
| canonical | `/tags/{id}` | none |
| og/twitter | og title/desc/type=website/url/site_name/image=/logo.png; twitter card=summary + image | og title/desc/type=website; twitter card=summary_large_image, no image |
| JSON-LD | BreadcrumbList Home > Gallery > "{L} Coloring Pages" (:2057, no `data-rh`, survives hydration) | none |
| robots | `X-Robots-Tag: noindex` if the tag query succeeded and returned 0 sketches (:2109) | none |

Old TagPage.tsx title was `${label} Coloring Pages - Free Printable Bible Coloring Sheets | Bible Sketch` and descriptions ended "...for all ages." — the bundle changed both.

### `/profile/:uid` (client `sq` at 945109, rendered by QP instead of the gallery Helmet when `publicProfileId` is set)
- title `${name}'s Bible Coloring Pages | Bible Sketch Gallery`; description `Browse ${name}'s collection of Bible coloring pages. Free printable Christian coloring sheets created with Bible Sketch.` Server (:1214) identical.
- canonical, og:title/description, og:image = photoURL or `${Dt}/logo.png`, og:url, og:type=profile, `profile:username`, twitter card=summary + title/desc/image. Server identical plus og:site_name.
- JSON-LD client: `{"@context","@type":"ProfilePage", mainEntity: Person{name,image,url, interactionStatistic: WriteAction count = sketchCount (all public sketches loaded, no limit), hasPart: ItemList of VisualArtwork{name "Book Chapter", image imageUrl, url /coloring-page/slug/id, datePublished, author Person}}}`, keyed `schema-${uid}-${n}`, rendered only if `dataReady || name !== 'Bible Sketch User'` (`dataReady = !!profile && !loading`). Logs `[ProfileSEO] ...` to console on every render.
- JSON-LD server: `@graph` [ProfilePage `@id` + Person (count = up to 50), separate ItemList "Sketches by {name}"], emitted with `data-rh="true"` so Helmet replaces it (:1276). Shape differs (hasPart inside Person vs sibling ItemList); count differs when > 50 public sketches.
- Name fallback differs: client uses `"Bible Sketch User"` for Helmet but the page H1 uses `"User"`; `sg`/modal use "Artist"/"Unknown Artist".
- Server `Cache-Control: public, max-age=1800, s-maxage=3600`.

## 3. Page structure

### `/gallery` (QP, community tab)
1. No H1 on the community view (ROADMAP S7). Server crawler body: `<h1>Bible Coloring Pages Gallery</h1>`, intro `<p>`, `<ol>` of 4 static links (/, /bible-verse-coloring, /blog, /pricing) + top 30 sketches by blessCount among newest 50 public (link text `Book ch:v[-v] Coloring Page|Verse Art`), removed by inline script before React mounts (:1657-1711).
2. Tab pill (buttons, not links): "My Gallery" (User icon), "Saved" (Bookmark), "Community" (Globe). Active = purple bg.
3. Filter bar `mS` — rendered only when `items.length > 0 && !loading && !error` (see bugs). Dropdowns "All Books" / "All Ages" / "All Styles" / "All Tags" + native `<select aria-label="Sort sketches by">` ("Most Popular" = popular, "Newest First" = newest) + "Clear" button when any of book/age/style/tag is set (does not reset sort). "Active filters:" chip row with per-chip X.
   - Community options: books = all 66 `ei`, ages = `Ot` values, styles = `dt` values, tags = all 15 `Yo`.
   - My/Saved/Profile options derived from loaded items: books present (canonical order), ages present (Pre-Teen -> Teen, alpha), styles present (alpha), tags by frequency (label from `Yo`, else raw id).
4. States: loading = spinner + "Loading masterpieces..."; error = red box "Could not load gallery" + message + optional "Create Required Index in Firebase" `<a target=_blank>` (Firestore console link parsed from a `failed-precondition` index error); empty = "No sketches found for {book}" or "No images found" + sub-line per context ("This user hasn't shared any sketches publicly yet." / "Create your first coloring page to see it here!" / "Bookmark sketches from the community to see them here!" / "Be the first to share a sketch with the community!").
5. Grid `grid-cols-2 md:3 lg:4`. Card: `lo` image 3:4 (alt `Gallery Item ${index}`), title `Book ch:start[-end]` or "Bible Scene", subtitle `font_style || "Verse Art"` for `type==='verse'`, else `${art_style} • ${age}` (Pre-Teen -> Teen), or a date if no promptData. Footer: `sg` author button + bless button (heart + count). Share row: Facebook, Pinterest buttons. Right-click disabled on card and image.
   - Old Gallery.tsx cards had no Verse Art subtitle branch; bundle added it.
   - Wrapper: `isPublic` -> `<Link to=/coloring-page/{slug}/{id}>` (real `<a href>`); else `<div onClick=openModal>`. So community and profile cards are always links; the modal opens only for the owner's private sketches (My Gallery) and bookmarks (Saved; bookmarks are `isPublic:false`).
   - Nested interactive: author `<button>` and share `<button>`s sit inside the `<a>`; they `preventDefault` + `stopPropagation`.
6. Pagination: community = "Load More Sketches" button (only if `hasMore`), appends next 50; all loaded items render (no 12-per-page). My/Saved/Profile = client pages of 12 with prev/next icon buttons (`aria-label` "Previous page"/"Next page") and "Page N of M".
7. Logged out + tab my/saved (reachable only transiently, effect forces community): disabled My Gallery/Saved buttons, Community button, "Login Required" / "Please log in to view your personal collection."

### `/profile/:uid` (QP with `publicProfileId`)
- `sq` Helmet; "Back to Gallery" button (ArrowLeft) -> `onBack()` = `navigate('/gallery')` (not a link).
- Header card: 96px avatar (`photoURL` or User icon, alt "Profile"), H1 `${name || 'User'}'s Gallery`, "Viewing public sketches from this creator." No tab pill.
- Then filter bar, grid, 12-per-page pagination as above. Server crawler body: `<h1>{name}'s Bible Coloring Pages</h1>` + `<ol>` of links (only if >= 1 sketch), wiped before mount (:1294-1300). H1 text differs from the client H1.

### `/tags/:tagId` (Aq)
- "Back to Gallery" button -> `navigate('/gallery')`.
- Hero (purple->amber gradient): tag icon tile, H1 = `J.h1` (see title rule, without the suffixes), category line (`season`/`theme`, capitalized), subtitle `Browse ${loaded.length} ${label} coloring page(s)${Pe} from Bible stories. Perfect for {celebrating the L season | teaching about l} in your church, Sunday School, or home.` The count is the number loaded so far (<= 50 until Load More), not the total.
- Filter bar with `hideTagFilter`: all 66 books, all ages, all styles, sort (default "Most Popular").
- States: spinner (`Hs` Loader2); error "Could not load sketches" + index link; empty "No sketches found" + `No ${label} sketches from ${book} yet.` or `No sketches tagged with "${label}" yet.`
- Grid of `<Link>` cards (same card as gallery; image alt `${book} sketch`), no modal. "Load More Sketches" when `hasMore`.
- Not found: H1 "Tag Not Found", "This tag doesn't exist.", `<Link to="/gallery">Back to Gallery</Link>`.
- Server crawler body: `<h1>{L} Coloring Pages</h1>`, description `<p>`, `<ol>` with /gallery, /bible-verse-coloring, /blog + top 15 tagged sketches (by blessCount among newest 50), wiped before mount.

### Gallery modal `gS` (910140)
Full-screen overlay (`z-[100]`, black/80), panel `max-w-5xl h-[90vh]`, close X (top-right). No Escape key, no backdrop click close, no focus trap, no `role=dialog`.
- Left: image (`lo`, preview `re` if an edit exists), `WP` watermark when not owner, "Refining creation..." overlay while editing, "Unsaved Preview" badge.
- Right: H2 reference (or "Unknown Verse"), age chip (Pre-Teen->Teen, "General"), date `toLocaleDateString`, "{n} Blessings". "Created By" card (non-owner only, click -> `onAuthorClick(userId)` -> `/profile/uid`).
- Actions (no preview): "Bless this Sketch"/"Blessed"; "Print PDF" (+ `(N left)` for non-owner, non-premium, logged-in); "Download" (same counter); "Save to Collection"/"Saved to Collection" (logged-in non-owner only). Facebook / Pinterest share buttons.
- With an unsaved preview: "You have unsaved changes", "Save New Version", "Discard Changes" (confirm "Discard these changes? Credits used for generation will not be refunded.").
- Owner section (`isOwner = currentUserId === sketch.userId`; **true for your own bookmarks**):
  - Tags box (not for bookmarks): chips or "No tags yet. Add tags to help others discover this sketch."; "Edit"/"Add Tags" -> `fS` compact picker + "Save Tags"/"Cancel".
  - "Refine Creation" box, "1 Credit" badge: "Modify this image..." -> textarea (placeholder `e.g. "Add a dove"`) + "Generate Edit"/"Cancel". Shown for bookmarks too.
  - "Management": visibility toggle "Public"/"Private" + "Change" (not for bookmarks, hidden while preview); delete "Delete Sketch" / "Remove Bookmark" -> confirm row "Are you sure? Cannot undo." "Yes, Delete"/"Cancel" (disabled while preview).
- `KP` premium modal: "Upgrade to Premium", "Unlock unlimited prints & downloads", remaining-count warning or "You've used all your free downloads", 3 bullets, "View Premium Options" (`window.location.href='/pricing'`, full reload), "Maybe Later".

## 4. Interactive behaviour

### QP state and effects (947867)
- Initial tab: `publicProfileId || userId ? 'my' : 'community'`. `userId` is usually undefined on first render (auth not resolved), so logged-in users usually land on Community; if auth already resolved (client navigation), they land on My Gallery. Effect on `[userId, publicProfileId]` forces `community` when logged out on my/saved; it never switches a logged-in user to `my`.
- Changing tab or profile resets book/tag/age/style to All, sort to `newest`, page 1, cursor. Changing any filter/sort resets page and cursor.
- Default sort on `/gallery` is **newest** (FilterBar default prop is popular; Aq default popular; FeaturedSection on home `aq` default popular).
- Load effect `[userId, tab, profileId, book, tag, age, style]` (sort is client-side only): profile -> `F8(uid)`; my -> `j8(uid)`; saved -> `zP(uid)`; community -> `mm({book,ageGroup,artStyle,tag,pageSize:50})`. Then blessed ids = `localStorage.blessedSketches` ∪ `users/{uid}.blessedSketchIds`. No cancellation of stale requests.
- Community: server-side filters, client-side sort of what is loaded (`newest` by timestamp, `popular` by blessCount). My/Saved/Profile: client-side filter + sort + 12-per-page slice.
- Bless (`sn`): no auth gate on `/gallery` (compare Aq and home featured, which call `onRequireAuth`). If already blessed, no-op. Optimistic: add id to Set and `localStorage.blessedSketches`, +1 on the card and open modal, then `Ip(id, userId)`; errors only logged.
- Share: Facebook `https://www.facebook.com/sharer/sharer.php?u={url}`; Pinterest `https://pinterest.com/pin/create/button/?url={url}&media={imageUrl}&description={desc}`; opened with `window.open(url,'shareWindow','width=600,height=700,...')` centered. `url = https://biblesketch.app/coloring-page/{slug}/{id}`. Pinterest description = `"{ref} Coloring Page | Printable Scripture for {Audience}\n\n" + one of 3 templates (chosen by `id.charCodeAt(0) % 3`) + hashtags (`#tag` per tag, fixed set, `#{Book} #{Audience}BibleStudy`) + AI disclaimer`. Audience map: Toddler->Toddlers, Young Child->Young Children, Pre-Teen->Pre-Teens, Teen->Teens, Adult->Adults.
- Modal callbacks: `onDelete` removes from list + closes; `onUpdate` merges fields (isPublic/tags); `onCreate` prepends new sketch and opens it; `onBookmark(id, saved)` removes the item from the Saved tab when un-saved.
- Author click: `sg` button -> `navigate('/profile/'+uid)` (no `<a>`). `sg` fetches `users/{uid}` per card (one getDoc per card, no cache) and logs `[ArtistBadge] Fetching profile for user: ...`.

### Aq (tag page)
- Load effect `[tagId, userId, book, age, style]` -> `mm({tag, book, ageGroup, artStyle, pageSize:50})`; sort client-side. Bless gated: logged-out -> `onRequireAuth(fn)` -> auth modal (login view), then runs the bless. Load More appends.

### gS modal handlers
- On open: if logged in, `Ec(uid)` -> remaining/isPremium; bookmark state: own bookmark -> true, else `hS(uid, sketch.id)`; non-owner -> `ol(sketch.userId)` for "Created By".
- Print (`Wt`): logged-out -> `alert("Please log in to print.")`. `Ec` -> not allowed -> `KP`. Else `yO(url)` (canvas re-encode to PNG data URL; falls back to the URL), `window.open('','_blank')`, `document.write` an `<img onload=window.print()>` page titled "Print Sketch", then `fm(uid)` (deduct 1 download unless premium). Errors -> `alert("Could not print image.")`. **Owners are charged too** (no isOwner check); the "(N left)" label is just hidden for them.
- Download (`bn`): same gate; `yO`, then `<a href=dataUrl|url download="bible-sketch-{id}.png">` click; `fm(uid)`. Error -> `alert("Could not download image.")`.
- Visibility (`sn`): `BP(id, !isPublic)`; error alert "Failed to update visibility".
- Delete (`Rn`): `FP(id, storagePath, isBookmark)`; then `onDelete`, close. Error alert "Failed to delete sketch. Please try again."
- AI edit (`Jt`): logged-out -> error "You must be logged in to edit."; **charges first** `ig(uid, 1, "Edited Sketch: {Book} {Chapter}"|"Gallery Item")`, then `T_(preview || imageUrl, prompt)`. `INSUFFICIENT_CREDITS` -> "Not enough credits. Please purchase more."; other -> message. No refund.
- Save New Version (`Tt`): needs `promptData` (else alert "Could not save due to missing sketch metadata."); `dS(uid, previewDataUrl, {reference, ageGroup (Pre-Teen->Teen), artStyle}, isPublic=false)`; `onCreate(newSketch)`. Error alert "Failed to save image to storage. Please try again."
- Bookmark (`on`): `auth.currentUser` required (alert "Please log in to save sketches."); `pS(uid, sketch)` toggles; if it was a bookmark being removed, closes modal. Error alert "Failed to update bookmark".
- Tags (`$n`): `VP(id, tags)`; alert "Failed to save tags. Please try again." on error.

### requireAuth
- App shell `X(fn, view='login')` at 2016856: runs `fn` if user and a second flag `a` (profile loaded) are set, else queues `fn`, opens auth modal `lq` in `view`. `Y(fn) = X(fn,'login')`.
- Used here only by Aq (bless). QP and gS use none: they check `userId` inline and `alert()`.

## 5. Backend contract

All Firestore calls are client SDK (`kt` = Firestore, `Qo` = Storage, `LP` = Functions). Emulators only when `location.hostname === 'localhost'` (839659 area).

### Reads
| Call | Query | Used by |
|---|---|---|
| `mm` (851566) | `sketches` where `isPublic == true` + ONE of [`tags array-contains tag` \| `promptData.book == book` \| `promptData.age_group == age` (Teen -> `in ['Teen','Pre-Teen']`) \| `promptData.art_style == style`] (priority tag > book > age > style), `orderBy createdAt desc`, `limit(pageSize+10)` = 60, `startAfter(cursor)`. Client post-filter: drop `isBookmark`; remaining filters applied client-side (with tag: book/age/style; with book: age/style; age+style: style). `hasMore = filtered.length > 50`; returns first 50, cursor = 50th doc snapshot. Includes `type:'verse'` sketches. | QP community, Aq |
| `F8` (853408) | `sketches` where `userId == uid` and `isPublic == true`, no limit, no orderBy; drop bookmarks; sort by createdAt desc. | profile |
| `j8` (849391) | `sketches` where `userId == uid`, no limit; drop bookmarks; sort desc. | My Gallery |
| `zP` (855525) | `sketches` where `userId == uid`, no limit; keep `isBookmark === true`; sort desc. (Reads all of the user's sketches to find bookmarks.) | Saved |
| `ol` (844163) | getDoc `users/{uid}`; returns data or null (errors swallowed). Fields used: `displayName`, `photoURL`, `isPremium`, `downloadsRemaining`, `blessedSketchIds`. | profile header, `sg`, modal author, `Ec` |
| `Wc` (849217) | getDoc `users/{uid}`.`blessedSketchIds` | blessed state |
| `hS` (855898) | getDoc `sketches/bookmark_{uid}_{sketchId}` -> exists | modal |
| lo | `getDownloadURL(ref(storage, thumbnailPath))`; if no `thumbnailPath` but `storagePath`, tries `{dir}/{name}_400x533.{ext}`; falls back to `imageUrl`; on `<img>` error falls back to `imageUrl`, then "Unavailable". One Storage metadata request per card. | all grids, modal |

Timestamps: `createdAt.toMillis()` or `Date.now()` if missing.

Indexes (firestore.indexes.json) cover every `mm` shape: `isPublic+createdAt`, `+promptData.book`, `+promptData.age_group`, `+promptData.art_style`, `tags(CONTAINS)+isPublic+createdAt`.

### Writes
| Call | Write | Rule (firestore.rules) |
|---|---|---|
| `Ip` bless (848646) | Logged in: transaction reads `users/{uid}`; if `blessedSketchIds` contains id -> `ALREADY_BLESSED` (swallowed); else `sketches/{id}.blessCount = increment(1)` + `users/{uid}.blessedSketchIds = arrayUnion(id)`. If user doc missing: only the increment. Logged out: plain `updateDoc(sketches/{id}, {blessCount: increment(1)})`. | update: bless needs `request.auth != null` and +1 only -> **the logged-out path is always denied** (:95-105) |
| `pS` bookmark toggle (854854) | doc id `bookmark_{uid}_{originalSketchId||id}`: exists -> delete (returns false); else `setDoc` `{userId:uid, isBookmark:true, isPublic:false, createdAt:serverTimestamp(), blessCount:0, originalSketchId, originalOwnerId, promptData, imageUrl, storagePath, thumbnailPath}` (logs payload to console). | create: owner + blessCount 0 |
| `BP` (854574) | `updateDoc(sketches/{id}, {isPublic})` | owner, keys isPublic/tags only |
| `VP` (854712) | `updateDoc(sketches/{id}, {tags: [] or list})` | same |
| `FP` delete (853806) | getDoc for `thumbnailPath`, `deleteDoc(sketches/{id})`; if not bookmark, delete Storage objects: `storagePath`, `thumbnailPath`, `{base}_400x533.{ext}`, `{base}_400x533.webp` (not-found ignored). Note: deleting a bookmark doc never touches Storage (correct: files belong to the original). | owner delete |
| `fm` (839994) | transaction on `users/{uid}`: premium -> no-op; `downloadsRemaining < 1` -> `NO_DOWNLOADS_REMAINING`; else `-1`. | decrease-only |
| `ig` (845836) | transaction on `users/{uid}`: `credits < amount` -> `INSUFFICIENT_CREDITS`; else `credits - amount`. Then lazy chunk `transactions-CpWNcXvd.js` `addDoc(users/{uid}/transactions, {userId, amount:-1, description, type:'usage', timestamp: serverTimestamp()})` (failure only logged). | decrease-only; transaction create `usage` -1 |
| `dS`+`P8` save version (847545/846837) | Storage upload `user_uploads/{uid}/sketches/{Date.now()}.png` (PNG conversion; jpg fallback) with `contentDisposition: attachment; filename="bible-sketch.png"`; `addDoc(sketches, {userId, imageUrl, storagePath, thumbnailPath: {base}_400x533.{ext}, isPublic:false, blessCount:0, createdAt, isBookmark:false, type:'scene', promptData:{book, chapter, start_verse, [end_verse], aspect_ratio:'3:4', age_group, art_style}})`. Verse Art sketches are re-saved as `type:'scene'` without `font_style`. Thumbnail is expected from a resize extension, not created by the client. | create: owner, blessCount 0 |

### Callable
- `generateContent` via `Xc` (timeout 540 s) from `T_`: `{model: 'gemini-3-pro-image-preview' (Fc.ARTIST), contents:{parts:[{text: edit prompt with user instruction + canvas rules + negative prompt D2}, {inlineData:{mimeType, data}}]}, config:{responseModalities:[IMAGE], imageConfig:{imageSize:'2K', aspectRatio:'3:4'}, safetySettings:[HATE_SPEECH BLOCK_MEDIUM_AND_ABOVE]}}`. Result image -> `V8` (threshold to pure B/W at luma 160) -> data URL.

### External / storage
- Share popups: facebook.com sharer, pinterest.com pin/create (above).
- `localStorage.blessedSketches`: JSON array of sketch ids (read in QP/Aq/home, written on bless). No sessionStorage or cookies in these pages.
- Server functions read with Admin SDK: gallery (`isPublic==true orderBy createdAt desc limit 50`), tag (`isPublic==true, tags array-contains, orderBy createdAt desc limit 50`, fallback without tag filter), profile (`users/{uid}` + `userId==uid, isPublic==true limit 50`).

## 6. Tracking

None in these pages: no `zaraz.track`/`zaraz.ecommerce`, no Pinterest tag events. The only "Pinterest" code is the share popup. (Global Pinterest `epik` capture `Qte` runs in `ene` on app start; mapped elsewhere.)

## 7. Known bugs and oddities

1. **Gallery AI edit always fails and costs 1 credit** (ROADMAP 1.1): `T_` receives `preview || sketch.imageUrl`, a Storage URL; the `data:` regex does not match, so the URL string is sent as base64 `inlineData` with `image/png`. The credit is deducted before the call, with no refund. Consequently "Save New Version" is dead code in practice. Same in old GalleryModal.tsx:239-262.
2. **Logged-out bless on `/gallery` is fake**: QP has no auth gate, `Ip` does an unauthenticated increment that rules deny; the UI and `localStorage` still show it as blessed. Aq gates it.
3. **Downloads/prints charge owners** (no `isOwner` check in `Wt`/`bn`), and the counter is hidden for owners.
4. **Download/print pixel path is broken by Storage CORS** (ROADMAP 1.1 Storage CORS): `yO` loads with `crossOrigin='anonymous'`; the bucket sends no CORS headers, so it falls back to the raw URL. Download then relies on the object's `Content-Disposition` (set only for files uploaded via `P8`); `download=` is ignored cross-origin. Print still works via `<img src=url>`. The download is deducted regardless.
5. **Filter bar disappears on empty results** (`j.length > 0 && !X && !D`): a community filter (or `?tag=` URL) with zero hits leaves no way to clear it except switching tabs (and `?tag=` is re-applied from the URL by the sync effect).
6. **Race on `?tag=` load**: the mount effect that resets filters sets tag to All, the URL-sync effect sets it back; the un-cancelled load effect fires for tag, All, tag. Whichever response lands last wins, so `/gallery?tag=easter` can briefly or permanently show unfiltered results. (PLAUSIBLE, from effect order; not observed.)
7. **`mm` pagination stops early**: it fetches 60 and reports `hasMore` only if > 50 survive client filtering. When the client-side filters (second filter, bookmarks) drop enough docs, `hasMore` is false even if more matches exist beyond 60. The cursor is the 50th surviving doc, so filtered-out docs between it and the 60th are re-read next page (harmless).
8. **Initial tab depends on auth timing** (community on hard load, my on client nav). Tab is not in the URL.
9. `Pinterest` description builder `tq` destructures `t.promptData` unguarded: a public sketch without `promptData` throws on Pinterest share (and `Gr` is also used for Facebook: `XP` would throw too).
10. Tag page description phrase uses `for ${age.toLowerCase()}s`: "for young childs", "for teens", "for adults", "for toddlers".
11. Tag subtitle count is the loaded count (max 50 per page), not the total.
12. Aq rewrites the query string on mount with `replace`, stripping `utm_*`/`fbclid` before any later reader. QP `?tag` changes push history and also drop other params.
13. Gallery card image alt is `Gallery Item {index}`; modal/author name fallbacks inconsistent ("User", "Bible Sketch User", "Artist", "Unknown Artist").
14. Duplicate head tags after hydration (server tags lack `data-rh`); twitter:card summary (server) vs summary_large_image (client) on gallery and tags; client titles differ from server on tags.
15. Home JSON-LD `SearchAction` targets `/gallery?search=` which does nothing.
16. `sg` makes one `users/{uid}` read per card (up to 50+ per page, uncached); `lo` one Storage `getDownloadURL` per card.
17. My Gallery / Saved / profile queries have no limit: cost grows with the user's library; Saved reads every sketch the user owns.
18. Bookmarks count as "owner" in the modal: Refine Creation (paid edit of someone else's image) is offered on bookmarks, the watermark is hidden, and "Save to Collection" is hidden (only "Remove Bookmark").
19. Modal a11y: no Escape/backdrop close, no dialog role, no focus management; tabs/back/pagination are buttons, author links are buttons inside `<a>` (nested interactive content).
20. Save New Version re-types Verse Art as `type:'scene'` and drops `font_style`.
21. Console noise in production: `[ProfileSEO]` on every render, `[ArtistBadge]` per card, bookmark payload dump, `LazyImage:resolve` timers.

## 8. Rebuild notes

**Server-rendered (Astro page, no JS needed for content):**
- `/tags/[tagId]`: validate against the 15 tags (404 otherwise), Firestore REST `runQuery` on `sketches` (`tags array-contains`, `isPublic == true`, `orderBy createdAt desc`, limit 60, drop bookmarks) — reuse `web/src/lib/firestore.ts` `query()` and `web/src/lib/sketch.ts` (`canonicalPath`, `thumbUrl`, `reference`, `ageDisplay`, `TAG_LABELS`, `jsonLd`). Support `?book/age/style/sort` server-side (they are just query filters/sort) and render real `<a href>` cards with the precomputed `_400x533` thumbnail URL (no per-card `getDownloadURL`). Decide the canonical for filtered URLs (recommend: self-canonical only for the unfiltered page, filtered = canonical to `/tags/{id}` or noindex). Keep `noindex` when empty. One title (pick the client's richer one or the server's; S7 says one title per page). Keep BreadcrumbList.
- `/profile/[uid]`: `users/{uid}` + public sketches (paginate rather than unlimited), ProfilePage JSON-LD (single shape), 404 / noindex rules as in `profileRender`, H1 unified. Author names in cards resolved server-side in one batch (`users` docs are `get`-only, not listable: needs one `getDoc` per distinct author, cacheable).
- `/gallery` community view: server render the first page (newest 50, or popular) with real links and an H1; filters as query params (`?tag`, `?book`, `?age`, `?style`, `?sort`, `?page` or cursor) so they are shareable and crawlable; "Load More" can be a plain `<a href="?after=...">` progressively enhanced.

**Islands (client-only):**
- Tabs My Gallery / Saved need auth (client SDK, owner-only reads). Make them separate URLs (e.g. `/gallery?tab=my`) or an island that mounts after `auth.authStateReady()`.
- Bless button (auth-gated via the shared requireAuth store; fix #2), share buttons (can be plain `<a target=_blank>` to the sharer URLs — no JS needed), author link as `<a href="/profile/{uid}">`.
- Gallery modal: only needed for private sketches and bookmarks; public items already link to `/coloring-page/...` (where `SketchActions.tsx` lives). Consider dropping the modal and routing owners to the sketch page with owner controls (the sketch page reads private docs client-side for the owner). Print/Download/AI edit/tags/visibility/delete become the same island as the sketch page.
- Credit/download charging: follow ROADMAP 1.1 (server-side charge + refund, no owner download charge, fix edit to send bytes after bucket CORS). Do not add server charging while the live bundle still charges.

**Data needed at request time:** tag list (static), sketches query per filter, user docs for profile header and card authors, thumbnail paths (derive `{base}_400x533.{ext}` like `thumbPathOf`). Blessed state is per-user: render counts server-side, hydrate "blessed" from `localStorage` + `users/{uid}.blessedSketchIds` in the island.

**Caching / purge:** listings change on every public sketch write; `onSketchWritten` purges `related:<id>` tags (commit 8e37d5a). Gallery, tag and profile pages need matching cache tags (e.g. `gallery`, `tag:<id>`, `profile:<uid>`) or a short TTL.

**Risks:** Firestore REST from the Worker has no composite-query fallback — every filter combo needs an index (current set covers single filters only; server-side two-filter combos such as tag+book would need new indexes, so either keep the "one indexed filter + client filter" approach from `mm` or add indexes on `seo-fixes` first). URLs must stay identical (`/gallery?tag=`, `/tags/{id}`, `/profile/{uid}` are in the sitemap: 15 tags + 16 profiles per ROADMAP). Keep `isPublic`/bookmark filtering identical so no private or bookmark doc leaks into a server-rendered list (Admin/REST reads bypass rules if a service account is used).

## Open questions
- Should `/gallery` default sort be newest (current client) or popular (server crawler list, tag pages, home)?
- Canonical/indexing policy for filtered tag and gallery URLs.
- Keep the modal for private sketches and bookmarks, or move owner actions to the sketch page?
- Should the Saved tab keep bookmark copies (denormalized `imageUrl`/`promptData` that go stale when the original is deleted or made private) or store only ids?
