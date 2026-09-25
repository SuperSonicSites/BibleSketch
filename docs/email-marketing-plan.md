# Email marketing master plan

The plan for Bible Sketch's lifecycle and marketing email: the philosophy (Dean Jackson's *Email Mastery*), how it
applies to our users, the campaigns, the system that sends them, and the build order. **Read §1 and §2 before
writing or editing any email**, and check every draft against the checklist in §9.

**Status (2026-09-25):**
- **Live:**
  - phase 0.5 (the opt-in capture, +5 prints);
  - the outage win-back, queued for Sep 29.
- **Phase 1 is built and deployed but not sending (§10).** The owner has 15 test emails to approve. Sending starts
  when `config/email` gets `live: true`.
- **The live words of every email are in `functions/email.js`.** §5 holds the drafts they came from.

- Owner decisions so far: emails are for **sign-ups**, whose data lives in **Firebase**, sent through **Resend**.
  No Zoho integration (purchases already land in Firestore through our webhook). Every campaign is automated, and
  the goal is a system that runs without the owner watching it.
- Sending any email to real users is an owner-approved action until the owner gives a standing approval, the way
  `pinterest-daily` has one.

---

## 1. The philosophy (Dean Jackson, *Email Mastery*)

- **Source:** *Email Mastery* by Dean Jackson (October 2013, 114 pages), the official PDF from I Love Marketing
  (`https://s3.amazonaws.com/ilovemarketing/Email+Mastery.pdf`, the download link on ilovemarketing.com's Email
  Mastery page).
  - It's the same book sold as the *Email Mastery!* paperback (ISBN 9781492932802, 126 pages with the print front
    matter). The book itself is Dean's welcome letter on the 9-word email, followed by I Love Marketing episodes
    104-106 and 108 with Joe Polish.
  - Checked against Dean's current guide (deanjackson.com, "The 9-Word Email") on 2026-09-24, which adds two
    variations ("Would you like to get started...?", "Would you like to join us?") and one warning: don't blast the
    whole database, target the people most likely to want it.
- What follows is a summary in our own words, not the book's text.

### 1.1 Email is a conversation, not a broadcast
- Write as one person to one person. The emails that work are **short, personal, and ask for a reply**. They read
  like a note from someone you know, not like a company newsletter.
