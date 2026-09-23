# Bundle map: the blog (`/blog`, `/blog/:slug`)

Source of truth: `hosting-public/assets/index-DHKtGwi1.js` (offsets below are character offsets into the UTF-8 string) and `hosting-public/assets/index-B89PR4wM.css`. Server side: `functions/index.js`, `functions/blog-posts.json`, `firebase.json`.

**Not in the old source at all.** `App.tsx`, `components/` and `services/` have no blog, and root `package.json` has no `react-markdown` or `front-matter`. The original `content/blog/*.md` files are lost too. Their full text survives in two places, which agree: the bundle (raw markdown strings with YAML front matter) and `functions/blog-posts.json` (the same bodies; 5 of 6 differ only in CRLF/trailing whitespace).

Live checks (headless Chrome, 2026-09-22, TZ America/Toronto, read only) are marked **[live]**.

---

## 0. Minified name index

| Name | Offset | What it is |
|---|---|---|
| `VY` `GY` `HY` `YY` `KY` `ZY` | 1106562, 1112882, 1121249, 1127938, 1135578, 1142337 | Raw markdown of the 6 posts (template literals, CRLF except `HY`), wrapped as ES modules `zY` `$Y` `qY` `WY` `XY` `QY` |
| `_W` / `SW` | 1194192 / 1195123 | `front-matter` package (js-yaml `safeLoad`) |
| `wW` → `I_` | 1195150 | `import.meta.glob('/content/blog/*.md', {query:'?raw'})` result, keyed `/content/blog/<file>.md` |
| `vW` | 1195597 | slug from filename: strip `.md`, lowercase, `[^a-z0-9]+`→`-`, trim `-` |
| `TW` | 1195689 | reading time = `max(1, ceil(words/200))` (whitespace split of the body, shortcodes included) |
| `oj` | 1195770 | loader: parse all posts, skip missing `title`/`date`, skip `draft: true`, sort by `date` desc. Very verbose `console.log`s |
| `AW` | 1197114 | `slug => oj().find(p => p.slug === slug)` |
| `iD` | 1197151 | page size `12` |
| `NW` | 1197151 | `/blog` listing page |
| `Yte` | 1988115 | post `<head>` (Helmet), memoised on slug |
| `Wte` | 1990153 | `<<sketch>>` embed card |
| `Kte` | 1994870 | `<<CTA>>` sign-up card |
| `Xte` | 1996054 | `/blog/:slug` post page |
| `PQ` | 1316866 | `react-markdown` |
| `Kee` | 1357224 | `remark-gfm` (tables etc.) |
| `TU` / `qte` | 1975707 / 1975753 | `react-syntax-highlighter` (Prism) + One Dark theme; only for fenced code, which no post uses |
| `rj` | 1105476 | date-fns `format` |
| `wm` / `ca` | 208235 / – | react-router `useParams` / `useNavigate` |
| `Dt` | 263949 | `"https://biblesketch.app"` |
| `GP` | 856100 | `getSketchById`: `getDoc(sketches/{id})` |
| `ol` | 844163 | `getUserProfile`: `getDoc(users/{uid})`, returns null on error |
| `Wc` | 849217 | `getBlessedIds`: `users/{uid}.blessedSketchIds` |
| `hS` | 855898 | `isBookmarked`: `getDoc(sketches/bookmark_{uid}_{id}).exists()` |
| `Ip` | 848646 | `blessSketch` (transaction) |
| `pS` | 854854 | `toggleBookmark` |
| `Mc` / `ep` / `Kc` | 859797 | book display (`Psalms`→`Psalm`, `Proverbs`→`Proverb`) / sketch slug / sketch URL (`#` if not public) |
| `lo` | 904756 | `LazyImage` (thumbnail via Storage `getDownloadURL`) |

## 1. Routes and URL behaviour

Client routes (`ene`, routes at 2020694):
- `<Route path="/blog" element={<NW/>}/>`: no props, so the listing has no auth access.
- `<Route path="/blog/:slug" element={<Xte user={n} onRequireAuth={Y}/>}/>`. `Y = O => X(O, "login")` (2016856), so the view is always forced to `"login"`.
- There is no `*` route. `/blog/a/b` matches nothing, so the client renders the header and footer around an empty body.

Hosting (`firebase.json:71-78`): `/blog` → `blogListingRender`, `/blog/**` → `blogRender`.

