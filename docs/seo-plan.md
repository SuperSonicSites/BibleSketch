# SEO implementation plan (tonight, 2026-09-25): one stage at a time

Work through the stages **in order**, most impactful first. For each stage: make the change, run the local
checks, deploy, run the live checks, tick the box, update "Where we are", then move on. Never start a stage
before the previous one is verified live.

## Where we are

- Current stage: **Stage 3 (not started)**
- Last verified live: Stage 2 + QA fix (2026-09-25, Worker 221ae789 + functions:sitemap)
- Notes:
  - Stage 1: master pages' og:image, JSON-LD, share buttons and image sitemap use
    `/img/w800/<original path>` (800x1071 WebP); community pages use their 400x533 thumbnail; the w800 route
    404s outside the master folder. Sitemap: 463 image entries, 0 Firebase. Firebase URL remains only in the
    island props (`imageUrl`, used by bookmark/share code), as planned. Profile og:image is the account avatar
    (out of scope).
  - Stage 2: community pages send `X-Robots-Tag: noindex` + meta noindex; community `/img/` images send
    `X-Robots-Tag: noindex`; all profiles noindex; sitemap = 372 master pages, 0 profiles, 378 images (372
    previews + 6 blog covers). `/api/purge` now accepts `lists: ["img"]`; purged img + the 85 community pages
    once. security-check: sitemap step now writes owner sketches with admin access (54/54 pass).
  - QA of stages 1-2 (2026-09-25): all 378 sitemap images 200; all 85 community og images 200 on our domain,
    0 Firebase; no Firebase URL in head/JSON-LD/share links on 10 page types; RSS feeds clean; 40 sampled master
    pages indexable, 85/85 community pages and thumbnails noindex (cached copies too); Worker tail: 29 requests,
    0 exceptions/errors/5xx. Fixed: tag pages with no owner page were indexable (`/tags/ordinary-time`); now
    noindex, matching the sitemap.
  - Lesson: purge about 30 s after `wrangler deploy`, not right away; an isolate still on the old version can
    re-cache a page in between (happened once with /tags/ordinary-time; purged again).
  - Open loose ends: (a) related grids on master pages still link some community pages (~5 of 85 links
    sampled): Stage 4 makes them master-only. (b) `web/scripts/check-sketch.mjs` fails on "first related link"
    because its Sep 22 fixture predates newer pages (fails the same on pre-stage-1 code): refresh the fixture
    in Stage 3. (c) The old Firebase renderers (profileRender, sketchRender, tag renderer) still call community
    pages and profiles indexable; unused in production (the Worker serves those paths), removed in phase 5;
    security-check's "thin pages" step tests them, not the Worker.

## Ground rules (every stage)

- **No existing URL changes.** Only add new URLs. Coloring-page, tag, blog and Pin URLs stay exactly as they are
  (Pinterest links and reputation). No redirects of user pages, ever.
- **Only the master account's pages and images are offered to Google** (`MASTER_UID` =
  `TiAEiMqWxpWqxCLtoI5OgHAvtf33`). Community pages stay public, shareable and printable, but are hidden from
  Google. Reason: users can make a page private or delete it (404), rights belong to them (Terms 2.1), and quality.
- **The full-resolution original is never referenced publicly** (sitemap, og:image, JSON-LD, share buttons).
- **Pinterest save text (`pinDescription`) does not change.** Search snippets get their own helper.
- **Not part of this plan:** a public print offer, free samples, making the repo private, changing
  `hosting-public/` files (byte-exact, Hosting procedure only).
- **No bulk AI text.** Google's September 2026 spam update runs Sep 24 to about Oct 8. Page descriptions are
  written a few pages a day by the daily task, starting after Oct 8 (Stage 11).
- `web/` must stay deployable after every stage: `pinterest-daily` deploys whatever is in the working tree.
  Commit each stage once it is verified.
- Deploys: Worker from `web/` with `npm run build` then `npx wrangler deploy` (stop `astro preview` first).
  Functions only with a quoted list, e.g. `firebase deploy --only "functions:sitemap"`.