- Replies are the point. A reply means a real conversation has started, and people who are talking to you buy.
- Graphics, logos, banners and "newsletter" styling tell the reader "marketing" before they read a word. Plain,
  text-looking email gets read. (Simple HTML is fine; graphic templates aren't.)

### 1.2 Every part of an email has one job
- **The from line and the subject line decide the open.** The subject line's only job is to get the email opened.
  A subject that looks like a personal note (a first name, a few plain words) beats a clever teaser or a headline.
- **The body's job is one action:** a reply or a click. Never both, never three. The email doesn't sell. It gets
  the next step, and the page does the selling.
- **Don't solve the mystery.** Leave something to find out by replying or clicking. If the email answers
  everything, there's no reason to act.
- **Be congruent.** The subject, the body and the page must match what the person signed up for and each other. A
  bait subject line wins one open and loses trust.

### 1.3 The 9-word email
- A very short question, about nine words, sent to people who raised their hand and then went quiet. It has no
  pitch and no link, and it's easy to answer yes or no.
- The word **"still"** does the work: it anchors back to what they wanted when they signed up ("Are you still
  looking for...?").
- The book's examples show that it wakes up old leads over and over, whatever the industry. It can go out to
  everyone who has been quiet for 90 days, and again every few months.
- It works best sent **on top of an earlier email** in the same thread (a "re:"), so the reader sees the history.

### 1.4 Sorting questions and the "chess master" mindset
- Early on, ask an **either/or question** that sorts people by what they want ("this or that?"). Each answer
  opens a different path.
- **Know the end before the first move.** Before asking a question, know what you'll say to each possible answer,
  and how that leads, one natural step at a time, to the offer that fits. Only ask for one step at a time.
- After three or four real exchanges, people often send a long, open reply telling you everything about their
  situation (the book calls it the "love letter"). That's the moment to help them precisely, and help turns into a
  sale.
- Someone has to answer the replies quickly: the book's **email concierge**. Replies left unanswered waste the
  whole method.

### 1.5 Timing: most buyers are slow
- Of the people who raise their hand, roughly **15% act within 90 days and 85% act later**, and about half do
  something within 18 months (the book's rule of thumb from real estate leads).
- So the first 90 days focus on finding the few who are ready now, and after that you **never "archive" a lead**.
  Keep talking to them for years. Most of the money is in that long tail, which almost everybody neglects.
- Treat everyone as the best prospect (the book's "5-star prospect") until they show otherwise.
- **Check back with people who told you what they wanted and didn't buy**, about 60-90 days later: "How is X going?"
  It restarts the conversation.

### 1.6 The welcome, then the sort
- The instant welcome after a sign-up **should look automatic**, because it is. Don't fake a personal note sent 10
  seconds after they signed up at 2 a.m. Put everything they need in it, including what to do right now if they're
  ready.
- The **next day**, send the short sorting question as a reply on top of the welcome ("re: ..."). That one starts the
  conversation.

### 1.7 The weekly flagship and the super-signature
- Send **one regular, valuable email every week**, the "weekly flagship". Its content educates, and it carries the
  offers. Pick something that changes every week so there's always a reason to write.
- **Offer cookies.** People don't like to take the initiative, so hand them the next step on a plate. Frame each
  offer as something **already happening** that they can simply join ("every Thursday we send...", "the Advent pages
  go up on Nov 1"), not as a favour they'd have to ask for.
- The **super-signature**: under the sign-off, on every email, list the 3 current offers ("3 ways we can help this
  week"). It's a ride-along that turns every email into a chance to take the next step.

### 1.8 Customers and past customers are the gold mine
- Getting a customer costs far more than selling to one again. The highest return is in the **after unit**: the
  people who already bought. Keep in touch, check in, and ask for referrals once the relationship is current.
- Most businesses neglect their buyers and old leads while chasing new ones. A short "thinking of you" email is
  the way back in when contact has lapsed.
- **Frequency isn't the problem, value is.** People who like what you send are happy to hear from you weekly. If
  they stop responding, fix what you send or how you say it, and don't just send less.

### 1.9 The book's three first moves
1. **Re-engage** everyone who has been quiet for 90 days or more with a 9-word email.
2. **Reconnect** with past customers, then orchestrate referrals.
3. **Start a weekly flagship** that educates and carries the offers.

Plus: **know your numbers.** What gets measured improves.

---

## 2. Voice and format rules for Bible Sketch

- **From a person:** "Renaud from Bible Sketch" `<renaud@e.biblesketch.app>`, with `Reply-To: hello@biblesketch.app` (owner decisions 2026-09-24; the owner wrote "Renaud @ Bible Sketch", but an "@" in a display name can look like a fake address to spam filters).
  - The sending domain is `e.biblesketch.app` (owner decision 2026-09-24; §6.7).
  - Replies reach the owner through `hello@` (§6.8), and a human answers them.
  - `hello@biblesketch.app` is also the public contact address on the site.
  - Never send from a `noreply` address.
- **Honest personal tone:** write like the owner, in first person. Never invent a personal circumstance ("I was just
  looking at your page this morning") that isn't true. Our readers are Christians, teachers and parents, and trust is
  the whole business. Automation that sounds personal is fine because the owner really does read the replies.
- **No pressure:** no fake urgency, no "last chance" unless it really is the last day, no guilt, and never use
  Scripture as sales leverage. A deadline is fine when it's real (a Sunday, a season, an offer window we will
  actually close).
- **Short:** 30-100 words. The weekly flagship stays under 150. Use their first name when we have it.
- **Plain:** no logo header, no banners, no multi-column template. Links are written as words (at most one simple
  button). Coloring pages are the product, so **one small image of a page** is allowed in the weekly flagship, and we
  test it against a text-only version (§8).
- **Subject lines:** a first name, or 2-6 plain words, often lowercase, like a note from a friend. No emoji, no
  "Newsletter #12", no ALL CAPS, no "FREE!!!". They must match the body.
- **One action:** one reply or one link destination per email. The welcome and the flagship are the only
  exceptions: one main link plus the super-signature.
- **Super-signature:** on every marketing email, 3 offers under the sign-off, chosen by the reader's stage (§5.9).
- **Footer (CASL):** "Bible Sketch · Supersonic Sites Inc., 109b - 1917 Peninsula Rd, Ucluelet, BC V0R 3A0, Canada · hello@biblesketch.app · Unsubscribe", plus one line saying why they're getting the email (owner decision 2026-09-24: the Supersonic Sites address from supersonicsites.com; the privacy page names the same operator).

---

## 3. Who we're writing to

### 3.1 The numbers today (2026-09-24)
- 183 accounts. **42 (23%) have ever made a page**, 4 have paid, and lifetime revenue is $84.95. That's about $0.46
  per sign-up.
- About 22 sign-ups every 30 days. Most come from Pinterest, where one or two Pins bring most of them.

**By sign-up month** (read-only aggregate, 2026-09-24):

| Month | 11/25 | 12/25 | 1/26 | 2/26 | 3/26 | 4/26 | 5/26 | 6/26 | 7/26 | 8/26 | 9/26 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Sign-ups | 12 | 7 | 37 | 20 | 18 | 20 | 14 | 12 | 13 | 12 | 18 |
| Made a page | 12 | 3 | 11 | 4 | 5 | 4 | 1 | 0 | 0 | 0 | 2 |
| Paid | 1 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 |

**What it says** (it changes the plan; see §12):
- **Making a page was already falling before the outage** (30% in January, 20% by April). From June to August,
  during the generation outage, nobody could make one.
- **People come to print ready-made pages, not to make their own.** Of the 85 people who signed up since Mar 26,
  never made a page and never bought:
  - 62 (73%) printed at least one gallery page;
  - 5 used all 5 free prints and hit the print wall;
  - all of them still have their 5 free page credits.
- **So activation means a print or a page, and the real sales moment is the print wall.** Premium ($4.99 a month,
  unlimited prints) is the natural offer there, more than a credit pack.

### 3.2 The offer ladder
Prices come from `web/src/pages/pricing.astro`:

| Offer | Price | What they get |
|---|---|---|
| Welcome | free | 5 pages (credits) + 5 prints |
| The Spark | $4.99 once | 20 pages + 20 prints (25¢ a page) |
| **The Torch** | $14.99 once | 80 pages + 80 prints (19¢ a page), the highlighted pack |
| The Beacon | $29.99 once | 200 pages + 200 prints (15¢ a page), aimed at ministry directors |
| Premium | $4.99 a month | unlimited prints, 10 pages a month, high-res PDF, no watermark |

- Credits never expire. That's a strong line for seasonal emails ("buy now, use it for Easter").
- One generation costs us about $0.12 in Gemini. A bonus page therefore costs about 12¢, so 3 free pages to win
  someone back cost about 36¢.

### 3.3 Personas (the sorting question decides)
| Persona | Who | What they want | Natural offer |
|---|---|---|---|
| **teacher** | Sunday school, children's ministry, Christian school, VBS | this Sunday's story, the right age, a whole series, enough pages for a class | Torch or Beacon; the church plan later |
| **family** | parents, grandparents, homeschoolers | quiet-time and rainy-day pages, their kids' ages, favourite stories | Torch; Premium for weekly users |
| **adult** | coloring for themselves: devotions, verse art | calming verse art, beautiful full-page scenes | Spark or Torch; Premium |

People who don't answer get the **teacher** path (the biggest group on Pinterest), softened to fit either.

### 3.4 Stage and activity (computed nightly, §6.2)
There are two separate fields, so a Premium subscriber can also be dormant.

- **`stage`**, the relationship. The first match wins:
  - `premium`: subscribed.
  - `buyer`: bought a pack.
  - `new`: signed up in the last 14 days.
  - `empty`: 0 credits, never bought.
  - `free`: has credits, never bought.
- **`activity`**, the recent behaviour:
  - `active`: made, printed or opened something in the last 30 days;
  - `quiet`: 30-89 days;
  - `dormant`: 90 days or more.

---

## 4. The customer journey (the chess board)

The end we steer toward: **the right pack, bought before a season, then repeat purchases and referrals.**

It runs backwards like this:
- someone buys when they run out of pages in a week they need one (a Sunday, a season);
- they run out only if they're using it every week;
- they use it every week if the Thursday email hands them this Sunday's page;
- that email is welcome only if the first page was a small win;
- and the first win comes from the welcome plus one sorting question.

```
Pin -> sign-up -> welcome (automatic) -> "re:" sorting question -> first page -> first print
    -> weekly Sunday Prep habit -> runs out of pages -> offer (pack / Premium) -> buyer
    -> thank-you conversation -> referrals, top-ups before each season
Quiet at any point -> 9-word email every 90 days (never archived) -> back into the weekly habit
```

---

## 5. The campaigns

Each email has a job, a trigger, a stop rule and a draft. The drafts are starting points, and live copy is approved
by the owner before it goes out. `{first}` is the first name (the email opens with "Hi," when we don't have one).

### 5.1 Welcome and sort (every sign-up that gave consent)
| # | When | Subject | Job |
|---|---|---|---|
| W0 | immediately | `Your Bible Sketch account (5 free pages)` | Everything in one place, plus one "start now" link |
| W1 | +1 day, sent as a re: | `re: Your Bible Sketch account` | The sorting question |

**W0 (clearly automatic):**
> Hi {first},
> Welcome to Bible Sketch! This is the automatic welcome, so here's everything in one place:
> you have **5 free pages and 10 free prints** (5 extra for joining these emails). Here are more pages like the one
> you came for:
> **[{story} pages, ready to print]**. Teaching something specific? **[Make your own]** in about 30 seconds.
> — Renaud
> *(super-signature, §5.9)*

- **Congruence:** `{story}` is the story on the page or Pin where they signed up (the landing path we'll capture,
  §6.3). Without it, use this week's story.

**W1 (the sorting question, next day, on top of W0):**
> Hi {first}, quick question: are these pages for a class, or for your kids at home?
> — Renaud

- **Reply handling (§6.8):**
  - "class", "church", "Sunday school", "kids at church", "VBS" → **teacher**;
  - "home", "my kids", "grandkids", "homeschool" → **family**;
  - "me", "myself", "adult", "for me" → **adult**.
- Every reply is also forwarded to the owner. **No reply by day 3:** the default path.

### 5.2 Activation (stops the moment they make a page)
| # | Trigger | Subject | Body (one action) |
|---|---|---|---|
| A1 | no page 24h after sign-up | `{first}, want a head start?` | "Pick a story and your page is ready in 30 seconds: Noah · David · Jonah · {season story}." Each name is a link that opens the generator filled in |
| A2 | made a page but no print within 48h | `did it print okay?` | "Did your {story} page print okay? If anything looked off, hit reply and tell me." A reply is feedback, and it starts a conversation |
| A3 | no page by day 7 | `we drew these for you` | 3 finished gallery pages from this season, one link each ("print this"). This is the last activation email |

- Activation is **the number one metric** (§8). If A1 alone moves first pages from 23% to 40%, it's worth more than
  every sales email put together.

### 5.3 Persona branch (after the sort)
- **teacher, T1** (the day after the reply): *"Great! What are you teaching this Sunday?"*
  - The reply names a story, and we answer with that story's page, filled in for their class's age. That's the magic
    trick: they told us what they need and got it within minutes.
  - In phase 1 the owner answers these; in phase 3 the reply handler answers automatically (§6.8).
- **family, F1:** *"How old are your kids?"*
  - The reply sets `ageGroups`, using the app's values (Toddler, Young Child, Teen). Every
    later link then opens the generator at the right age.
- **adult, D1:** *"Do you color for quiet time, or just to relax?"*
  - Either answer leads to verse art (a fitting verse and font) or to the ornate full-page scenes that win on our
    adult board.
- **60-90-day check-in (§1.5),** for anyone who told us what they were working on and didn't buy:
  - teacher: *"How did the {story} lesson go?"*
  - family: *"Are the kids still enjoying the pages?"*
  - It's sent as a re: on their last thread.

### 5.4 The weekly flagship: "Sunday Prep" (every Thursday, everyone who opted in)
- **Why Thursday:** teachers plan their lesson at the end of the week, and parents plan the weekend.
- **Send time:** 6:00 a.m. Eastern (most users are in the US; test it later).
- **Content:**
  - **This Sunday's story.**
    - Inside a season window: the season's story (Advent weeks, Palm Sunday, Easter, Pentecost, Mother's Day...).
    - Otherwise: the next story in the current series from `web/src/data/pin-year.json`.
  - **One ready page.** The best public page for that story, preferring a Pin published this week and the
    highest-resonance image.
  - **One "make it for your age" link.**
  - **1-2 sentences about the story itself.** A detail kids love, or a question to ask the class. Leave the answer
    for the page and the lesson (don't solve the mystery).
- **Draft:**
  > Subject: `Sunday: Jonah and the big fish`
  > Hi {first},
  > This week's story is Jonah. Kids always remember the fish, but the surprise is chapter 3: God asks Jonah a second
  > time. Here's the page: **[Jonah, ready to print]**. Need it simpler or older? **[Make your own version]**
  > — Renaud
  > *(super-signature)*
- **Stage-aware:** new users skip the flagship during their first 7 days, while the activation emails run.
- **Approval:** the first 4 issues go to the owner as Resend drafts to approve. After that it sends automatically if
  the owner agrees.

### 5.5 Conversion (triggered by behaviour)
| # | Trigger | Subject | Body | Stop rule |
|---|---|---|---|---|
| C1 | 1 credit left, never bought | `one page left` | "You have one free page left. If you want to keep going, the Torch pack is 80 pages for $14.99, and pages never expire. [See the packs]" | buys |
| C2 | 0 credits, never bought | `out of pages?` | Same idea, plus the first-purchase bonus (owner to approve): "Get any pack before Sunday and I'll add 10 pages." The deadline is real, and the bonus is granted automatically | buys, or 7 days pass |
| C3 | started checkout, no purchase in 1h | `anything I can help with?` | "Looks like you almost got the {pack}. Any question I can answer?" A reply is expected; no hard sell | buys |
| C4 | 5+ pages or 3+ prints in 30 days, free or a pack buyer | `you're making a lot of pages` | Premium: unlimited prints and 10 new pages a month for $4.99 | subscribes |
| C5 | teacher with 3+ pages | `for your whole class` | The Beacon (200 pages at 15¢), and the church plan once it exists | buys Beacon |
| **C6** | **1 print left** (the print wall is next; §3.1) | `one print left` | "You have one free print left. Premium is unlimited prints, plus 10 new pages a month, for $4.99. Cancel anytime. [Get Premium]" For a teacher, the Torch as well (80 prints come with it) | subscribes or buys |
| **C7** | **0 prints left, never bought**: a 7-day, email-only offer (§12.20) | day 0 `out of prints?`, day 5 `re: out of prints?`, day 7 `last day` | "You've used your free prints. Just for you, for 7 days: unlimited prints for about US$2 a month (CAD 2.79, plus tax). **[Keep printing]** (Want new pages too? Premium is about US$5.)" The link expires on day 7 | subscribes or buys; the offer repeats at most every 90 days |

- **One conversion email a week at most.** People in the middle of activation don't get conversion emails.
- The flagship's super-signature does the gentle, constant selling. The C-emails only fire on a real signal.

### 5.6 After the sale (buyers and Premium)
| # | When | Subject | Body |
|---|---|---|---|
| B1 | right after a purchase | `thank you, {first}` | "Thanks for getting the {pack}. What are you making first? I read every reply." |
| B2 | +10 days | `a favour?` | "If Bible Sketch has helped, would a teacher friend like 5 free pages? [Send them a gift]" (referrals, phase 3). Until then, ask for a one-line review |
| B3 | Premium, each renewal | `your 10 new pages are here` | "Your 10 pages for {month} are ready. This month's story: {series}." It keeps subscribers using it, which keeps them subscribed |
| B4 | pack buyer at 5 or fewer credits | `topping up before {season}?` | Sent only inside a season window |

- The purchase receipt itself is transactional (it's sent under the purchase, not under marketing consent) and stays
  separate from B1.

### 5.7 Re-engagement: the 9-word emails (never archive)
- **Who:** everyone opted in with no activity for 90+ days (`dormant`). It repeats every 90 days, a few weeks
  ahead of the next season when possible.
- **Subject:** just `{first}` (or `quick question` when we have no name).
- **Body, by persona:**
  - teacher: *"Are you still teaching Sunday school this year?"*
  - family: *"Are you still looking for Bible pages for the kids?"*
  - adult: *"Do you still color Bible verses for quiet time?"*
  - default: *"Do you still need Bible coloring pages for Sunday?"*
- **Replies:**
  - "yes": the reply handler sends this week's Sunday Prep page and a gift of 3 pages (the bonus is owner-approved);
  - "no": we thank them and move them to seasonal-only emails;
  - anything else goes to the owner.
- `quiet` (30-89 days) gets no special email. The weekly flagship is their reason to come back.
- **Deliverability floor:** a contact with no opens or clicks for 6 months drops to **seasonal-only** (about 5 emails
  a year, §5.8), and after 12 more silent months we stop sending. They're never deleted: a sign-in or a purchase puts
  them back.

### 5.8 The seasonal promotions (broadcasts)
This follows the same calendar as Pinterest (`pin-year.json`). Each season gets:
- an announcement in the flagship;
- one dedicated email;
- a **re-send to non-clickers** 3 days later with a new subject, as a re:;
- a true "last day" note when an offer window closes.

| Season | Announce | Anchor date | Offer idea (owner approves) |
|---|---|---|---|
| **Advent & Christmas 2026** | Thu Nov 12 | Advent starts Sun Nov 29; Christmas Fri Dec 25 | a page a day of Advent in the gallery; +20% pages on any pack until Dec 6 |
| New Year | Thu Dec 31 | Jan 1-10 | verse art for the new year; Premium push |
| Lent & Easter 2027 | Thu Feb 4 | Ash Wed Feb 10; Easter Sun Mar 28 | the Holy Week series; bonus pages until Palm Sunday (Mar 21) |
| Mother's Day | Thu Apr 22 | Sun May 9 | pages to color for Mom |
| VBS & summer | Thu May 13 | June-July | the Beacon for VBS directors |
| Father's Day | Thu Jun 3 | Sun Jun 20 | pages for Dad |
| Back to Sunday school | Thu Aug 19 | September | the fall series (creation, Genesis) |
| Thanksgiving | Thu Oct 28 | US Thu Nov 25, 2027 | the harvest and thankfulness pages |

- **How the offers work:** bonus pages granted by our own code during the window. Nothing changes in billing.
- **Dates:** they come from the same computus as `web/scripts/pins-plan.mjs`, so later years stay correct.

### 5.9 The super-signature (on every marketing email)
It sits under the sign-off, above the footer, and starts **"3 ways we can help this week:"**. The slots are chosen by
stage, each one framed as already happening:

| Slot | new / free | empty | buyer / premium |
|---|---|---|---|
| 1 | "Every Thursday I send this Sunday's story with a ready page." (links to this week's page) | same | same |
| 2 | this season's series ("The Advent pages go up one a day from Nov 29.") | same | same |
| 3 | "Teaching a group? The Beacon is 200 pages at 15¢ each." | "The Torch: 80 pages for $14.99, and they never expire." | "Give a teacher friend 5 free pages." (from phase 3; until then, Premium for pack buyers) |

### 5.10 Feedback that feeds the product
- **Day 30:** *"What would make Bible Sketch more useful for you?"* (reply only). The answers go to the owner, and
  the recurring themes go into ROADMAP.
- **When a page fails:** the failure is refunded automatically. The apology email is transactional, and it carries
  no offers.

---

## 6. The system and its data

The better we know someone, the more each email can sound like it was written for them: "the Noah page you were
looking at", "next in your David series", "for your Young Child class", at 6 a.m. in their time zone. This section
lists every field that makes that possible, where it lives, and how we collect it.

### 6.1 Where things live
- **`users/{uid}` is public by design.** Anyone who knows a uid can read it (`allow get: if true` in
  `firestore.rules`), because profile pages and gallery credits show the name and photo, and `onUserCreated` strips
  the email from it.
  - **No email or marketing data ever goes on it.**
- **Four new places in Firestore:**

  | Place | Written by | Readable by | Holds |
  |---|---|---|---|
  | `users/{uid}/private/profile` | the user (rules validate each key), and functions | that user, functions | consent, answers, sign-up context |
  | `users/{uid}/events/{id}` | the user, or the Worker acting as the user; create only | functions | prints, downloads, checkout clicks, page feedback |
  | `emailProfiles/{uid}` | functions only | functions only (clients denied) | everything computed: stage, counts, taste, money, email engagement, offers |
  | `emailReplies/{id}` | functions only | functions only | each reply: its text, the parsed answer, what we did with it |

- **Existing sources, used as they are:**
  - Firebase Auth: the email, `emailVerified`, `displayName`, the sign-in provider, and `lastRefreshTime` (the last
    time the app was open, even without making a page).
  - `users/{uid}`: `printsUnlimitedUntil` (**new**; a timestamp, set by the server only, for the outage gift in
    §12.1; the create and update rules already refuse any key not on their lists, so clients can't set it),
    `credits`, `downloadsRemaining`, `isPremium`, `planStatus`, `subscriptionStartDate`,
    `createdAt`.
  - `users/{uid}/transactions`: `bonus`, `usage`, `refund`, `credit_purchase` (with `pack` and `price`),
    `subscription`.
  - `sketches`: `userId`, `type` (scene or verse), `reference`, `age`, `style`, `font`, `isPublic`, `isBookmark`,
    `tags`, `createdAt`.
  - `generations/{uid}_{requestId}`: the status (charged, done or refunded) and the error code.
- **Resend** holds copies for sending: contacts (email, first name, unsubscribe status, topics, and the properties
  in §6.4), segments, Automations and Broadcasts.
  - Firestore stays the source of truth, and Resend is rebuilt from it every night.
- Nothing reads or writes Zoho for email: purchases already land in `transactions` through our own webhook.

### 6.2 The Firestore fields

**`users/{uid}/private/profile`**: what the person tells us. They can see and change it in their account.

| Field | Type and values | Set when | Used for |
|---|---|---|---|
| `emailOptIn` | boolean | sign-up checkbox, the opt-in banner, account settings | marketing email at all |
| `optInAt` | timestamp | same | CASL proof |
| `optInText` | string (the exact wording shown) | same | CASL proof |
| `optInSource` | `signup` / `banner` / `account` | same | CASL proof; opt-in rate by place |
| `persona` | `teacher` / `family` / `adult` | sign-up question, the W1 reply, or inferred | the branch, the offers, the wording |
| `personaSource` | `signup` / `reply` / `inferred` | same | an answer always beats a guess |
| `ageGroups` | list of the app's ages: `Toddler`, `Young Child`, `Teen`, `Adult` | F1/T1 reply, or inferred from pages made | the default age in every link; which pages we show |
| `setting` | `sunday-school` / `childrens-church` / `christian-school` / `homeschool` / `vbs` / `home` / `personal` | a reply | "your class" vs "your kids"; the Beacon and church pitch |
| `groupSize` | `1-5` / `6-15` / `16+` | a reply ("How many kids in your class?") | Spark vs Torch vs Beacon |
| `curriculum` | string, 80 characters max ("God's Big Story") | a reply | series that match their lessons; church-plan leads |
| `timezone` | IANA name (`America/Chicago`) | sign-up, from the browser | the flagship arrives at 6 a.m. their time |
| `locale` | `en-US` / `en-CA` / `en-GB`... | sign-up, from the browser | Letter vs A4; the right Mother's Day (the UK's is in Lent) and Thanksgiving |
| `signup` | map: `path`, `story`, `sketchId`, `utmSource`, `utmMedium`, `utmCampaign`, `referrer` (domain only), `epik` (yes/no), `at` | first visit, kept in the browser until they sign up | a congruent W0 ("the Noah page you were looking at"); which Pins and boards bring buyers |

- Functions may also write `persona`, `ageGroups`, `setting`, `groupSize` and `curriculum` from a parsed reply.

**`emailProfiles/{uid}`**: everything we compute. Rebuilt from the sources every night, updated live by the
triggers.

| Group | Fields | Comes from |
|---|---|---|
| Identity | `email`, `firstName` (first word of the display name), `emailVerified`, `provider` (`google` / `password`), `resendContactId` | Auth, Resend |
| Lifecycle | `stage` and `activity` (§3.4), `stageSince`, `signedUpAt`, `cohort` (`2026-10`), `lastActiveAt` | computed; Auth `lastRefreshTime` + events |
| Usage | `pagesMade`, `scenes`, `verses`, `edits`, `failed`, `prints`, `downloads`, `printsOfOwn`, `published`, `saved` (bookmarks), `pagesLast30`, `printsLast30`, `firstPageAt`, `lastPageAt`, `firstPrintAt`, `lastPrintAt` | transactions, sketches, generations, events |
| Balance | `credits`, `downloadsRemaining`, `isPremium`, `planStatus` | `users/{uid}` |
| Taste | `lastStory` (`{ref, sketchId, at}`), `recentRefs` (the last 10), `topBooks` (the top 3), `favAge`, `favStyle`, `favFont`, `verseShare` (0-1), `series` (`{seriesId: last order made}`, matched to `pin-year.json` items) | sketches |
| Money | `purchases`, `revenue`, `firstPurchaseAt`, `lastPurchaseAt`, `lastPack`, `premiumSince`, `premiumRenewals`, `cancelledAt` | transactions, `users/{uid}` |
| Email | `emailsSent`, `lastSentAt`, `lastOpenAt`, `lastClickAt`, `clicks30`, `lastReplyAt`, `replies`, `bouncedAt`, `complainedAt`, `unsubscribedAt`, `topics` (`{sundayPrep, offers}`) | Resend webhooks, the reply hook |
| Answers | `lastAnswer` (`{question, answer, at}`) | the reply hook |
| Offers | `offers.<id>` (`{sentAt, expiresAt, redeemedAt}`), e.g. `firstPack10`, `winback3`, `advent2026` | the offer logic; the purchase trigger |
| Sync | `syncedAt`, `syncedHash` | the nightly sync (only changed contacts go to Resend) |

- `offers` does two jobs. It stops an offer from repeating, and the purchase trigger reads it to grant a promised
  bonus automatically.

**`users/{uid}/events/{id}`**: behaviour that leaves no other trace.

- **Rules:**
  - create only, by that user;
  - `type` is one of the values below, the keys are fixed, and `at` is the server time;
  - no update and no delete.
- **Forgery:** a user could fake their own events. The only effect is on their own emails; nothing about credits or
  money reads these.

| `type` | Payload | Written by |
|---|---|---|
| `page_printed` | `sketchId`, `own` (boolean), `paper` | the Worker's `/api/print` (it already acts with the user's token) |
| `page_downloaded` | `sketchId`, `own` | the Worker's `/api/download` |
| `checkout_started` | `plan` (`spark` / `torch` / `beacon` / `premium`) | the pricing page's plan buttons |
| `page_feedback` | `sketchId`, `vote` (`up` / `down`) | the 👍/👎 after a page (phase 3) |

- **Today, prints only lower `downloadsRemaining`,** and only on other people's pages. Nothing records who printed
  what, and that's why this collection is needed.

**`emailReplies/{id}`**: the fields are `uid`, `email`, `at`, `question` (which email it answers: `w1`, `t1`,
`f1`, `nine-word`...), `text` (the first 2,000 characters, without the quoted history), `parsed` (`{field, value}`),
`action` (`auto-answered` or `forwarded`) and `handledAt`.

### 6.3 How we collect it (one question at a time)
Following §1.4, every question in an email is also a way to collect data. Ask only when the answer changes what we
send next, and never ask what their behaviour already tells us.

| Where | What we ask or capture | Field |
|---|---|---|
| First visit, before sign-up | the landing page, its sketch and story, the UTM tags, the referrer domain, the Pinterest click id (a first-touch record kept in the browser) | `signup` |
| Sign-up form | an **unticked** box: *"Send me a free Bible story page to print each week, plus occasional offers, and get 5 extra prints now. Unsubscribe anytime."* (approved 2026-09-24; the source of truth is `CONSENT_TEXT` in `web/src/lib/session.ts`). The server grants the bonus once per account (§12.2) | the consent fields |
| Sign-up form (optional) | *"I'm making pages for: my class / my kids / myself"*. An answer skips W1 | `persona` |
| Sign-up, silently | the browser's time zone and language | `timezone`, `locale` |
| W1 reply | a class, or your kids at home? | `persona` |
| T1 reply | What are you teaching this Sunday? | `lastAnswer`; `curriculum` if they name one |
| T2 reply (after their 3rd page) | How many kids are in your class? | `groupSize`, `setting` |
| F1 reply | How old are your kids? | `ageGroups` |
| D1 reply | For quiet time, or just to relax? | `setting` = `personal` |
| 9-word reply | yes or no | "no" moves them to seasonal-only (`topics.sundayPrep` off) |
| Behaviour, no question | the ages, styles, fonts and books of the pages they make, and the days they make them | inferred `ageGroups`, `favStyle`, `topBooks`, and a guessed `persona` (never over an answer) |
| Account settings | they can change their persona, ages and opt-in at any time | the profile |

- **Existing users (183)** get an in-app opt-in banner, not an email (§7). It writes the same consent fields, with
  `optInSource: banner`.

### 6.4 What Resend gets: contact properties and events
- **The principle:** compute everything in Firestore and give Resend only flat, ready-to-use values.
  - Segments then filter on simple equality (`stage = empty`).
  - Templates insert values as they are (`{{{next_story_url}}}`) with no logic in Resend.
- **Before building:** confirm the property types and limits in the current Resend docs.

**Contact properties** (snake_case, all set by the sync or the triggers):

| Property | Example | Used by |
|---|---|---|
| `first_name` (built in) | Sarah | every email |
| `persona`, `setting` | teacher, sunday-school | branches, wording, super-signature |
| `stage`, `activity` | empty, dormant | segments, stop rules |
| `age_group` | Young Child | the default age in every link |
| `credits`, `prints_left` | 1, 3 | C1, C2 |
| `pages_made`, `prints` | 4, 2 | C4, milestones |
| `is_premium`, `last_pack` | no, torch | B1, B3, B4; keeping sales emails away from subscribers |
| `last_story`, `last_story_url` | Jonah 1, a link to their page | the check-ins; "how did it go?" |
| `next_story`, `next_story_url` | David and Goliath, a pre-filled generator link | "next in your series"; the flagship's personal line |
| `landing_story`, `landing_url` | Noah's Ark, a link | W0 |
| `signup_source`, `signup_board` | pinterest, sunday-school | congruent copy; reports |
| `timezone`, `paper` | America/Chicago, letter | send time; print links |
| `curriculum`, `group_size` | God's Big Story, 6-15 | teacher emails; Beacon and church offers |
| `offer`, `offer_ends` | "+10 pages on your first pack", "Sunday, Oct 4" | C2 and the seasonal emails (the real deadline, written out) |

**Events** (they start and stop the Automations; their payload values can go into the email):

| Event | Fired by | Payload | Starts / stops |
|---|---|---|---|
| `signed_up` | an opt-in **at sign-up** (`optInSource: signup`), once the email is verified | `landing_story`, `landing_url` | starts W0/W1 and activation |
| `joined_list` | an opt-in from the **banner** (an older account) | `prints_left` | a short "you're in, here are your 5 extra prints" note. Never the welcome or activation emails: they aren't new |
| `persona_set` | the profile trigger, the reply hook | `persona` | starts T1 / F1 / D1 |
| `page_made` | a `usage` transaction | `story`, `sketch_url`, `credits_left` | stops activation; milestones |
| `page_printed` | an events trigger | `story`, `own` | stops A2 |
| `credits_low`, `credits_zero` | a `usage` transaction | `credits_left` | C1, C2 |
| `checkout_started` | an events trigger | `plan` | C3 (waits 1 hour for `purchased`) |
| `purchased` | a `credit_purchase` transaction | `pack`, `credits_added`, `price` | B1; stops C1-C5 |
| `premium_started`, `premium_renewed`, `premium_cancelled` | a `subscription` transaction; a `planStatus` change | — | B3; win-back |
| `page_failed` | a `refund` transaction | `story`, `error` | the apology (transactional) |
| `replied` | the reply hook | `question`, `answer` | the next step of a branch |
| `went_dormant` | the nightly sync | `persona` | the 9-word email |

### 6.5 The pipeline (Firebase functions, which have admin access)
- **`onUserCreated`** (exists): also creates `emailProfiles/{uid}`. Everyone gets one, because it feeds the
  numbers in §8, but only people who opted in become Resend contacts.
- **New `onPrivateProfileWritten`** on `users/{uid}/private/profile`. It watches the person's own answers:
  - opting in creates or re-subscribes the Resend contact, and fires `signed_up` the first time;
  - opting out unsubscribes them;
  - a new persona fires `persona_set`.
- **New `onTransactionCreated`:** updates the counters, and fires `page_made`, `credits_low`, `credits_zero`,
  `purchased`, `premium_*` and `page_failed`. When a promised offer is open, it grants the bonus.
- **New `onEventCreated`** on `users/{uid}/events`: updates the counters, and fires `page_printed` and
  `checkout_started`.
- **New HTTPS `resendWebhook`:** checks Resend's signature (`RESEND_WEBHOOK_SECRET`), then:
  - records delivered, opened, clicked, bounced, complained and unsubscribed in `emailProfiles`. A bounce or a
    complaint stops all marketing to that person;
  - forwards any **`email.received`** (a reply that ignored Reply-To) to `hello@` (§6.8). Parsing happens on the `hello@` path, which stores each reply in `emailReplies`, applies the parsed
    answer, and fires `replied`.
- **Nightly scheduled `emailSync`:**
  - recomputes `stage`, `activity`, the taste fields and `next_story` from the sources;
  - sends Resend only the contacts that changed (a hash comparison), throttled, because Resend's API rate limit is
    a few requests a second;
  - fires `went_dormant`.
- **One Resend key, in one place:** only the functions hold `RESEND_API_KEY`.
  - The Worker never talks to Resend. Prints travel through `events` docs, and replies arrive through Resend's
    webhook.
  - Secrets, both set by the owner as Firebase secrets (Claude never handles them): `RESEND_API_KEY` and
    `RESEND_WEBHOOK_SECRET`.
- **Deploys:** functions deploys with an explicit, quoted `--only` list (CLAUDE.md), and they're owner-approved.
  The `firestore.rules` change goes through `scripts/security-check.mjs` first (§6.10).

### 6.6 Links that carry the context
- **Pre-filled generator links (new, small front-end change):**
  - `/?ref=Jonah+1:1-17&age=Young+Child&style=Sunday+School`
  - `/bible-verse-coloring?ref=John+3:16&font=Playful`

  The link fills in the form but doesn't generate: a click must never spend a credit. Today the generator only
  reads `?sketch=`.
- **Tracking tags:** every email link carries `utm_source=email&utm_medium=email&utm_campaign=<email id>`
  (`w0`, `c2`, `sunday-prep-2026-11-12`...). The site and GA4 then see which email brought each visit, sign-up and
  purchase.
- **Print links** open the page's print view at the reader's `paper` size.
- **The free weekly PDF** (phase 2): `/free/<sketchId>?t=<expiry>.<signature>` on the Worker.
  - It renders the same PDF as the Print button (fit to Letter or A4), with no sign-in and no print spent.
  - It only opens with an HMAC-signed, expiring link (a new Worker secret), made by the weekly job. It's the same signing helper as the 7-day offer link (§12.20).
  - A forwarded link works for the friend too: that's word of mouth, and the PDF footer says biblesketch.app.
  - The email also links to the page and "make your own version", because this click doesn't visit the site.
- **The sync computes every personal link** (`next_story_url`, `last_story_url`, `landing_url`), so the templates
  only insert them.

### 6.7 Resend setup
- **Sending domain:** `e.biblesketch.app` (owner decision 2026-09-24), so the sender is
  `renaud@e.biblesketch.app` (§12.11).
- **DNS, checked on 2026-09-24:**
  - `resend._domainkey.e.biblesketch.app` (DKIM) is live;
  - `send.e.biblesketch.app` has Resend's MX and SPF (the return path);
  - `e.biblesketch.app` has an MX to Resend's inbound servers, so receiving is on;
  - the root `_dmarc.biblesketch.app` is `p=none`, with reports to Cloudflare. It covers the subdomain, which meets
    Gmail's and Yahoo's DMARC requirement. Tighten it to `quarantine` once reports show only aligned mail.
  - The root MX (Cloudflare Email Routing) is untouched, so `hello@` and `reports@` keep working.
- **Personal mail on the root domain is separate** (2026-09-24):
  - Cloudflare Email Routing receives it and forwards it to the owner's Zoho Mail (`supersonicsites.com`), where
    Zoho sends as `hello@biblesketch.app` (CHECKLIST).
  - Resend's free plan allows 3 domains (pricing checked 2026-09-25; an earlier note here said 1). Personal mail stays on Zoho anyway, so marketing and personal mail keep
    separate reputations.
  - Don't move the root MX: the Worker's `send_email` report binding and the forwarding depend on Email Routing.
- **Topics** (so people can leave one without leaving everything):
  - "Sunday Prep (weekly)";
  - "Offers & seasonal packs".
  - Transactional mail isn't a topic.
- **Automations:** the welcome and sort (W), activation (A), the persona branches, conversion (C), after the sale
  (B), and re-engagement.
- **Broadcasts:** the weekly flagship and the seasonal emails. The one-click unsubscribe headers are built in.
- **Cost:** free up to 1,000 marketing contacts (about 18-24 months at the current sign-up rate), then about $40 a
  month.
- **Check first:** before building, confirm the API shapes in the current Resend docs (Contacts properties, Events,
  Automations, Topics). This product changes quickly.

### 6.8 Replies: the email concierge
- **The path (owner decision 2026-09-24):** every email carries `Reply-To: hello@biblesketch.app`.
  - Cloudflare Email Routing receives the reply and it lands in the owner's Zoho inbox. The owner answers as
    `hello@biblesketch.app` through the Zoho Mail alias (CHECKLIST).
  - Resend's receiving on `e.biblesketch.app` stays on only as a fallback, for mail clients that ignore Reply-To.
    `resendWebhook` forwards any `email.received` to `hello@`.
- **Phase 1: reading the easy answers automatically.** Route `hello@` to a Cloudflare **Email Worker** (the
  `email()` handler on `biblesketch-web`) instead of a plain forward rule.
  1. It **forwards every message first** to the owner's inbox (`message.forward`, a verified destination), so
     `hello@` works exactly as it does today, contact mail included.
  2. Then, when the sender matches a contact and the text is a simple answer (the W1 keyword rules in §5.1, the age
     groups for F1, yes/no for the 9-word email), it posts the answer to an `emailReply` function with a shared
     secret (`EMAIL_HOOK_SECRET`, the purge secret's pattern in reverse). That function stores it in `emailReplies`,
     applies it, and fires `replied`.
  3. A failure in step 2 never loses the mail: the forward already happened.
- **The owner is the concierge** and answers the "love letters".
- **Phase 3:** automatic answers to the easy, high-value replies:
  - "What are you teaching this Sunday?" gets back a link to that story, filled in for their age;
  - "yes" to a 9-word email gets this week's page and a gift.
  - Anything unclear still goes to the owner.
  - Optional: a daily scheduled task drafts replies for the owner to approve.

### 6.9 The weekly flagship job
- A scheduled job runs on Wednesday. It could be a step in a Claude scheduled task (`email-weekly`) or a Worker
  cron.
- **Steps:**
  1. Pick this Sunday's story (§5.4).
  2. Pick the best page for it.
  3. Fill in the template.
  4. Create a Resend Broadcast for Thursday 6:00 a.m. ET.
- **Approval:** a draft for the owner to approve until a standing approval exists. Then it sends automatically.
- **Personal lines:** the Broadcast is the same for everyone, except the properties it inserts:
  - `first_name`;
  - `next_story_url` ("next in your series");
  - `age_group` in the "make your own version" link.

### 6.11 The automation map: who gets what, and why nothing cross-wires
**Every sender, and what each is for:**

| Sender | Emails | To whom |
|---|---|---|
| Firebase Auth (`firebaseapp.com`) | verify your email, reset your password | the account holder (security only) |
| Zoho Billing | invoices, receipts, subscription notices | buyers (billing only) |
| Cloudflare Email Routing (`reports@biblesketch.app`) | the monthly Pinterest report | the owner (and Brent) only, never users |
| Resend (`renaud@e.biblesketch.app`) | every lifecycle and marketing email in §5 | people who opted in |
| Owner in Zoho Mail (`hello@biblesketch.app`) | personal replies | whoever wrote |

The senders never overlap: each has its own purpose and audience, and Resend is the only one allowed to market.

**The rules inside Resend** (built in phases 1-2):
1. **One gate:** a contact exists only after an opt-in and a verified email. Stopping marketing is Resend's call:
   - an unsubscribe, a bounce or a complaint;
   - the nightly sync writes properties but never resubscribes anyone. Only a new opt-in in the app does.
2. **One source of truth:** `stage` and `activity` (§3.4) are computed once, in `emailProfiles`. Every automation
   filters on them rather than keeping its own idea of who someone is.
3. **Exclusions, by lane:**
   - **Welcome and activation (W, A):** only `stage = new` after a sign-up opt-in. Stops at the first page or print.
   - **Weekly flagship:** every opted-in contact, except the first 7 days after sign-up.
   - **Credit offers (C1, C2):** only people who never bought. Stop the moment they buy.
   - **Print-wall offers (C6, C7):**
     - never while `unlimitedPrints` (Premium, the Prints plan, the outage gift);
     - C7 at most every 90 days;
     - not within 14 days after the outage gift's "unlimited ends" emails, which already make that offer.
   - **After the sale (B):** only buyers. Premium and the Prints plan get B3; pack buyers get B4.
   - **Re-engagement (the 9-word email):** only `activity = dormant`. Then the seasonal-only tier after 6 months of
     silence.
   - **The outage win-back:** once ever, to the 85. They aren't `new`, so it never overlaps the welcome.
4. **Frequency cap:** at most 3 marketing emails a week per person, with at most 1 conversion email. When two emails
   compete on the same day, the order is:
   1. activation;
   2. after the sale;
   3. conversion;
   4. re-engagement;
   5. the flagship, which slides to next week.
5. **No duplicates** (§12.7): keyed broadcasts, Resend idempotency keys, and the `fired.<event>` markers.
6. **Two topics:**
   - "Sunday Prep", the weekly page;
   - "Offers & seasonal packs".

   Leaving offers keeps the weekly page. Transactional mail never carries offers.
7. **No loops between the app and Resend:**
   - an unsubscribe in Resend is written back to `private/profile` with `optOutSource: resend`;
   - the profile trigger skips changes that came from Resend, so it never pushes them back.
8. **One reply path:** `hello@` (§6.8). Resend's receiving is only a forward-to-`hello@` fallback.

**Live today (2026-09-25):**
- the Firebase, Zoho and Cloudflare emails above;
- the opt-in capture;
- the +5 bonus, which is a data change, not an email;
- the outage win-back, queued in Resend for Sep 29.

**Built and not sending yet:** the phase 1 sequences (§10), which wait for `config/email.live`.
- In our code the lanes are:
  - `due()` in `functions/email.js`;
  - one email a day and 3 a week at most;
  - one offer a week;
  - no print offer while printing is unlimited, nor within 14 days of the outage offer.

### 6.10 Privacy, security and deletion
- **Collect nothing sensitive:** no church name, no denomination, no children's names or exact ages (age groups
  only), and no free text beyond `curriculum` and the replies themselves.
- **Rules** (`firestore.rules`, checked by new `scripts/security-check.mjs` steps):
  - another user can't read or write someone's `private/profile`;
  - a user can't write unknown keys or values outside the lists in §6.2;
  - `events` are create-only, with the allowed types;
  - clients can't read `emailProfiles` or `emailReplies`.
- **Account deletion:** `onUserDeleted` (exists) also deletes `private/profile`, `events`, `emailProfiles/{uid}`,
  their `emailReplies`, and the Resend contact.
- **Reply texts** are deleted after 12 months, and the parsed answers stay on the profile.
- **The privacy policy** (`web/src/pages/privacy.astro`) must describe all of this before launch. The owner approves
  that copy. It covers:
  - the marketing email;
  - Resend as the processor;
  - what we keep and why.

---

## 7. Consent and the law (CASL applies; this isn't legal advice)
- Bible Sketch is run from Canada, so **treat every contact under CASL**. It's stricter than the US CAN-SPAM Act.
- **Express consent:** the unticked box, with the date, the exact wording and the source stored (§6.2).
- **Every marketing email shows:**
  - the business name and mailing address: Supersonic Sites Inc., 109b - 1917 Peninsula Rd, Ucluelet, BC V0R 3A0, Canada (decided 2026-09-24);
  - a working unsubscribe link. Resend handles it immediately, and CASL allows up to 10 business days.
- **Existing users:** only the new opt-in reaches them. The in-app banner asks, and asking by email is itself a
  marketing message.
  - CASL does allow *implied* consent: for 2 years after a purchase (our 4 buyers), and possibly 6 months after an
    inquiry. Using it is an owner decision, best checked with a lawyer.
- **Transactional email** needs no marketing consent and must carry no offers: verification, password reset,
  receipts, failure refunds, and "your page is ready".
- **Gmail and Yahoo bulk-sender rules:**
  - SPF, DKIM and DMARC;
  - one-click unsubscribe;
  - a spam-complaint rate under 0.3%. Aim for under 0.1%.

---

## 8. Numbers to track (added to the monthly report email)
Every number here comes from `emailProfiles` (§6.2). Cohorts by sign-up month (`cohort`) and by source
(`signup_source`, `signup_board`) show which Pins and boards bring people who buy, and not just people who sign up.

| Metric | Today | Target by March 2027 |
|---|---|---|
| Opt-in rate at sign-up | n/a | 50%+ |
| **Activation:** a first page within 7 days | ~23% ever | **50%+** |
| Activation, broad: a print or a page within 7 days | ~73% of recent sign-ups printed (§3.1) | 85%+ |
| Print wall to paid (hit 0 prints, then paid within 30 days) | unknown | 15%+ |
| Email-assisted revenue: purchases within 7 days of an email click | n/a | tracked monthly |
| A first print within 14 days | unknown | 35%+ |
| W1 reply rate (the sorting question) | n/a | 15%+ |
| Flagship click rate | n/a | 8%+ |
| 9-word reply rate | n/a | 5%+ |
| Free to paid | 2.2% | **5%+** |
| Revenue per sign-up (12 months) | $0.46 | **$1.50** |
| Unsubscribes per send / complaints | n/a | < 0.5% / < 0.1% |

- **The projection** (from the 2026-09-24 analysis): value per sign-up goes from $0.46 to about $1.19 in the base
  case. That's about +$700 in year 1 and +$1,400 in year 2 at the base Pinterest forecast. The bigger value is the
  list itself, which every later product launches to: the keepsake book, the church plan, seasonal bundles.
- **Tests:** one variable at a time, each on the flagship first, at least 2 sends per variant, judged on clicks, not
  opens (Apple Mail inflates opens):
  - a subject style: a plain topic vs a first name;
  - text-only vs one page image;
  - send day.
- Record each result in this doc (§13).

---

## 9. Checklist for every email (run it before you ask the owner to approve)
1. Who is it for (stage and persona), and what's **the one action**?
2. What happens next after each possible answer or click? (The chess move is written down before sending.)
3. From "Renaud from Bible Sketch" `<renaud@e.biblesketch.app>`, with Reply-To `hello@biblesketch.app` (§6.8).
4. The subject: looks like a personal note, short, true, and matches the body.
5. The body: under 100 words (flagship under 150), first person, and no invented personal circumstance.
6. It leaves a reason to click or reply (don't solve the mystery).
7. At most one link destination (the welcome and the flagship may add the super-signature).
8. The super-signature matches the stage (§5.9) and every offer in it is true today.
9. No fake urgency, no guilt, and Scripture is never used as sales pressure.
10. The CASL footer is there: name, address, unsubscribe, and why they're receiving it.
11. Stop rules are set: buyers leave the sales sequences, and at most one conversion email a week.
12. "re:" appears only when the email truly continues one we sent to that person (§12.10).
13. Every personal field has a fallback, so no email ever shows an empty slot (§12.14).
14. A test send to the owner, read on a phone.

---

## 10. Build order
**Phase 0 (owner, now):** the steps in §11.

**Phase 0.5: live since 2026-09-24** (commits 4706d7e and 242c0f3; rules, `onPrivateProfileWritten`, `onUserDeleted`, Worker c8b5a730).
- **Built:**
  - the unticked opt-in box and the "I'm making pages for" question on sign-up (email and Google);
  - the one-time banner for accounts never asked;
  - `users/{uid}/private/profile` with its rules;
  - the first-visit record (`bs_first` in localStorage, sent at sign-up);
  - `onPrivateProfileWritten` (+5 prints, once ever);
  - private-profile cleanup in `onUserDeleted`;
  - the privacy policy additions;
  - the outage gift, now part of `scripts/outage-winback.mjs` (§12.1).
- **Not in 0.5:** the persona question isn't in the banner (W1 asks by email); `ageGroups`, `setting`, `groupSize` and `curriculum` come with the reply reader.

The original list:
- ship the consent checkbox and the persona question alone, storing to `private/profile`. Every week without it,
  about 5 sign-ups arrive that we may never email;
- ship the question for Google sign-ups too (§12.3);
- the opt-in bonus trigger (§12.2), with its security-check steps (a functions deploy);
- unlimited prints until a date (`printsUnlimitedUntil`, §12.1), with its three checks (a Worker deploy), and the
  outage grant script;
- prepare the outage win-back (§12.1) to go out as soon as Resend is verified.

**Phase 1: built and deployed 2026-09-25, not sending yet.**
- **Go live:**
  - the owner approves the 15 test emails (sent 2026-09-25);
  - then `config/email` gets `live: true` (a data write, owner-approved).
  - Until then `emailTick` only logs, every 30 minutes, which email each person is due.
- **The design changed from the Resend Automations below** (checked against Resend's docs, 2026-09-25): our own
  functions decide and send, one email at a time, through Resend's send API.
  - The reason: the stop rules, the 3-a-week and 1-a-day caps, quiet hours (8 a.m. to 8 p.m. their time) and the
    "re:" threading all live in one tested file, not in a graph in Resend's dashboard.
  - Resend contacts, topics and Broadcasts come with the weekly flagship in phase 2. `RESEND_ADMIN_KEY` is for that.
- **Built:**
  - `functions/email.js`: every email's words, `render()` (CASL footer, one-click unsubscribe headers) and `due()`,
    the rules for who gets what, when. `node scripts/email-check.mjs` tests the rules, renders every email, and
    `--render=<email>` writes test sends.
  - `functions/index.js` section 17:
    - `emailProfiles/{uid}`: the email choice mirrored by `onPrivateProfileWritten`, the counters kept by the new
      `onTransactionCreated` (pages made, the first page, bought), the unsubscribe token, open offers, and `fired`
      (when each email went out);
    - `emailTick` (every 30 minutes; at most 40 sends a tick, for Resend's 100 a day);
    - `emailAction` (the unsubscribe and offer links);
    - `emailReply` (answers read from replies);
    - `onUserDeleted` also deletes `emailProfiles` and `emailReplies`.
  - The Worker:
    - `/api/email/unsubscribe|offer` forwards to `emailAction`, so the links stay on biblesketch.app;
    - the generator reads `?book=&chapter=&verse=&to=&age=&style=` (or `&font=`). It fills the form in and never
      starts a generation;
    - `email()` in `src/worker.ts` forwards every hello@ message to the owner first, then posts easy answers (an
      unsubscribe, the sorting question) to `emailReply`. It uses the purge hook's shared secret, so there's no new
      secret to set.
  - `scripts/email-backfill.mjs`: run once on 2026-09-25 (184 accounts: 42 made a page, 4 bought, 1 opted in).
  - The emails:
    - W0, W1 and the banner's `joined` note (which asks the sorting question too);
    - A1-A3, C1, C2 (with the +10 first-pack bonus, granted by `onTransactionCreated`), C6, C7 with its day-5 and
      last-day notes;
    - the outage follow-ups O23, O27 and O30 (Oct 22, 26 and 28).
    - O27, O30 and C7 link to the 7-day Prints offer (`/api/email/offer`, which redirects to the Zoho checkout until it
      ends).
  - The security check has 5 more steps (53 in all), and every one passes.
- **Changed from the drafts in §5:**
  - A1 goes on day 2 (W1 has day 1);
  - A2 asks "how did it turn out?" a day after the first page, because we don't record prints yet;
  - A3's subject is `3 pages ready to print`, with the 3 newest pages from the master account;
  - the super-signature appears only in W0 (§9 item 7), with offers that are true today.
- **Owner review of the first tests (2026-09-25):**
  - **Words:** the emails use the site's own terms.
    - **Credits** make a page of your own ("Image Credits" in Account, "20 Credits" on the pricing page).
    - **Prints** print or download any page.
    - **Pages** means only finished coloring pages.
    - So W0 is now `Your Bible Sketch account (10 free prints)`, and C1/C2 are `one credit left` / `out of credits?`.
  - **An offer about a balance waits until the balance has stayed put for 3 days** (`STUCK_MS`).
    - This covers C1, C2, C6 and C7. `emailTick` records when it first saw each balance (`emailProfiles.balance`).
    - The owner suggested about 7 days. I recommended 3, so the offer lands before the next Sunday, and the owner
      can change it.
    - Together with the one-offer-a-week rule, "one print left" and "out of prints" can never arrive close
      together.
  - **The prints offer shows both plans:** monthly is the main link, and yearly is a second link
    (`/api/email/offer?...&p=yearly`).
  - **Prices are USD only** (§12.20).
  - **Offer deadlines end at 11:59 p.m. in the reader's time zone** (Eastern when unknown), so "until Friday" is
    true where they are.
- **Left for later:**
  - the `events` collection (prints, checkout clicks), which would feed A2's print check and C3;
  - `resendWebhook` (Resend already suppresses bounces and complaints, and shows opens and clicks);
  - the Resend contacts sync;
  - the email numbers in the monthly report, due before its Oct 24 run.

The original phase 1 list:
- **The data (§6.2-6.3):**
  - `private/profile` with its rules and security-check steps;
  - the first-touch capture and the sign-up questions;
  - the opt-in banner for existing users;
  - `emailProfiles` (built for all 183 users on the first run);
  - `events`, written by `/api/print`, `/api/download` and the pricing buttons.
- **The pipeline (§6.5):** the profile, transaction and events triggers, `resendWebhook`, and the nightly
  `emailSync`.
- **Pre-filled generator links and the tracking tags (§6.6).**
- **The emails:** the W0/W1 welcome and sort, activation A1-A3, and the conversion emails C1-C2.
- **Replies:** the Email Worker on `hello@` (forward first, then post simple answers to `emailReply`), and the `email.received` fallback (§6.8).
- **Reporting:** email numbers in the monthly report (from `emailProfiles`).
- **Deletion:** `onUserDeleted` cleanup, and the privacy policy update.

**Phase 2 (live by Nov 10, before the Advent announcement on Nov 12):**
- the weekly Sunday Prep flagship (the first 4 approved by the owner), its free signed PDF link (§6.6), the weekly pick log (no repeats, §12.7) and the super-signature;
- the Advent and Christmas campaign;
- after-the-sale emails B1, B3 and B4, and the conversion emails C3-C5;
- the 9-word re-engagement and the seasonal-only tier;
- the persona branches T1, F1 and D1, and the 60-90-day check-ins.

**Phase 3 (January 2027):**
- referrals ("give 5, get 5") and B2;
- automatic concierge answers;
- the Premium annual push and the teacher/church path (God's Big Story pack);
- A/B tests (§8).

---

## 11. Owner steps and decisions
1. **Resend:**
   - The account is created and `e.biblesketch.app` is set up (2026-09-24; the DNS is live, §6.7). Confirm it shows
     "Verified" in Resend.
   - Then set two Firebase secrets yourself (§6.5), with `firebase functions:secrets:set <NAME>`:
     - `RESEND_API_KEY`;
     - `RESEND_WEBHOOK_SECRET`, which you get when the webhook endpoint is created in phase 1.
2. **Sender (decided 2026-09-24):** "Renaud from Bible Sketch" `<renaud@e.biblesketch.app>`, with replies to `hello@biblesketch.app`, which forwards to the owner's Zoho inbox.
3. **Mailing address (decided 2026-09-24):** Supersonic Sites Inc., 109b - 1917 Peninsula Rd, Ucluelet, BC V0R 3A0, Canada, as shown on supersonicsites.com. It's in the email footer and on the privacy page.
4. **Approve** the consent checkbox wording and the persona question (§6.3), and the privacy policy update (§6.10).
5. **Bonus amounts:**
   - **the opt-in bonus** (decided: extra free prints; proposed: +5; §12.2);
   - the first-purchase bonus (proposed: +10 pages for 7 days after running out);
   - the re-engagement gift (proposed: 3 pages);
   - the seasonal bonus (proposed: +20% pages on packs during the window);
   - the referral (proposed: 5 and 5).
6. **Implied consent** for the 4 past buyers: use it, or ask via the banner only?
7. **Urgent: the outage win-back (§12.1).**
   - Decided 2026-09-24: the gift is a month of unlimited prints.
   - Still open: send it relying on CASL's 6-month implied consent? The April sign-ups age out during October. A
     lawyer's 15-minute check is worth it.
   - Also approve the Worker deploy and the grant script.
8. **Is the weekly page free to print (§12.4)?** Either it doesn't count against the 5 prints, or the consent
   wording drops "free".
9. **The $1.99 prints-only downsell (§12.20):**
   - test it: yes or no?
   - monthly, annual ($14.99), or both?
   - The webhook routes on the plan code (deployed 2026-09-24). Next: create
     the Zoho plan and send its plan code, so the prints path can be added.
10. **A standing approval** for the automated sequences once you've read the first versions, and later for the
   weekly flagship.

---

## 12. What the first draft missed (review, 2026-09-24)

Sorted by value. Each item says where it changes the plan.

### 12.1 The outage cohort: the biggest single email we can send
**Status (2026-09-25): scheduled.** The owner approved the send (CASL implied consent, lawyer-checked).
- **The email: 80 emails for Tue Sep 29, 11:00 AM ET,** after a review of the queue through the Resend MCP on Sep 25.
  - The review found 6 subjects that weren't first names (Nursery, City, Teacher, Profe, REAL, MIBI). They were cancelled and rescheduled with "quick question" and "Hi,".
  - LyndaSpector was rescheduled as "Lynda".
  - Dropped: 1 throwaway-mailbox bot sign-up and the owner's 2 test accounts (markers say `outage_email_dropped`).
  - The name check now rejects role and org words, all-caps handles and merged names (`firstName` in the script). The script gained `--reschedule` and `--drop`.
  - Timing: 15:00 UTC is 8-11 AM across US time zones, the peak open window.
- **The gift:** all 85 accounts got unlimited prints until **Oct 29**.
- **Skipped:** the 2 accounts with unverified emails.
- **The test:** sent to the owner on Sep 25.
- **The tool:** `scripts/outage-winback.mjs`.
  - It holds the cohort (created 2026-03-26 to 09-21, never made a page or bought), the gift, and the email itself: plain text plus simple HTML, From "Renaud from Bible Sketch", Reply-To `hello@`, a mailto unsubscribe, and the CASL footer.
  - One marker per account (`processedWebhooks/outage2026_<uid>`, holding the Resend id) and a batch idempotency key mean a re-run sends nothing (checked).
  - Recipients are **not** Resend contacts. Their implied consent lapses at 6 months, so they only join the list through the banner.
- **The Resend key can only send:** cancelling or checking delivery happens in the Resend dashboard (Emails).

- **Who:** 85 people signed up between Mar 26 and today, never made a page and never bought.
  - The generator was down from June to Sep 21.
  - All of them still have their 5 free credits, and 73% printed a gallery page, so they wanted this.
  - This is exactly the neglected-leads situation the 9-word email was invented for (§1.3).
- **The legal basis is time-limited.** These users gave no express consent. CASL allows *implied* consent for 6
  months after an inquiry, and a free account sign-up plausibly counts as one.
  - The April sign-ups age out during October and the May ones in November, so this can't wait for phase 2.
  - Owner decision, ideally with a 15-minute lawyer check (§11).
  - Anyone older than 6 months only sees the in-app banner.
- **The apology gift (owner decision 2026-09-24): unlimited prints for a month.**
  - Each of the 85 gets `printsUnlimitedUntil` = the send date + 30 days, set by an owner-approved script just before
    the send.
  - A fixed end date keeps it simple, and it's a real deadline for the email to name.
  - The gift doesn't depend on opting in. An apology that requires a subscription would feel wrong.
- **What it costs:** almost nothing. A print of an existing page costs no Gemini call, only a PDF from the Worker.
  Someone printing the whole public gallery costs pennies.
- **Draft** (subject `{first}`; it carries the identification and unsubscribe footer like any other):
  > Hi {first}, did you ever get your coloring page made? Our page maker was broken for part of the summer, and
  > I'm sorry. It works again, your 5 free pages are still in your account, and to make up for it, printing is
  > unlimited for you until {date}. **[Print this week's page]**
  > — Renaud
- **Order:** the oldest cohorts first.
- **Replies:** go to the owner (the concierge).
- **When they come back,** the opt-in banner asks for express consent (with the weekly page, and the opt-in bonus
  for after the month).
- **The next moves (the chess plan):** the month works as a free Premium trial for prints.
  - **Day 23,** a reply-only check-in: *"What have you printed so far?"*
  - **Day 27:** `unlimited ends {date}`, with Premium ("keep unlimited prints, plus 10 new pages a month, for $4.99;
    cancel anytime").
  - **Day 30:** a last-day note.
  - **Who gets these:** only people who opted in, or who are still inside their own 6-month window. **Without
    express consent, nobody gets a marketing email once their 6 months are up.**
- **If it works,** test "your first month of unlimited prints" as the opt-in bonus for every new sign-up (§8 tests).

**Build (small, no Resend needed; phase 0.5).** The three `unlimitedPrints` checks were built 2026-09-24 with the
prints plan (§12.20). The grant script and the deploys remain.
- a helper `unlimitedPrints(profile)` = `isPremium` or `printsUnlimitedUntil` is still in the future, used in:
  - `web/src/lib/downloads.ts` (`grantDownload` skips the decrement);
  - `web/src/components/SketchActions.tsx` (no "(n left)", no print wall);
  - `web/src/components/shell/AccountModal.tsx` ("Unlimited until Oct 31");
- the grant script, which checks the cohort by the same rules as §3.1 and writes only `printsUnlimitedUntil`;
- a Worker deploy, and the script run: both owner-approved.

### 12.2 Capture consent now, before anything else is built
- Each week without the checkbox, about 5 new sign-ups arrive that we may never be allowed to email.
- The 90 accounts from before Mar 26 are already out of reach except through the in-app banner.
- Ship the checkbox and the persona question alone this week (§10, phase 0.5), storing to `private/profile`. The
  consent record is what matters, and the sending can come later.
- **The opt-in bonus (owner decision 2026-09-24): extra free prints for opting in.** It applies at sign-up and
  through the banner, so it also gives the 90 older accounts a reason to say yes.
  - **Granted by the server:** the `onPrivateProfileWritten` trigger adds the prints to `downloadsRemaining` the
    first time `emailOptIn` turns true.
    - It logs a `bonus` transaction (`description: 'Email opt-in bonus'`, `downloadsAdded`).
    - It records `offers.optInBonus.redeemedAt`, so it's paid once per account. Opting out and back in again gives
      nothing more.
    - Opting out later doesn't take the prints back.
    - The client never writes `downloadsRemaining` upward (the rules forbid it), so this needs a functions deploy.
  - **CASL is fine with an incentive,** as long as:
    - the box stays unticked and separate from the Terms;
    - using the app never depends on it;
    - the wording says what they'll get and how to unsubscribe.
  - **The trade-off:** extra prints push the print wall (C6) back by that many prints. Permission to email is worth
    far more than a few prints, because the wall converts best when an email arrives right as they hit it.
  - **Recommendation:** +5 (5 free prints becomes 10).

### 12.3 Google sign-ups never see a form
- Google sign-in is one click through a popup, so a checkbox on the email form misses them.
- **Fix:** show one small welcome step after the first Google sign-in: the consent box, "I'm making pages for...",
  and Continue.
- **Check first:** the share of sign-ups that use Google (Auth `provider`).

### 12.4 The "free weekly page" collides with the print wall
- Printing a gallery page costs a free user one of their 5 prints (`grantDownload` in `web/src/lib/downloads.ts`).
  So a free user who has used their 5 prints clicks the Thursday page and gets "No downloads left", right after the
  checkbox promised a free page every week.
- **Recommendation:** this week's flagship pages don't count against prints. `grantDownload` skips the decrement
  for the week's sketch ids; it's a small change.
  - It costs nothing (no generation), it builds the weekly habit, and the wall still applies to everything else.
- **The alternative:** drop "free" from the consent wording.
- **Decided 2026-09-24 (final): the weekly page is free to print from the email only.** It replaces an earlier "not free" answer the same day.
  - The Thursday email's button links to a signed PDF (§6.6), which needs no sign-in and uses no print.
  - On the site, the same page costs a print like any other. The free print is the reason to join: "a free page every Thursday, by email only".
  - This needs no subscriber check at print time, no field on the sketch and no rule change.

### 12.5 People print first, and most are on phones
- **§3.1 shows printing is the main behaviour.**
  - Activation is measured as a print or a page (§8).
  - W0 leads with more pages like the one they printed (§5.1).
  - The print wall gets its own offer, C6 (§5.5).
  - The first sync fills in past prints as 5 − `downloadsRemaining` for free users (prints were never logged).
- **Pinterest traffic is mostly mobile, and printing from a phone is awkward.**
  - Add a one-click **"email me this page to print later"**. It's a transactional email, and it gives people a
    reason to trust our emails.
  - Record the `device` on each event, so emails can say "open this on your computer to print".

### 12.6 The verification email may be the real activation leak
- Email-and-password sign-ups must verify before they can use the app (`signUpWithEmail` signs them out after
  sending the link).
- That email comes from Firebase's default `firebaseapp.com` address and template, which spam filters often catch.
  Every email in this plan comes after that gate.
- **Fixes:**
  - **Check** how many accounts never verified (an Auth export, run by the owner; it contains personal data).
  - **Send the verification email through Resend** from `biblesketch.app`. ROADMAP 1.3 already lists branded
    transactional email.
  - **Create a Resend contact only once the email is verified.** Mailing typos and bots hurts the sender
    reputation.

### 12.7 Duplicate and missed sends
- **Duplicates:** Firebase triggers can run twice on a retry, which would mean two welcome emails.
  - Keep `fired.<event>` timestamps on `emailProfiles` and skip repeats.
- **Missed sends:** the nightly sync re-fires a missed `signed_up` (opted in and verified, but no W0 sent).
- **Never the same page twice:** the weekly job keeps a pick log, the same idea as `pins.json`: date, sketch, story.
  - It never reuses a sketch, and never repeats a story within 52 weeks. Seasonal stories come back each year with a new drawing.
- **Never the same email twice:**
  - **One Resend contact per address,** so each broadcast reaches a person once.
  - **Each weekly send is keyed** (e.g. `sunday-prep-2026-11-12`), and the job checks the log first, so a re-run sends nothing.
  - **Triggered emails carry a Resend idempotency key** (`w0_<uid>`, `c7_<uid>_<date>`). Resend drops a repeat within 24 hours.
  - **The `fired.<event>` markers cover longer windows:** the welcome once, the outage email once ever, the 7-day offer at most every 90 days.
  - **The one deliberate second send** is the re-send to non-clickers: once, as its own segment, with a new subject.
- **Monitoring** (the lesson of the silent 3.5-month outage):
  - a health line in the monthly report;
  - an alert through the existing Cloudflare email channel when no email has gone out for 7 days, or when bounces
    pass 2%.

### 12.8 Don't send traffic into a broken generator
- **Before each Broadcast,** the send job checks two things:
  - a generation succeeded in the last 24 hours;
  - the Gemini spend cap has headroom. The 2026-09-23 cap stopped every customer's generation.
- If either fails, the send is held and the owner is told.
- **Before Advent,** raise the cap for the expected spike.

### 12.9 Email clicks would pollute the Pinterest learning loop
- `pins-learn` judges images by Pinterest clicks and saves. If emails send people to Pins ("save this to your
  board"), those Pins look better than they are, and the loop learns the wrong lesson.
- **Rule:** emails link to the site, not to Pins.
- If we ever ask for saves, record those Pins (an `emailPushed` flag in `pins.json`) so `pins-learn` leaves them out.

### 12.10 Honest "re:" only
- "re:" is used only when the email really continues one we sent to that person: W1 on top of W0, and check-ins on
  their own thread.
- A fake "re:" on a first contact is a misleading subject line, which CASL and the Competition Act forbid, and it
  spends trust we need. (Added to the §9 checklist.)
- **Test threading** in Gmail, Apple Mail and Outlook. Real threading may need `In-Reply-To` / `References` headers.

### 12.11 The From address
- **The owner chose `e.biblesketch.app`** (2026-09-24), so the sender is `renaud@e.biblesketch.app`.
  - I had recommended the root domain for the most personal-looking address. The subdomain's advantage is that its
    sending reputation is kept apart from `biblesketch.app`.
  - Most inboxes show the display name ("Renaud at Bible Sketch") far more than the address, so the personal feel
    comes from the name, the short text and real replies.
- **The receiving MX on the subdomain** lets replies come straight back through Resend (§6.8).

### 12.12 Summer and holidays
- Sunday school mostly runs September to May, and many classes pause in June-August (VBS aside).
- **In summer,** the flagship leans on "summer at home" for families and VBS for teachers.
- Weeks with no class (the Sunday after Christmas, and Easter week for some) get a lighter email.

### 12.13 Time zones
- A Broadcast goes out at one time for everyone.
- **Start** at 6:00 a.m. Eastern for all.
- **Once the list is bigger,** send in time-zone batches (Eastern, Central, Mountain/Pacific, the rest) using
  `timezone`.

### 12.14 A fallback for every personal field
Templates never show an empty slot:

| Field | Fallback |
|---|---|
| no first name | "Hi," |
| no next or landing story | this week's story |
| no age group | Young Child |
| no persona | the default teacher path |

### 12.15 Testing without real sends
- The emulators and any test setup never hold a real Resend key. A `DRY_RUN` mode logs emails instead of sending
  them.
- Webhook tests use Resend's test addresses (delivered, bounced and complained at `resend.dev`).

### 12.16 Referral abuse
- The referral pages are granted only after the friend verifies their email and prints or makes a page.
- One reward per new person.

### 12.17 Testimonials from replies
- When a reply praises Bible Sketch, ask permission to quote it (first name and role only, e.g. "Sarah, Sunday
  school teacher").
- The quotes feed the site, the Pins and the super-signature.

### 12.18 Measuring the lift honestly
- At 20-40 sign-ups a month, a hold-out group would take a year to say anything.
- **Instead,** compare each monthly cohort with the §3.1 baseline and track email-assisted revenue (§8).
- **Once sign-ups pass about 100 a month,** keep 10% as a hold-out that gets only transactional email for their
  first 90 days.

### 12.19 The owner's time, and the owner's story
- **Expected replies at today's rate:** a handful a month (22 sign-ups, about half opting in, about 15% replying to
  W1). That's easy to answer by hand until phase 3 automates the simple ones.
- **The strongest true line we have:** the owner teaches God's Big Story in Sunday school (the About page says so).
  "I teach Sunday school too" is honest, and it makes every teacher email credible. Use it in W0 and T1.

### 12.20 Proposed test: a $1.99 "unlimited prints" plan, offered only by email (owner idea, 2026-09-24)
**Why it fits:** most sign-ups print ready-made pages and never make their own (§3.1). A prints-only plan matches
that, and a tiny price turns a free user into a customer with a card on file. Every later offer is then one click.

**Why it isn't a pricing-page tier:**
- **Payment fees:** about 30¢ + 3% of every charge, which is about 18% of $1.99. We keep about $1.63.
- **Premium margin:** Premium ($4.99) keeps about $3.30 after fees and up to 10 generations (about $1.20).
- **The risk:** on the pricing page, many people who'd have paid $4.99 would pick $1.99 instead.

**So it's a downsell,** shown only to people who have already passed on Premium:
- **the end of the outage month (§12.1):** "keep unlimited prints for $1.99 a month" (Premium stays as the option
  that includes pages);
- **the moment someone runs out of prints, as a 7-day, email-only offer** (C7; owner idea 2026-09-24):
  - **Day 0:** the offer.
  - **Day 5:** a "re:" reminder.
  - **Day 7:** a last-day note.
  - After that, the link stops working. It's offered at most once every 90 days, so nobody learns to wait for it.
  - The deadline is real because the Worker enforces it (see Build);
- **not on a fixed day 15:** most people have printed only 1-2 pages by then and don't feel the need yet. Use day 15
  only as a fallback for people who have printed at least 3.

**Consider an annual price** for teachers: $14.99 for a Sunday school year. It means one card fee instead of 12, and
less churn.

**The honest size:** at today's volume, a handful of subscribers. The value is the first purchase, not the $1.99.

**Build (before the owner creates the plan in Zoho):**
1. **The webhook first. Done and deployed 2026-09-24 (revision handlezohowebhook-00137).**
   - `handleZohoWebhook` treated *every* subscription as Premium (`isPremium` plus 10 credits a month), because Zoho
     routes by workflow rule and the code never checked the plan.
   - Now only plan codes in `PREMIUM_PLANS` (`bible-sketch-premium`) can grant or remove Premium. Any other plan gets
     a 400 "Unknown plan", which shows as a failed delivery in Zoho's webhook log, and changes nothing.
   - `scripts/security-check.mjs` step: "a subscription on any other plan neither grants nor removes premium".
2. **The prints plan. Built and deployed 2026-09-24 (commit c76724e; webhook revision handlezohowebhook-00138, Worker version 637f9390).**
   - **In Zoho** (created by the owner's browser agent, 2026-09-24), under the product "Bible Sketch" (ID
     9037000000281233, the same product as Premium, so the existing workflow rules deliver its events):

     | Plan code | Price | Billing | Hosted checkout |
     |---|---|---|---|
     | `bible-sketch-prints-monthly` | CAD 2.79 | monthly, until cancelled | `https://billing.zohosecure.ca/subscribe/16bb18d1e24b94dc61c8488c1a133d491f563cd205dd5841ec6a82f3d2da95da/bible-sketch-prints-monthly` |
     | `bible-sketch-prints-yearly` | CAD 20.99 | yearly, until cancelled | same, ending `/bible-sketch-prints-yearly` |

     - No trial and no setup fee; tax settings copied from Premium.
     - Not in any pricing widget, and plan switching is off in the customer portal.
   - **In the code:**
     - the codes are in `PRINTS_PLANS`;
     - each `live` delivery sets `printsUnlimitedUntil` to `current_term_ends_at` + 3 days, never shortening a longer
       pass;
     - it logs a `prints_subscription` transaction once per term;
     - it gives no credits and no Premium;
     - any other status is a 200 no-op, so the pass lapses at its date.
   - **The app** reads the pass through `unlimitedPrints()` in `web/src/lib/store.ts`: `grantDownload`,
     `SketchActions` and `AccountModal` ("Unlimited until Oct 31").
   - **Tests:** security-check 46/46; `e2e-downloads` 11/11.
   - **Prices in emails are USD only** (owner decision 2026-09-25: "we are international"; this replaces "about US$2
     (CAD 2.79) plus tax"):
     - Premium is $4.99 a month;
     - Prints is $1.99 a month;
     - Prints yearly is **$19.99 a year, shown as "that's $1.67 a month"**. That's 16% off 12 × $1.99, close to "2
       months free" and just under $20. The owner asked for a round, converting number, and this was my
       recommendation.
     - **Zoho has to match:** the two Prints plans were created in CAD (2.79 and 20.99). They must charge US$1.99 and
       US$19.99 before any email with the offer goes live (CHECKLIST).
3. **The 7-day link (built 2026-09-25):**
   - Emails link to `/api/email/offer?u=<uid>&t=<token>`, adding `&p=yearly` for the yearly plan.
   - The token is random and kept in `emailProfiles.offers` (no shared secret).
   - While the offer is open, the link opens the on-site checkout (4). After that it shows "This offer has ended",
     with a link to `/pricing`.
   - `createCheckout` checks the token again, so the Prints plans can't be bought without a live offer.
4. **The on-site checkout (owner decision 2026-09-25; built, waiting on the Zoho setup):**
   - `/checkout/<plan>` for premium, prints-monthly, prints-yearly, spark, torch and beacon is a distraction-free page:
     no header or footer, an order summary, and Zoho's payment form in an iframe. Zoho hides its own header and
     footer there, so there's nothing to click away to.
   - **Why the API:** Zoho's plain checkout links can't choose a currency. The `createCheckout` function
     (`functions/index.js` section 18):
     - creates the buyer as a **USD** Zoho customer, with the uid custom field the webhook reads, once, and keeps its
       id as `zohoCustomerUsdId`;
     - then opens a hosted page for that customer with the USD price set per checkout (packs are the $0 plan plus
       their add-on at quantity 1).
   - **After payment:** Zoho redirects to `/checkout/done`, which moves the whole tab to the pricing page's
     thank-you banner. That banner also sends the Zaraz purchase events.
   - **Needs:**
     - the Zoho API client: `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET` and `ZOHO_REFRESH_TOKEN` as Firebase secrets, with
       the scopes `ZohoSubscriptions.customers.CREATE,ZohoSubscriptions.hostedpages.CREATE`;
     - `ZOHO_ORG_ID` in `functions/.env`;
     - USD enabled in Zoho, with a gateway that charges USD.
   - **Go-live order:**
     1. deploy `createCheckout` and `emailAction`;
     2. open one real checkout per plan and check the price and currency, without paying;
     3. switch the pricing page buttons to `/checkout/<plan>` (`web/src/scripts/pricing.ts`) and deploy the Worker.

**Judge it after 60 days:**
- how many people take the downsell;
- whether $4.99 sales drop;
- whether $1.99 subscribers later buy packs or upgrade.

---

## 13. Test results and changes
*(Add a dated line for each test or change: what changed, the numbers, and what we kept.)*

- **2026-09-25, phase 1 test sends:** all 15 emails went to the owner (renaud@supersonicsites.com) through the
  Resend MCP, with real subjects, sample data and placeholder links (`u=test`).
  - Waiting on the owner's approval.
- **2026-09-25, "re:" threading fixed:** Resend sends through Amazon SES, which replaced our custom `Message-ID`
  (the delivered W0 carried an `@email.amazonses.com` id). So the first W1 test pointed at an id that doesn't exist.
  - Now `emailTick` keeps each sent email's Resend id (`sentIds`), reads its real Message-ID with `RESEND_ADMIN_KEY`,
    and sets `In-Reply-To`/`References` on W1 and C7's day-5 note.
  - A 16th test (W1 answering the real W0 id) went to the owner to confirm the thread.
