# Pinterest strategy (from Pinterest's own engineering papers)

Written 2026-09-23. Sources: six papers by Pinterest engineers about how the recommender picks Pins, plus the
account audit of the same day (176 Pins, 806k impressions, 2,079 outbound clicks). The execution plan lives in
ROADMAP 1.5; this file explains why the plan looks the way it does and what to change.

| Short name | Paper | What it describes |
|---|---|---|
| PinnerSage | Pal et al., KDD 2020 (arXiv 2007.03634) | A user = several interest clusters; how Home Feed candidates are fetched |
| PinnerFormer | Xu, Zhai, Rosenberg, RecSys 2022 (arXiv 2209.08435) | Long-term interest (14-28 day future) vs short-term intent |
| TransAct V2 | Xia et al., 2025 (arXiv 2506.02267) | Home Feed ranking with a 2-year action history and impression negatives |
| PinFM | Chen et al., 2025 (arXiv 2507.12704) | 20B-parameter activity model; how brand-new Pins are handled |
| PinRec | Botta et al., KDD 2026 (arXiv 2504.10507) | One retrieval model for Home Feed, Search and Related Pins, steered per goal |
| UniPinRec | Li et al., 2026 (arXiv 2606.00422) | Retrieval and ranking in one model; Board More Ideas and notifications |

A caveat to keep in mind throughout: these papers describe models, not marketing. They never mention posting
frequency, hashtags, time of day or account penalties. Everything below is one of three kinds of statement, and
the text says which: **stated** (the paper says it), **inferred** (follows from how the model works), or
**ours** (our own account data).

---

## 1. How the machine sees a Pin, a person and a board

### 1.1 A Pin is an embedding built from image, text and the boards it sits on
**Stated.** Every model in these papers represents a Pin by PinSage or its successor OmniSage: "visual signals,
text annotations, and pin-board graph information" (PinnerSage), plus engagement. New models add CLIP-style image
embeddings (UniPinRec). The pin-board graph means: which boards the Pin is saved to, and what else sits on those
boards.

**Inferred.** A Pin's position in Pinterest's space is decided by three things we control or influence:
1. What the image looks like (a full storybook scene reads as "kids' Bible activity"; a stained-glass mandala reads as "adult coloring").
2. The words in the title and description (these feed the text annotations).
3. The boards it lands on: our board at first, then every board a stranger saves it to. A save onto someone's
   "Sunday School Crafts" board teaches Pinterest more than our own copy does.

### 1.2 A person is a set of separate interests, not an average
**Stated (PinnerSage).** Pinterest clusters each user's last 90 days of saves and clicks into separate interests
(3-5 for a light user, 75-100 for a heavy one) and fetches Home Feed candidates near a few of them at a time. Their
example: averaging "painting", "shoes" and "sci-fi" gives an embedding closest to "energy boosting breakfast",
which is why they refuse to average. Interest weight decays with λ = 0.01 per day: an interest untouched for about
69 days counts half.

