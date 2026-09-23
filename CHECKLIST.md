# Manual checklist

Only work that needs a human: console access, dashboards, decisions, or accounts an agent can't use. Code work lives in [ROADMAP.md](ROADMAP.md). Tick items and add the date. The complete copy is on branch astro-rebuild (it has the Cloudflare/rebuild items); seo-fixes is merged into it regularly.

## Open

### Decisions
- [x] **Unpaid premium/credits accounts.** 8 accounts have premium or credits without any payment (beta-week sign-ups, Nov 24-28, 2025; one orphan doc `EIV569…` with no Auth user). Keep or revoke? - ANSWER: KEEP
- [x] **Bucket CORS.** Allow GET from `https://biblesketch.app` on the Storage bucket now, or wait for the rebuild (needed before any browser-side image editing; see ROADMAP 1.1). - ANSWER: ENABLED 2026-09-23 (verified: GET from biblesketch.app returns Access-Control-Allow-Origin)
- [x] **"Remove Color" pricing.** Free (rate-limited) or 1 credit (ROADMAP 1.1). - ANSWER: 1 CREDIT (2026-09-23)

### Astro rebuild, phases 3-5
- [x] ~~**Let the preview site sign in**~~ Not needed: the owner chose to test on the live site (2026-09-23). (the browser API key only accepts biblesketch.app): Google Cloud console > APIs & Services > Credentials > the Firebase browser key (`AIzaSyAxrH…`) > Website restrictions: add `https://biblesketch-web.supersonicworkers.workers.dev/*`, Save (up to 5 min to apply). For Google sign-in there too: Firebase console > Authentication > Settings > Authorized domains: add `biblesketch-web.supersonicworkers.workers.dev`. **Remove both after cutover step 2.**
- [ ] **Test the new pages on https://biblesketch.app** (live since 2026-09-23): make one Scene Art page and one Verse Art page, try Make changes, Remove Color and Add Ref on the result, publish one, check My Gallery and Saved on /gallery, open /pricing (don't buy). Each generation or paid edit uses 1 of your credits; failures are refunded.
- [x] 2026-09-23: Cutover steps 1 and 2 approved and live (owner: "push live, we'll debug there").
- [ ] One real purchase test (the cheapest pack) to see the credits land and the Purchase event fire.
- [ ] Cloudflare dashboard (optional, saves Worker requests): Workers Routes on biblesketch.app, add routes with Worker = **None** for `biblesketch.app/__/*`, `biblesketch.app/assets/*`, `biblesketch.app/references/*`, `biblesketch.app/sitemap.xml`. Today the Worker passes them through to Firebase, which works.
- [ ] **Around 2026-09-30, approve the cleanup (phase 5):** removes the old app's functions and routes; after it there is no rollback to the old site.
- [ ] Firebase console > Authentication > Sign-in method: disable **Anonymous** (owner decision; nothing uses it).
- [ ] (Optional) Cloudflare Cache Rule: ignore the query string for `/` and `/bible-verse-coloring` in the cache key, so ad clicks (`?utm_…`, `?gclid`, `?fbclid`, `?epik`) share one cached page. Not needed for correctness.
- [x] **Thumbnail palette PNGs** (optional). Firebase console > Extensions > Resize Images (0.3.0) > Reconfigure: set output options to palette PNG. Smaller thumbnails; slightly lossy where verse text is colored, so check a few by eye.

### Google Cloud / Firebase console (confirm these were done in the Phase A hotfix)
- [ ] Gemini API: per-model quota caps and a billing budget alert.
- [x] Old Gemini keys deleted at the source; old secret versions disabled; current key restricted to the Generative Language API (API restriction only, no referrer restriction).
- [x] Auth > Authorized domains: remove the stale `bible-sketch-platform-267611631790.us-west1.run.app`.
- [ ] Monitoring alerts for generation failures (ROADMAP S1) — until then, try one generation on the live site each week.

### Zoho
- [ ] Make the customer "User ID" custom field read-only in the customer portal (ROADMAP S5).

### Recurring
- [ ] **Monthly:** run `node scripts/optimize-sketch-images.mjs --apply` (or ask an agent to), until a Storage trigger replaces it.
- [ ] **2-4 weeks after 2026-09-22:** Search Console > Pages and Sitemaps: soft 404s and duplicate-canonical counts should fall; the sitemap should show 338 discovered URLs with no errors.

## Done
- [x] 2026-09-23: Purge secret + WORKER_PURGE_URL set, `onSketchWritten` deployed; private → 404 → public test passed on a live sketch.
- [x] 2026-09-23: Live auth tested by the owner on phase 1 pages (sign-up and login work). Phase 2 cutover approved and live (coloring pages, tags, profiles, /api).
- [x] 2026-09-23: Phase 1 cutover approved and live (about, privacy, terms, verified, blog on the Worker).
- [x] 2026-09-23: Phase 0 /labs probe routes deleted in the Cloudflare dashboard (`_astro/*` and `img/*` kept for phase 1).
- [x] 2026-09-23: Phase 1 copy changes approved as drafted (docs/copy-review-phase1.md). Set LAST_UPDATED in privacy/terms to the go-live date at cutover.
- [x] 2026-09-23: Workers Paid confirmed active on the Cloudflare account; Phase 0 zone probe routes approved.
- [x] 2026-09-22: Cloudflare purge of `/og.png`, `/logo.png`, Christmas blog cover; Email Obfuscation off; Bot Fight Mode decided.
- [x] 2026-09-22: Sitemap resubmitted in Search Console.
