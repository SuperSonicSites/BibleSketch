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

Rollback: `firebase hosting:clone biblesketch-5104c@71e21728728e83ff biblesketch-5104c:live --project biblesketch-5104c`, or Console > Hosting > Release history > Rollback.

### Functions

- Always deploy an explicit list: `firebase deploy --only functions:a,functions:b --project biblesketch-5104c`. Never include `generateContent`, `handleZohoWebhook`, `onUserCreated` or `onUserDeleted`. Each listed function uploads the whole `index.js`, so deploy from one clean commit.
- Rollback: check out the previous commit and redeploy the same `--only` list.
- Channels call the live functions, so function changes can only be tested in the emulators.
- The functions predeploy hook runs `check-hosting-public.mjs --live`, which fails if a file `functions/index.html` references isn't live on `biblesketch-5104c.web.app` yet (release Hosting first). If web.app or the network is down and a billing hotfix can't wait, skip it for that deploy: `$env:SKIP_LIVE_ASSET_CHECK='1'` (PowerShell), then `Remove-Item Env:SKIP_LIVE_ASSET_CHECK`.
- Function deploys don't purge the Hosting CDN, so rendered HTML can stay stale for hours. Verify with `?cb=<random>`.
