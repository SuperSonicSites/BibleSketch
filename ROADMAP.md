# Roadmap

Status 2026-09-23. Production = branch `seo-fixes`. The SEO/performance fixes that didn't need a rebuild are live (see [docs/deploying.md](docs/deploying.md)). Everything below needs the front-end rebuild, because the React source for production is lost.

## 1. Front-end rebuild: Astro 7 + React islands on Cloudflare Workers

**Decision** (judge panel, 2026-09-23): Astro with React islands, served by a Cloudflare Worker bound to route patterns on `biblesketch.app`. Firebase stays the whole backend (Auth, Firestore, Storage, Functions, rules, Zoho webhook). Paths the Worker doesn't claim (`/__/*`, `/sitemap.xml`, static files, routes not yet ported) keep falling through to Firebase Hosting, so the rollout is route by route and deleting a route is an instant rollback.

**Why:** coloring pages (88% of indexable URLs) ship HTML with no JavaScript blocking the first paint, one `<head>`, real links, and a cache that can drop a sketch within seconds when it is made private. About $5/month (Workers Paid), no cold starts.

**Fallback:** React Router v8 framework mode on Firebase Hosting + one SSR function (more code reuse, one vendor, but every page hydrates about 100 KB of JS).

**Pinned** (`web/package.json`, exact versions): `astro` 7.3.4, `@astrojs/cloudflare` 14.3.3, `@astrojs/react` 6.0.6 (7.0 shipped 2026-09-22; revisit in a month), React 19.3.0, `wrangler` 4.136.3, `firebase` 12.19.0, Tailwind 3.4.19 through a plain `postcss.config.js` (`@astrojs/tailwind` only supports Astro ≤ 5; Tailwind 4 would change the bundle's classes).

### Phase 0 result (2026-09-23): GO
All four checks passed; the Worker `biblesketch-web` runs on `https://biblesketch-web.supersonicworkers.workers.dev/coloring-page/<slug>/<id>`. Code in `web/`, trigger on `seo-fixes` (not deployed).

| Check | Result |
|---|---|
| Lighthouse mobile ≥ 95 (`web/scripts/lighthouse.mjs`) | **100 / 100 / 100** on 3 URLs, cold and warm cache (LCP 1.3-1.5 s, TBT 0, CLS 0). Production today: 62-72 (LCP 8-10 s). On the zone with Zaraz: 99. |
| Private-sketch purge | `onSketchWritten` → `POST /api/purge` (secret) → gone. Live: HIT → purge (0.3 s) → MISS. Emulator: `security-check.mjs` step 34. |
| Zaraz on Worker HTML | Auto-injected on the zone, same as origin pages. No manual tag. |
| `/_astro/*` and exact routes | `/_astro/*` needs its own route and serves immutable. Fall-through to Firebase works. **An exact route does not match the same path with a query string** (`/labs?utm_source=x` went to Firebase). |

Decisions and facts for the rollout:
- **Caching:** Workers Cache (Astro `cacheCloudflare()`), `max-age` 1 h + `swr` 1 day. Tags: `sketch:<id>` on the page, its redirects and its 404; `related:<id>` for each sketch in the related grid. The purge drops both, so a sketch made private also leaves other pages' related grids. Each deploy starts from a cold cache (the cache is keyed by Worker version), so cached HTML never points at deleted `/_astro` files.
- **Data:** Firestore REST without auth (`web/src/lib/firestore.ts`); a private or missing sketch both read as 403 → 404 (cached, tagged, purged on publish).
- **Images:** `/img/<thumb path>` serves the `_400x533` thumbnail as first-party WebP through the Images binding (58 KB → 22 KB), cached a year. Needs its own route on the zone.
- **Auth in islands:** `initializeAuth` with IndexedDB persistence, never `getAuth` (it loads gapi + `/__/auth/iframe`, ~140 KB, on every page); pass `browserPopupRedirectResolver` only to the sign-in popup call. Import Firebase on idle.
- **Scroll-snap carousels need `scroll-padding` equal to their padding.** Otherwise Chrome snaps on first layout, counts it as a scroll, and records no LCP (Lighthouse then falls back to a pessimistic ~94).
- **`/` in phase 4:** an exact `biblesketch.app/` route would miss `/?utm_source=…` (ads, Pinterest). Plan: bind `biblesketch.app/*` and `fetch(request)` to the origin for paths not ported yet (proven in the probe), instead of per-path routes.
- **wrangler never deletes routes** it created, even with `"routes": []`: remove them in the dashboard (CHECKLIST).
- **Parity:** the page reproduces the live bundle's title, description, canonical, H1, subtitle and related list (`web/scripts/check-sketch.mjs` against 3 captured live pages). Tags and related cards are now real links; the head is rendered once, on the server.
- **Phase 0 shortcuts to finish in rollout phase 2:** header shows the guest state only (Log In links to `/`); Print/Download/Save are read-only placeholders (quota shown); no owner controls (private sketches render only in the SPA); the guest CTA links to `/` instead of opening the auth modal.

### Phase 0: go/no-go prototype (2-3 days)
Coloring page only, deployed to a `workers.dev` URL, reading public production data through the Firestore REST API (rules allow unauthenticated reads of public sketches; `firebase-admin` does not run on Workers). It must show:
- Lighthouse mobile >= 95 on 3 sketch URLs (today: 58).
- A private-sketch purge round trip: Firestore trigger → Worker purge endpoint → page gone from cache.
- Zaraz loads on Worker-generated HTML.
- Static assets (`/_astro/*`) served correctly on route-bound Workers; exact root matching for `/`.

If any Workers item fails, switch to the React Router v8 fallback.

### Rollout phases (each shippable and reversible)
1. `/about`, `/privacy`, `/terms`, `/verified`, `/blog` and posts (MDX collection; `<<sketch>>` / `<<CTA>>` shortcodes become components).
2. `/coloring-page/*`, `/tags/*`, `/profile/*` (305 + 15 + 16 URLs), plus the purge trigger.
3. `/gallery` (+ modal) and `/pricing` (Zoho round trip, `/verified` return, Zaraz purchase events as the bundle sends them: Premium 4.99 USD, packs 4.99/14.99/29.99 USD; owner confirmed 2026-09-23 that prices are in USD, about $7 CAD).
4. `/` (Scene Art) and `/bible-verse-coloring` (Verse Art, rebuilt from the minified bundle: it only exists there). Fold in the `coloring-page-quality` branch (new prompts and models).
5. Remove the 13 render functions, the old SPA routes, and the template patches (`functions/index.html` rating stripper and layout CSS). Keep old hashed assets forever.

**Phase 1 plan** (2026-09-23; feature map in [docs/bundle-map/](docs/bundle-map/README.md)). Owner decisions: build the **full shared shell now**; **fix the legal/About copy while porting** (drafts reviewed by the owner before cutover, "Last Updated" dates bumped); **fix CompleteRegistration** (once per new account, Google or email, same name/payload); **hello@biblesketch.app** is the only contact address.
1. Shell: header with server-side active state and real links, footer with About; auth store (nanostores) with the `users/{uid}` listener, verified-email gate and a `requireAuth` that reads current state and clears on modal close; islands `AuthControls` (header) and `ModalHost` (auth login/signup/reset/Google, Account, profile completion, error). Firebase loads on idle. Sign-up writes the user doc and Welcome Bonus before signing out (fixes the race); Account shows `downloadsRemaining`. Pinterest `?epik` capture as an inline script. 404 page; trailing/double-slash 301s in middleware.
2. Pages: `/about`, `/privacy`, `/terms`, `/verified` prerendered (single head, noindex where it is today, self-canonicals). `/blog` and posts from `functions/blog-posts.json` (single source, the sitemap keeps reading it), rendered on request with Workers Cache tagged `related:<id>` per embedded sketch; `SketchEmbed` server-rendered with real links plus a Bless/Save island; the CTA opens sign-up (hidden for signed-in users); share links as plain `<a>`; cover images with real dimensions.
3. Coloring page: `SketchActions` switches to the shared store (the guest CTA opens sign-up).
4. Checks: head parity script against live for every phase 1 URL; auth flows end-to-end against the emulators (sign-up, verify gate, login, Google stub, reset, bless/save, account update); Lighthouse ≥ 95 on /about, /blog and one post.
5. Cutover (owner approval): routes `about*`, `privacy*`, `terms*`, `verified*`, `blog*`, `/_astro/*`, `/img/*` (`/about-Renaud.webp` and `/blog-images/*` move into `web/public`). Rollback: a `LIVE_PREFIXES` var the middleware checks; removing a prefix makes the Worker pass that path to Firebase, so rollback is a deploy, not a dashboard edit.

**Phase 1 live** (2026-09-23, Worker version c17c3996). Verified on biblesketch.app with `?cb=`: all phase 1 URLs (about, privacy, terms, verified, blog + 6 posts, `/blog-images/*`, `/about-Renaud.webp`, `/img/*`) answer 200 from the Worker; `/about/` 301s; unknown slugs and other paths (`/`, `/gallery`, `/coloring-page/*`, `/tags/*`, `/aboutus`) still come from Firebase. Zaraz `s.js` loads and sets the GA4/Pixel cookies; the auth modal opens and Google sign-in reaches accounts.google.com; no Worker errors in `wrangler tail`. Not verified by an agent: a real sign-up, the verification email link, login and a completed Google sign-in (owner test, CHECKLIST).

**Phase 2 plan** (2026-09-23, build only; nothing goes live until the owner approves). Owner decisions: **print is a PDF now** (ROADMAP 1.2) and download moves server-side too; **owners never spend a download on their own sketch**; **filtered tag/profile URLs are canonical to the unfiltered page**. The Worker acts for the signed-in user by verifying their Firebase ID token and calling Firestore REST with it (rules apply as that user), so no service account is needed. Tag and profile pages are server-rendered from one REST query each (24 per page, `?page=N` links, GET-form filters), cached with `tag:`/`profile:`/`related:<id>` tags.

**Phase 2 live** (2026-09-23, Worker version 9bca4b7d, after the owner tested sign-up and login live on phase 1). Verified on biblesketch.app with `?cb=`: all 326 sitemap coloring-page/tag/profile URLs answer 200 from the Worker; filtered tag URLs are canonical to the tag page; unknown sketch/tag/profile ids 404; `/`, `/gallery`, `/pricing`, `/bible-verse-coloring` still come from Firebase; `/api/purge` and `/api/print` reject requests without a secret/token (403); headless: tag and profile cards render, the sketch page's guest CTA opens sign-up, Zaraz loads, no page errors. `onSketchWritten` deployed by the owner the same day (secret v1 + `WORKER_PURGE_URL`); owner's private → public test on a live sketch worked and the function logged no purge errors. **Phase 2 complete.**

**Phase 2 result** (2026-09-23): built, tested, deployed to workers.dev only.
- Coloring page: Print PDF (`POST /api/print/<id>`, Letter/A4 from the browser locale, pdf-lib) and Download (`POST /api/download/<id>`, `bible-sketch-<id>.png`) run in the Worker with the visitor's ID token: owners and premium never spend a download, others spend one through a conditional Firestore write (rules still allow decrease only), 0 left → upgrade modal / 402. Save to Collection, Owner Controls (tags, visibility, delete incl. Storage files), and a "Make public" panel for an owner on their private sketch's 404.
- `/tags/<tag>` and `/profile/<uid>`: server-rendered, filters/sort/pages as URL params (GET form, works without JS), canonical to the unfiltered page, real links, Bless per card, noindex/404 rules as the render functions. Tag titles use the client's richer title.
- Checks: `scripts/e2e-downloads.mjs` 10/10 and `e2e-auth.mjs` 8/8 against the emulators; head parity with production on 11 phase 1 URLs + 15 tags + 8 profiles; `security-check.mjs` 34/34 on seo-fixes. Lighthouse mobile: sketch pages 97-99, tags 99-100, profiles 99, blog 99, about 99.
- Lessons: eager images below a phone's fold hurt Lighthouse (listing cards are lazy; only the first blog cover is eager); the whole Tailwind stylesheet (with Typography) is inlined (`build.inlineStylesheets: 'always'`).
- Go-live needs: phase 1 live first, then routes `coloring-page*`, `tags*`, `profile*`, `api/*` + `LIVE_PREFIXES`, and `onSketchWritten` deployed with `WORKER_PURGE_SECRET` = the Worker's `PURGE_SECRET` (docs/deploying.md).

**Phases 3-5 plan** (2026-09-23, owner: "finish the migration completely from A to Z", then work on generation quality). Owner decisions: **Remove Color costs 1 credit**; gallery **Refine is fixed at 1 credit**; **failed generations and edits are refunded automatically**; **every successful generation is auto-saved as a private sketch** (the user publishes it; nothing paid for is lost); **Verse Art keeps WEB**; prices stay USD (Premium 4.99, packs 4.99/14.99/29.99, as the purchase events send them); `/gallery` = server-rendered public listing with URL filters + My Gallery / Saved tabs; **account deletion also deletes the user's sketches**; **anonymous sign-in dropped**; cutover in two steps (gallery + pricing, then the generators); cleanup after about a week.

**Phases 3-4 result** (2026-09-23): built, tested, backend live (unused by the old app), Worker on workers.dev only.
- Backend (`functions/index.js` §15, `functions/generation/`): `createSketch` / `editSketch` callables run the whole pipeline server-side and charge one credit per generation or paid edit in a transaction before Gemini, with a ledger (`generations/{uid}_{requestId}`) that makes retries idempotent and an idempotent refund on any failure; `refundStaleGenerations` (every 10 min) refunds charges whose instance died; `cleanupDeletedAccounts` (hourly) removes a deleted account's sketches, others' bookmarks of them and its files once the Auth account is gone. Scene Art = coloring-page-quality prompts (3.1 Pro brief with bible-api ±5 verse context, Nano Banana 2 artist); Verse Art = the bundle pipeline (brief on `gemini-3.8-flash`, critic ≤2 attempts); edits keep the framing. Post-processing (85% + threshold, threshold for edits) and the lab QA metrics (`qa` on every new sketch, not a gate) run in Node with jimp. Real runs: scene 32 s, verse 41 s, edit 14 s. The old `gemini-3-pro-image-preview` is no longer in Google's model list; the new pipeline doesn't use it (S0 is moot once `/` is live).
- Front end: `/pricing` (static, checkout URL byte-identical, Purchase once with the buyer's identity, `replaceState`), `/gallery`, `/` and `/bible-verse-coloring` (Generator island; result at `?sketch=<id>`; a dropped connection resumes the same paid request), `SketchOwnerView` (result view and gallery dialog).
- Checks: `security-check.mjs` 42/42 (fake Gemini in the emulator), `e2e-generate.mjs` 9/9, `e2e-auth` 8/8, `e2e-downloads` 10/10, head parity with live (intended: verse page title/description/share image). Lighthouse mobile on workers.dev: `/` 97, verse 99, gallery 100, pricing 99 (production `/` 62-72).
- **Live 2026-09-23** (Worker 77e8dbc4): step 1 `gallery*`, `pricing*`; step 2 `biblesketch.app/*` with `/` and `/bible-verse-coloring` in LIVE_PREFIXES. Verified with `?cb=`: the four pages from the Worker (also `/?utm_source=`), `/__/auth/handler`, `/__/firebase/init.json`, `/sitemap.xml`, `/robots.txt`, `/assets/*`, `/references/*` from Firebase with their caching, unknown paths 404; Google sign-in reaches accounts.google.com; Zaraz loads; no page errors, no Worker errors. `public/_headers` restores the year-long caching of fonts and images the Worker now serves. Rollback: drop a prefix from LIVE_PREFIXES and deploy (the old app and its functions are untouched until phase 5).
- Not done on purpose: filters inside My Gallery / Saved (newest first + Load More); the Saved tab links to the original page instead of a dialog.

Shared work across phases: App-level state (auth, users/{uid} listener, requireAuth queue, 4 modals, profile completion) moves to nanostores; every island waits for `auth.authStateReady()` before acting on clicks; the server renders links as real `<a href>`; `services/firebase.ts:79` (module-scope `location`) must be guarded.

### 1.0 Coloring-page quality (branch `coloring-page-quality`, not merged)
Work from the prompt-lab sessions (2026-09-22), commit `0194652`: new prompts (`services/prompts.ts`), Nano Banana 2 (`gemini-3.1-flash-image`, 2K) as the image model, `gemini-3.1-pro-preview` as the prompt writer with ±5 verses of context from bible-api.com (WEB), and new Adult · Classic references (`adult-classic-a/b.jpg`; dense references swapped out because they produced hairline output). House rules decided by the owner: no shading or black fills, a slim even frame, no text, stylized rather than photorealistic, no added characters, faithful to the verse. Adult · Classic = Doré-style drama in colorable line art (round 08: 8 👍 / 2 👎).

**Verse Art lettering** (2026-09-23): the critic now checks the exact WEB words, signatures/watermarks and black fills. Owner decision: **when both drafts are rejected, the generation fails and is refunded** (the user is asked to try again) instead of delivering a wrong page. The old font references carried other verses and a third-party watermark (Krista Hamrick) that leaked into pages; they were replaced in `functions/references` by two of Bible Sketch's own Scripture-board pages per font. Test (9 cases × 2 runs each): bad first drafts 11/18 → 7/18, reference-text leaks 3 → 0, refunded 3/18.
Then (owner: "under 5% bad first drafts, and they must not all look the same"; "lines closed, add a border"): the brief splits the verse into sized lines that code checks word for word (fallback: 4 words a line), the artist gets only those lines + the reference, a composition is picked at random per page (medallion, heart, wreath, arch, landscape, banners, panel, scroll…), a slim closed page border is required, and the critic no longer uses the brief's own criteria. First-draft eval (20 verses, all fonts): 30% bad → 1/30 bad on the final prompt (5 drafts per round to limit cost, so the true rate is only known to be roughly under 15%); border present on 18/20. Open: the reference prints "Proverb 3:5" (bundle parity, also in `web/src/lib/sketch.ts`).

It can't ship on its own: the prompts live in the React front end, whose production source is lost. Plan:
- Port `services/prompts.ts` and the model choices into the phase-4 islands (Scene Art and Verse Art), and upload the new references to Hosting.
- Add the QA gate from the lab (`lab/qa.ts`): measure printed line width and area count on each result and retry when it's too fine. Calibrated from ~100 votes: 👍 median 0.63 mm lines / ~570 areas, "too fine" 👎 median 0.36 mm / ~1100 areas; lines under 0.4 mm predict "hard to color" for adults. Validate thresholds before gating.
- Continue the lab loop one style per round (`node lab/gen.mjs`, review at `localhost:5199`); `lab/` stays gitignored.
- `generateContent` already allows `gemini-3.1-flash-image` and `gemini-3.1-pro-preview`, so the backend is ready. Costs: $0.101 per 2K image.
- Open question: verses whose text contradicts the owner's expectation (Genesis 3:24 "cherubim", plural): ask before adding any rule that overrides the text.
- Owner decision 2026-09-23 (Pinterest work): where the text is silent, follow beloved tradition (three crowned wise men, ox and donkey at the manger, Jonah's whale, round-topped tablets…; list in `functions/generation/prompts.js` CHRISTIAN_GUIDELINES rule 8, applies to every age and style). Goliath is drawn as a real giant; short adults (Zacchaeus) stay adults. Toddler keeps the frame but becomes a full storybook scene (characters in the story's setting, filling the frame), with our two best Pinterest pages as references (`toddler-sundayschool-a/b.jpg`). Why: Toddler · Sunday School full scenes are the best Pinterest performers (36.8 outbound clicks per Pin vs 5.8 for Adult); the old "one subject, simple setting" prompt produced sparse pages. Tested on 15 passages with the functions pipeline run locally.

### 1.1 Credit system (fix in the rebuild, before or with phase 4)
Audit 2026-09-22 (live bundle + prod rules in emulators). Today the **client** deducts credits and the server only checks `credits >= 1`.
- Move charging server-side: `generateContent` reserves 1 credit in a transaction before calling Gemini and refunds on failure (charge-then-refund). The live bundle's own client deduction must be gone at the same time, or users are charged twice.
- Close the bypass: with 1 credit a user can make 60 image calls/day; throwaway verified accounts can exhaust the global 500/day cap and block everyone. Add App Check, and per-account limits tied to paid credits.
- "Remove Color" (result view) is a Gemini image call with no charge. Decide: free (and rate-limited) or 1 credit.
- "Make changes" and the gallery AI edit charge before calling Gemini with no refund. The gallery edit sends the Storage URL as if it were base64, so it fails 100% of the time and costs 1 credit each: fetch the image and send real bytes (needs bucket CORS, see below).
- Two tabs at 1 credit: both generate, one charge succeeds, the other image is discarded. Server-side charging fixes this.
- Profile Settings reads a nonexistent `downloads` field (always shows 0). Use `downloadsRemaining`.
- Email sign-up writes the user doc before the auth token propagates, so it fails; the doc is created later without the Welcome Bonus transaction (62 of 182 users have none). Create the user doc server-side (`onUserCreated` Auth trigger).
- Monitoring: generation was down about 3.5 months (Jun-Sep 2026, invalid Gemini key) and nobody noticed. See suggestion S1.

**Storage CORS** (audit 2026-09-22): the bucket sends no CORS headers on GET. Today almost nothing needs it (`embedLogoOnImage` draws no logo; downloads and prints fall back to the plain URL). Any rebuilt feature that reads image pixels in the browser (canvas, fetch → base64) needs bucket CORS for `https://biblesketch.app` first.

### 1.2 Print through a PDF instead of direct printing
Today Print opens the image in a popup after an `await` (popup blockers catch it) and prints at whatever scale the browser picks.

Plan: a `GET /api/print/<sketchId>.pdf` endpoint (Worker) that builds a Letter or A4 PDF with `pdf-lib` (no headless Chrome needed): the full-size image fitted with safe margins, verse reference and a small site footer, `Content-Disposition: inline`. The Print button opens it in a new tab (synchronously, inside the click, so no popup block): Chrome's PDF viewer then gives Print and Save as PDF with correct scaling. The endpoint decrements the print quota server-side and checks sketch visibility and ownership. Page size from the user's locale (Letter for US/CA, A4 elsewhere) with a toggle. Server-side generation needs no CORS.

### 1.3 Better sign-up experience
- Fix the sign-up write race and the missing Welcome Bonus (see 1.1).
- Branded transactional email from `biblesketch.app` (Cloudflare Email Service fits the Workers stack): welcome, verify email, password reset, purchase receipt (credits added), low-credits nudge, "your coloring page is ready" for long generations. Set up SPF/DKIM/DMARC first. Use Firebase's custom email action handler on `biblesketch.app` instead of the default `firebaseapp.com` pages.
- Fewer steps: Google One Tap on content pages; passwordless email links as an option; defer the profile-completion modal until after the first generation.
- Guest preview: let visitors see a watermarked first result before signing up, then sign up to download (server-side credit check makes this safe).
- Clear credit messaging at sign-up (what 5 free credits buy) and after purchase (credits land instantly; show the new balance).

### 1.5 Pinterest auto-publish (RSS)
Built 2026-09-23 in `web/`: `src/data/pins.json` (the calendar), `src/lib/pins.ts`, `/pins/<board>.xml` (RSS 2.0) and `/pin-img/<name>.png` (1000x1500, Images binding: sketch 1000x1333 + a 1000x167 banner from `public/pin-banners/`). `node scripts/pins-check.mjs [--backlog]` before every deploy. Strategy and its reasoning: [docs/pinterest-strategy.md](docs/pinterest-strategy.md). Owner decisions:
- **Posting ramp (owner decision 2026-09-23, replaces one Pin a day):** 1 Pin a day in the week from 2026-09-24, 2 a day the next week, 3, 4, then 5 a day from 2026-10-22, boards taking turns. `pins-check` enforces the daily ceiling (`dailyCap`); it is a ceiling, not a target: only reviewed pages go in, and a thin day stays thin. Why: winners are a lottery (Tailwind: top 1% of Pins = half of all reach; Pinterest recommends 5-25 fresh Pins a day) and the Nov-Dec 2025 burst of 4-8 a day drew no penalty. Supply is the limit: 5 a day is 35 reviewed pages a week, so the Sunday School series and verse art have to be generated in batches (the master account may generate 250 a day, owner decision 2026-09-23; everyone else 60).
- A feed lists only what was released in the last 2 days (`WINDOW_DAYS`), so a late connection or a skipped Pinterest check can never publish a pile.
- Only public sketches of the master account (`TiAEiMqWxpWqxCLtoI5OgHAvtf33`), never a sketch already on Pinterest, one Pin per sketch.
- Copy: follow the Pin copy rules in docs/pinterest-strategy.md §3.3a (titles `[opener]: [story moment] | [reference] Coloring Page for Kids`, never "Free"; descriptions 200-350 chars (was 250-420 until 2026-09-23; released entries keep theirs), describe only what is drawn, "coloring page" once, audience, one lesson theme, end with "Get your first 5 prints free at BibleSketch."). Since 2026-09-23 every title has "Coloring" and every description "coloring page" (pins-check enforces it).
- Templates: kids' pages alternate `paper` and `purple` (60-day A/B test from Oct 15), older-audience pages `black`; Scripture board `plain` (owner decision 2026-09-23): no banner, the page trimmed to its drawn border (Images `trim.border`, 24 px kept), 1000 wide, about 1000x1350.
- Every page is reviewed up close before it enters the calendar (faces and eyes, counts, frame, stray lines, text in verse art); fixes by edit or regeneration, rejects deleted. How to generate, review, publish and schedule a batch, and the current state: [docs/pinterest-runbook.md](docs/pinterest-runbook.md).
- 2026-09-23 changes from the strategy review (owner-approved): three December shepherd Pins moved to Oct 29, Nov 9 and Nov 16 (front-load Christmas: a Pin needs ~4 weeks of history before the mid-December peak); 11 reviewed backlog pages fill Sept 25 - Oct 13 and two Sundays (Jesus calms the storm, Jonah, a Jericho series, the burning bush, Esther; Philippians 4:13, Psalm 23:1, Psalm 100:5); Scripture moves toward 2 Pins a week; new Adult Pins paused. Done the same day: 62 verse pages Oct 6 - Dec 20 ([docs/pinterest-scripture-plan.md](docs/pinterest-scripture-plan.md)) and 30 Sunday School scenes Oct 1 - Nov 5 (David, Jonah, Noah, Daniel, Moses, Joseph, Zacchaeus and more). Still open: Sunday School after Nov 13, more Christmas scenes for December (216 open ramp slots through Dec 20, see the runbook's Status block).
- **Pinterest API app** (2026-09-23): "Bible Sketch Pin Publisher" (id 1615048), `src/lib/pinterest.ts` and the owner page `/api/pinterest` (OAuth for @biblesketch only, tokens encrypted in KV, POST /pins with alt text). Sandbox until Standard access (requested 2026-09-24 with a demo video). Then: `PINTEREST_ENV=production`, a daily cron publisher replaces the RSS feeds (RSS can't carry alt text). Updating existing Pins is beta and not open to us.
- **Pinterest stats** (2026-09-24): Trial access reads production, so a second, production connection feeds `/api/pinterest/report` (JSON) and a monthly email report (owner decisions: every ~30 days to renaud@supersonicsites.com, CC brent@supersonicsites.com, a short TLDR rather than a dashboard, bullets with bold board names and linked top Pins; cron on the 24th, Email Routing). Details: docs/pinterest-runbook.md, "Reading performance".
- **Genesis 1-4 series** (2026-09-24): the stats showed Genesis 1-4 Pins earn 62% of clicks (3.4x per Pin), so 18 reviewed Creation / Eden / Cain and Abel pages go out on the Sunday School board Oct 2-30, and the 18 Pins without alt text (mostly Genesis) got it. Details: runbook Status.
- **Daily production** (owner decision 2026-09-24): a desktop-app scheduled task (`pinterest-daily`, 7:00 local) generates, reviews, publishes and schedules 5 Pins a day into the earliest open ramp slots 7-60 days out, deploys the Worker, runs the alt-text pass and pushes. Board mix, content rules and its authorized scope: runbook "Daily scheduled task". Cost: about 5-10 generations a day on the Gemini key (watch the spend cap) and the master account's credits.
- **Yearly calendar and learning loop** (owner decisions 2026-09-24): `web/src/data/pin-year.json` holds:
  - seasons timed about 6 weeks before the Pinterest Trends rise, with Easter and the other moveable days
    computed;
  - the daily board mix, with Adult back at 2 a week;
  - a bank of about 350 moments and verses. No repeats, except proven winners as fresh images after 6 months, in
    at most 10% of slots.

  `scripts/pins-plan.mjs` turns it into each day's exact slots with a drawing `guidance`.
  `scripts/pins-learn.mjs` learns monthly from Pins at least 180 days old:
  - reach (clicks + saves) steers what to post;
  - resonance (per 1,000 impressions, within a board) judges the image;
  - visual profiles, and a winners-vs-losers visual study, become composition notes.

  Backend: `createSketch` takes the master-only `guidance` (and a verse `composition`), and every generation keeps
  its brief, guidance, models, references and prompt version on its private ledger doc. **Deployed 2026-09-24**
  (createSketch, editSketch) after the emulator security check passed (44/44). Verified live:
  - a master generation with guidance (Genesis 8:11) drew exactly the moment asked for;
  - its brief, guidance, models, refs and prompt version are on the private `generations/` doc;
  - the public sketch doc has no prompt fields.

  Details: runbook "Daily scheduled task".
- Not verified yet: the `security-check.mjs` step for the master account's 250 cap (the emulators were held by another session on 2026-09-23). Run it with the next emulator suite.
- Local test of `/pin-img`: set `"remote": true` on the `images` binding in `wrangler.jsonc` (local mode can't draw overlays), and remove it after.

### 1.6 Lifecycle email (Resend)
- Plan: [docs/email-marketing-plan.md](docs/email-marketing-plan.md), built on Dean Jackson's *Email Mastery* (2026-09-24).
- **Owner decisions:**
  - the emails go to sign-ups; their data is in Firebase, and Resend sends;
  - no Zoho integration;
  - every campaign is automated;
  - (2026-09-24) opting in to the emails earns extra free prints (+5 proposed; plan §12.2);
  - (2026-09-24) the 85 sign-ups who couldn't make a page during the Jun-Sep outage get a month of unlimited prints with the apology email (`printsUnlimitedUntil`; plan §12.1).
  - (2026-09-24, proposed) a $1.99/month unlimited-prints plan, offered only by email for 7 days to people who run out of prints (plan §12.20, C7).
  - (2026-09-25) email prices are in USD only (we are international): Premium $4.99 a month, Prints $1.99 a month or
    $19.99 a year ("that's $1.67 a month"). The Zoho Prints plans must be switched from CAD. The emails say
    "credits" (to make a page of your own) and "prints" (to print any page), as the site does. Offers about a
    balance wait until it has stayed put for 3 days (owner suggested about 7; plan §10).
  - (2026-09-25) checkout moves on-site: `/checkout/<plan>` is a distraction-free page with Zoho's form in an iframe,
    in USD through Zoho's API. It's built and waiting on the Zoho API client and USD setup (plan §12.20 item 4,
    CHECKLIST 0a).
  - (2026-09-24) the weekly Thursday page is free to print from the email only (a signed PDF link, plan §6.6), and the consent box says so. Replies go to hello@biblesketch.app; the sender is "Renaud from Bible Sketch"; the mailing address is Supersonic Sites Inc., Ucluelet, BC.
- **Billing (deployed 2026-09-24; the plan-code fix in revision 00137, then the Unlimited Prints plans in revision 00138 with Worker 637f9390):** `handleZohoWebhook` granted Premium to any subscription it received. Now only the `bible-sketch-premium` plan code grants or removes Premium. Other plans get a 400 and nothing changes. Security check 45/45.
- **Phases:**
  0.5. **Live 2026-09-24:** the opt-in box and persona question at sign-up, the one-time banner, the private email record, +5 prints on the first opt-in, the first-visit record, and the privacy text.
  1. **Live since 2026-09-25 20:24 UTC** (owner approved phase 1; `config/email.live` is true; hello@ goes through the
     Email Worker):
     - the welcome and sort, activation, the credit and print offers (with the 7-day $1.99 offer link and the +10
       first-pack bonus), and the outage follow-ups;
     - `emailTick` sends through Resend;
     - unsubscribe links, the hello@ reply reader, and prefilled generator links.

     Plan §10. Left for later: print events, the Resend webhook and contacts sync. The email numbers in the monthly report were built 2026-09-25 (`emailStats`).
  2. The weekly "Sunday Prep" flagship, Advent/Christmas, after-the-sale emails and 9-word re-engagement. Live by Nov 10.
  3. Referrals, automatic concierge answers, Premium annual, the church path. January 2027.
- **Waiting on the owner steps** in the plan's §11: the Resend account and domain, sender, mailing address, consent wording, bonus amounts.

### 1.4 Suggestions
- **S0. Model safety net (urgent, backend only).** Production still calls `gemini-3-pro-image-preview` (Google lists its shutdown as 2026-06-25; it still answers today) and `gemini-2.5-flash` (deprecated). When either stops, generation breaks for everyone until the rebuild. `generateContent` can map the old model names to `gemini-3.1-flash-image` / a current flash model server-side, without touching the bundle. Ship the mapping (behind a flag) now, and flip it on the first sign of errors or immediately after a quality check in the lab.
- **S1. Monitoring and alerts (do first, no rebuild needed).** A daily synthetic check that calls generation end to end, Cloud Monitoring alerts on `generateContent` error rate and on zero successful generations in 6 hours, a Gemini budget alert, and an uptime check on 5 key URLs. The 3.5-month outage would have been caught on day one.
- **S2. CI.** GitHub Actions on `seo-fixes`: emulators + `security-check.mjs` on every push; manual-approval deploy job with the quoted `--only` lists. Removes "deploy from one Windows machine" as a single point of failure.
- **S3. App Check** on the callable and Firestore once the rebuild controls the client.
- **S4. Images.** In the rebuild, serve WebP/AVIF thumbnails from first-party URLs (Cloudflare Images or a Worker route over Storage): smaller files and image-sitemap entries on a domain you can verify in Search Console. Replace the monthly cache script with a Storage trigger.
- **S5. Zoho.** The UID custom field is editable by customers in the portal; make it read-only or stop trusting it when the `?uid=` query param is present.
- **S6. Repo hygiene.** Delete leftovers at the root (`gemini.md`, `metadata.json`, `repair_images.cjs`, `temp_debug.jpg`, `dist/`) and the stale `docs/*-implementation-plan.md` once the rebuild replaces them.
- **S7. SEO follow-ups.** Once the rebuild ships: one title per page (server and client disagree today), an H1 on `/gallery`, real internal links, and a Search Console check 2-4 weeks after each phase.
