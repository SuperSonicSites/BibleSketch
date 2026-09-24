# Pinterest runbook (where we are, and how to do each recurring job)

Why we do things this way: [pinterest-strategy.md](pinterest-strategy.md) (the plan, with the Pin copy rules in
§3.3a) and [pinterest-scripture-plan.md](pinterest-scripture-plan.md) (verse art). Decisions: ROADMAP 1.5.
Owner-only steps: CHECKLIST, "Pinterest auto-publish".

## Status (update this block at the end of every Pinterest session)

As of **2026-09-24 03:30 UTC**:
- **Calendar** (`web/src/data/pins.json`, 173 entries, `pins-check`: no errors):

  | Board | Pins | Dates |
  |---|---|---|
  | Christmas | 40 | Sept 23 - Dec 19 |
  | Scripture | 74 | Sept 24 - Dec 20 (all verse art, `plain` template) |
  | Sunday School | 59 | Sept 25 - Nov 13 (one a day Oct 1 - Nov 5, plus the Genesis 1-4 series Oct 2 - 30) |

  Ramp capacity through Dec 20 is ~370; **198 slots are open**, first open day Oct 9. Sunday School has nothing after
  Nov 13 and Christmas is thin in December by design (front-loaded).
- **Genesis 1-4 series** (2026-09-24, owner request after the stats showed Genesis 1-4 Pins earn 62% of clicks):
  18 reviewed pages on the Sunday School board every day or two from Oct 2 to Oct 30, in story order: Creation days
  1-7 (opener "Days of Creation Coloring Pages"), "very good", Adam's breath of life, tending the garden, Eve,
  the fruit, hiding, garments of skin, leaving Eden, Cain and Abel (x2). 23 generated, 5 rejected and left private
  (broken border; implied nudity in the realistic Young Child style; lone figure; thin lines). Lesson: for Adam
  and Eve, the Toddler style keeps them modest (behind flowers, with animals); the Young Child style drew Eve
  covered only by her hair twice. Cain's angry face (Gen 4:3-5) was kept on purpose: the verse says so.
- **Alt text**: every Pin on the active boards has alt text (the 18 missing ones, mostly old Genesis Pins, were
  written from their images and set 2026-09-24). New RSS Pins still need the weekly pass.
- **Feeds connected** (Pinterest > Settings > Bulk create Pins): `christmas.xml` (Sept 23), `scripture.xml`
  (Sept 24 00:01 UTC). **Not yet:** `sunday-school.xml` (connect after 2026-09-25 00:00 UTC, when its first Pin is
  in the feed; Pinterest refuses an empty feed). `easter.xml` from Feb 1. `adult.xml` stays unconnected (paused).
