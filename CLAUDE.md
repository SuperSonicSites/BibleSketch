# CLAUDE.md

Bible Sketch (https://biblesketch.app) turns Bible verses into printable coloring pages. Solo owner, production app with paying customers. Firebase project `biblesketch-5104c` behind Cloudflare. This worktree's branch `seo-fixes` **is production**. Roadmap: [ROADMAP.md](ROADMAP.md). Owner-only tasks: [CHECKLIST.md](CHECKLIST.md). Deploys: [docs/deploying.md](docs/deploying.md).

## Facts you can't infer from the code

- **The production front-end source is lost.** Live = the minified bundle `hosting-public/assets/index-DHKtGwi1.js` (React 19.2, react-router 6, react-helmet-async). Root `App.tsx`, `components/`, `services/` are an **older** version: read them to understand behaviour, grep the bundle for what production actually does. Features that exist only in the bundle: blog, About, Verse Art pipeline, profile-completion modal, tag URL filters, Zaraz tracking. Front-end changes wait for the Astro rebuild (ROADMAP 1).
- `functions/index.js` holds everything server-side: 13 SEO render functions (string templates into `functions/index.html`), `sitemap`, `generateContent` (Gemini proxy, callable), `handleZohoWebhook` (billing), `onUserCreated`/`onUserDeleted`. The render functions wipe or replace their own HTML when the SPA boots; Google indexes what React renders.
- Credits are deducted by the **client**; the server only checks `credits >= 1`. Don't add server-side charging while the live bundle still charges, or users pay twice (ROADMAP 1.1).
- Newer prompt/model work lives on branch `coloring-page-quality` and the gitignored `lab/` folder in the `C:\Users\renau\Coding\BibleSketch` worktree (not merged, ROADMAP 1.0).
- The Hosting CDN caches rendered HTML up to 1 day and is only flushed by a new Hosting release. Add `?cb=<random>` when checking a change.

## Hard rules (each one has broken production or nearly did)

- Never run `npm run build`: it overwrites `functions/index.html` with the old front end.
- Never `firebase deploy` without an explicit, **quoted** `--only "functions:a,functions:b"` list (unquoted lists break in PowerShell; unscoped deploys can delete live functions). Hosting only through the channel → clone procedure in docs/deploying.md; never add `hosting-public/index.html`; never delete an `/assets/*` file.
- `services/firebase.ts` uses the emulators only when the hostname is exactly `localhost`. Opening the local app via `127.0.0.1` or a LAN IP talks to **production**.
- `functions/package-lock.json` must keep its optional platform packages (fsevents, @unrs/resolver-binding-*, @emnapi/*). Don't regenerate it casually; Cloud Build's `npm ci` fails without them.
- Production deploys, data writes and Zoho resends are owner-approved actions: ask first unless the owner asked for that specific action in this conversation. Zoho resends can grant credits twice (check `processedWebhooks` first).
- Write docs and code with the editor tools, not through shell strings: backticks inside a bash double-quoted string execute as commands.
- Files use CRLF (`functions/index.js`, `functions/index.html`, scripts). Keep endings consistent; `hosting-public/**` is `-text` and must stay byte-exact.

## Verify before you say done

```bash
scripts/emulators.cmd                    # full emulator suite; app at http://localhost:5000
node scripts/security-check.mjs          # 33 checks; must all pass
node scripts/check-hosting-public.mjs    # before any Hosting change (add --live before a functions deploy)
node --check functions/index.js
```

- Emulator notes: after many runs in one day, delete `rateLimits/global_<YYYY-MM-DD>` in the Firestore emulator or the cap test fails. The Hosting emulator ignores `firebase.json` headers; check headers on a preview channel.
- Browser checks: the in-app browser pane is usually hidden, so `requestAnimationFrame` never fires and Helmet never updates `<head>`. Use headless Chrome: `puppeteer-core`, `chrome-launcher` and Lighthouse 13.4.1 exist in `%LOCALAPPDATA%\npm-cache\_npx\0f94ee7615faf582\node_modules`. Wait for `load` plus a delay (`networkidle` never fires: Firestore keeps a connection open).
- After a production deploy: check the changed routes with `?cb=`, look at Cloud Logging for the touched services, and say what you verified and what you couldn't.

## Working style

- Read the code path end to end before changing it; prefer the smallest correct diff; match the surrounding style.
- For facts about Astro, Firebase, Cloudflare, Gemini or npm versions, check current docs or the npm registry: this stack moves monthly (Astro 7, React Router 8, React 19.3 as of Sept 2026).
- Record what the owner decides (thresholds, product rules like "no shading, slim frame, no text") in ROADMAP or CHECKLIST, not only in chat.
- Commit messages: what changed and why, wrapped at ~85 columns, ending with the `Co-Authored-By` line the harness provides.