- Local checks: `npm run build`, `npx astro preview` (http://localhost:4321), `node scripts/check-pages.mjs`.
  Repo root: `node --check functions/index.js`; `node scripts/security-check.mjs` against the emulators when a
  stage touches indexing rules. Live checks: add `?cb=<random>` to every URL.
- After each deploy: check the changed routes live, look at Worker logs, say what was verified and what wasn't.

---

## Stage 1: One image on our own domain, never the original  [x] verified live 2026-09-25

**Why first:** Google Images is result #1 on our money searches, and today every signal (image sitemap,
og:image, JSON-LD, Pinterest share button) points at the full-size Firebase PNG, which also breaks the
owner's rule. The page shows a different 400 px file, so Google gets two images per page.

**Changes**
- `web/src/lib/config.ts`: add `MASTER_UID`.
- `web/src/pages/img/[...path].ts`: add an 800 px WebP branch, **allowed only for paths under
  `user_uploads/<MASTER_UID>/sketches/`** (otherwise it would let anyone render 800 px copies of private
  community pages). Existing 400x533 and blog-cover branches unchanged.
- `web/src/lib/sketch.ts`: a `previewUrl(sketch)` helper (absolute `https://biblesketch.app/img/...` URL):
  800 px for master pages, the 400x533 thumbnail for community pages.
- `web/src/pages/coloring-page/[...path].astro`: og:image, JSON-LD `image`, Pinterest share `media` use
  `previewUrl`. Keep `sketch.imageUrl` in the island props (share code reads it).
- `web/src/components/ListingCard.astro`: Pinterest share `media` uses `previewUrl`.
- `functions/index.js` sitemap (`exports.sitemap`, around line 449): `<image:loc>` becomes the first-party
  800 px preview. Deploy `firebase deploy --only "functions:sitemap"`.

**Checks**
- Local: `/img/w800/<master path>` returns 200 `image/webp`, ~800 px wide; the same for a community path
  returns 404; the 400x533 thumbnail still works.
- Live: the coloring page HTML contains no `firebasestorage.googleapis.com` in `<head>` or JSON-LD
  (`curl -s <page>?cb=... | grep -c firebasestorage` shows only island props, if any);
  og:image loads; `sitemap.xml?type=<bucket>` shows `biblesketch.app/img/` image entries.
- Print and download still work (they use `storagePath`, not `imageUrl`).

## Stage 2: Hide community pages from Google  [x] verified live 2026-09-25

**Why:** keeps unstable, unreviewed pages out of the index so a user making a page private never breaks our
search results. Every coloring page that earned a Google click in 12 months is a master page (checked).

**Changes**
- `web/src/pages/coloring-page/[...path].astro`: `robots="noindex"` when `sketch.userId !== MASTER_UID`.
- `web/src/pages/img/[...path].ts`: add `X-Robots-Tag: noindex` to images outside the master folder.
  After deploy, purge the `img` cache tag once (thumbnails are cached for a year).
- `web/src/pages/profile/[uid].astro`: all profiles `noindex` (the story index replaces them later).
- Sitemap (`functions/index.js`): coloring pages from `MASTER_UID` only; drop the profiles sub-sitemap.
- `scripts/security-check.mjs`: update the expectations (community sketch page now noindex; profiles noindex).

**Checks**
- Emulators: `node scripts/security-check.mjs` all pass after the expectation update.
- Live: a community page (e.g. `/coloring-page/genesis-3-6/ZxyOG3Yfl7MP5EFEsGKj` if not master; confirm with
  its "Created by") shows `noindex`; a master page does not; a community `/img/` thumbnail sends
  `X-Robots-Tag: noindex`, a master one does not; the sitemap has 372-ish coloring pages and no profiles.