Server behaviour:
- Both call `redirectToCanonical(req,res)` (`functions/index.js:570`) with no canonical path. It 301s the `web.app`/`firebaseapp.com` hosts to `biblesketch.app` and collapses trailing or double slashes (`/blog/` → `/blog`, `/blog/x/` → `/blog/x`), keeping the query string. The redirect is cached `max-age=300, s-maxage=3600`.
- `blogRender` (`:1345`): `slug = pathSegments[1]`. Extra segments are **ignored**: `/blog/<slug>/anything` returns a 200 with the full post and the post's canonical, while the client shows an empty page (oddity 7.9).
- Unknown slug, or a post with no `title`: `sendShell(res, 404, true)` (`:554`) returns the SPA shell, 404, `X-Robots-Tag: noindex`, `s-maxage=3600`. The client then renders "Post Not Found" (below).
- A missing `blog-posts.json` gives 503 on posts. On the listing it gives an empty list with 200.
- Slug matching is exact and case-sensitive on both sides. Client slugs come from filenames (`vW`), server slugs from `blog-posts.json.slug`; they are the same 6 strings today.
- Query params: none are read. No pagination param: "Load More" is state only (see §4).
- Canonical: `https://biblesketch.app/blog` and `https://biblesketch.app/blog/<slug>`, on both server and client.

Internal navigation into the blog: header desktop nav "Blog" button (257174) and mobile menu "Blog" (262852), both `onNavigate("blog")` → `navigate("/blog")` (2018874). `currentView` is `"blog"` for any path that starts with `/blog` (2018608). The About page has a "Read Blog" button (2012642). The SSR fallbacks of other render functions link `<a href="/blog">Read Blog</a>` (`functions/index.js:629, 1636, 1811, 2002, 2602`). All client entries are `<button onClick>`, not `<a>`.

Sitemap (`functions/index.js:409-430`): group `blog` holds `/blog` (lastmod = newest post `lastmod`) and each `/blog/<slug>` with `lastmod` and an `image:image` of `SITE + coverImage`, read from `blog-posts.json`.

## 2. `<head>`

### `/blog`

| | Server `blogListingRender` (`:2122`) | Client `NW` Helmet (1197151) |
|---|---|---|
| title | `Blog - Bible Sketch` | `Blog - Bible Sketch` |
| description | "Latest updates, tutorials, and news from Bible Sketch." | same |
| canonical | `/blog` | `/blog` |
| og | title, description, `og:type=website`, url, site_name, `og:image=/logo.png` | og:title, og:description, og:url only |
| twitter | `summary`, title, description, image `/logo.png` | none |
| JSON-LD | none | none |
| robots | template `max-image-preview:large` | – |

Server tags have no `data-rh`, so Helmet adds its own next to them. **[live]**: 2 canonicals and 2 `meta[name=description]` (identical values). The listing has no `Blog`/`ItemList` JSON-LD.

### `/blog/:slug`

| | Server `blogRender` (`:1391-1446`) | Client `Yte` (1988115) |
|---|---|---|
| title | `${title} - Bible Sketch Blog` | same |
| description | `excerpt` | same |
| canonical | `/blog/<slug>` | same |
| og | title, description, image (`SITE+coverImage` or `/logo.png`), `type=article`, url, site_name, `locale=en_US`, `article:published_time=date`, `article:author` (defaults to "Bible Sketch Team") | same, plus `og:image:alt`, `og:image:width=1200`, `og:image:height=630`, `og:image:type` (from the extension); `article:author` only if front matter has an author |
| twitter | `summary_large_image`, title, description, image | same, plus `twitter:url` |
| BlogPosting | carries `data-rh="true"`, so Helmet replaces it. `dateModified = lastmod` (ISO), `image` has no width/height | `dateModified = date` (not lastmod), `image` has width 1200 and height 630 |
| BreadcrumbList | Home › Blog › title, no `data-rh`, so it survives hydration | none |

Mismatches: `dateModified` (lastmod vs date; equal today apart from the format), image dimensions, the extra og tags, and duplicate description/canonical/og after hydration (**[live]**: 2 canonicals, 2 descriptions; JSON-LD is BreadcrumbList plus one BlogPosting). The declared 1200×630 is wrong for every cover (see §3).

## 3. Page structure

