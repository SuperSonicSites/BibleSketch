# Manual checklist

Only work that needs a human: console access, dashboards, decisions, or accounts an agent can't use. Code work lives in [ROADMAP.md](ROADMAP.md). Tick items and add the date.

## Open

### Decisions
- [ ] **Unpaid premium/credits accounts.** 8 accounts have premium or credits without any payment (beta-week sign-ups, Nov 24-28, 2025; one orphan doc `EIV569…` with no Auth user). Keep or revoke?
- [ ] **Bucket CORS.** Allow GET from `https://biblesketch.app` on the Storage bucket now, or wait for the rebuild (needed before any browser-side image editing; see ROADMAP 1.1).
- [ ] **"Remove Color" pricing.** Free (rate-limited) or 1 credit (ROADMAP 1.1).
- [ ] **Thumbnail palette PNGs** (optional). Firebase console > Extensions > Resize Images (0.3.0) > Reconfigure: set output options to palette PNG. Smaller thumbnails; slightly lossy where verse text is colored, so check a few by eye.

### Google Cloud / Firebase console (confirm these were done in the Phase A hotfix)
- [ ] Gemini API: per-model quota caps and a billing budget alert.
- [ ] Old Gemini keys deleted at the source; old secret versions disabled; current key restricted to the Generative Language API (API restriction only, no referrer restriction).
- [ ] Auth > Authorized domains: remove the stale `bible-sketch-platform-267611631790.us-west1.run.app`.
- [ ] Monitoring alerts for generation failures (ROADMAP S1) — until then, try one generation on the live site each week.

### Cloudflare (Astro rebuild)
- [ ] **Delete the 2 Phase 0 probe routes** of Worker `biblesketch-web`: Workers & Pages > biblesketch-web > Settings > Domains & Routes: `biblesketch.app/labs` and `biblesketch.app/labs/*` (wrangler can't remove routes; they now return a 404 page from the Worker). Keep `biblesketch.app/_astro/*` and `biblesketch.app/img/*`: rollout phase 1 needs them.
- [ ] **Review the phase 1 copy changes** in [docs/copy-review-phase1.md](docs/copy-review-phase1.md) (About, Privacy, Terms) and answer its ❓ items. The cutover waits for this.
- [ ] **Approve the phase 1 cutover** (ROADMAP 1, phase 1 plan step 5): the Worker takes `/about`, `/privacy`, `/terms`, `/verified`, `/blog*` on biblesketch.app. Preview everything first on https://biblesketch-web.supersonicworkers.workers.dev (it talks to production Firebase: logging in with an existing account works there, but sign-up and Google sign-in only work on biblesketch.app).
- [ ] (Optional, purge check 2c) After rollout phase 2 ships the trigger: make one of your own sketches private in the app, check its `/coloring-page/…` URL 404s within seconds, then make it public again.

### Zoho
- [ ] Make the customer "User ID" custom field read-only in the customer portal (ROADMAP S5).

### Recurring
- [ ] **Monthly:** run `node scripts/optimize-sketch-images.mjs --apply` (or ask an agent to), until a Storage trigger replaces it.
- [ ] **2-4 weeks after 2026-09-22:** Search Console > Pages and Sitemaps: soft 404s and duplicate-canonical counts should fall; the sitemap should show 338 discovered URLs with no errors.

## Done
- [x] 2026-09-23: Workers Paid confirmed active on the Cloudflare account; Phase 0 zone probe routes approved.
- [x] 2026-09-22: Cloudflare purge of `/og.png`, `/logo.png`, Christmas blog cover; Email Obfuscation off; Bot Fight Mode decided.
- [x] 2026-09-22: Sitemap resubmitted in Search Console.
