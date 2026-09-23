# Deploying

Production is Firebase project `biblesketch-5104c`, behind Cloudflare. There is no CI: deploys run from this worktree.

The front-end source is lost. `hosting-public/` is the live Hosting release, byte for byte (hashes in `scripts/hosting-live-files.json`), plus intended changes. `functions/index.html` is the SSR template the render functions fill in.

Never:
- run `npm run build`: it rebuilds the old front end over `functions/index.html`. The `build`/`deploy` npm scripts are disabled on purpose.
- run `firebase deploy` without `--only`.
- add `hosting-public/index.html`: it would shadow the `/` → homeRender rewrite.
- remove an `/assets/*` file. Carry every hashed asset forward, since cached HTML still points at old ones.

`node scripts/check-hosting-public.mjs` enforces this and runs as the Hosting predeploy hook. Put files you change or add on purpose in its `CHANGED` / `ADDED` lists.

## Hosting release

1. `node scripts/check-hosting-public.mjs`
2. Start the emulators (`scripts\emulators.cmd`), then `node scripts/security-check.mjs`.
3. `firebase hosting:channel:deploy <name> --expires 3d --no-authorized-domains --project biblesketch-5104c`
4. Check the channel URL with curl (the template sends browsers away from `*.web.app`): every route returns 200 and references `/assets/index-DHKtGwi1.js`, `/assets/*` stay `immutable`, `/__/auth/handler` returns 200. Optionally compare the channel's file list with live through the Hosting API (`versions/<id>/files`): only intended paths should differ.
5. Promote the tested version: `firebase hosting:clone biblesketch-5104c:<name> biblesketch-5104c:live --project biblesketch-5104c`
6. For any file changed in place (no hash in its name: `og.png`, `logo.png`, `robots.txt`, ...), purge its URL in Cloudflare (Caching > Custom Purge > URL). Cloudflare otherwise keeps it for up to a year.

Rollback: `firebase hosting:clone biblesketch-5104c@<version> biblesketch-5104c:live --project biblesketch-5104c` with the previous version from Console > Hosting > Release history (the Dec 12, 2025 original is `71e21728728e83ff`). The template now needs `/fonts/*` (added in release `wave-3`): roll the renderers back to `wave-4b` BEFORE rolling Hosting back past `wave-3`, and after any release that brings `/fonts` back, purge the 10 `/fonts/*.woff2` URLs in Cloudflare.

## Functions

- Always deploy an explicit, **quoted** list: `firebase deploy --only "functions:a,functions:b" --project biblesketch-5104c`. PowerShell splits an unquoted comma list and the deploy aborts. Never include `generateContent`, `handleZohoWebhook`, `onUserCreated` or `onUserDeleted` unless that function is the change.
- Each listed function uploads the whole `functions/` directory (`index.js` and the `index.html` template), so deploy from a clean checkout of exactly the ref you mean.
- The 13 renderers: `"functions:homeRender,functions:sketchRender,functions:profileRender,functions:blogRender,functions:galleryRender,functions:verseRender,functions:tagRender,functions:blogListingRender,functions:pricingRender,functions:aboutRender,functions:privacyRender,functions:termsRender,functions:verifiedRender"`
- In a non-interactive shell, a deploy that raises min-instance cost aborts unless `--force` is passed. With an explicit `--only` list, `--force` only skips prompts (deletions are limited to the listed functions).
- Function deploys don't purge the Hosting CDN (pages are cached up to 1 day). Verify with `?cb=<random>`, and flush with a new Hosting release: `firebase hosting:channel:deploy flush-<n> --expires 1d --no-authorized-domains --project biblesketch-5104c`, then `firebase hosting:clone biblesketch-5104c:flush-<n> biblesketch-5104c:live --project biblesketch-5104c`. Cloning the live version onto itself does nothing.
- Rollback: check out the previous ref, redeploy the same list, flush the CDN. Redeploying an older commit does not undo `minInstances`: deploy once with `minInstances: 0` to remove it.
- Channels call the live functions, so function changes can only be tested in the emulators.
- `onSketchWritten` (edge-cache purge for the Astro Worker) is **not deployed yet**; it ships with rollout phase 2 (ROADMAP 1). Before its first deploy: `firebase functions:secrets:set WORKER_PURGE_SECRET --project biblesketch-5104c` (same value as the Worker's `PURGE_SECRET`) and `WORKER_PURGE_URL=https://biblesketch.app/api/purge` in `functions/.env`. With the URL unset it does nothing.
- The functions predeploy hook runs `check-hosting-public.mjs --live`, which fails if a file `functions/index.html` references isn't live on `biblesketch-5104c.web.app` yet (release Hosting first). For a billing hotfix when web.app is unreachable: `$env:SKIP_LIVE_ASSET_CHECK='1'` (PowerShell), then `Remove-Item Env:SKIP_LIVE_ASSET_CHECK`.

## Storage

`node scripts/optimize-sketch-images.mjs` (dry run), then `--apply`: gives new full-size sketch originals `Cache-Control: private, max-age=31536000, immutable`. Idempotent; run monthly.

## History: SEO fixes rollout (2026-09-22, done)

Deployed wave by wave from tags: `wave-1` (no-op Hosting release), `wave-3` (404 page, fonts, og.png), `wave-4a` / `wave-4b` / `wave-4c` (renderers), sitemap from `wave-4c`, `wave-6` (Storage headers), then `wave-4c2` and `wave-4c3` (template follow-ups). Live renderers = `wave-4c3`. Rollback per wave: 4a → `wave-1`; 4b → `wave-4a`; 4c → `wave-4b`; sitemap → `wave-1` (`functions:sitemap` only); each followed by a CDN flush.