### `/blog` (NW)
- Wrapper `min-h-screen bg-[#FFF7ED]` > `main.max-w-7xl.mx-auto.px-4.py-12`.
- `h1` "Blog" (serif, centred).
- With 0 posts: "No blog posts yet. Check back soon!".
- "Showing {shown} of {total} posts".
- Grid of 1, 2 or 3 columns. Each card is an `<article onClick={() => navigate('/blog/'+slug)}>` (**no `<a>`**), containing:
  - A cover `<img>` (`aspect-[2/1] object-cover`, `loading=lazy`, hidden on error).
  - The date line `MMMM d, yyyy · N min read`, purple.
  - An `h2` title (`line-clamp-2`).
  - The excerpt (`line-clamp-2`).
  - "By {author}".
- Order: `date` desc. Ties (4 posts on 2025-12-10) keep glob order, which is alphabetical by filename; the server's stable sort of the JSON order gives the same result.

Server SSR body (`:2170-2200`): `<h1>blog</h1>` (lowercase) plus one `<h2><a href=…>title</a></h2>` per post, then an inline script that runs `root.innerHTML=''` immediately. Users never see it. It is crawlable HTML with real links.

### `/blog/:slug` (Xte)
Order inside `article.max-w-3xl.mx-auto.px-4.py-12`:
1. `<button>` "← Back to all posts" → `navigate('/blog')`.
2. Cover `<img src={coverImage} alt={title}>`, full width, `md:-mx-8`, hidden on error. No width, height or priority.
3. `header`: `h1` title (serif, 4xl/5xl), then a meta row: author · `<time dateTime=date>` (parsed as a local date, so it shows correctly) · "N min read".
4. `div.prose-blog.prose.prose-sm.md:prose-lg`: `react-markdown` + `remark-gfm` with component overrides:
   - `img`: `src==="sketch-placeholder"` with `alt` of the form `sketch:<id>` renders a `Wte` card; any other image goes in a `div.my-8` with `max-w-[1000px]` (no post uses markdown images).
   - `a`: real `<a href>`, purple. **Every `http*` link gets `target=_blank rel=noopener noreferrer`, including `https://biblesketch.app/...` links.** Relative links (`/pricing`) open in the same tab, with a full reload (no router Link).
   - `table`: wrapped in `overflow-x-auto`; `thead` `bg-purple-50`; `th` purple; zebra `tr`.
   - `blockquote`: purple left border, italic.
   - `code`: fenced blocks with a language go through Prism One Dark (unused).
   - `p`: if its flattened text is exactly `[CTA_PLACEHOLDER]` it renders `Kte`, otherwise a `<p>`.
5. Share row "Share:" with Twitter, Facebook and Copy Link buttons (§4).

No related posts, no prev/next, no author box, no breadcrumbs UI, no tags, no RSS.

"Post Not Found" branch (unknown slug): `h1` "Post Not Found", "The blog post you're looking for doesn't exist.", and a `<button>` "← Back to Blog". No Helmet, so the head stays whatever the previous route or the server set.

Server SSR body (`:1565-1576`): `<article>` with an inline-styled `h1`, "By {author} · {YYYY-MM-DD}", a cover `<img width=1200 height=630 fetchpriority=high>`, and the body converted by `markdownToHtml` (`:94-215`). Hydration replaces it: `createRoot` clears the root, and there is no removal script here.

Shortcodes, server side:
- Before conversion, `<<sketch="id">>` becomes `<figure><a href="/coloring-page/<slug>/<id>"><img src=<tokened thumb URL> alt="<Book> <c>:<v>[-<v2>] Coloring Page" width=400 height=533 loading=lazy></a></figure>`.
  - `<Book>` is the raw book name, e.g. `Psalms`; the client shows `Psalm`.
  - Sketches that are missing, private or bookmarks are dropped.
- `<<CTA>>` is removed.
- `---` rules are removed.

Styles: `.prose-blog` in `index-B89PR4wM.css`:
- Body text 18px, 21px from `md`, line-height 1.8, colour `#1f2937`.
- `h2` 28px/32px with `margin-top:48px`; `h3` 22px/24px.
- `p` and lists `margin-bottom:28px`.
- `a`: `#7c3aed`, underlined.
- `hr`: 1px `#E5E7EB`, `48px` margin.
- `img`: 8px radius, 28px vertical margin (this also hits the embed thumbnails).

