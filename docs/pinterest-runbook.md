# Pinterest runbook (where we are, and how to do each recurring job)

Why we do things this way: [pinterest-strategy.md](pinterest-strategy.md) (the plan, with the Pin copy rules in
§3.3a) and [pinterest-scripture-plan.md](pinterest-scripture-plan.md) (verse art). Decisions: ROADMAP 1.5.
Owner-only steps: CHECKLIST, "Pinterest auto-publish".

## Status (update this block at the end of every Pinterest session)

As of **2026-09-24 11:10 UTC** (first `pinterest-daily` run):
- **Calendar** (`web/src/data/pins.json`, 178 entries, `pins-check`: no errors):

  | Board | Pins | Dates |
  |---|---|---|
  | Christmas | 42 | Sept 23 - Dec 19 |
  | Scripture | 74 | Sept 24 - Dec 20 (all verse art, `plain` template) |
  | Sunday School | 62 | Sept 25 - Nov 13 (one a day Oct 1 - Nov 5, plus the Genesis 1-4 series Oct 2 - 30) |

  Ramp capacity through Dec 20 is ~370; **193 slots are open** (100 of them in the 7-60 day window), first open day
  Oct 14 (Oct 14 and Oct 16 can only take Christmas or Scripture: Sunday School already has 2). Sunday School has
  nothing after Nov 13 and Christmas is thin in December by design (front-loaded).