- Pinterest links to master pages unaffected (spot-check 2 recent pins' landing pages).

## Stage 3: Coloring-page template that can carry the story  [ ]

**Why:** pages have ~150 words, never name the story, and the first real sentence is the paywall. This stage
builds the slots; the words themselves arrive gradually (verse text now, descriptions from Stage 11).

**Changes**
- `web/src/data/page-text.json` (new, keyed by sketch id): `{ scene, description, verse }`. Firestore rules
  forbid writing new fields to sketch docs, so text lives in the repo like `pins.json`.
- A one-off script (`web/scripts/page-text-verses.mjs`) fills `verse` (World English Bible, public domain)
  for master pages from bible-api.com. No AI text in this stage.
- Template: when an entry exists, show the scene in the title/H1/alt ("<Scene> Coloring Page (<Ref>)"),
  a "What's in this picture" block, the verse as a blockquote, and a "Part of: <story>" link (Stage 9 fills it).
  Without an entry: alt = full reference + "coloring page" (not the book alone).
- `web/src/lib/sketch.ts`: new `metaDescription()` (~150 chars, no hashtags, no disclaimer). `pinDescription`
  and `description()` stay as they are for Pinterest.
- "Unlock This Coloring Page" stops being a heading; add the honest line "Free to print with a free account
  (5 prints)". The AI note moves into the page body ("Drawn with AI from the Bible text").

**Checks**
- `node web/scripts/check-sketch.mjs`: expected differences only in meta description/title where text exists;
  update the fixture deliberately.
- Live: a master page shows the verse and clean meta description; `data-pin-description` unchanged
  (compare before/after); a page without an entry still renders.

## Stage 4: Crawl paths (reach the 41% of pages nothing links to)  [ ]

**Changes**
- Tag pages: all items on one page (no `?page=2`), lazy images; filters unchanged.
- Gallery `?page=N`: self-canonical with "Page N" in the title (not page 1).
- Related grid (`relatedQuery` / `loadRelated` in `sketch.ts`): same book and nearest chapter first, master
  pages only (one existing query: master public pages, grouped in memory; no new Firestore index).
- `web/src/components/SketchEmbed.astro`: link text = the scene or reference, not "View Full Page".

**Checks**
- Live: `/tags/christmas` lists all 54 pages on one URL; `/gallery?page=2` canonical is itself; the Luke 2:6-7
  page's related grid shows Christmas pages; blog embeds show descriptive link text.

## Stage 5: Say only true things  [ ]

**Changes**
- `/pricing`: remove "No Watermark", "Private Mode", "Commercial Rights" as paid perks; add company name
  (Supersonic Sites Inc.) and a refund line.
- Rights: one usage-rights paragraph in `/terms`; `/about` and blog FAQs point to it.
- `ai.txt` and `robots.txt`: serve from the Worker (`web/public/`, add both to `LIVE_PREFIXES`) so
  `hosting-public/` is untouched. `ai.txt` rewritten to match the Terms; `robots.txt` same rules as today plus
  the sitemap line.
- Copy: "free printable" -> "free to print with a free account"; "thousands" -> "450+"; "in seconds" ->
  "about a minute"; rename "Community Favorites" (they are staff pages).

**Checks**
- Live: `/ai.txt` and `/robots.txt` served by the Worker with the new text; `/pricing` perks and refund line;
  no "thousands" / "in seconds" left (`curl` + grep home, gallery, pricing).

## Stage 6: Structured data  [ ]

**Changes**
- Organization (home, `/about`): one `@id`, logo, `sameAs` Pinterest and TikTok.
- Master coloring pages: `ImageObject` with `contentUrl` (800 px preview), `license` (Terms), `acquireLicensePage`
  (`/pricing`), `creditText`, `creator`, `copyrightNotice`, `digitalSourceType` (AI); author/copyright point to
  the Organization (not a Person named "Bible Sketch"); `description` = the meta description.
- Community pages: no license markup (users own them).
- Tag pages: `CollectionPage` + `ItemList`. No FAQ, HowTo, SearchAction or review markup.
- Add to `web/scripts/check-pages.mjs`: fail if `firebasestorage` appears in head or JSON-LD.

**Checks**
- Rich Results Test on one master page and `/tags/christmas`; `check-pages.mjs` passes.

## Stage 7: Bing and IndexNow  [ ]

**Changes**
- IndexNow key file in `web/public/`; `/api/purge` (already called for every publish) also pings IndexNow
  with the changed master URLs. No functions deploy.
- Owner: Bing Webmaster Tools (import from Search Console, submit sitemap); check Cloudflare Bot Fight Mode /
  AI bot settings let real search bots through; point `img.biblesketch.app` to the main site in Short.io.

**Checks**
- Key file returns 200 text; a test purge logs a 200/202 from IndexNow; Bing shows the sitemap.

## Stage 8: Typos and the blog bug  [ ]

**Changes**
- `functions/blog-posts.json`: the "best" -> "favorite" damage in `christian-christmas-coloring-pages`
  ("favorite For:", "My Tips for favorite Results", "favorite typography layout"), and the
  "Educational Authority hats" line.
- `sketch.ts`: "Young Childs", "for Toddler" -> "Toddlers", `bookDisplay` "Proverb" -> "Proverbs".
- Toddler Christmas post: a link near the top to `/tags/christmas`.

**Checks**
- Live grep for "favorite For", "Young Childs", "Proverb " returns nothing; `check-sketch.mjs` fixture updated.

## Stage 9: Story list, verse pages and story pages (new URLs, unlinked)  [ ]

**Changes**
- `web/src/data/stories.json`: stories with verse ranges, scenes, characters, memory verse, season, Wikidata
  id; seeded from the 30 series in `pin-year.json`.
- Verse pages: new route `web/src/pages/coloring-page/[verse].astro` for `/coloring-page/<ref-slug>`
  (the address above existing pages, 404 today). A segment without a hyphen is a sketch id and must keep the
  current behaviour. Indexable only with 3+ master pages (36 references today), otherwise noindex.
- Story pages: `/coloring-pages/<story>` and the `/coloring-pages` index in Bible order; add `/coloring-pages`
  to `LIVE_PREFIXES`. Indexable at 10+ master pages. Cache tags `tag:`/`related:` so publishes show up.
- Built **unlinked**; linked from tag pages and coloring pages only once reviewed.

**Checks**
- `/coloring-page/luke-2-6-7` renders the verse page (8 master pages); `/coloring-page/<a sketch id>` still
  301s to its canonical; `/coloring-pages/nativity` renders; unknown slugs 404 + noindex.

## Stage 10: Generator page wording  [ ]

**Changes**
- `/bible-verse-coloring`: title "Bible Verse Coloring Page Generator | Bible Sketch", a 3-step "How it works".
- Home: the word "generator" in body text; the home title stays as it is.

**Checks**
- Live title and text; home title unchanged.

---

## After tonight (scheduled, not tonight)

- **Stage 11 (from Oct 8): page text through the daily task.** Owner extends `pinterest-daily`'s scope in
  `docs/pinterest-runbook.md`. Each run writes `page-text.json` entries for 5-8 existing master pages
  (order: Nativity 64, Wise Men 9, Noah 20; Creation 60 held 3 weeks as the comparison group), owner approves
  them in the Pin review, and every new master page is born with its text. About mid-December for all 372.
- **Stage 12 (by Nov 1): `/tags/christmas` and `/tags/advent` upgraded in place.** Owner-written intro,
  scene sections in Bible order, toddler section, "How I use these in Sunday school"; Advent becomes the
  25-day calendar (missing scenes added to `pin-year.json`). Link the verse and story pages from them.
- **Stage 13: links.** From about Oct 12, 30-50 hand-picked church, homeschool and Advent resource pages.
- **Stage 14: measurement.** Search Console (Web, Images, AI report), Bing AI Performance, sign-ups by landing
  page in the monthly report, 20 fixed AI prompts a month.
- **Always:** `pin-year.json` decides what gets made, for Pinterest and search at once; never make a
  published master page private or delete it; when community pages pass ~10,000, block search engines
  from the gallery's deep lists.