Tailwind Typography `prose` is also present.

Cover images (`hosting-public/blog-images/`, live; `public/blog-images/christian-christmas-coloring-pages.webp` **differs** from the live one, so use `hosting-public`):

| file | size | px |
|---|---|---|
| BibleSketch.webp | 242 KB | 1200×713 |
| christian-christmas-coloring-pages.webp | 102 KB | 1280×676 |
| genesis-1-coloring-pages-toddlers.webp | 157 KB | 1280×676 |
| joshua-1-9-coloring-page-free.webp | 135 KB | 1280×633 |
| joshua-jericho-coloring-pages.webp | 170 KB | 1280×676 |
| printable-christian-christmas-coloring-pages-toddlers.webp | 230 KB | 1280×714 |

### The posts

Front matter fields: `title`, `date` (`YYYY-MM-DD` string), `excerpt`, `author`, `coverImage`, `draft: false`. The loader requires `title` and `date`. `blog-posts.json` adds `slug`, `lastmod` (ISO), and `body` (markdown without the front matter).

All 30 embedded sketches were checked **[live, Firestore REST read]**: they exist, `isPublic: true`, and have a thumbnail.

| slug | title | date | author | min | CTA | embedded sketch IDs (ref, audience/style) |
|---|---|---|---|---|---|---|
| `joshua-1-9-coloring-page-free` | 4 Unique & Free Joshua 1:9 Coloring Pages for Courage & Faith | 2025-12-12 | Renaud Gagne | 6 | **none** | WrFh8ilVdsYQzrxmChsO (verse, Elegant Script), fefjDXrTcYCb1xGzR1SY (Classic Serif), 5SISdcUP4jxzkCc7qUXw (Modern Brush), JIwO1fT6iq0Si6JWTi0h (Playful); all Joshua 1:9 |
| `5-printable-christian-christmas-coloring-pages-for-toddlers` | 5 Printable Christian Christmas Coloring Pages For Toddlers | 2025-12-11 | Renaud Gagne | 7 | 1 (after §6) | fK5Dm0ytIEtNINJGRmdF Luke 1:26-28, T6jEiU59OGduqvhi1xmQ Luke 1:39-45, rs3PsOPDY0Lqfmx2WxnE Luke 2:1-5, 5SmkRrFWxphgKqAjnPfR Luke 2:6-7, nPjrtOj26SdOzMW9R0nv Luke 2:8-14 (all Toddler / Sunday School) |
| `5-genesis-1-coloring-pages-for-toddlers` | 5 Free Printable Genesis 1 Coloring Pages For Toddlers (Creation Story) | 2025-12-10 | Renaud Gagne | 5 | 1 (last line) | x3frk4gMzKA4XyUq6rFU Gen 1:1-2, DbZ9PRyfCbwlWoeFMPqe 1:3-5, JGwbesQv0C6ZOvkTOSeF 1:9-10, 1KUlc6Cge2E485IgEE75 1:11-13, BvOApfUMQjLsY6dcwPCN 1:20-22 (Toddler / Sunday School); links `/tags/creation` |
| `bible-coloring-pages` | Free Printable Bible Coloring Pages: The Bible Sketch Guide | 2025-12-10 | Bible Sketch Team | 5 | 1 (last line) | qXyvSvE2VwB5PT9nrEeD Esther 2:17 (Young Child / Stained Glass), gts06GvvQyiXOQqK9PQ1 Psalms 23:1 (verse, Elegant Script); only LF file; has pricing tables |
| `christian-christmas-coloring-pages` | 7 Favorite Printable Christian Christmas Coloring Pages | 2025-12-10 | Renaud Gagne | 6 | 1 (after §7) | RZa9lDfB24WNwJBoTLwF Isaiah 7:14, 2mdV5JsemQTco3Crpfks Luke 2:1-5, GluBh4EOvYCeyBGpR875 Luke 2:6-7, K3QlKF0VcmCQpYH4k4u9 Luke 2:8-9, 7G3VjHwnh2cwQbtkLtwR Luke 2:10, dmZFyihbQ1Aj9PU3ZUXr Matthew 2:9 (**6** sketches for "7") |
| `joshua-jericho-coloring-pages` | 8 Free Printable Joshua and Jericho Coloring Page | 2025-12-10 | Renaud Gagne | 8 | 1 (after §9) | jrYwxjNzEfoRdehCuBIR, PhXU9ErGw0WDrR6EuDtu, KLCHIxBz1J4C5mYKLL86, hNyiI9XnlJYSOWFtRHDi (Joshua 6:4), caTpviqF9QrCVTEZ1TxO, Q4Cr67Nza8M59P1xI76y, LA5RYLFfsTbrM1yIed2H, n2RJQ2uux9e4Tr6YkTzN (Joshua 6:20) |

