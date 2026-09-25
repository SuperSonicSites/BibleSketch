# CLAUDE.md

Bible Sketch (https://biblesketch.app) turns Bible verses into printable coloring pages. Solo owner, production app with paying customers. Firebase project `biblesketch-5104c` behind Cloudflare. **Branch `main` is production** (since 2026-09-23: `seo-fixes` and `astro-rebuild` were fast-forwarded into it and are frozen). Work and deploy from `main` in `C:\Users\renau\Coding\BibleSketch-astro`; the `C:\Users\renau\Coding\BibleSketch-recovered-prod` worktree (seo-fixes) is retired. Roadmap: [ROADMAP.md](ROADMAP.md). Owner-only tasks: [CHECKLIST.md](CHECKLIST.md). Deploys: [docs/deploying.md](docs/deploying.md).

## Layout

- `web/`: the front end, Astro 7 + React islands on the Cloudflare Worker `biblesketch-web` (its own package.json and wrangler config). It serves every page of biblesketch.app (route `biblesketch.app/*`); paths not in `LIVE_PREFIXES` (`/__/auth`, `/sitemap.xml`, `/assets`, `/references`) pass through to Firebase Hosting.
- `functions/`: the backend, in numbered sections of `index.js`. Generation = `createSketch` / `editSketch` (server-side charging with refunds; `functions/generation/`: prompts, pipelines, image ops, QA metrics), plus the billing webhook, sitemap, purge trigger, user triggers, lifecycle email (§17) and the on-site checkout (§18). The old SEO render functions and the client-charged `generateContent` stay until phase 5 (ROADMAP 1), but no page uses them.
- `coloring-page-quality` is ported into `functions/generation/`, not merged (its commit edits the old SPA source). The prompt lab (`C:\Users\renau\Coding\BibleSketch\lab`, gitignored) still imports that branch's copy of the prompts.
- In `web/`: `npm run build`, `npx astro preview` (workerd, http://localhost:4321; stop it before rebuilding, Windows locks `dist/`), `npx wrangler deploy` (Worker `biblesketch-web`), `node scripts/check-sketch.mjs` (parity with 3 live pages), `node scripts/lighthouse.mjs <origin> [runs] [--cold] [--paths=/a,/b]` (Git Bash: prefix `MSYS_NO_PATHCONV=1`), `node scripts/check-pages.mjs [origin]` (head parity with live), and against the emulators `node scripts/e2e-auth.mjs` / `e2e-downloads.mjs` / `e2e-generate.mjs` (uncomment `FIRESTORE_EMULATOR` in `web/.dev.vars`, rebuild, preview on http://localhost:4321; honoured only for localhost requests; comment it out again before a production build). Phases 1-4 are live on biblesketch.app since 2026-09-23 (the Worker has `biblesketch.app/*`; unported paths pass through to Firebase) (routes in `web/wrangler.jsonc`; rollback = drop a prefix from `LIVE_PREFIXES` and deploy; ROADMAP 1). `npm install` needs `npm approve-scripts` for new packages with install scripts. The purge secret is the Worker secret `PURGE_SECRET`; the Firebase side is `WORKER_PURGE_SECRET` (same value). The hello@ reply reader (`email()` in `web/src/worker.ts`) reuses it to call `emailReply`.

## Pinterest

- Plan: [docs/pinterest-strategy.md](docs/pinterest-strategy.md) (built from Pinterest's own recommender papers). Execution: ROADMAP 1.5, calendar `web/src/data/pins.json`, feeds `/pins/<board>.xml`.
- Before writing or editing any Pin title or description, read the Pin copy rules (§3.3a of the plan) and run `node scripts/pins-check.mjs` in `web/`. Pacing is a ramp (1 Pin a day from 2026-09-24, +1 each week, up to 5; pins-check enforces it), and every page is reviewed up close before it enters the calendar. After Pins publish, set their alt text with `node scripts/pins-alt.mjs` (RSS can't carry it). Never change a released entry's title before `|` (it names the Pin image).
- **Where we are and how to do each job** (batch generation on the master account, review, publish, scheduling, feeds, the Pinterest API app): [docs/pinterest-runbook.md](docs/pinterest-runbook.md). Read its Status block first and update it at the end of every Pinterest session.
- The scheduled task `pinterest-daily` (7:00 local, desktop app) is owner-authorized (2026-09-24) to generate, review, publish and schedule 5 Pins a day, following the yearly calendar (`web/src/data/pin-year.json`, `node scripts/pins-plan.mjs`) and the learning loop (`pin-learn.json`, `scripts/pins-learn.mjs`), and to deploy the Worker and push `pins.json`, `pin-year.json`, `pin-learn.json` and the runbook, within the scope written in the runbook's "Daily scheduled task" section. That standing approval covers only that task's runs.
- The Gemini key has an AI Studio monthly spend cap. On 2026-09-23 a big batch hit it and every customer's generation failed until the owner raised it: ask the owner about headroom before a large batch, and stop a batch after 3 failures in a row.

## Email

- Lifecycle and marketing email to sign-ups: [docs/email-marketing-plan.md](docs/email-marketing-plan.md). It covers the Dean Jackson philosophy, voice rules, campaigns, the Firestore → Resend system and CASL. Read its §1-2 and use the §9 checklist before writing any email; ROADMAP 1.6 tracks the build. Sending to real users is owner-approved until the owner grants a standing approval.
- The engine (phase 1, 2026-09-25): `functions/email.js` holds every email's words and `due()`, the rules for who gets what, when; `emailTick` (functions/index.js section 17) sends through Resend every 30 minutes. It sends nothing until `config/email` has `live: true` (an owner-approved data write); until then it logs what it would send. Changing an email's words changes live email: get the owner's approval of a test send first (`node scripts/email-check.mjs --render=<owner email>`, then the Resend MCP).

## Billing and checkout

- Zoho Billing, Canada data center (`subscriptions.zohocloud.ca`, org 110000236578, base currency CAD; gateway Stripe). The memory note `zoho-billing` has the webhook payloads and the safe-resend rules. `handleZohoWebhook` grants by plan code (`PREMIUM_PLANS`, `PRINTS_PLANS`) and reads the uid from the customer field `cf_cf_firebase_uid`.
- **Prices are USD everywhere** (owner, 2026-09-25): they come from Zoho's USD price lists ("US Bible Sketch Premium" holds Premium and the Prints plans; one list per pack), not the CAD plan prices. The Prints plans ($1.99 a month, $19.99 a year) are sold only through email offers.
- **On-site checkout, live since 2026-09-25:** the pricing buttons open `/checkout/<plan>`. It has no header or footer, has a strict CSP (`web/src/middleware.ts`), and embeds the hosted page that `createCheckout` opens through the Zoho API (a dedicated "Bible Sketch checkout" client; if it breaks, run `node scripts/zoho-token.mjs` and redeploy `createCheckout`). The uid field is hidden from customers in Zoho, so Zoho's plain checkout links no longer work for us. Details: plan §12.20 item 4.

## Facts you can't infer from the code

- **Since 2026-09-23 the Worker serves every page.** The old SPA (the bundle `hosting-public/assets/index-DHKtGwi1.js`, and the older root `App.tsx`, `components/`, `services/`) is reference only: grep it to see what production used to do. It and its functions go in phase 5, planned for around 2026-09-30 and waiting on the owner's OK.
- Caching: the Worker caches public pages up to a day (`onSketchWritten` purges them through `/api/purge`). Paths passed through to Firebase keep the Hosting CDN, which only a Hosting release flushes. Add `?cb=<random>` when checking a change.

## Hard rules (each one has broken production or nearly did)

- Never run `npm run build` at the repo root: it overwrites `functions/index.html` with the old front end (in `web/` it's the normal build).
- Never `firebase deploy` without an explicit, **quoted** `--only "functions:a,functions:b"` list (unquoted lists break in PowerShell; unscoped deploys can delete live functions). Hosting only through the channel → clone procedure in docs/deploying.md; never add `hosting-public/index.html`; never delete an `/assets/*` file.
- Both front ends (`web/src/lib/firebase-client.ts`, the old `services/firebase.ts`) use the emulators only when the hostname is exactly `localhost`. Opening a local app via `127.0.0.1` or a LAN IP talks to **production**.
- Several sessions deploy the Worker from this working tree (`pinterest-daily` included), so anything uncommitted in `web/` ships with their deploy. Keep `web/` deployable at all times, and add new pages unlinked until they're ready.
- `functions/package-lock.json` must keep its optional platform packages (fsevents, @unrs/resolver-binding-*, @emnapi/*). Don't regenerate it casually; Cloud Build's `npm ci` fails without them.
- Production deploys, data writes and Zoho resends are owner-approved actions: ask first unless the owner asked for that specific action in this conversation. Zoho resends can grant credits twice (check `processedWebhooks` first).
- Write docs and code with the editor tools, not through shell strings: backticks inside a bash double-quoted string execute as commands, and regex backslashes get lost in heredoc and template strings.
- Files use CRLF (`functions/index.js`, `functions/index.html`, scripts). Keep endings consistent; `hosting-public/**` is `-text` and must stay byte-exact.

## Verify before you say done

```bash
scripts/emulators.cmd                    # full emulator suite; app at http://localhost:5000
node scripts/security-check.mjs          # 54 checks; must all pass (restart the emulators between runs)
node scripts/check-hosting-public.mjs    # before any Hosting change (add --live before a functions deploy)
node --check functions/index.js
node scripts/email-check.mjs             # after touching functions/email.js (rules, words) or web/src/lib/email-reply.ts
```

- Emulator notes: after many runs in one day, delete `rateLimits/global_<YYYY-MM-DD>` in the Firestore emulator or the cap test fails. The Hosting emulator ignores `firebase.json` headers; check headers on a preview channel.
- Browser checks: the in-app browser pane is usually hidden, so `requestAnimationFrame` never fires and Helmet never updates `<head>`. Use headless Chrome: `puppeteer-core`, `chrome-launcher` and Lighthouse 13.4.1 exist in `%LOCALAPPDATA%\npm-cache\_npx\0f94ee7615faf582\node_modules`. Wait for `load` plus a delay (`networkidle` never fires: Firestore keeps a connection open).
- After a production deploy: check the changed routes with `?cb=`, look at Cloud Logging for the touched services, and say what you verified and what you couldn't.

## Working style

- Read the code path end to end before changing it; prefer the smallest correct diff; match the surrounding style.
- For facts about Astro, Firebase, Cloudflare, Gemini or npm versions, check current docs or the npm registry: this stack moves monthly (Astro 7, React Router 8, React 19.3 as of Sept 2026).
- Record what the owner decides (thresholds, product rules like "no shading, slim frame, no text") in ROADMAP or CHECKLIST, not only in chat.
- Commit messages: what changed and why, wrapped at ~85 columns, ending with the `Co-Authored-By` line the harness provides.