**Inferred.** A Pin gets fetched when it sits clearly inside an interest many people have. A Pin that sits between
two interests (an adult-style page with a kids' title, a toddler page on an adult-art board) is close to nobody's
cluster and gets fetched for nobody. This fits our numbers: Toddler/Sunday School earns 36.8 outbound clicks per
Pin and Adult/Stained Glass 4 (**ours**), and 104 of our 176 Pins were Adult.

### 1.3 Pinterest remembers two years, and matches each new Pin against that history
**Stated (TransAct V2, PinFM).** Home Feed ranking reads up to about 10,000 of a user's actions over two years.
For each candidate Pin, it searches that history for the user's past actions *most similar to that Pin* and
feeds those to the ranker, next to the last few hundred real-time actions. PinRec's time features include
"daily, weekly, and seasonal" cycles.

**Inferred.** Seasonal content has a long memory. A parent who saved nativity pages last December is matched
against our new nativity Pin this November through that stored action, even though the 90-day interest clusters
of 1.2 have forgotten it. Seasonal Pins win by looking like what the same people saved last season.

### 1.4 Shown and ignored counts against you
**Stated.** TransAct V2 trains on "impression-based negatives": Pins a user was shown and did not act on. This beat
random negatives and cut hides 12.8% online. PinRec and UniPinRec use impression-only Pins as hard negatives too,
and PinRec found that treating impressions as positive "rewards exposure rather than intent" and hurt results.
Hides are an explicit negative in every ranking model.

**Inferred.** An impression with no save, click or close-up is not neutral: it teaches the ranker that this kind
of Pin does not suit this kind of person. A weak Pin does not just fail quietly; it spends the account's
impressions teaching the system that our content gets scrolled past. **Quality control is a ranking lever**, not
a matter of taste. This is the strongest argument for one reviewed Pin a day over many unreviewed ones.

### 1.5 Each surface chases a different action
**Stated (PinRec).** "Search emphasizes outbound clicks … related Pins emphasizes session depth and continued
exploration, and home feed emphasizes saves and discovery." PinRec retrieves separately for each target outcome
("outcome-conditioned"), and it helped most for rare outcomes: +16% recall for product outbound clicks in Search.
Home Feed has "a higher share of less-active users"; Related Pins skews to active users.

**Inferred.** We need two things from each Pin, and they come from different surfaces:
- **Saves** (Home Feed, Board More Ideas): the Pin has to be worth keeping. Teachers and parents save things to use later.
- **Outbound clicks** (Search, where they are the goal): the Pin has to promise something you only get by clicking: the printable itself.

Search is where our business outcome (a visit to biblesketch.app) is the platform's goal too. Search runs on
query embeddings (OmniSearchSage), so words that match how people search matter most there.

### 1.6 New Pins are judged by content for about four weeks
**Stated (PinFM).** A new Pin has no learned ID embedding. In training, the model's ID-based output is dropped 70%
of the time for Pins younger than 7 days and 50% for 7-28 days, so fresh Pins are scored mostly on content features.
This turned a -4% for Pins under 28 days into +17.7%, and +5.7% "fresh saves" online. PinRec retrieves brand-new
items "zero-shot" from their content embedding.

**Inferred.**
- Pinterest works to give fresh Pins a fair chance: a steady trickle of new Pins is rewarded, and re-posting old images adds nothing (1.7).
- For the first ~28 days a Pin lives on its image, words and board. After that its own engagement history takes over.
- **Don't judge a Pin before day 30**, and publish seasonal Pins at least 4 weeks before the peak so they arrive with a history of their own.

### 1.7 Duplicates and text-heavy images are filtered before ranking
**Stated (PinnerSage).** Before candidates reach ranking, Pinterest removes "near duplicates" and "lower quality
pins … due to their aesthetics (low resolution or large amount of text in the image)".

**Inferred.** A second Pin of the same image competes with the first and can be dropped as a duplicate. Text on
the image should be a small label, not a headline block. (**Ours:** 26 URLs have 2-4 Pins each, some with
identical titles.)

### 1.8 Sessions chain Pins, and boards are anchors
**Stated.** Short-term intent moves the feed within a session (PinnerFormer had to damp it: one food Pin filled
the next refresh with food). Related Pins gains the most from multi-step generation (+71%) "as the model adapts
… to evolving user intent" (PinRec). UniPinRec adds boards as items in the sequence and powers "Board More
Ideas" (recommendations under a user's own board) and push/email notifications, where dormant users responded
twice as much (+1.72% push opens).

**Inferred.** When someone opens one of our Pins, the next things they see are close to it. Several distinct
scenes from the same story sit close together, so a series keeps the session on our Pins. And people who build
boards like "Sunday School Lessons" or "Christmas Crafts for Kids" get Board More Ideas suggestions for them:
we want our Pins to be the obvious fit for boards with those names.

### 1.9 What the papers do not tell you
Nothing here supports or rules out: a best posting time, hashtags, a safe daily Pin count, video/Idea Pins,
Rich Pins, or a creator-level quality score. TransAct V2's ranker does take "creator signals" as input, so the
account itself carries features, but the paper does not say which. Treat any claim on those topics as folklore
until our own data says otherwise.

### 1.10 Industry data: Tailwind's 2025 benchmark (1.2M Pins, 17k accounts)
Source: Tailwind, "2025 Pinterest Marketing Best Practices Benchmark Report", parts 1 and 2 (Nov-Dec 2024; data
Jul-Oct 2024). It measures outcomes, where the papers describe mechanisms. Read it with three caveats: it is
correlational, Tailwind sells a scheduler (its "Pins published via Tailwind do better" finding is self-serving and
ignored here), and its accounts are mostly English-language e-commerce and bloggers, not church and education.

What it adds or confirms:
- **Pinterest is evergreen.** Over 60% of saves in a 90-day window went to Pins over a year old, 40% to Pins over
  two years old; Pins peak in their **second year**. Day-30 and day-90 reads are early signals, not verdicts; the
  payoff of a Pin comes in year 1-2, and last season's Christmas Pins will circulate again this December. Matches
  our Easter Pin (82k impressions, still earning) and 1.3.
- **Fresh Pins get the traffic.** Over 90% of traffic to creators' sites came from their own new Pins ("Creates");
  re-saves of an existing Pin are rarely shown. Confirms 1.6-1.7 and the one-Pin-per-sketch rule.
- **Winners take almost everything.** Top 1% of fresh Pins = over 50% of impressions and clicks; bottom 80% = under
  10%. Ours: top 10 Pins = 43% of clicks. Pinterest itself recommends 5-25 fresh Pins a day (see 3.4).
- **Engagement drives reach**; image Pins are 89% of the most viral (video 8%): no need for video.
- **Vertical 2:3, lots of white.** 87 of the top 100 dominant colors in viral Pins were white or light grey; only 4%
  of viral designed Pins used the brand's own palette. Coloring pages are white by nature (good), and it is a point
  for the neutral `paper` banner over `purple` in our template test.
- **Titles:** ~80% of viral Pins have the target keyword in the title, often with a qualifier ("easy", "kid
  friendly"); only the first 35-45 characters show in the feed.
- **Descriptions: short and focused.** Viral Pins averaged 220-232 characters, with 5 or fewer keywords, and
  Tailwind's reading matches 1.1: too many ideas in one description blurs what the Pin is about.
- **Alt text:** Pins with alt text had 25% more impressions and 123% more outbound clicks (correlation, cause
  unknown). Our hand-made Pins have alt text; **RSS-published Pins have none** (Pinterest's RSS import has no alt
  field).
- **Hashtags** carry no penalty and seem to be read as keywords. We keep them out anyway: no evidence they help.
- Best posting time is account-specific; shopping features don't apply to us.

Part 3 (Mar 2025, "What is Fresh?"):
- **Freshness is a spectrum.** Pins with a new image pointing to an already-pinned page kept 64% of their reach even
  on the 11th-25th Pin to that page; the same image and page re-pinned kept 11%. New image > new text > nothing new.
  For us: a second Pin to a strong page is fine when the image is genuinely different (another sketch of the
  scene), never the same sketch in another banner (1.7).
- **Holding period.** Most new Pins get no impressions for the first couple of days; ~20% still had none after a
  week. Distribution then grows over the first 90 days, in step with saves and outbound clicks. Matches 1.6.
- **How to benchmark:** ignore week 1 entirely; look for week-over-week growth over the first 2-3 months; compare
  each month's new Pins with your own previous months, not with other accounts.
- Tailwind also warns that platforms are "likely" learning to spot and demote AI-generated content (no data given).
  Our pages are AI-generated line art: another reason for the close-up review of every page, and a risk to watch
  in the day-30 numbers.

---

## 2. Principles

1. **One Pin, one interest.** Every Pin must sit clearly inside one audience's interest: the image style, title,
   description and board all say the same thing. No hybrids. (1.1, 1.2)
2. **Every impression is a vote.** Publish only pages that pass the close-up review. A skipped day costs nothing;
   a weak Pin teaches the ranker to skip us. (1.4)
3. **Earn the save and the click separately.** Save = worth keeping (a lesson-ready page). Click = the printable is
   one tap away (the Pin shows the page; the site has the print-ready file). (1.5)
4. **Arrive before the season.** Seasonal Pins go out 4-8 weeks before their peak, and look like what the same
   people saved last year. (1.3, 1.6)
5. **New images only.** One Pin per sketch, never a re-post. Distinct scenes from one story, not near-copies. (1.6, 1.7)
6. **Name things the way searchers and board-makers do.** Titles, descriptions and board names use the words people
   type and the names they give their own boards. (1.5, 1.8)
7. **Judge at day 30 and day 90, value at year 1-2.** Before 30 days the Pin runs on content scores; judging
   earlier measures noise. Pins peak in their second year, so never delete a Pin for a slow start. (1.6, 1.10)

The current ROADMAP 1.5 rules already follow 2 and 5 (one reviewed Pin a day, one Pin per sketch, a 2-day feed
window). The changes below cover the rest.

---

## 3. The playbook for Bible Sketch

### 3.1 Content: where to put the effort
Our data and the model agree: the account's strength is **kids' Bible story scenes for teachers and parents**.
- **Lead with Toddler and Young Child Sunday School scenes** (36.8 and 13.5 outbound clicks per Pin). Full
  storybook scenes, 1-3 named characters in the key action, setting filling the page: the winner profile already
  recorded in memory and ROADMAP 1.0.
- **Keep verse art as the second line** (best click-through, 0.5-0.7%). It serves a different interest (scripture
  memory, journaling); keep it on its own board.
- **Adult coloring: pause new Pins.** Adult Pins sit in a different interest cluster from our main audience and
  earn 4-8 clicks per Pin. If we want that audience later, it deserves its own consistent series, not a sprinkle.
- **Story series.** For the stories people search ("david and goliath craft", "jonah and the whale craft",
  Noah, creation), make 3-4 distinct scenes per story (the challenge, the key moment, the outcome) and release
  them 3-5 days apart on the same board. Each is a new image, not a variant, so none is filtered as a duplicate (1.7),
  and together they give Related Pins a chain to follow (1.8).

### 3.2 Boards
- Keep a few tight boards, each one interest: Christmas, Sunday School, Scripture (verse art), Easter.
  The `adult` feed stays unconnected until 3.1's pause is lifted.
- Board names and descriptions use the phrases people give their own boards: "Sunday School Coloring Pages
  for Kids", "Christmas Nativity Coloring Pages", "Bible Verse Coloring Pages".
- Don't rename boards that already have history just for wording; add keywords to the board description instead.

### 3.3 The Pin itself
- **Image:** the page must be readable at feed size: thick lines, one clear action, faces visible. The 2:3 frame
  and small banner (1000x167 of 1500) are fine; keep the banner a label, never a text block (1.7).
- **Title** (current formula works): `[opener]: [story moment] | [reference] for Kids`. Put the search phrase
  first where it reads naturally ("Jonah and the Whale Coloring Page: …"). Titles stay unique across the account.
- **Description** (current rules work): say what is drawn, who it is for (preschool, Sunday school, homeschool),
  the lesson, and end with the call to action. Use one or two searched phrases in plain sentences
  ("coloring page", "Sunday school activity", "preschool Bible craft"), no keyword lists.
- **Link:** every Pin links to its own sketch page. (**Fix:** "Joshua 1:9 Memory Verse", 385 saves and no link,
  and "Esther Before the King" have none. Edit them in Pinterest to add the sketch URL: the saves are already
  there, the clicks are not.)
- **Save + click:** the Pin shows the finished page (worth saving); the landing page gives the print-ready file
  in one step (worth clicking). If the landing page makes people hunt, Search learns our Pins don't deliver the
  click (1.5).

### 3.3a Pin copy rules (every calendar entry in `web/src/data/pins.json`)
The rules for writing each Pin's title and description. `web/scripts/pins-check.mjs` enforces the ones marked
**(checked)**; the rest are for whoever writes the copy.

**Title** `[opener]: [story moment] | [reference] Coloring Page for Kids`
- 40-100 characters, contains `|` and the Bible reference **(checked)**.
- Contains "Coloring" **(checked)**. If the opener lacks it ("Sunday School Crafts", "Nativity Scene Drawing"),
  put "Coloring Page" after the reference.
- Never "Free" **(checked)**. Unique across the whole account, old Pins included.
- The opener is a phrase people search: Sunday School Coloring Pages, Bible Story Coloring, Christmas Bible Story
  Coloring, Advent Coloring Page, Nativity Scene Drawing, Nativity Crafts for Kids, Sunday School Crafts, Bible
  Verse Coloring Pages, Scripture Coloring Page. Never the same opener twice in a row on a board (warned).
- The story moment names the scene the way people say it, with the names they search: "Noah's Ark", "David and
  Goliath", "Baby Jesus in the Manger". The first ~40 characters show in the feed, so the main words go first.
- The ending names the audience the image is for: "for Kids" / "for Toddlers" on kids' pages, "for Adults" or no
  audience on black-template pages. Never a kids' title on an adult-style page, or the reverse (1.2).
- After an entry's release date, never change the text before `|`: the Pin image name is built from it.

**Description** 200-350 characters **(checked)**; shorter and focused, one idea per Pin (1.10). In this order:
1. A hook that speaks to the teacher or parent ("Picture your Sunday school class coloring…", a question, a
   one-line story fact). A different first sentence from every other Pin on the board (warned).
2. What is drawn and nothing else: who, doing what, where; then the reference in parentheses.
3. The phrase "coloring page" once, with the searched qualifier that fits: nativity / Christmas / Advent /
   Bible verse / Sunday school coloring page **(checked)**.
4. Who it is for (toddlers, preschool, early elementary, teens, adults) and where (Sunday school, children's
   church, homeschool, VBS, family devotions).
5. One lesson theme ("a lesson on trusting God").
6. Ends with `Get your first 5 prints free at BibleSketch.` **(checked)**
- No hashtags or emojis **(checked)**, no keyword lists, no "AI generated", and no promises the page doesn't keep
  (worksheets, craft instructions, "free printable").

**Alt text**: RSS can't carry it, so it is set on Pinterest after each Pin publishes: `node scripts/pins-alt.mjs`
prints a snippet for the signed-in tab that writes "Coloring page: <the what-is-drawn sentence>" on every released
calendar Pin (CHECKLIST, weekly). So sentence 2 of every description must stand alone as a picture description.

**Placement**: the board, the template and the words all say the same audience: kids' pages on paper/purple to
Christmas, Sunday School or Easter; verse art to Scripture; black-template pages are adult-style and stay rare
outside the adult board.

### 3.4 Timing and cadence
- **Ramp to 5 a day** (owner decision 2026-09-23): 1 a day from Sept 24, +1 each week, 5 a day from Oct 22,
  boards taking turns. Why: winners are a lottery (top 1% of Pins = half of all reach, 1.10), Pinterest recommends
  5-25 fresh Pins a day, and our Nov-Dec 2025 burst of 4-8 a day drew no penalty. What does not change: every Pin
  is a reviewed page, because a weak Pin is still a vote against us (1.4). The ceiling is a ceiling; supply of
  reviewed pages is the real limit. Watch the day-30 save rate per impression by week: if it falls as volume rises,
  hold the ramp where it was.
- **Christmas: front-load.** The peak is mid-December; a Pin released after about Nov 15 reaches the peak still
  inside its 28-day "new Pin" window (1.6). The calendar today has 9 Christmas Pins in October, 17 in November and
  11 in December. Move the strongest December pages into late October / early November, and use December for
  Sunday School, Advent-week verse art and Epiphany (the magi, Jan 6).
- **Easter 2027 (March 28):** start Feb 1 as planned; put the core Holy Week scenes out in February, not March.
- **Next autumn:** Genesis/creation peaks in September (**ours**); have creation pages out by early August 2027.
- **Evergreen stories** (David, Jonah, Noah, Daniel) fill every week that isn't seasonal. They feed the
  2-year memory of 1.3 all year.

### 3.5 Seeding real saves
The pin-board graph (1.1) is built by other people's boards. The site already has "Share on Pinterest" buttons
on listing cards and sketch pages. Two small improvements, if and when worth it:
- Point the button's `media` at the 2:3 `/pin-img` image when the sketch has one, so saves from the site use the
  same Pin-shaped image.
- In the (future) post-download email or screen, one line: "Saving this for later? Pin it to your Sunday School
  board." Teachers' saves onto their own lesson boards are the best training signal we can get.

### 3.6 The existing 176 Pins
- Don't delete: their save history keeps feeding the 2-year memory, and deleting a Pin erases its engagement.
- Fix the two linkless Pins (3.3).
- Leave the duplicates; add no more.
- Archived boards stay archived.

---

## 4. Measurement

Pull `creator_analytics` per Pin (method in memory: `BoardFeedResource`, `field_set_key: 'react_grid_pin'`)
once a month, into a sheet with the Pin's release date, board, template (paper/purple/black) and story.

| Metric | Why | Read at |
|---|---|---|
| Save rate = saves / impressions | Home Feed's goal (1.5) | day 30, day 90 |
| Outbound CTR = clicks / impressions | Search's goal, and ours | day 30, day 90 |
| Outbound clicks per Pin | business value | day 90 |
| Impressions per Pin at day 30 | is the ranker still showing it after the new-Pin window? | day 30 |

Rules:
- Compare Pins of the same age only. Nothing is judged before day 30.
- The paper vs purple template test (from Oct 15, 60 days) is read on save rate and CTR at day 30 of the last Pin
  in it, i.e. mid-February, not on December totals.
- A board whose Pins sit under half the account's median save rate at day 30 for two months gets paused.
- Site side: Pinterest referrals → first print → paid pack (the Zaraz Pinterest tag is already installed).

---

## 5. Next 90 days

| When | What |
|---|---|
| This week | Connect `christmas.xml` and `scripture.xml` (CHECKLIST). Add links to the two linkless Pins. |
| By Oct 10 | Regenerate Matthew 2:9-10. Make and review Sunday School pages for their slots, starting with story series (David and Goliath, Jonah, Noah: 3-4 scenes each). Connect `sunday-school.xml` on its first day. |
| By Oct 15 | Rebalance the calendar: move the best December Christmas pages into late Oct / early Nov (3.4). |
| Sept 24 - Dec 20 | Posting ramp, 1 to 5 a day (3.4). Weekly alt text (3.3a). Monthly analytics pull (section 4). |
| Mid-Nov | First day-30 read on the October Pins: save rate and CTR by board and template. |
| Jan | Build and review the Lent/Easter calendar; core Holy Week scenes scheduled for February. |
| Mid-Feb | Template test verdict; decide the adult board and whether to raise cadence. |

Record owner decisions from this plan in ROADMAP 1.5.