Common post pattern: "Key Takeaways" list, then numbered `##` sections each followed by one `<<sketch>>`, then "Create Your Own…", `<<CTA>>`, a "Which Sketch is Right for Your Family?" table, and a "Frequently Asked Questions" section with `###` questions. The only shortcodes are `<<sketch="ID">>` and `<<CTA>>`; there is no other `<<…>>`.

## 4. Interactive behaviour

**Listing (NW).** `oj()` runs in the render body (not memoised). `useEffect(() => setShown(all.slice(0, page*12)), [page, all])`, and "Load More ({remaining} remaining)" is shown only when `page < ceil(total/12)`, so it is hidden with 6 posts. Cover `onError` hides the image. There is no loading state: the posts are bundled.

**Post (Xte).**
- The shortcodes are rewritten before markdown parsing:
  - `<<sketch="X">>` becomes `![sketch:X](sketch-placeholder)`.
  - `<<CTA>>` becomes `\n\n[CTA_PLACEHOLDER]\n\n`.
- Share buttons:
  - twitter: `window.open('https://twitter.com/intent/tweet?text=' + enc(title + ' - Bible Sketch') + '&url=' + enc(url), '_blank', 'width=600,height=400')`.
  - facebook: `https://www.facebook.com/sharer/sharer.php?u=…` in the same kind of popup.
  - copy: `navigator.clipboard.writeText(url)` then `alert("Link copied to clipboard!")`, with no error handling.

**Embed card `Wte`** (one per `<<sketch>>`, each fully independent):
- Load: spinner (`Hs` Loader2) inside a white box.
  - `GP(id)` reads the sketch doc.
  - If the sketch has a `userId`, the author's name is either the current user's `displayName` (own sketch) or `ol(userId)` → `users/{uid}.displayName`.
- Errors:
  - `permission-denied`: "This sketch is private or restricted."
  - missing doc: "Sketch not found".
  - anything else: "Failed to load sketch" (red box).
  - Loaded but `!isPublic`: "This sketch is private and cannot be displayed."
- Layout: one column on mobile, `md:grid-cols-[1fr_1fr]`.
  - Left: `LazyImage` (`imageUrl`, `thumbnailPath`, `storagePath`, `objectFit=cover`, `aspectRatio=""`, alt = the ref, or "Bible coloring page").
  - Right: the ref (`Mc(book) c:v[-v2]`, purple, bold), "By {name}", and 3 full-width buttons:
- **Bless** (heart `qo` + count), disabled once blessed.
  - Logged in: optimistic `+1`, then `Ip(id, uid)`; on error it rolls back.
  - Logged out: `onRequireAuth(R)`, which opens the auth modal on the **login** view.
- **Save / Saved** (bookmark `jd`; a spinner while working): `pS(uid, sketch)` toggles; on error `alert("Failed to save to collection.")`. The auth gate is the same as Bless.
- **View Full Page** → `navigate('/coloring-page/<ep>/<id>')`, a `<button>` rather than a link.
- When a user is present: `Wc(uid)` marks the card blessed if its id is in `blessedSketchIds`, and `hS(uid, id)` sets the saved state.

**CTA `Kte`**: a purple gradient box with `h3` "Create Free Account", "Get **5 Free Credits** + High-Res Prints", and a pulsing yellow button "Sign Up Free". It calls `onRequireAuth(() => {}, "signup")`, but `Y` drops the second argument, so **the modal opens on Log In, not Sign Up**. For a logged-in user `X` runs the no-op immediately, so the button does nothing. The CTA is shown to everyone.

**requireAuth (`X`, 2016856)**:
```js
X = (fn, view = "login") => { user && userDocLoaded ? fn() : (queue(() => fn), setView(view), openAuthModal()) }
```
An effect in `ene` runs the queued fn once `user && userDocLoaded`.

