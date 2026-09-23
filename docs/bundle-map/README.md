# Bundle map: live front end for the Astro rebuild

What production actually does, read from the minified bundle `hosting-public/assets/index-DHKtGwi1.js` (2,027,249 bytes). Offsets are character offsets into that file (UTF-8 read). The old root `App.tsx`, `components/` and `services/` are an older source; where they disagree, the bundle is right. Credit findings are in [ROADMAP.md 1.1](../../ROADMAP.md#11-credit-system-fix-in-the-rebuild-before-or-with-phase-4).

## Spec files

- [app-shell.md](app-shell.md): `ene` (2016039), ErrorBoundary, route table, header `a5`, footer, auth/profile/profile-completion/error modals, requireAuth `X`/`Y`, plan checkout `D`, auth pipeline, Pinterest `?epik` capture `Qte`.
- [data-layer.md](data-layer.md): every Firestore/Storage/callable/external call (service block ~839,650-878,000), minified SDK name key, rules cross-check, browser storage, all 7 `zaraz` calls.
- [scene-art.md](scene-art.md): `/` (`Iq` head + `iq` CreateTool), picker/options, Scene Art pipeline, result view `qP`, save, Community Favorites `aq`.
- [verse-art.md](verse-art.md): `/bible-verse-coloring` (`Oq` head, `Lq`), bible-api lookup, Verse Art pipeline with critic, community section `Rq`.
- [gallery-tags-profile.md](gallery-tags-profile.md): `/gallery` (`QP`), gallery modal `gS`, `/tags/:tagId` (`Aq`), `/profile/:uid` (`Jte` + `sq`), filter bar, bless/bookmark/owner actions.
- [pricing-billing.md](pricing-billing.md): `/pricing` (`fq`), Zoho checkout and return, upgrade modal `KP`, webhook contract.
- [static-pages.md](static-pages.md): `/about` (`AU`+`Zte`), `/privacy` (`hq`), `/terms` (`pq`), `/verified` (`Nq`).
- [blog.md](blog.md): `/blog` (`NW`), `/blog/:slug` (`Xte`), markdown sources, sketch embed `Wte`, CTA `Kte`.
- Coloring page (`_O`, `xt`, related carousel `mq` 1023378, JSON-LD `gq` 1026959): no spec here; ported in `web/` (see ROADMAP "Phase 0 result", `web/src/lib/sketch.ts`, `web/src/components/RelatedGrid.astro`).

## Routes

Client routes from the bundle route table (2019198-2020734). Server functions from `firebase.json` rewrites; line numbers are `functions/index.js`.

| Route | Client component | Spec | Server render function |
|---|---|---|---|
| `/` | `Iq` + `iq` | scene-art.md | `homeRender` :584 |
| `/bible-verse-coloring` | `Lq` | verse-art.md | `verseRender` :1739 |
| `/gallery` (`?tag=`) | `QP` | gallery-tags-profile.md | `galleryRender` :1591 |
| `/profile/:uid` | `Jte` → `QP` | gallery-tags-profile.md | `profileRender` :1158 |
| `/tags/:tagId` (`?book=&age=&style=&sort=`) | `Aq` | gallery-tags-profile.md | `tagRender` :1912 |
| `/pricing` (`?subscription=success`, `?purchase=<pack>`) | `fq` | pricing-billing.md | `pricingRender` :2223 |
| `/terms` | `pq` | static-pages.md | `termsRender` :2895 |
| `/privacy` | `hq` | static-pages.md | `privacyRender` :2650 |
| `/about` | `AU` + `Zte` | static-pages.md | `aboutRender` :2389 |
| `/verified` | `Nq` | static-pages.md | `verifiedRender` :3084 |
| `/coloring-page/:id`, `/coloring-page/:slug/:id` | `_O` | `web/` (Phase 0) | `sketchRender` :735 |
| `/blog` | `NW` | blog.md | `blogListingRender` :2122 |
| `/blog/:slug` | `Xte` | blog.md | `blogRender` :1345 |
| `/sitemap.xml` (`?type=`) | none | **none (gap 1)** | `sitemap` :451 |
| anything else | no `*` route (blank body) | app-shell.md | none: `**` → missing `/index.html` → `hosting-public/404.html` |

Other server entry points: `generateContent` :317 (data-layer.md), `handleZohoWebhook` :3177 (pricing-billing.md), `onUserCreated` :3407 / `onUserDeleted` :3429 (app-shell.md), `onSketchWritten` :3461 (Worker cache purge, ROADMAP 1).

## Gaps found by the critic

Sweep method: whole-bundle regex passes for `zaraz`/`pintrk`/`gtag`/`fbq`, `localStorage`/`sessionStorage`/`document.cookie`, `window.open`, `location.*`, `alert`/`confirm`, navigate calls and `to:` links, `path:` routes, `fetch`, `httpsCallable`, `collection`/`doc`/Storage `ref` aliases, dynamic `import()`, browser APIs; then every JSX-rendering definition in the app ranges (~250,000-290,000 constants/header, 839,000-1,106,000, 1,188,000-1,200,000, 1,988,000-2,027,249) checked against the names and offsets cited in the eight specs. All 7 zaraz calls, 13 localStorage calls, 5 `window.open`, 20 `alert`/`confirm`, 14 routes, 28 Firestore/Storage call sites, the one callable and all JSX components are covered by at least one spec, except as listed below.

1. **Sitemap is not mapped** (`functions/index.js:389-485`, `buildSitemapGroups` :415, `sitemap` :451). What it does: one scan of `sketches where isPublic==true` (select `userId,type,promptData,tags,createdAt,imageUrl,isBookmark`, bookmarks dropped). Sub-sitemaps: `pages` (`/`, `/gallery`, `/bible-verse-coloring`, `/about`, `/pricing`, no lastmod), `blog` (from `functions/blog-posts.json`), `tags` (a LITURGICAL tag is listed only if a public sketch carries it), `profiles` (only uids with ≥3 public sketches, `MIN_PROFILE_SKETCHES`), and one bucket per sketch: `{age}-{style}` (Pre-Teen → Teen), `verses-{font}`, else `sketches-other`, each with `image:image`. `/terms`, `/privacy`, `/verified` are left out on purpose. Unknown `?type` → 404; `Cache-Control: public, max-age=3600, s-maxage=3600`; 50k URL cap per group, no paging. blog.md cites `:409-430`, which is now stale (the code moved after the seo-fixes merge). **Owner: data-layer.md** (or a new server/SEO spec). The rebuild has to keep these URLs stable or move the sitemap into the Worker.
2. **Unused syntax highlighter plus markdown stack in the entry chunk.** Prism via `react-syntax-highlighter` (`TU`/`qte` 1,975,707) with about 297 language grammars (`displayName=` entries, ~1,380,000-1,975,000, about 600 KB), plus react-markdown/remark-gfm/micromark (~1,199,000-1,380,000). All of it ships in the one 2 MB bundle that every route loads. No post uses fenced code. blog.md says the highlighter is unused but not what it weighs. **Owner: blog.md §8.** Render markdown at build time and ship no client markdown JS.
3. **Static public files are not inventoried.** `hosting-public/robots.txt` (`Allow: /` + `Sitemap:`), `ai.txt`, `manifest.json` (name "Bible Sketch Platform", `theme_color`/`background_color` `#FFF7ED`, `start_url` https://biblesketch.app, 192/512 icons), favicons + `apple-touch-icon.png`, self-hosted fonts (`/fonts/`: Inter v20 in 7 subsets, Quicksand v37 in 3; only `quicksand-v37-latin.woff2` is preloaded), `logo.png`/`logo.webp`, `og.png` (5.87 MB), `about-Renaud.webp`, `blog-images/`, `references/` (Gemini style references, fetched at runtime by the pipelines). app-shell.md lists the head links but not the files. **Owner: app-shell.md.** Every file must exist at the same path in `web/public` (or be served by the Worker) before routes move.
4. **HTTP headers are not consolidated.** `firebase.json` only sets `Cache-Control` (`public, max-age=31536000, immutable` for `/assets/**`, all js/css, images and fonts, **including `/references/*.jpg` and `/og.png`**, so a changed reference image needs a new filename; `no-store` for `404.html`). There is no CSP, HSTS, `X-Frame-Options`, `Referrer-Policy` or `Permissions-Policy` anywhere. Each render function sets its own `Cache-Control`/`X-Robots-Tag`, and those are spread across the page specs. Several specs list "firebase.json headers not reviewed". **Owner: app-shell.md** (one table: route → Cache-Control, X-Robots-Tag, status).
5. **The privacy policy describes tracking the bundle does not contain.** `hq` §3 (1,000,578-1,003,356) names Google Analytics 4, Facebook Pixel and the Pinterest Tag, with opt-out links, and §3.4/§7.5 describe managing cookies and opting out of tracking. The bundle has no `gtag`/`fbq`/`pintrk`, the Firebase config has no `measurementId`, and there is no consent UI or `zaraz.consent`/`zaraz.set` call. Whatever runs comes from the Zaraz dashboard, which the bundle doesn't show. static-pages.md transcribes the copy but doesn't flag the mismatch; data-layer.md §6 lists the calls but not the policy claims. **Owner: static-pages.md** (policy accuracy) **+ data-layer.md §6** (Zaraz tool inventory).
6. **Old source files that are not in the bundle go unmentioned.** `components/ResultModal.tsx` is dead: its strings "Your Masterpiece", "Ready to print and color!" and "Edited Sketch via Gallery" are absent from the bundle; the result view is `qP`. `components/SketchSEO.tsx` = `gq` (coloring page, `web/`). **Owner: scene-art.md** name map (one line each), so nobody ports them.
7. **Cross-spec "unmapped" references are mostly resolved elsewhere.** Nothing is missing here; this list tells readers where to look: `Qte` → app-shell.md (not blog.md's guess); `lo` LazyImage and `ig` deductCredits → data-layer.md; `KP` → pricing-billing.md + gallery-tags-profile.md; `Nq` → static-pages.md; the `fq` Zoho return handler → pricing-billing.md §4; the `Iq` JSON-LD → scene-art.md; `Yo`/`fS`/`mS` → gallery-tags-profile.md + scene-art.md. **Still only summarized:** share text builders `tq`/`XP`/`ZP` (906,942-907,237; the exact Pinterest/Facebook copy and hashtags) and the tag chips `A_` (877,347). **Owner: gallery-tags-profile.md.** Transcribe the share text if the rebuild keeps share buttons.

Already open in a spec and not repeated here: hard-coded `$4.99` vs Zoho `$7` (pricing-billing), the `_400x533` thumbnail producer (data-layer/scene-art), whether bare `/tags` matches the `/tags/**` rewrite (gallery-tags-profile).

## Open questions for the owner

Merged from all specs, duplicates removed.

**Billing and credits**
1. What is the real premium price (Zoho charges $7/month; page, server HTML, blog and tracking say $4.99)? Do "Best Value" and "10 credits/month" still hold? Are the Spark/Torch/Beacon pack prices in the blog post current?
2. Should Remove Color stay free (it is a full Gemini image call), or cost 1 credit? (ROADMAP 1.1)
3. Should the Purchase/Order Completed events wait until the webhook's credit grant shows up, instead of firing from URL params that anyone can type?
4. Does Zoho append `order_id` (or anything else) to `redirect_url`, and does it restrict `redirect_url` domains (needed to test checkout from `workers.dev`)?

**Auth and accounts**
5. Keep anonymous sign-in (`A8`)? Nothing in the bundle needs it for reads; check the console setting and any metrics that count anonymous users.
6. Once the Worker takes the routes, how are `/__/auth/**` and `/__/firebase/init.json` served (proxy to `firebaseapp.com`, or change `authDomain` plus the OAuth redirect URIs)? The Google popup depends on this.
7. Is the sign-up race (`L8` signs the new user out while `N8` is still writing the user doc) the cause of the missing Welcome Bonus? This is plausible from the code but has not been reproduced.
8. Account deletion wipes `user_uploads/{uid}` but leaves the `sketches` docs (broken public images, orphaned bookmarks). Keep that, delete the docs, or keep the images?
9. `/verified`: keep a static page with a Log in button, or build a custom email action handler (`applyActionCode` + auto sign-in, which needs a console change)?
10. Does "5 Free Credits" (blog CTA, /verified, sign-up banner) match the actual welcome bonus?

**Tracking and privacy**
11. Which tools are configured in Zaraz (GA4, Facebook Pixel, Pinterest)? Do they read the `_epik` cookie or `localStorage.pinterest_epik`, do they hash the raw `em` sent in CompleteRegistration/AddToCart, and are Pinterest/Meta conversions mapped from the current event names (renaming them would break them)?
12. The privacy policy promises cookie management and a tracking opt-out, but there is no consent UI. Add one, or change the policy?
13. Should the rebuild add Zaraz events for share, CTA, bless and save (none today)?

**Content, legal and SEO**
14. Is mail to `support@biblesketch.com` (About, Terms, Pricing, Organization JSON-LD) received, or should everything use `hello@biblesketch.app`?
15. Legal copy: Terms 1.1 says "exclusively" 3 art styles (the app has 6 plus Verse Art); Terms says 18+ while Privacy talks about under-13s; About promises "Download the PDF". Port verbatim, or update and change the Last Updated dates?
16. Which og/twitter image and card should `/about` use (`/logo.png` square 408 KB, or `/og.png` at 5.87 MB)? Add self-canonicals to `/privacy` and `/terms`? Add an About link to the footer?
17. What canonical/indexing policy for filtered URLs (`/gallery?tag=`, `/tags/x?book=...`): self-canonical, canonical to the unfiltered page, or noindex?
18. Should the default `/gallery` sort be newest (current client) or popular (tag pages, home featured section, server crawler list)?
19. The WebSite SearchAction on `/` targets `/gallery?search=`, which the gallery ignores. Drop it or build search?
20. Blog: fix "7 Favorite..." (it has 6 sketches) and the singular "8 ... Coloring Page", or keep the indexed titles? Keep the share buttons? Hide the CTA for signed-in users?
21. Blog embeds: render at build time (and risk showing a sketch that later went private) or at request time with edge cache plus a `related:<id>` purge? Should `blog-posts.json` (read by the sitemap) be generated from the Astro content collection, or should the sitemap move to the Worker?

**Generation and images**
22. What creates the `_400x533` thumbnails (probably a Resize Images extension that exists only in the console)? Which format does it produce?
23. The home hero image is in the old project's bucket `coloring-book-bce53`. Is that project still yours, or should the image move?
24. Keep the 85% shrink in `$P` (it makes the white frame; refined images skip it, and it contradicts the full-bleed prompt), for Scene Art and Verse Art?
25. Verse Art: keep the WEB translation ("Yahweh"), or switch (e.g. KJV)? Proxy and cache bible-api.com in the Worker? Should the verse community section exclude the viewer's own sketches (client does, server doesn't)? Does the `isPublic+type+createdAt` index exist in prod?
26. Should the result view get its own URL or draft persistence, so Back or a refresh doesn't lose an unsaved generation?
27. Keep the home count (`U8` reads every public sketch doc), or replace it with `getCountFromServer` or a server-rendered number?

**Gallery data model**
28. Keep the gallery modal for private sketches and bookmarks, or move owner actions to the sketch page island?
29. Bookmarks store denormalized copies (`imageUrl`, `promptData`) that go stale when the original is deleted or made private. Keep that, or store ids only?