- **Pinterest API app** "Bible Sketch Pin Publisher" (id 1615048): Trial access; **Standard upgrade submitted
  2026-09-24** with the demo video (`C:\Users\renau\Videos\bible-sketch-pinterest-api-demo-final.mp4`).
  Connected to @biblesketch in Sandbox. 3 Sandbox test Pins exist (boards "Sandbox - christmas/scripture/
  sunday-school", visible only to us).
- **Stats through the API** since 2026-09-24: https://biblesketch.app/api/pinterest/report (see "Reading
  performance"). Baseline below. **Monthly email report** to renaud@supersonicsites.com, CC
  brent@supersonicsites.com, on the 24th (first one sent by hand 2026-09-24). Brent's address was added as an
  Email Routing destination 2026-09-24 and gets his copy once he clicks Cloudflare's verification link.
- **Open decisions** (CHECKLIST): AI disclosure label on API Pins; "Free Printable" wording on the kids' banners.
- **Next jobs:** connect `sunday-school.xml` (Sept 25 after 8 pm EDT); weekly alt text; generate Sunday School
  pages for Nov 6 onward and more Christmas scenes; read the paper/purple test mid-February; first day-30
  results read mid-November (strategy §4).

## Weekly: alt text on RSS-published Pins
RSS can't carry alt text. In `web/`: `node scripts/pins-alt.mjs > alt.js`, then run its contents in the signed-in
Pinterest tab (browser tool `javascript_exec`, or DevTools). Idempotent. Stops being needed once the API publisher
replaces RSS.

## Generating a batch of pages (master account)
The master account (`TiAEiMqWxpWqxCLtoI5OgHAvtf33`, the owner's signed-in tab on biblesketch.app) has its own
**250 generations a day** outside the global 500 pool (`functions/index.js`, `MASTER_DAILY_IMAGE_LIMIT`); other
accounts keep 60. Each generation costs 1 credit (the master account has hundreds) and real Gemini money.

1. **Gemini spend cap.** The Gemini key sits under an AI Studio monthly spend cap (ai.studio/spend, owner only).
   On 2026-09-23 a ~140-page day hit it and every generation, customers' included, failed with "exceeded its
   monthly spending cap" until the owner raised it. Before a large batch, ask the owner to check the headroom.
2. **Run it in the signed-in tab** (open any biblesketch.app page first; find the current bundle name with
   `[...document.scripts].map(s => s.src)`, it changes with every deploy):
   ```js
   const g = await import('/_astro/generate.<hash>.js');
   const LIST = [/* { kind:'scene', book:'Jonah', chapter:2, startVerse:10, endVerse?, age:'Toddler', style:'Sunday School' }
                    or { kind:'verse', book, chapter, startVerse, font:'Elegant Script'|'Classic Serif'|'Modern Brush'|'Playful' } */];
   window.__batch = LIST.map((x) => ({ ...x, status: 'queued' }));
   let next = 0, fails = 0; window.__stop = false;
   const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
   const worker = async (w) => { await sleep(w * 6000); while (next < LIST.length && !window.__stop) {
     const it = window.__batch[next++]; it.status = 'running';
     try { const r = await g.callFunction('createSketch', { requestId: crypto.randomUUID(), ...LIST[next - 1] });
       Object.assign(it, { status: r.status, sketchId: r.sketchId, imageUrl: r.imageUrl, error: r.error }); }
     catch (e) { Object.assign(it, { status: 'error', error: e.message }); }
     if (it.status === 'done') fails = 0; else if (++fails >= 3) window.__stop = true;   // cap or outage: stop
     await sleep(4000); } };
   window.__done = Promise.all([0, 1, 2].map(worker));
   ```
   Three workers, 4 s apart: verse art fetches bible-api.com, which rate-limits around 15 requests / 30 s. A page
   takes 30-60 s; 30 pages take ~15 minutes. Poll `window.__batch`. A refunded run cost nothing; the logs
   (`firebase functions:log --only createSketch --project biblesketch-5104c`) say why.
3. **Inputs that work.** Scenes: `age` Toddler (style Sunday School only) or Young Child (Sunday School best);
   one key moment with 1-3 named characters. Verse art prints **one verse** (`startVerse` only), under 30 words
   (longer ones come out cramped), WEB text with "the LORD" (`withLord`), Psalms as "Psalm", Proverbs as "Proverbs".
4. **Review every page up close** (ROADMAP 1.5): `python web/scripts/pins-review.py pages.json sheet` makes
   contact sheets of 3; crop details with PIL when text or faces are small. Reject: lone figure with no action,
   sparse or empty setting, stern or angry faces on kids' pages, violence, faint lines, broken or open border,
   stray marks or quotes, wrong or misspelled text, anything that breaks a beloved tradition (bearded Moses,
   three magi). Regenerate the verse or scene; never schedule a reject.
5. **Publish the approved pages** (`isPublic: true`, the same field the app's "Publicly Visible" toggle sets):
   ```js
   const f = await import('/_astro/firebase-client.<hash>.js'); const { db, fs } = await f.r();
   for (const id of IDS) { const ref = fs.doc(db, 'sketches', id); const d = (await fs.getDoc(ref)).data();
     if (d.userId === 'TiAEiMqWxpWqxCLtoI5OgHAvtf33' && d.isPublic !== true) await fs.updateDoc(ref, { isPublic: true }); }
   ```
6. **Schedule**: write the entries by hand to the copy rules (strategy §3.3a; Scripture titles lead with the
   reference, scripture plan §3), place them in open days under the ramp (`dailyCap` in `pins-check.mjs`), one per
   board per day, the same story at least 4 days apart, kids' templates alternating `paper`/`purple`, Scripture
   `plain`. Then `node scripts/pins-check.mjs` (no errors), build, `npx wrangler deploy`, check one `/pin-img/`
   and one page, commit, push, and update the Status block above.

## Connecting a feed
Pinterest > Settings > Bulk create Pins > Auto-publish > Add another: URL `https://biblesketch.app/pins/<board>.xml`,
pick the board by name (the picker defaults to a Sandbox board; search for the real one), Save. Only on a day the
feed has an item. Record it in CHECKLIST and the Status block.

## Pinterest API (Sandbox now, production after Standard access)
- Code: `web/src/lib/pinterest.ts`, owner page `https://biblesketch.app/api/pinterest` (Connect, Publish, Sign out;
  only @biblesketch is accepted). Tokens AES-GCM encrypted in KV `PINTEREST`; secrets `PINTEREST_APP_SECRET`
  (owner-set) and `PINTEREST_TOKEN_KEY`; vars `PINTEREST_APP_ID`, `PINTEREST_ENV` in `web/wrangler.jsonc`.
- Sandbox quirks: production boards are hidden but their names are still taken, and board names must be under
  50 characters (hence "Sandbox - <board>").
- Tokens are bound to one environment (KV `tokens:sandbox`, `tokens:production`). Trial access already reads
  production, so the stats connection (`/api/pinterest/connect?env=production`, owner clicked "Give access"
  2026-09-24) holds a production token with our full scopes.
- The Sandbox test boards and Pins are hidden on pinterest.com (logged-out profile and board pages checked
  2026-09-24) but the production API and the old public widget API (`widgets.pinterest.com/v3/pidgets/...`)
  still list them. Harmless; the owner can delete them once Standard access is granted.
- **After Standard access:** set `PINTEREST_ENV` to `production` and deploy; the production token from the stats
  connection should then publish too (if /api/pinterest asks to connect, connect once); build the daily publisher (a Worker cron that publishes each day's due entries with
  `publish()`, which already sets alt text and refuses duplicates); disconnect the RSS feeds the same day so
  nothing posts twice; apply the owner's AI-disclosure decision (`ai_disclosures: { values: ['AI_MODIFIED'] }`).
- Updating an existing Pin (e.g. alt text on RSS Pins) is beta in production and not available to our app.

## Reading performance
**API (preferred):** with an owner session (open https://biblesketch.app/api/pinterest and connect; the session
lasts an hour), `/api/pinterest/report` returns JSON: the account's last 90 days (daily + summary: impressions,
saves, Pin clicks, outbound clicks; includes repins and the archived boards), every board, and every Pin on an
active board with its 90-day and lifetime metrics and whether it has alt text. The archived boards' Pins are not
listed. Crunch it in the signed-in tab: `const r = await fetch('/api/pinterest/report').then((x) => x.json())`.

Baseline 2026-09-24 (compare at the day-30 read, mid-November):

| | Impressions | Saves | Pin clicks | Outbound |
|---|---|---|---|---|
| Account, Jun 27 - Sep 21 (per week) | ~24,000, flat since July | 70-104, rising in Sept | ~730 | ~43 |
| Account, last 28 days vs first 29 (per day) | -6% | +17% | -10% | -16% |
| 148 Pins on active boards, last 90 days | 172,366 | 582 | 5,277 | 405 |

- Sunday School board: 55% of those impressions and 58% of the outbound clicks (5.6 outbound per Pin in 90 days;
  Christmas 1.5, Scripture 1.5, Easter 0.6, Adult 2.1). Toddler-titled Pins: 13.8 per Pin.
- Genesis 1-4 Pins (creation, Adam and Eve, Eden, Cain and Abel): 48 Pins, 53% of impressions and 62% of outbound
  clicks, 3.4x the outbound per Pin of everything else (5.2 vs 1.6). The calendar has one Genesis 1-4 entry (Nov 3). Top Pin: "Creation Narrative ... Gen 1:20-22" (20,327
  impressions, 50 outbound clicks in 90 days).
- Top 10 Pins = 45% of impressions, 50% of outbound. 30 Pins had under 100 impressions in 90 days.
- 18 Pins lacked alt text (16 of them Genesis/creation Pins, including the top Pin); all set the same day.

**Market ceiling and funnel (measured 2026-09-24).** A profile's `profile_views` in the internal `UserResource`
is Pinterest's "monthly views" (ours read 104,964 = the API's 30-day impressions). Niche leaders: Marshmallowish
(Bible coloring) 1.5M, Sermons4Kids 978k, SundaySchoolZone 812k, Children's Ministry Deals 702k, Ministry-To-
Children 486k, Trueway Kids 349k, Faithful Teacher's Corner 281k; generic coloring (SuperColoring) 10M+. So the
niche ceiling is ~1-1.5M monthly views (10-15x today). Funnel: 0.17% of impressions become clicks to the site;
Google sends ~nothing (1 ranking keyword), so sign-ups ~ Pinterest: ~8% of clicks sign up (183 sign-ups vs
~2,100 lifetime clicks); 4 of 183 paid (2.2%), $84.95 total, ~$21 per buyer, ~$0.46 per sign-up. Pinterest's
conversion tag only records page visits (no sign-up or purchase events), and sign-ups don't store a source.

**Monthly email report** (owner request 2026-09-24: text only, every ~30 days, **a quick TLDR, not an analytics
dashboard**: keep it about 15 lines): the Worker's cron (`0 13 24 * *`, `web/wrangler.jsonc`; entry
`web/src/worker.ts`) runs `emailReport()` in `web/src/lib/pinterest-email.ts`: one line for the account's last 30
days (impressions, saves, clicks to the site, each vs the 30 before); one line per board (clicks and impressions
since the last report, from per-board lifetime totals saved in KV `report:last`; the first report shows 90 days);
top 3 Pins by clicks to the site for 30/60/90 days, one line each; new Pins and what's scheduled; a to-do line
(a board's calendar ending within 30 days, Pins without alt text). Format (owner, 2026-09-24): bullet points,
board names in bold followed by ":", top Pins as numbered lists linking to each Pin; bare HTML with a plain-text
copy. Preview without sending: `/api/pinterest/report?tldr` (owner session). It goes through
Email Routing (`send_email` binding `REPORT_EMAIL`, raw MIME: the structured `send()` is refused without Email
Sending onboarding) to a verified destination address, from reports@biblesketch.app. If building fails, a
"FAILED" email with the error goes out instead (e.g. Pinterest disconnected). Send one now: the "Email the
monthly report now" button on /api/pinterest (owner session). Recipients: `TO` and `CC` in
`pinterest-email.ts` and `allowed_destination_addresses` in `wrangler.jsonc`; each must be a verified Email Routing
destination (`npx wrangler email routing addresses list`; add one with `... addresses create <email>`, then the
person clicks the verification link). Raw MIME has one envelope recipient, so each CC is a separate send of the same
message; a failed CC is logged and doesn't fail the report.

**Internal API (fallback):** in the signed-in Pinterest tab, `/resource/BoardFeedResource/get/` with `source_url` and header
`X-Pinterest-PWS-Handler: www/[username]/[slug].js` returns each Pin's `creator_analytics` (lowercase keys:
`impression`, `save`, `outbound_click`, `pin_click`). Judge nothing before day 30 (strategy §4).
