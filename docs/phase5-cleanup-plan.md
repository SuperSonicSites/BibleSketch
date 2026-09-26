# Phase 5: retire the old site (verified plan, 2026-09-26)

**Status:** step 0 done 2026-09-26 (gates green, `web/tsconfig.json` added, this plan rewritten). Stages A, B and C
wait for their owner approvals, in that order. Nothing in production has changed yet.

First draft 2026-09-26 from a read-only pass over the code, the deployed functions, the logs and the live site. Then
verified the same day by a 38-agent workflow (six read-only audit lanes: a dry run of the code deletion in the
scratchpad, a Vite analysis of the Worker build, a static audit of the check scripts, a repo-wide cross-reference
sweep, Hosting/CLI/live probes, and a real run of the test suite in the emulators; then a merge, three adversarial
refuters per major finding, and a completeness critic). 17 findings survived, the corrections are folded in below;
the "Verification record" section at the end says what was found. Each stage ends with checks; the next stage starts
only when they pass.

## What "the old site" is, precisely

- **14 Cloud Functions nobody reaches from biblesketch.app:** the 13 page renderers (`homeRender`, `sketchRender`,
  `profileRender`, `blogRender`, `galleryRender`, `verseRender`, `tagRender`, `blogListingRender`, `pricingRender`,
  `aboutRender`, `privacyRender`, `termsRender`, `verifiedRender`) and the client-charged generator
  `generateContent`. In `functions/index.js` (at commit `5776a19`): `generateContent` is lines 322-392, sections 2 to
  11 are lines 491-3113 (including `getIndexHtml`, `sendShell`, `redirectToCanonical`, `CANONICAL_ORIGIN`,
  `WRONG_HOSTS`, `cachedIndexHtml`), plus the top-of-file helpers used only by them: the `GoogleGenAI` require
  (line 2), `getThumbnailUrl`, `BUCKET`, `thumbPathOf`, `storageUrl`, `extractSketchIds` (29-75), `jsonLd`,
  `markdownToHtml` (89-216), the `generateContent guards` header, `ALLOWED_MODELS`, `ALLOWED_CONFIG_KEYS` (244-252),
  `DAILY_LIMITS.text` (254), `MAX_PARTS`, `MAX_TEXT_CHARS`, `MAX_INLINE_CHARS` (260-262), `validateContents` (264-292).
  They still answer on `biblesketch-5104c.web.app` (a 301 to biblesketch.app) and on their Cloud Run URLs.
- **The SSR template** `functions/index.html` (only `getIndexHtml` reads it).
- **13 Hosting rewrites** in `firebase.json` that point at those renderers, and the `** -> /index.html` catch-all
  (there is no `hosting-public/index.html`, so unknown paths already answer the static `404.html`).
