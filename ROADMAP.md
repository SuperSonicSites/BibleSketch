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
3. `/gallery` (+ modal) and `/pricing` (Zoho round trip, `/verified` return, Zaraz purchase event with the real price: the bundle hard-codes 4.99, the plan is $7).
4. `/` (Scene Art) and `/bible-verse-coloring` (Verse Art, rebuilt from the minified bundle: it only exists there). Fold in the `coloring-page-quality` branch (new prompts and models).
5. Remove the 13 render functions, the old SPA routes, and the template patches (`functions/index.html` rating stripper and layout CSS). Keep old hashed assets forever.

Shared work across phases: App-level state (auth, users/{uid} listener, requireAuth queue, 4 modals, profile completion) moves to nanostores; every island waits for `auth.authStateReady()` before acting on clicks; the server renders links as real `<a href>`; `services/firebase.ts:79` (module-scope `location`) must be guarded.

### 1.0 Coloring-page quality (branch `coloring-page-quality`, not merged)
Work from the prompt-lab sessions (2026-09-22), commit `0194652`: new prompts (`services/prompts.ts`), Nano Banana 2 (`gemini-3.1-flash-image`, 2K) as the image model, `gemini-3.1-pro-preview` as the prompt writer with ±5 verses of context from bible-api.com (WEB), and new Adult · Classic references (`adult-classic-a/b.jpg`; dense references swapped out because they produced hairline output). House rules decided by the owner: no shading or black fills, a slim even frame, no text, stylized rather than photorealistic, no added characters, faithful to the verse. Adult · Classic = Doré-style drama in colorable line art (round 08: 8 👍 / 2 👎).

It can't ship on its own: the prompts live in the React front end, whose production source is lost. Plan:
- Port `services/prompts.ts` and the model choices into the phase-4 islands (Scene Art and Verse Art), and upload the new references to Hosting.
- Add the QA gate from the lab (`lab/qa.ts`): measure printed line width and area count on each result and retry when it's too fine. Calibrated from ~100 votes: 👍 median 0.63 mm lines / ~570 areas, "too fine" 👎 median 0.36 mm / ~1100 areas; lines under 0.4 mm predict "hard to color" for adults. Validate thresholds before gating.
- Continue the lab loop one style per round (`node lab/gen.mjs`, review at `localhost:5199`); `lab/` stays gitignored.
- `generateContent` already allows `gemini-3.1-flash-image` and `gemini-3.1-pro-preview`, so the backend is ready. Costs: $0.101 per 2K image.
- Open question: verses whose text contradicts the owner's expectation (Genesis 3:24 "cherubim", plural): ask before adding any rule that overrides the text.

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

### 1.4 Suggestions
- **S0. Model safety net (urgent, backend only).** Production still calls `gemini-3-pro-image-preview` (Google lists its shutdown as 2026-06-25; it still answers today) and `gemini-2.5-flash` (deprecated). When either stops, generation breaks for everyone until the rebuild. `generateContent` can map the old model names to `gemini-3.1-flash-image` / a current flash model server-side, without touching the bundle. Ship the mapping (behind a flag) now, and flip it on the first sign of errors or immediately after a quality check in the lab.
- **S1. Monitoring and alerts (do first, no rebuild needed).** A daily synthetic check that calls generation end to end, Cloud Monitoring alerts on `generateContent` error rate and on zero successful generations in 6 hours, a Gemini budget alert, and an uptime check on 5 key URLs. The 3.5-month outage would have been caught on day one.
- **S2. CI.** GitHub Actions on `seo-fixes`: emulators + `security-check.mjs` on every push; manual-approval deploy job with the quoted `--only` lists. Removes "deploy from one Windows machine" as a single point of failure.
- **S3. App Check** on the callable and Firestore once the rebuild controls the client.
- **S4. Images.** In the rebuild, serve WebP/AVIF thumbnails from first-party URLs (Cloudflare Images or a Worker route over Storage): smaller files and image-sitemap entries on a domain you can verify in Search Console. Replace the monthly cache script with a Storage trigger.
- **S5. Zoho.** The UID custom field is editable by customers in the portal; make it read-only or stop trusting it when the `?uid=` query param is present.
- **S6. Repo hygiene.** Delete leftovers at the root (`gemini.md`, `metadata.json`, `repair_images.cjs`, `temp_debug.jpg`, `dist/`) and the stale `docs/*-implementation-plan.md` once the rebuild replaces them.
- **S7. SEO follow-ups.** Once the rebuild ships: one title per page (server and client disagree today), an H1 on `/gallery`, real internal links, and a Search Console check 2-4 weeks after each phase.