## 5. Backend contract

Posts: bundled at build time (Vite glob of `/content/blog/*.md` as raw strings). No Firestore, no fetch. The server uses its own copy, `functions/blog-posts.json`, and **nothing keeps the two in sync** (no generator script in the repo).

Firestore (client, `Wte`), per embed:
- `getDoc(sketches/{id})`. Rules allow it when `isPublic == true` (`firestore.rules:86`).
- `getDoc(users/{userId})` for the author name. `users` has `allow get: if true` (`firestore.rules:31`).
- Logged in only: `getDoc(users/{me})` (`Wc`, repeated per embed) and `getDoc(sketches/bookmark_{me}_{id})` (`hS`).
- Bless `Ip`: `runTransaction`. It reads `users/{me}`. If `blessedSketchIds` already contains the id it throws `ALREADY_BLESSED`, which is swallowed. Otherwise it does `update(sketches/{id}, {blessCount: increment(1)})` and `update(users/{me}, {blessedSketchIds: arrayUnion(id)})`. With no user doc it increments `blessCount` only.
- Save `pS`: if `sketches/bookmark_{me}_{origId}` exists, it is deleted (unsave). Otherwise `setDoc` with `{userId, isBookmark: true, isPublic: false, createdAt: serverTimestamp(), blessCount: 0, originalSketchId, originalOwnerId, promptData, imageUrl, storagePath, thumbnailPath}`. It logs the payload to the console.

Anonymous auth: when no user, `ene` calls `A8()` → `signInAnonymously` unless `localStorage.anon_auth_disabled === "true"` (842697). The page otherwise needs no auth.

Storage: `LazyImage` calls `getDownloadURL(ref(thumbnailPath))`. With no `thumbnailPath` it tries `<storagePath dir>/<name>_400x533.<ext>`, then falls back to `imageUrl`.

Server (`blogRender`, `:1476-1560`):
- Admin `get()` of each unique embedded id (`extractSketchIds`, `:65`). A sketch is kept only if `isPublic && !isBookmark`.
- `storageUrl(thumbPathOf(s), getThumbnailUrl(...))` (`:47-63`) reads the object metadata and builds the same tokened URL the client gets, so the browser downloads each thumbnail once.
- Slug: `generateSketchSlug` (`:19`).

External URLs: `twitter.com/intent/tweet`, `facebook.com/sharer/sharer.php`. No Gemini, bible-api, or Zoho on blog pages.

Storage APIs: clipboard only. No local/sessionStorage of its own (only the global `anon_auth_disabled` read).

## 6. Tracking

None in `NW`, `Xte`, `Wte`, `Kte` or `Yte`: no `zaraz.track`, `zaraz.ecommerce` or `pintrk` in 1195000-1200000 or 1988000-2002000. Share clicks, CTA clicks, bless and save are not tracked. Page views come only from Zaraz's own auto page-view (outside the bundle).

## 7. Known bugs and oddities

1. **Infinite render loop on `/blog`** **[live]**. `oj()` returns a new array every render; the effect depends on it and calls `setState(newArray)`, which re-renders, and so on. There were ~1,988 full re-parses of all 6 posts in 3 s (3,660 in 6 s), each with ~15 `console.log`s. That burns CPU and battery for as long as the tab is open.
2. **Listing dates one day early in the Americas** **[live]**. `new Date("2025-12-12")` is parsed as UTC midnight, so Toronto shows "December 11, 2025" (the post page parses the date locally and is correct).
3. **CTA opens Log In, not Sign Up**, because `Y` drops the view argument. For logged-in users it is a dead button.
4. **Queued Bless/Save do nothing after login**. `R` closes over `user = null` from the click-time render, and the queued call's `if (e?.uid)` fails. The user logs in and nothing happens.
5. Duplicate `<link rel=canonical>`, `meta description` and og tags after hydration (server tags lack `data-rh`) **[live]**.
6. Declared `og:image:width/height` 1200×630 and JSON-LD 1200×630 are wrong for all 6 covers (1200×713, 1280×633-714). The server `<img width=1200 height=630>` has the wrong aspect ratio too.
7. Server `markdownToHtml` table regex needs LF. The 5 CRLF posts render their tables as raw `| … |` paragraphs in the SSR HTML (checked by running the function: 0 tables and 7, 8 or 10 pipe paragraphs). Only `bible-coloring-pages` (LF) gets `<table>`s.
8. Server strips `---` and `<<CTA>>`, and emits an `<h1>blog</h1>` (lowercase) on the listing. The SSR post date is the raw `YYYY-MM-DD`.
9. `/blog/<slug>/<anything>` returns a 200 with the full post from the server, while the client matches no route and shows an empty page.
10. Content:
    - "7 Favorite…" has 6 sketches.
    - "8 … Coloring Page" is singular.
    - `bible-coloring-pages` states Premium **$4.99/month** with 10 credits, plus Spark $4.99/20, Torch $14.99/80 and Beacon $29.99/200. ROADMAP phase 3 says the plan is $7. Check the prices against Zoho before porting.
    - The CTA promises "5 Free Credits". Many users never got a Welcome Bonus (ROADMAP 1.1, sign-up write race).