- **The old React source in the repo root:** `App.tsx`, `index.tsx`, `index.html`, `components/` (36 files),
  `services/` (4), `utils/` (5), `src/` (2), `public/` (46, a copy of hosting-public's static files), `constants.ts`,
  `types.ts`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `metadata.json`,
  `gemini.md`, `repair_images.cjs`, `temp_debug.jpg`. Last real change: Dec 2025. It is older than what
  production ran (that source is lost); the bundle `hosting-public/assets/index-DHKtGwi1.js` is the true record.
- **Scripts and tests written for it:** `scripts/security-check.mjs` steps 18-22 (generateContent) and 31-41
  (renderer pages through the Hosting emulator's rewrites); `web/scripts/check-pages.mjs` (head parity against the
  Firebase renderers, obsolete since 2026-09-23); the template part of `scripts/check-hosting-public.mjs` and the
  functions predeploy hook that runs it with `--live`.

## What must NOT change

- **Firebase Hosting stays.** On biblesketch.app the Worker serves every page and every file in `web/public`
  (`/robots.txt`, `/manifest.json`, `/about-Renaud.webp`, `/blog-images/*` never reach Firebase). What still passes
  through to Firebase: `/__/auth/*` and `/__/firebase/*` (Google sign-in; `authDomain` is biblesketch.app),
  `/sitemap.xml` (the `sitemap` function), `/404.html`, `/assets/*` and `/references/*` (the old bundle's files;
  cached HTML may still ask for them, and the rule "never delete an /assets/* file" stands), and the icons that are
  not in `web/public`: `/favicon.ico`, `/og.png`, `/android-chrome-*.png`, `/apple-touch-icon.png`. All of these are
  static files or the sitemap rewrite, so removing the renderer rewrites cannot touch them. `hosting-public/` stays
  byte-exact; `scripts/hosting-live-files.json` stays.
- **These functions stay:** `sitemap`, `handleZohoWebhook`, `onUserCreated`, `onUserDeleted`, `onSketchWritten`,
  `createSketch`, `editSketch`, `refundStaleGenerations`, `cleanupDeletedAccounts`, `onPrivateProfileWritten`,
  `onTransactionCreated`, `emailTick`, `emailAction`, `emailReply`, `emailStats`, `createCheckout` (16), plus the
  extension function `ext-storage-resize-images-generateResizedImage` (thumbnails; managed by `firebase ext:*`, never
  in a delete list). Every function the new site calls is on this list.
- **These helpers stay** even though they sit near old code: `generateSketchSlug`, `escapeHtml`, `AGE_GROUPS`,
  `ART_STYLES`, `VERSE_FONT_STYLES`, `LITURGICAL_TAGS`, `MASTER_UID`, `reserveDailyCall` and the image caps (the
  sitemap and `createSketch` use them), everything in section 1 (sitemap, lines 393-490), section 12 onwards, and
  **`isDocId` (lines 571-573, inside section 2)**: `landingBook` (3992) and `emailAction` (4173) call it. The first
  draft of this plan deleted it; `node --check` and the export count pass on that broken file, so stage C has an
  undefined-identifier gate.
- `functions/generation/` and `functions/references/`. `functions/package-lock.json` is not regenerated;
  `@google/genai` stays in `functions/package.json` (`generation/pipeline.js` requires it).
- Cloudflare: no route or dashboard change. The Worker keeps passing non-live paths to Firebase exactly as today.
- Firestore rules and indexes: untouched in this phase (a follow-up is listed at the end).
- The `GEMINI_API_KEY` secret: `createSketch` uses it; deleting `generateContent` does not touch it.
- The `coloring-page-quality` branch and the prompt lab in `C:\Users\renau\Coding\BibleSketch\lab`: separate
  checkouts, unaffected.

## Evidence that it is safe (read 2026-09-26)

- `generateContent`: last real call 2026-09-23 13:14 UTC, an hour before the cutover. Nothing since.
- Renderers: no biblesketch.app request reaches them (every rewrite source in `firebase.json` is in the Worker's
  `LIVE_PREFIXES`). The last real hit was a crawler on the Firebase domain, 2026-09-24 01:35 UTC; the only hits since
  are the verification's own probes of `biblesketch-5104c.web.app` (2026-09-26). Log silence is therefore not a gate
  for any stage, and probing web.app page paths is not evidence.
- `sitemap`: still serving (2026-09-26).
- Live checks: `/assets/index-DHKtGwi1.js`, `/references/*`, `/sitemap.xml`, `/__/auth/handler`, `/favicon.ico`
  come from Firebase (200) on biblesketch.app; an unknown path is the static 404 page; the Worker serves everything
  else. The 404 page is static (no SPA shell, no bundle), and there is no service worker, so nothing can revive the
  old SPA once the functions are gone.
- The new site's own checks pass today (stage 9 QA sweep, 467 coloring pages, 58 other pages, Lighthouse 98).

## Why do it

- `generateContent` still accepts calls from any verified account and never deducts a credit (the credit audit's
  60-images-a-day bypass). It is unused but open, on your Gemini key.
- `sketchRender` runs with `minInstances: 1`: an idle instance billed around the clock for a page nobody asks it for.
- Every deploy of `functions/` uploads and validates the template and 2,900 lines of dead code; the predeploy hook
  HEADs the template's assets on web.app before any functions deploy (this blocked a billing hotfix once).

## When to run, and how the daily task fits

- The scheduled task `pinterest-daily` runs at 07:02 local from this working tree: it builds `web/`, deploys the
  Worker and pushes `main`. Run every stage between 09:00 and 06:30 local. Before any `web/` build, confirm today's
  run finished (`list_task_runs pinterest-daily` shows it succeeded) and no `astro preview` or `wrangler` process is
  alive (Windows locks `dist/`).
- Push each stage's commit right away, so the task's push never carries phase 5 work by accident.
- Line numbers below are for `functions/index.js` at commit `5776a19` and `scripts/security-check.mjs` after step 0.
  Before stage C, `git log -1 --format=%h -- functions/index.js` must print `5776a19`; otherwise re-derive every
  edge from the anchors given in brackets, never from the numbers.

## Step 0: make the gates green (done 2026-09-26; no production effect)

1. `scripts/security-check.mjs` step 42 (sitemap) was failing since commit `5776a19` (2026-09-25) made the sitemap
   index list the Worker-only child `/coloring-pages/sitemap.xml`, which the Hosting emulator answers with 404.html.
   The step now fetches only the `?type=` children and asserts the Worker child is listed once. Result: 54/54,
   including step 49 (master 250 cap), which ROADMAP 1.5 had listed as unverified.
2. `web/tsconfig.json` added with `useDefineForClassFields: false`. Vite 8 (Rolldown) reads the nearest tsconfig by
   walking up, so the Worker build had been using the root `tsconfig.json` of the old SPA; without it one file
   (`web/src/lib/generate.ts`, class `CallError`) compiles differently and one chunk hash changes. With this file the
   `dist/client/_astro` names are identical before and after (checked), so stage C can delete the root file. It ships
   with the next Worker deploy (output-neutral).
3. This plan rewritten. Commit pushed.

## Stage A: Hosting release without the old rewrites (about 30 minutes; owner approval 1)

Order matters: rewrites first, functions second. The CLI does not validate rewrites against existing functions
(firebase-tools 15.30.2 warns and ships them; `hosting:clone` checks nothing), so nothing in the tooling protects the
order: a rewrite to a deleted function fails at request time. Remove the rewrites before deleting the functions, and
in the stage B undo redeploy the functions before restoring any rewrite.

1. `firebase.json`: remove the 13 renderer rewrites and the `**` catch-all. Keep exactly one rewrite:
   `/sitemap.xml -> sitemap`. Add a `redirects` block of 13 scoped entries, type 301, each to
   `https://biblesketch.app<same path>`: `/`, `/coloring-page/:rest*`, `/profile/:rest*`, `/blog`, `/blog/:rest*`,
   `/gallery`, `/bible-verse-coloring`, `/pricing`, `/about`, `/privacy`, `/terms`, `/tags/:rest*`, `/verified`
   (owner decision 2026-09-26: the Firebase domain keeps redirecting to the canonical site, as the renderers do
   today). Never a `**` redirect: redirects run before static files and would catch `/assets/*`. They cannot affect
   biblesketch.app, whose pages the Worker serves itself. Change nothing else (headers, predeploy hooks, functions).
2. `scripts/security-check.mjs`: steps 31-41 test the renderer pages through the emulator's rewrites, so they break
   with this `firebase.json`. Delete the `// rendered pages`, `// status codes and redirects` and `// head tags`
   blocks (lines 476-624: the 11 steps with `get`, `isShell`, `ldBlocks`), drop `getDownloadURL` from the storage
   import (line 22), add a `// ---- sitemap` section comment before step 42, update the header comment (lines 1-2 and
   9). CLAUDE.md verify block: 43 checks.
3. Gates before deploying: `node scripts/check-hosting-public.mjs` prints `hosting-public OK: 49 live files, 16
   template refs`; emulators up (or `firebase emulators:exec`), `node scripts/security-check.mjs` prints
   `All 43 checks passed.` (proves the sitemap rewrite still routes step 42 through Hosting).
4. Record the undo id first: `firebase hosting:channel:list --project biblesketch-5104c --json`; note the live
   channel's `release.version.name` (the id after `versions/`).
5. `firebase hosting:channel:deploy phase5 --expires 3d --no-authorized-domains --project biblesketch-5104c`.
6. Channel checks. Files: HEAD every path in `scripts/hosting-live-files.json` (51, including `/__/firebase/init.js`
   and `init.json`) plus `/404.html` and `/fonts/*` on the channel host; Hosting's ETag is the sha256 of the gzip-9
   bytes, the hash the JSON records and `check-hosting-public.mjs` computes, so each ETag must equal it (0
   mismatches, 0 non-200; a 15-line scratch script outside the repo). Routes: `/sitemap.xml` and
   `/sitemap.xml?type=pages` 200 XML; `/__/auth/handler` 200; `/404.html` 200; `/assets/index-DHKtGwi1.js` 200
   `immutable`; `/references/adult-classic.jpg` 200; `/favicon.ico` and `/og.png` 200; `/`, `/coloring-page/x/y`,
   `/pricing`, `/tags/advent` 301 with `Location: https://biblesketch.app<same path>` (note whether `?cb=` carries
   over: the renderers preserved it, Hosting redirects may not; either is acceptable); `/nonexistent` 404.
7. Promote: `firebase hosting:clone biblesketch-5104c:phase5 biblesketch-5104c:live --project biblesketch-5104c`.
8. Live checks with `?cb=` on biblesketch.app: `/`, `/gallery`, `/coloring-pages`, one coloring page, `/pricing`,
   `/tags/advent` 200 from the Worker (no `x-served-by` header); `/sitemap.xml`, `/__/auth/handler`, `/favicon.ico`,
   `/og.png` 200 from Firebase; `/nonexistent` 404; Google sign-in opens. On web.app: `/` and `/pricing` 301.
9. Commit `firebase.json`, `scripts/security-check.mjs`, CLAUDE.md, and the ROADMAP 1 note on the redirect decision:
   "Phase 5 stage A: Hosting keeps only the sitemap rewrite; drop the renderer-page checks". Push.

Undo: `firebase hosting:clone biblesketch-5104c@<id from step 4> biblesketch-5104c:live --project biblesketch-5104c`
(seconds).

Stop if: any ETag mismatches, or any 200 check above fails.

## Stage B: delete the 14 functions from Firebase (about 15 minutes; owner approval 2)

The point of no quick return: after it, bringing the old pages back is a redeploy from git (10-15 minutes), not a
switch.

1. `firebase functions:delete homeRender sketchRender profileRender blogRender galleryRender verseRender
   tagRender blogListingRender pricingRender aboutRender privacyRender termsRender verifiedRender generateContent
   --project biblesketch-5104c --force`. Explicit names only; never an unscoped `firebase deploy`. `functions:delete`
   runs no predeploy hook and touches only the named functions.
2. `firebase functions:list --project biblesketch-5104c`: 17 rows, the 16 kept functions plus
   `ext-storage-resize-images-generateResizedImage`. No `*Render`, no `generateContent`.
3. Live checks: make one Scene Art page on biblesketch.app (uses `createSketch`, 1 credit, refunded on failure; the
   owner runs it, or approves the master account's credit and Gemini spend); open `/checkout/premium` (loads the Zoho
   page; don't buy); `/sitemap.xml` 200; hello@ reply path untouched (`emailReply` still listed).
   `firebase functions:log --only createSketch,sitemap --project biblesketch-5104c`: no errors after the deletion.
4. Cloud Run: the `sketchrender` service and its min instance are gone (Console > Cloud Run).
5. Until stage C the source still exports the 14. Never run `firebase deploy --only functions` (codebase-wide is
   unscoped and would recreate all 14, min instance included); deploy kept functions by name only.

Undo: check out the commit before stage C and `firebase deploy --only "functions:homeRender,...,
functions:generateContent" --project biblesketch-5104c --force` with the quoted list (`--force` because
`sketchRender`'s `minInstances: 1` is a cost increase once it has been deleted, and the CLI aborts without it in a
non-interactive shell). Restore the rewrites with a Hosting release only if the old pages must answer on the
Firebase domain again.

Stop if: any kept function disappears from the list, or a generation fails with an error naming a missing function,
permission or secret. A Gemini quota or spend-cap error is not a stage B failure (ask the owner about AI Studio
headroom and retry).

## Stage C: remove the code and the template from the repo (about 1 hour, one commit; owner approval 3)

Only after stage B has been live for a day with the daily task running clean. Check the precondition in "When to
run" first.

1. `functions/index.js`, CRLF kept, in this order:
   - Move lines 571-573 (`isDocId` and its two comment lines) into section 17, directly above `const sameSecret`
     (about line 3898), where both its callers live.
   - Delete 491-3113 [from the `// ----` rule above `// 2. SEO RENDERER` to the blank line after `verifiedRender`'s
     closing `});`; the section 12 header stays whole].
   - Delete 322-392 [`exports.generateContent = onCall({` to the blank line before the section 1 header].
   - Delete 264-292 (`validateContents`), 260-262 (`MAX_PARTS`, `MAX_TEXT_CHARS`, `MAX_INLINE_CHARS`), 244-252 (the
     guards header, `ALLOWED_MODELS`, `ALLOWED_CONFIG_KEYS`); change line 254 to `const DAILY_LIMITS = { image: 60 };`
     (keep the ponytail comment above it).
   - Delete 89-216 (`jsonLd`, `markdownToHtml`), 29-75 (`getThumbnailUrl`, `BUCKET`, `thumbPathOf`, `storageUrl`,
     `extractSketchIds`) with their comment lines, and line 2 (the `GoogleGenAI` require).
   - Gates: `node --check functions/index.js`. From `functions/`, with `FUNCTIONS_EMULATOR` unset,
     `node -e "const k=Object.keys(require('./index.js')).sort(); console.log(k.length, k.join(','))"` prints `16`
     and exactly `cleanupDeletedAccounts,createCheckout,createSketch,editSketch,emailAction,emailReply,emailStats,
     emailTick,handleZohoWebhook,onPrivateProfileWritten,onSketchWritten,onTransactionCreated,onUserCreated,
     onUserDeleted,refundStaleGenerations,sitemap` (with `FUNCTIONS_EMULATOR=true` the emulator-only `emailTickNow`
     appears too; expected). From the repo root, `node node_modules/typescript/bin/tsc --allowJs --checkJs --noEmit
     --target es2022 --module commonjs --moduleResolution node --skipLibCheck --types node functions/index.js | grep
     -E "TS2304|TS2552"` prints nothing (undefined identifiers; the baseline also prints nothing). `grep -nw
     "GoogleGenAI\|BUCKET\|storageUrl\|MAX_PARTS\|getIndexHtml\|sendShell\|redirectToCanonical\|CANONICAL_ORIGIN"
     functions/index.js` prints nothing. Expected size about 1,520 lines (the dry run went from 4426 to 1522).
2. Delete `functions/index.html`.
3. `scripts/check-hosting-public.mjs`: drop the template part (the `functions/index.html` read, the refs loop and the
   `--live` HEAD loop, lines 34-50), the `--live` usage lines (4-6) and the `template refs` part of the summary line;
   reword the assert message at line 21 (the file must not exist because the Worker serves `/` and the Firebase
   domain must keep answering 404 for `/index.html`). Optionally add an `--origin=<url>` mode that does the stage A
   ETag comparison, so docs/deploying.md step 4 stays executable. `firebase.json`: delete the functions `predeploy`
   line entirely (it only existed for the template); the hosting predeploy stays.
4. `scripts/security-check.mjs`: delete the `// generateContent` block (lines 333-379 after step 0 and stage A:
   `textReq`, `imageReq`, steps 18-22) and the `call:` line in `clientApp` (line 58); reword the header (lines 1-2
   and 9). `hosting` stays in the emulator command (`scripts/emulators.cmd`, line 10 of the script): step 42 fetches
   `/sitemap.xml` through it. Expected: `All 38 checks passed.`
5. `git rm web/scripts/check-pages.mjs` (obsolete); keep `check-sketch.mjs` and `web/scripts/fixtures/live-seo.json`.
6. `git rm` the old React source listed in "What the old site is" (root `App.tsx` ... `temp_debug.jpg`, `public/`),
   including root `tsconfig.json` (safe since step 0 added `web/tsconfig.json`). Keep root `package.json` and
   `package-lock.json` because `scripts/security-check.mjs` imports `firebase/*` from the root `node_modules`;
   slimming them to `firebase` plus the emulator scripts is optional and separate.
7. Docs, explicit lines (numbers as of 2026-09-26): CLAUDE.md:8 (Layout bullet for `functions/`), :10 (drop
   `check-pages.mjs`), :33 (the "Facts" bullet on the old SPA), :38 (the root `npm run build` rule: the scripts are
   disabled stubs), :45 (CRLF note without `functions/index.html`), :50-52 (verify block: 38 checks, no `--live`,
   no "app at :5000"), :57 (rateLimits note: kept steps still count against the 500 global cap); docs/deploying.md
   :5, :8, :10, :20 (channel checks by the ETag method), :24, :27, :29, :30, :36, :49; README.md :12, :14, :33-34,
   :36, :43; ROADMAP.md :21 (cite the purge step by label, not number), :50 (phase 5 done), :202-203 (S0/S1 target
   `createSketch`/`editSketch`), :207; CHECKLIST.md :132 ticked; docs/seo-plan.md :172 (replace with
   `check-sketch.mjs` and the e2e scripts), :74, :150-152, :288, :291 annotated as history. The comments at the top
   of `web/src/lib/sketch.ts` and `web/src/styles/global.css` may keep pointing at the bundle: it still exists.
8. Checks before the commit: the step 1 gates; emulators up, `node scripts/security-check.mjs` prints
   `All 38 checks passed.`; `node scripts/check-hosting-public.mjs` prints `hosting-public OK: 49 live files`;
   `node scripts/email-check.mjs` unchanged; in `web/` (outside the daily window), `npm run build` and the
   `dist/client/_astro` file names equal the step 0 list; `node scripts/check-sketch.mjs` passes. `git status` shows
   only the intended deletions and edits. `web/` changes only by losing `scripts/check-pages.mjs`; the Worker build
   output is unchanged.
9. Prove the slimmed source on Cloud Build and in production with two cheap, safe functions:
   `firebase deploy --only "functions:sitemap,functions:emailAction" --project biblesketch-5104c`. Then
   `/sitemap.xml?cb=` 200 with the same index child list as minutes before (19 entries on 2026-09-26: 18 `?type=`
   children plus `/coloring-pages/sitemap.xml`) and `?type=pages` with the same 5 URLs (per-type sketch counts move
   with the daily task's publishes and are informative only); `curl -sI
   "https://biblesketch.app/api/email/unsubscribe?u=__x__&t=y"` answers 400 before and after (the Worker route
   `api/email/[action].ts` forwards to `emailAction`; the reserved id `__x__` takes the moved `isDocId` branch before
   any Firestore read, while an unknown id answers 404);
   `firebase functions:log --only emailAction,sitemap -n 20` shows no `ReferenceError`. The other 14 kept functions
   stay on the pre-cleanup image until their next deploy; that is expected, and the emulator run in step 8 (steps
   11-13: the tick and the links) is their gate.
10. Commit: "Phase 5 stage C: remove the render functions, generateContent, the SSR template and the old React
    source". Push.

Undo: `git revert` the commit; redeploy `functions:sitemap,functions:emailAction` from the reverted tree.

Stop if: security-check loses a step it should have kept, the build fails on Cloud Build, or the sitemap index's
child list or `?type=pages` changes.

## After the cleanup (separate decisions, not part of phase 5)

- Firestore rules: the web client never writes `credits` or `downloadsRemaining` any more (grep of web/src finds
  no such write; the server charges and refunds). The "decrease only" allowance in `userUpdateAllowed` can go.
  That is a rules deploy, tested in the emulators with security-check.
- Firebase console: disable Anonymous sign-in (CHECKLIST; nothing uses it).
- Root `package.json`: slim to what `scripts/` need (its `dev`, `preview` and `dev:local` scripts point at the
  deleted Vite setup).
- `scripts/check-hosting-public.mjs` and `hosting-live-files.json` keep guarding the 60 static files for as long as
  Hosting serves them; revisit only if `/assets` and `/references` traffic is zero for months.

## Owner approvals this plan needs, in order

0. Done 2026-09-26: keep the 301s on the Firebase domain (the `redirects` block in stage A). Step 0's commit and
   each stage's commit and push to `main` are part of the approved plan; `web/tsconfig.json` reaches production
   with the next Worker deploy (output-neutral).
1. Stage A Hosting release (a production release through the channel procedure).
2. Stage B function deletion, including the one live test generation (who runs it, on which account).
3. Stage C commit and the `sitemap,emailAction` functions deploy.

## Verification record (2026-09-26)

What the workflow confirmed about the first draft, kept here so the reasons behind the corrections survive:

- Blocker: `isDocId` was inside the deleted range while `emailAction` and `landingBook` call it; `node --check`
  and the 16-export count passed on the broken file (dry run in the scratchpad), only `tsc --checkJs` (2 new
  TS2304) and the emulator steps 11-13 caught it.
- The unchanged suite failed at step 42 today (41/54, steps 43-54 never ran): the Worker-only sitemap child from
  commit `5776a19`. A two-line filter gave 54/54.
- Steps 31-41 depend on the Hosting rewrites, so they break at stage A, not C.
- Root `tsconfig.json` was in play for the Worker build (Vite 8.3 walks up to it); deleting it changed one chunk of
  58 transformed files, behaviour identical. `web/tsconfig.json` makes the output independent of it.
- Stage B undo needs `--force` (`sketchRender` min instance). `functions:list` shows the extension function too.
- The first draft's ranges were off by one at the section headers; five more dead helpers were missed; the export
  check command was wrong; the CLI does not validate rewrites; renderer log silence is not evidence (the review's
  own probes ran five renderers); `/favicon.ico` and `/og.png` still come from Firebase on biblesketch.app.
- Refuted, no change: the root `package.json` dead scripts (already deferred), the codebase-wide `--only functions`
  hazard (covered by the hard rule, one sentence added to stage B), the `check-hosting-public.mjs` wording (folded
  into stage C step 3).
