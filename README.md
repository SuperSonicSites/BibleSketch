<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1KgskLl18a5-hUpp_wDtwgGP7HFMqQlx5

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploying

This branch is production (`biblesketch-5104c`) and the front-end source is lost. `hosting-public/` is the live Hosting release, byte for byte (hashes in `scripts/hosting-live-files.json`). `functions/index.html` is the SSR template the render functions fill in.

Never:
- run `npm run build`: it rebuilds the old front end over `functions/index.html`. The `build`/`deploy` npm scripts are disabled on purpose.
- run `firebase deploy` without `--only`.
- add `hosting-public/index.html`: it would shadow the `/` → homeRender rewrite.
- remove an `/assets/*` file. Carry every hashed asset forward, since cached HTML still points at old ones.

`node scripts/check-hosting-public.mjs` enforces this and runs as the Hosting predeploy hook. Put files you change or add on purpose in its `CHANGED` / `ADDED` lists.

### Hosting release

1. `node scripts/check-hosting-public.mjs`
2. Start the emulators (`scripts\emulators.cmd`, launch entry `emulators-recovered-prod`), then `node scripts/security-check.mjs`.
3. `firebase hosting:channel:deploy <name> --expires 3d --no-authorized-domains --project biblesketch-5104c`
4. Check the channel URL with curl (the template sends browsers away from `*.web.app`): every route returns 200 and references `/assets/index-DHKtGwi1.js`, `/assets/*` stay `immutable`, `/__/auth/handler` returns 200.
5. Promote the tested version: `firebase hosting:clone biblesketch-5104c:<name> biblesketch-5104c:live --project biblesketch-5104c`
6. For any file changed in place (no hash in its name: `og.png`, `logo.png`, `robots.txt`, ...), purge its URL in Cloudflare (Caching > Custom Purge > URL). Cloudflare otherwise keeps it for up to a year.

Rollback: `firebase hosting:clone biblesketch-5104c@<version> biblesketch-5104c:live --project biblesketch-5104c` with the previous version from Console > Hosting > Release history (the Dec 12 original is `71e21728728e83ff`), or use Rollback in that console page.
Once the self-hosted fonts template is live (wave 4c), roll the renderers back to `wave-4b` BEFORE rolling Hosting back past wave 3. Otherwise every page asks for `/fonts/*`, gets a 404, and Cloudflare and browsers keep that 404 for a year. After any Hosting release that brings `/fonts` back, purge the 10 `/fonts/*.woff2` URLs in Cloudflare.

### Functions

- Always deploy an explicit, **quoted** list: `firebase deploy --only "functions:a,functions:b" --project biblesketch-5104c`. PowerShell splits an unquoted comma list and the deploy aborts. Never include `generateContent`, `handleZohoWebhook`, `onUserCreated` or `onUserDeleted`.
- Each listed function uploads the whole `functions/` directory (`index.js` and the `index.html` template), so deploy from a clean checkout of exactly the ref you mean.
- The 13 renderers: `"functions:homeRender,functions:sketchRender,functions:profileRender,functions:blogRender,functions:galleryRender,functions:verseRender,functions:tagRender,functions:blogListingRender,functions:pricingRender,functions:aboutRender,functions:privacyRender,functions:termsRender,functions:verifiedRender"`
- Rollback: check out the previous ref and redeploy the same list, then flush the Hosting CDN, which a Functions deploy never does (pages are cached up to 1 day). A new Hosting release flushes it: `firebase hosting:channel:deploy flush-<n> --expires 1d --no-authorized-domains --project biblesketch-5104c`, then `firebase hosting:clone biblesketch-5104c:flush-<n> biblesketch-5104c:live --project biblesketch-5104c`. Cloning the live version onto itself does nothing.
- Redeploying an older commit does not undo `minInstances`: an unset option leaves the deployed value alone. To stop the warm sketchRender instance, deploy it once with `minInstances: 0`.
- Channels call the live functions, so function changes can only be tested in the emulators.
- The functions predeploy hook runs `check-hosting-public.mjs --live`, which fails if a file `functions/index.html` references isn't live on `biblesketch-5104c.web.app` yet (release Hosting first). If web.app or the network is down and a billing hotfix can't wait, skip it for that deploy: `$env:SKIP_LIVE_ASSET_CHECK='1'` (PowerShell), then `Remove-Item Env:SKIP_LIVE_ASSET_CHECK`.
- Function deploys don't purge the Hosting CDN, so rendered HTML can stay stale for hours. Verify with `?cb=<random>`.

### SEO fixes rollout (branch `seo-fixes`)

One wave at a time, each from its tag: `git checkout <tag>`, deploy, check, then `git checkout seo-fixes`. The commits are not in wave order, so never deploy a wave from the branch tip. Run the emulators + `node scripts/security-check.mjs` before each wave. In PowerShell use `curl.exe`.

| Wave | Deploy from | What | How | Check after |
|---|---|---|---|---|
| 1 | `wave-1` | No-op Hosting release (proves the pipeline) | Hosting release steps above | deploy log shows 0 new files; site unchanged |
| 2 | – | Cloudflare: Email Address Obfuscation off; review Bot Fight Mode | dashboard | – |
| 3 | `wave-3` | 404 page, fonts, og.png, logo.png, blog cover | Hosting release steps above. On the channel first: `curl.exe -sI <channel-url>/assets/index-ZZtest.js` must show one `Cache-Control: no-store`; if not, drop the `404.html` header rule | purge `/og.png`, `/logo.png`, `/blog-images/christian-christmas-coloring-pages.webp` in Cloudflare. Don't open `/fonts/` URLs on biblesketch.app before this is live |
| 4a | `wave-4a` | Real 404/503s, 301s, noindex | `firebase deploy --only <the 13 renderers, quoted> --project biblesketch-5104c` | `/pricing?cb=1` is 200 (no loop); `/coloring-page/foo/doesnotexist123?cb=1` is 404; `https://biblesketch-5104c.web.app/pricing?cb=1` is 301 to biblesketch.app; sign in and open one of your private sketches: it renders |
| 4b | `wave-4b` | Thumbnail hero, JSON-LD, cards, caching, minInstances | same command (accept the min-instance cost prompt) | a sketch page's hero `<img>` is a `_400x533` URL with `fetchpriority="high"`; no `aggregateRating` in the page source |
| 4c | `wave-4c` | Template: self-hosted fonts, max-image-preview, rating stripper | same command (the predeploy hook refuses until wave 3 is live) | no `fonts.googleapis` in any page; fonts look unchanged |
| 5 | `wave-4c` | Sitemap | `firebase deploy --only "functions:sitemap" --project biblesketch-5104c` | total `<loc>` equals unique; resubmit `https://biblesketch.app/sitemap.xml` in Search Console |
| 6 | `seo-fixes` | Cache-Control on full-size sketch images | `node scripts/optimize-sketch-images.mjs` (dry run), then with `--apply`; re-run monthly | a full-size sketch PNG returns `Cache-Control: private, max-age=31536000, immutable` |

Rollback per wave (then flush the CDN as above): 4a to `wave-1`; 4b to `wave-4a`; 4c to `wave-4b`; 5 to `wave-1` (`functions:sitemap` only); 3 by Hosting rollback to the wave-1 release (roll 4c back first).