- **Daily task log.** 2026-09-24: 5 generated, 5 approved: Christmas Oct 9 (Luke 2:12, angel gives the shepherds
  the sign) and Oct 12 (Micah 5:2, Micah points to Bethlehem); Sunday School **Abraham series** Oct 11 (Gen 12:5),
  Oct 15 (Gen 15:5), Oct 17 (Gen 21:2-3). Next runs: continue Abraham (three visitors Gen 18:2, Isaac and Rebekah,
  Jacob's ladder), then Babel and Joseph. `pins-alt.mjs` cuts alt text short when the description quotes a verse
  with a full stop inside (Joshua 1:9); that Pin's alt was set by hand.
- **Genesis 1-4 series** (2026-09-24, owner request after the stats showed Genesis 1-4 Pins earn 62% of clicks):
  18 reviewed pages on the Sunday School board every day or two from Oct 2 to Oct 30, in story order: Creation days
  1-7 (opener "Days of Creation Coloring Pages"), "very good", Adam's breath of life, tending the garden, Eve,
  the fruit, hiding, garments of skin, leaving Eden, Cain and Abel (x2). 23 generated, 5 rejected and left private
  (broken border; implied nudity in the realistic Young Child style; lone figure; thin lines). Lesson: for Adam
  and Eve, the Toddler style keeps them modest (behind flowers, with animals); the Young Child style drew Eve
  covered only by her hair twice. Cain's angry face (Gen 4:3-5) was kept on purpose: the verse says so.
- **Alt text**: every Pin on the active boards has alt text (the 18 missing ones, mostly old Genesis Pins, were
  written from their images and set 2026-09-24; the two RSS Pins released so far, Luke 2:15-16 and Joshua 1:9, were
  set by the daily run 2026-09-24). New RSS Pins get it on each daily run.
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

## Daily scheduled task (`pinterest-daily`, owner request 2026-09-24)
A Claude Code scheduled task in the desktop app (`C:\Users\renau\.claude\scheduled-tasks\pinterest-daily\SKILL.md`,
every day at 7:00 local, runs only while the app is open) adds **5 reviewed Pins a day** with the procedure in
"Generating a batch of pages" below, following the **yearly calendar**. Owner-authorized scope: at most 10
generations per run on the master account (with the planner's `guidance`); publishing the approved ones; editing
`web/src/data/pins.json`, `pin-year.json` (refill only: add items, never remove used ones), `pin-learn.json` and
this file's Status and "What's working" blocks; pins-check, pins-plan, pins-learn, build, `npx wrangler deploy`
(Worker only); commit and push those files to `main`; the alt-text pass. Nothing else.

### The yearly calendar (owner request 2026-09-24)
`web/src/data/pin-year.json` is the whole year, and `node scripts/pins-plan.mjs` (in `web/`) turns it into each
day's exact instructions, so the task never improvises what to post:
- **Seasons** with release windows opened about 6 weeks before Pinterest searches rise (Trends curves in the file's
  `_trends`): Christmas Oct 1 - Dec 15 (1 a day, 2 a day Nov 1 - Dec 10), Epiphany Dec 16 - Jan 3, Lent and
  Easter from Easter - 60 days (2 a day on the Easter board), New Year and Valentine's verses, Mother's Day,
  Pentecost, VBS summer, Father's Day, back to school, creation (our Genesis peak in September), fall (Noah and
  Jonah), light (October), Thanksgiving. Easter, Pentecost, Mother's/Father's Day and Thanksgiving are computed
  each year.
- **Daily mix** (trimmed to the ramp): the seasonal boards first, then Sunday School, 1 Scripture, **Adult on
  Tuesdays and Fridays** (owner decision 2026-09-24, Adult/Classic, `black` template), then Sunday School up to 3.
  A board with nothing left hands its slot to Sunday School, then Scripture.
- **Content bank** (`items`): about 350 story moments and verses, each with its variants (T = Toddler, Y = Young
  Child, A = Adult/Classic, ES/CS/MB/PL = verse fonts) in the order to make them. Adam and Eve are Toddler only.
- **No repeats:** a moment + variant is posted once. Another variant of it waits 90 days, the same page slug on a
  board 30 days. Only **proven winners** (`pin-learn.json`, top 10% at day 180) come back as a fresh image, after
  6 months, in at most 10% of recent slots (owner decision 2026-09-24).
- `pins-plan.mjs --check` validates the file and the next 365 days, and warns when a board has fewer unused pages
  than open slots in the next 90 days: then the task **refills** the bank (at most 20 new moments a run, same
  format, faithful to the text, not already in the bank).

### The learning loop (owner decisions 2026-09-24: long-term data only; steer the drawing; learn the "je ne sais quoi" from winners and losers)
**Two outcomes per Pin,** from lifetime numbers at **day 180** (and day 365), ranked **within its own board**
(boards differ a lot):
- **Reach** = outbound clicks + saves. It mostly reflects what the topic, the season and Pinterest's distribution
  gave the Pin, which is partly a lottery. So reach only steers **what to post** (planner weights per board, age,
  style, font, book, template, title opener and series). 1 slot in 5 ignores the weights, to keep exploring.
- **Resonance** = clicks + saves per 1,000 impressions, counted only for Pins shown 300+ times: did the people who
  saw the image want it? Only resonance judges the image itself (composition, faces, feel, style), so a lucky or
  unlucky distribution teaches nothing about the drawing.

Winners and losers weigh the same: each Pin above the board median pushes its traits up, each one below pushes
them down. Every trait is shrunk toward neutral for small samples and labelled by evidence: hunch (fewer than 8
Pins), moderate, or strong (15+ Pins and a clear effect). Only moderate and strong ones become rules.

**Visual profiles.** Each approved page gets `tags` from the vocabulary in pin-year.json (`_tags` explains them):
- characters, children, animals
- scale, viewpoint, setting, density
- faces (joyful, tender, calm, awe, worried, stern), feel, composition, action, recognizable at feed size
- look, lines, frame, caption
- layout and motifs (verse art)

New pages get their tags at review, in pins.json. Older Pins have them in pin-learn.json `profiles`: all 130
sketches were profiled on 2026-09-24 from their images, with the performance numbers hidden while tagging.

**Monthly** (the daily run on or after the 25th, after the monthly report saved fresh numbers in KV
`learn:report`):
1. `node scripts/pins-learn.mjs` writes to pin-learn.json:
   - `weights`: what to post;
   - `traits` and `traitsByKind`: kids, adult and verse, with effect, n and confidence;
   - `traitNotes`;
   - `winners`: the top 10%, which may come back as fresh images;
   - `study`: the 12 most and 12 least resonant Pins of each kind, with images;
   - `referenceCandidates`: for a quarterly, owner-approved swap of `REFERENCE_MAP`.
2. **Visual study:** turn `study` into contact sheets (`python scripts/pins-review.py <json> <prefix> 6`) and look at
   the top and bottom Pins side by side. Update `lessons` (what the winners share and the losers lack) and
   `compositionNotes` (at most ~300 characters per kind; the planner puts them in every `guidance`). Keep only what
   both the images and the moderate/strong traits support.
3. Paste the summary into "What's working" below.

To refresh the numbers by hand, open `/api/pinterest/report?save` from the signed-in tab (snippet in "Reading
performance").

**The drawing is steered:** every slot's `guidance` holds the moment to draw (or the verse decorations) plus that
kind's composition notes, and `createSketch` accepts it from the master account only. Every generation keeps its
brief, guidance, models, references and prompt version on its private `generations/` ledger doc. Log a rejected
page with `node scripts/pins-plan.mjs --reject <plan> "<reason>"`; two rejects skip that item variant.

**What's working** (pins-learn and the visual study, 2026-09-24; 146 Pins from Nov-Dec 2025, all at least 180
days old and all profiled; `lessons` in pin-learn.json has the detail):
- **Kids:**
  - Winners have a big, friendly, calm or smiling face (1-2 people, or smiling animals) and a garden or setting
    filling every corner in bold shapes: Adam breathing in life, Esther and the king, the Eden trees.
  - Losers have no face or person, big empty sea or sky, abstract swirls, or a small subject: dry land and seas,
    the tiny ark.
  - Measured (moderate): no characters, a wide viewpoint, medium scale and medium lines all fall flat.
- **Adult:**
  - Winners are whole pages of ornate pattern, peaceful or majestic, and readable: stained-glass magi under the
    star, the creation trees, the Psalm 23 meadow. Measured: peaceful feel +0.19, a wide view (strong), dense.
  - Losers: the crucifixion, abstract objects, a lone static figure, half-empty backgrounds, nudity. Measured:
    solemn feel (strong), balanced density (strong), awe faces, a single character.
- **Verse:**
  - Winners are bold outline letters filling a scroll or the page, with an ornate frame and cheerful motifs, on
    famous verses. Measured: dense, framed, scroll, medium lines.
  - Losers are thin script in white space, and fragments or odd KJV wording.
- **What to post** (reach and resonance within boards): Iconography ×1.18, the Playful verse font ×1.14, Matthew
  ×1.12, Classic ×1.08, Psalms, Toddler. Weaker: 1 Thessalonians, Stained Glass for kids' boards, Young Child.
- **Winners** (may come back as fresh images after 6 months): Romans 8:28, Joshua 1:9, John 10:30, the magi and
  the star, the manger, Eve brought to Adam, Genesis 3:1, Cain and Abel, John 19:30, Matthew 28:6, the flood,
  1 John 4:8, the Eden trees.

**Run** (in order; stop and report on any failure):
1. Read the Status block; `git pull --ff-only` (stop if it fails or `pins.json`/this file have uncommitted changes).
2. On or after the 25th, if `pin-learn.json` `updated` is older than 25 days: `node scripts/pins-learn.mjs`.
3. `node scripts/pins-plan.mjs --check`: refill the bank if it warns.
4. `node scripts/pins-plan.mjs --next 5`: exactly these slots, in this order.
5. Generate each slot's `create` (it includes `guidance`), review up close, and log rejects. Regenerate a reject once;
   if it fails again, ask the planner for the next pick. At most 10 generations; stop after 3 failures in a row
   (likely the Gemini spend cap).
6. Publish the approved pages. Write each entry with the slot's `release`, `board`, `template`, `ref`, `plan`, the
   review `tags`, and copy by §3.3a.
7. Run pins-check (no errors, no warnings on new entries), build, deploy, check one new `/pin-img/`, then the
   alt-text pass.
8. Update the Status block, commit `pins.json`, `pin-year.json`, `pin-learn.json` and this file, then push.

Fewer than 5 approved is fine: never schedule a reject.

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
   three magi). Also reject what the learning loop found falls flat: large empty areas (bare sky or sea),
   no readable face on a kids' page, a subject too small to read at feed size, suffering or nudity, and thin
   letters floating in white space on verse art. Regenerate the verse or scene; never schedule a reject.
   Give every approved page its visual profile (`tags`, vocabulary in pin-year.json `_tags`).
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
Without the owner session, the master account's Firebase ID token also works (the daily task uses this), and
`?save` stores the per-Pin numbers in KV `learn:report` for `pins-learn.mjs`:
```js
const f = await import('/_astro/firebase-client.<hash>.js'); const { auth } = await f.n();
const headers = { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` };
await fetch('/api/pinterest/report?save', { headers }).then((r) => r.text()); // "Saved 151 Pins for pins-learn."
```

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

**Growth projection (2026-09-24), to check each month against the account's 30-day numbers.**

Model inputs:
- the Nov-Dec 2025 cohort's per-Pin curve: ~4,600 lifetime impressions, peaking around month 4, then -6% a month;
- 5 Pins a day;
- 35% extra impressions from other people's repins;
- rough seasonal factors: Christmas ×1.3, Easter ×1.35, summer ×0.85-0.9;
- a soft ceiling at the niche leaders' 0.9-2.5M monthly views.

Rates improve over the year as the learning loop kicks in (its first new Pins reach 180 days at the end of March
2027). Monthly figures:

| Month | Low: impressions / clicks / saves | Base | High |
|---|---|---|---|
| Today (Sep 2026) | 105k / 177 / 392 | same | same |
| Dec 2026 | 205k / 330 / 615 | 264k / 490 / 910 | 327k / 665 / 1,210 |
| Mar 2027 (Easter) | 404k / 660 / 1,210 | 606k / 1,190 / 2,110 | 838k / 1,870 / 3,230 |
| Sep 2027 | 492k / 830 / 1,480 | 769k / 1,670 / 2,760 | 1.12M / 2,940 / 4,640 |
| Dec 2027 | 637k / 1,080 / 1,910 | 1.0M / 2,210 / 3,610 | 1.47M / 3,970 / 6,180 |
| Sep 2028 | 623k / 1,060 / 1,870 | 989k / 2,180 / 3,560 | 1.48M / 3,990 / 6,210 |

Year 1 (Oct 2026 - Sep 2027) base: 5.5M impressions, 11k clicks, 19k saves. Year 2 base: 10.5M impressions, 23k
clicks, 38k saves. The script is in the 2026-09-24 session scratchpad (project.py); rebuild it from this table if
needed.

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