11. Absolute `https://biblesketch.app/...` links in posts open in a new tab (`target=_blank` for any `http*`).
12. Each embed re-reads `users/{me}` (`Wc`) and the author's `users/{uid}`, so 8 embeds cost about 8 + 8 + 8 + 8 reads for a logged-in user. `users/{uid}` is world-readable (`allow get: if true`), including `email`. Only `displayName` is needed here, so the rebuild should not depend on that rule.
13. `blog-posts.json` and the bundled markdown are two copies with no sync script. ROADMAP 1 phase 1 plans one MDX collection.
14. Cover `<img>` on the post page has no width, height or priority. It is the LCP element and causes CLS.

## 8. Rebuild notes

- **Fully static** (prerender at build): `/blog` and every post. There is no per-request data except the embeds.
  - Source: an Astro content collection from `functions/blog-posts.json` or re-extracted `.md`. Normalise to LF.
  - Keep the front matter fields. The slug is the filename, or the `slug` field, and must equal today's 6 slugs.
  - Keep `lastmod` for `dateModified` and the sitemap.
  - Retire `blogRender` and `blogListingRender`, and have the sitemap read the same collection (a JSON emitted at build, or keep `blog-posts.json` generated from the collection).
- **Shortcodes** become components:
  - `<SketchEmbed id>`: server-render the card from a Firestore REST read at build time (ref with `Mc`, author `displayName`, thumbnail URL, `/coloring-page/<slug>/<id>` as a real `<a>`). Only the Bless count/button and Save need a small island.
    - `blessCount` is live data: build-time HTML plus a client refresh, or render it at request time with edge caching and the `related:<id>` purge tag already used by the sketch pages.
    - If a sketch goes private, the build-time HTML would still show it. Either purge and rebuild on `onSketchWritten`, or render embeds at request time.
  - `<Cta>`: a real button that opens the auth modal on **signup** (fixes bug 3). Hide it or change it for logged-in users (needs the auth store, so it's an island, or render it for guests and hide it after `authStateReady`).
- Links: listing cards, "Back to all posts", "View Full Page" and the header "Blog" become `<a href>`. Internal markdown links should not get `target=_blank`.
- Head (single render, server): title, description, canonical, og (with real cover dimensions), twitter, one BlogPosting (`dateModified = lastmod`), BreadcrumbList. Consider an `ItemList`/`Blog` on `/blog`. No duplicates.
- Dates: format from the `YYYY-MM-DD` string at build time, with no timezone parsing (fixes bug 2). Reading time uses the same `TW` formula (6, 7, 5, 5, 6 and 8 min today).
- Pagination: 12 per page is irrelevant at 6 posts. Drop "Load More", or use real `/blog/page/2` links if the post count grows.
- Keep `.prose-blog` styles (§3) and `/blog-images/*` paths (from `hosting-public`, not `public/`). Add `width`/`height`/`fetchpriority=high` to the cover.
- 404: unknown slugs and extra segments should give a real 404 page with `noindex`.
- Share: keep the Twitter/Facebook/Copy buttons as a tiny island, or turn Twitter/Facebook into plain `<a target=_blank>` share URLs. Add tracking only if the owner wants it (none today).
- Bless/Save island: wait for `auth.authStateReady()` and re-read the current user when running a queued action (fixes bug 4). Reuse the sketch page's `SketchActions` island (`web/src/components/SketchActions.tsx`) if its API fits.
