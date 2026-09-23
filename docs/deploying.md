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

## Astro Worker (`web/`, branch astro-rebuild)

Worker `biblesketch-web` on Cloudflare (account "Supersonic Sites Master Account"). It answers only the route
patterns bound on the `biblesketch.app` zone; everything else still goes to Firebase Hosting.

Before any deploy, from `web/`, with the emulators running (`scripts/emulators.cmd` in the seo-fixes worktree)
and `npx astro preview --port 4321` on a fresh build:
1. `node scripts/check-sketch.mjs`, `node scripts/check-pages.mjs`, `node scripts/e2e-auth.mjs`: all pass.
2. Stop the preview (Windows locks `dist/`), `npm run build`, `npx wrangler deploy`.
3. On workers.dev: `node scripts/lighthouse.mjs https://biblesketch-web.supersonicworkers.workers.dev 3 --paths=...`
   (in Git Bash prefix `MSYS_NO_PATHCONV=1`, or `/about` is rewritten to a Windows path).

Every deploy starts from a cold Workers Cache (it is keyed by Worker version), so no purge is needed after one.

### Taking routes (owner-approved, one phase at a time)
1. In `wrangler.jsonc` add the phase's patterns to `routes` (each `{ "pattern": "biblesketch.app/<path>*",
   "zone_name": "biblesketch.app" }`; a trailing `*` also catches query strings, which an exact route misses)
   and its paths to `vars.LIVE_PREFIXES` (comma-separated; e.g. `/about,/privacy,/terms,/verified,/blog`).
   Paths the patterns catch but LIVE_PREFIXES doesn't list (e.g. `/aboutus`) are passed to Firebase.
   Static files in `web/public` that a pattern catches must exist there (`/about-Renaud.webp`, `/blog-images/*`).
2. Deploy, then check every URL of the phase with `?cb=<random>`: status, `<title>`, no `x-served-by`
   Firebase headers, and `curl -H 'Accept: text/html'` shows the Zaraz script.
3. Rollback: remove the prefix from `LIVE_PREFIXES` and deploy (seconds; the Worker passes those paths
   to Firebase). The route itself can stay. wrangler never deletes routes, even with `"routes": []`: remove
   them in the dashboard (Workers & Pages > biblesketch-web > Settings > Domains & Routes).

Phase 1 patterns: `about*`, `privacy*`, `terms*`, `verified*`, `blog*` (plus the existing `_astro/*`, `img/*`).

Phase 2 patterns: `coloring-page*`, `tags*`, `profile*`, `api/*` (print, download, purge); LIVE_PREFIXES adds
`/coloring-page,/tags,/profile,/api`. In the same change, deploy the purge trigger from seo-fixes: set the secret
(`firebase functions:secrets:set WORKER_PURGE_SECRET`, the same value as the Worker's `PURGE_SECRET`; set both
fresh), put `WORKER_PURGE_URL=https://biblesketch.app/api/purge` in `functions/.env`, then
`firebase deploy --only "functions:onSketchWritten" --project biblesketch-5104c`. Check: make a test sketch
private and its page 404s within seconds (CHECKLIST, purge check 2c).

Phase 2 routes went live 2026-09-23; the secrets are an owner step (agents are blocked from secret stores).
PowerShell, from `C:\Users\renau\Coding\BibleSketch-astro\web` (writes the value to two temp files, then deletes them;
`secret bulk` and `--data-file` avoid the newline a PowerShell pipe would add):

```powershell
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); $s = ($b | ForEach-Object { $_.ToString('x2') }) -join ''
@{ PURGE_SECRET = $s } | ConvertTo-Json | Set-Content -Encoding ascii "$env:TEMP\ps.json"; Set-Content -NoNewline -Encoding ascii "$env:TEMP\ps.txt" $s
npx wrangler secret bulk "$env:TEMP\ps.json"
npx firebase functions:secrets:set WORKER_PURGE_SECRET --data-file "$env:TEMP\ps.txt" --project biblesketch-5104c
Remove-Item "$env:TEMP\ps.json", "$env:TEMP\ps.txt"; Remove-Variable s, b
```

### Phases 3-4 (gallery, pricing, generators)
Generation functions (seo-fixes, live since 2026-09-23): `createSketch`, `editSketch`, `refundStaleGenerations`,
`cleanupDeletedAccounts`. Deploy them only with a quoted `--only` list; they need `GEMINI_API_KEY` (already set).
In the emulator they use a fake Gemini when `functions/.env.local` has `FAKE_GEMINI=1`. Real-model check without
the site: run `functions/generation/pipeline.js` from a node one-liner with a key (see ROADMAP "Phases 3-4 result").

Both steps went live 2026-09-23. Step 1 patterns: `gallery*`, `pricing*`; LIVE_PREFIXES adds `/gallery,/pricing`.
Step 2 (generators): `/` can't be an exact route (it would miss `/?utm_source=…`), so bind `biblesketch.app/*` and
add `/,/bible-verse-coloring` to LIVE_PREFIXES; the middleware keeps passing every other path to Firebase. In the
dashboard, add routes with Worker = **None** for `biblesketch.app/__/*`, `/assets/*`, `/references/*` and
`/sitemap.xml`, so Firebase Auth's handler, the old bundle's files and the sitemap never depend on the Worker.
Verify: `/__/auth/handler` 200, Google sign-in on the live site, `/?utm_source=x` served by the Worker,
`/assets/index-DHKtGwi1.js` still immutable from Firebase, `/sitemap.xml`, an unknown path 404s.

## History: SEO fixes rollout (2026-09-22, done)

Deployed wave by wave from tags: `wave-1` (no-op Hosting release), `wave-3` (404 page, fonts, og.png), `wave-4a` / `wave-4b` / `wave-4c` (renderers), sitemap from `wave-4c`, `wave-6` (Storage headers), then `wave-4c2` and `wave-4c3` (template follow-ups). Live renderers = `wave-4c3`. Rollback per wave: 4a → `wave-1`; 4b → `wave-4a`; 4c → `wave-4b`; sitemap → `wave-1` (`functions:sitemap` only); each followed by a CDN flush.
