# Bible Sketch

AI Bible coloring-page generator: https://biblesketch.app (Firebase project `biblesketch-5104c`, behind Cloudflare).

Agents: read [CLAUDE.md](CLAUDE.md) first. Plans: [ROADMAP.md](ROADMAP.md). Manual owner tasks: [CHECKLIST.md](CHECKLIST.md).

## What runs in production

| Part | Where | Source |
|---|---|---|
| Front end (React SPA) | Firebase Hosting, `hosting-public/` | **Source lost.** Only the built bundle survives (`hosting-public/assets/index-DHKtGwi1.js`). The root `App.tsx`, `components/`, `services/` are an *older* version, useful as reference only. |
| SEO HTML for every route | 13 render functions in `functions/index.js`, template `functions/index.html` | here |
| Sitemap | `sitemap` function | here |
| Generation proxy (Gemini) | `generateContent` callable | here |
| Billing | `handleZohoWebhook` (Zoho Billing) | here |
| User doc triggers | `onUserCreated`, `onUserDeleted` | here |
| Data rules | `firestore.rules`, `storage.rules`, `firestore.indexes.json` | here |

## Branches

- `seo-fixes`: **production.** Everything live is on this branch.
- `recovered-prod`: production as recovered on 2026-09-22 plus the security hotfix (base of `seo-fixes`).
- `coloring-page-quality`: newer generation prompts and models, not deployed. To be folded into the rebuild.
- `main`: old, predates the Dec 2025 production deploy.

## Local setup

Windows machine; Node 22+; firebase-tools (global, logged in); JDK 21 for the emulators.

```bash
npm ci --legacy-peer-deps          # react-helmet-async peers React <=18
cd functions && npm ci && cd ..
scripts/emulators.cmd              # auth, firestore, storage, functions, hosting on :5000
node scripts/security-check.mjs    # 34 regression checks against the emulators
```

The emulators need `functions/.secret.local` (dummy `GEMINI_API_KEY`, `ZOHO_WEBHOOK_SECRET=localtestsecret123`, `WORKER_PURGE_SECRET=localpurgesecret`) and `functions/.env.local` (`ZOHO_ENFORCE_AUTH=true`, `WORKER_PURGE_URL=http://127.0.0.1:8788/api/purge`). Open the app at `http://localhost:5000`: on any other host the bundle talks to **production** Firebase.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/security-check.mjs` | Regression suite (rules, callable, webhook, renderers, sitemap) |
| `scripts/check-hosting-public.mjs` | Deploy guard for `hosting-public/` (predeploy hook) |
| `scripts/optimize-sketch-images.mjs` | Cache-Control on new Storage originals (monthly) |
| `scripts/audit-credit-grants.mjs`, `strip-user-emails.mjs` | One-off admin scripts (dry run by default) |
| `scripts/firestore-rest.mjs` | Firestore REST helper using the Firebase CLI login |

## Deploying

See [docs/deploying.md](docs/deploying.md). Never `npm run build`, never `firebase deploy` without a quoted `--only` list.
