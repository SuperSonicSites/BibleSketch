# Email marketing master plan

The plan for Bible Sketch's lifecycle and marketing email: the philosophy (Dean Jackson's *Email Mastery*), how it
applies to our users, the campaigns, the system that sends them, and the build order. **Read §1 and §2 before
writing or editing any email**, and check every draft against the checklist in §9.

**Status (2026-09-24):** plan only, nothing built or sent. Waiting on the owner steps in §11 (Resend account and
domain, sender name, mailing address, consent wording, bonus amounts).

- Owner decisions so far: emails are for **sign-ups**, whose data lives in **Firebase**, sent through **Resend**.
  No Zoho integration (purchases already land in Firestore through our webhook). Every campaign is automated, and
  the goal is a system that runs without the owner watching it.
- Sending any email to real users is an owner-approved action until the owner gives a standing approval, the way
  `pinterest-daily` has one.

---

## 1. The philosophy (Dean Jackson, *Email Mastery*)

Source: *Email Mastery*, Dean Jackson and Joe Polish, transcripts of I Love Marketing episodes 104-108
(`https://s3.amazonaws.com/ilovemarketing/Email+Mastery.pdf`, 114 pages). What follows is a summary in our own
words, not the book's text.

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

- **From a person:** "Renaud at Bible Sketch" (owner to confirm the name). Replies go to `hello@biblesketch.app`,
  which is already the only public contact address (ROADMAP 1, phase 1 decision), and they reach a human. Never
  send from a `noreply` address.
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
- **Footer (CASL):** business name, mailing address, unsubscribe link, and the reason they're getting the email.

---

## 3. Who we're writing to

### 3.1 The numbers today (2026-09-24)
- 183 accounts. **42 (23%) have ever made a page**, 4 have paid, and lifetime revenue is $84.95. That's about $0.46
  per sign-up.
- About 22 sign-ups every 30 days. Most come from Pinterest, where one or two Pins bring most of them.
- There was a 3.5-month generation outage (Jun-Sep 2026), which drags these numbers down.
- The first lever is clear: **get people to make and print a page before selling anything.** Someone who never
  makes a page never buys.

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

### 3.4 Stages (computed nightly, §6.3)
- `new`: signed up in the last 14 days.
- `active`: made a page in the last 30 days and still has credits.
- `empty`: has used all of their credits and never bought.
- `buyer`: bought a pack. `premium`: subscribed.
- `quiet`: no activity for 30-89 days. `dormant`: 90 days or more.

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
> you have **5 free pages and 5 free prints**. The quickest way to start is with the page you came in on:
> **[Make your own {story} page]**, ready in about 30 seconds.
> — Renaud
> *(super-signature, §5.9)*

- **Congruence:** `{story}` is the story on the page or Pin where they signed up (the landing path we'll capture,
  §6.2). Without it, use this week's story.

**W1 (the sorting question, next day, on top of W0):**
> Hi {first}, quick question: are these pages for a class, or for your kids at home?
> — Renaud

- **Reply handling (§6.5):**
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
  - In phase 1 the owner answers these; in phase 3 the reply Worker answers automatically (§6.5).
- **family, F1:** *"How old are your kids?"*
  - The reply sets their default age group (Toddler / Kids / Older), so every later link opens the generator at the
    right age.
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
  - "yes": the reply Worker sends this week's Sunday Prep page and a gift of 3 pages (the bonus is owner-approved);
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

| Slot | new / active | empty | buyer / premium |
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

## 6. The system

### 6.1 Where things live
- **Firestore** is the source of truth for behaviour: `users/{uid}` (credits, downloadsRemaining, isPremium),
  `users/{uid}/transactions` (the welcome bonus, each generation and refund, purchases through our own Zoho
  webhook), sketches, and prints.
- **Resend** holds the email side: contacts with their properties, unsubscribe status, Topics, Segments,
  Automations (the sequences) and Broadcasts (the flagship and seasonal emails).
- Nothing reads or writes Zoho for email.

### 6.2 Consent and persona at sign-up (needs a reviewed Firestore rules change)
- **The sign-up form gets:**
  - an **unticked** checkbox: *"Email me a free Bible story page each week, plus occasional offers. Unsubscribe
    anytime."* (the owner approves the wording);
  - one optional question: *"I'm making pages for: my class / my kids / myself"*. If they answer it, the sorting
    email W1 is skipped and the branch starts straight away.
- **Stored on `users/{uid}`:**
  - `marketing: { optIn, at, text, source }`, with the exact wording shown, for CASL proof;
  - `persona`;
  - `landing`: the first page they viewed on this visit, captured in the browser, which gives the story for W0.
  - The client creates this doc (`web/src/lib/session.ts`), so `firestore.rules` must allow these fields on create
    and on the owner's update. **That rules change gets the security-check treatment** (`scripts/security-check.mjs`).
- **Existing users (183)** get an in-app opt-in banner, not an email (§7).

### 6.3 Events and sync (Firebase functions, which have admin access)
- **`onUserCreated`** (exists): when they opted in, create the Resend contact with its properties and fire the
  `signed_up` event.
- **New `onTransactionCreated`** on `users/{uid}/transactions`:
  - `page_made` (with the credits left);
  - `credits_low` / `credits_zero`;
  - `purchased` (pack or Premium);
  - `refunded`.
- **Prints:** the Worker's print and download endpoints fire `page_printed`.
- **Checkout started:** the pricing page's plan click posts to a small Worker endpoint, which fires
  `checkout_started` for C3.
- **Consent changes:** a user-doc update trigger (the banner, or the account settings) creates or unsubscribes the
  Resend contact.
- **Nightly sync** (a scheduled function): recomputes each opted-in contact's properties, which catches anything the
  events missed.
  - Properties: `credits`, `pages`, `prints`, `premium`, `lastActive`, `persona`, `stage`, `lastStory`, `ageGroup`.
- **Secret:** `RESEND_API_KEY`, which the owner sets (Firebase secret and Worker secret). Claude never handles it.
- **Deploys:** these are functions deploys with an explicit, quoted `--only` list (CLAUDE.md), and they're
  owner-approved.

### 6.4 Resend setup
- **Sending domain:** `mail.biblesketch.app`, with SPF, DKIM and DMARC in Cloudflare DNS. A subdomain keeps the root
  domain's reputation safe.
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

### 6.5 Replies: the email concierge
- Replies go to `hello@biblesketch.app`, through Cloudflare Email Routing, to an **Email Worker** (the `email()`
  handler on `biblesketch-web`).
- **Phase 1:** it logs the reply, sets `persona` on simple W1 answers (the keyword rules in §5.1), and forwards
  **every** reply to the owner's inbox. The owner is the concierge and answers the "love letters".
- **Phase 3:** automatic answers to the easy, high-value replies:
  - "What are you teaching this Sunday?" gets back a link to that story, filled in for their age;
  - "yes" to a 9-word email gets this week's page and a gift.
  - Anything unclear still goes to the owner.
  - Optional: a daily scheduled task drafts replies for the owner to approve.

### 6.6 The weekly flagship job
- A scheduled job runs on Wednesday. It could be a step in a Claude scheduled task (`email-weekly`) or a Worker
  cron.
- **Steps:**
  1. Pick this Sunday's story (§5.4).
  2. Pick the best page for it.
  3. Fill in the template.
  4. Create a Resend Broadcast for Thursday 6:00 a.m. ET.
- **Approval:** a draft for the owner to approve until a standing approval exists. Then it sends automatically.

---

## 7. Consent and the law (CASL applies; this isn't legal advice)
- Bible Sketch is run from Canada, so **treat every contact under CASL**. It's stricter than the US CAN-SPAM Act.
- **Express consent:** the unticked box, with the date, the exact wording and the source stored (§6.2).
- **Every marketing email shows:**
  - the business name and a mailing address (the owner provides one; a PO box works);
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
| Metric | Today | Target by March 2027 |
|---|---|---|
| Opt-in rate at sign-up | n/a | 50%+ |
| **Activation:** a first page within 7 days | ~23% ever | **50%+** |
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
- Record each result in this doc (§12).

---

## 9. Checklist for every email (run it before you ask the owner to approve)
1. Who is it for (stage and persona), and what's **the one action**?
2. What happens next after each possible answer or click? (The chess move is written down before sending.)
3. From "Renaud at Bible Sketch", with replies going to `hello@biblesketch.app`.
4. The subject: looks like a personal note, short, true, and matches the body.
5. The body: under 100 words (flagship under 150), first person, and no invented personal circumstance.
6. It leaves a reason to click or reply (don't solve the mystery).
7. At most one link destination (the welcome and the flagship may add the super-signature).
8. The super-signature matches the stage (§5.9) and every offer in it is true today.
9. No fake urgency, no guilt, and Scripture is never used as sales pressure.
10. The CASL footer is there: name, address, unsubscribe, and why they're receiving it.
11. Stop rules are set: buyers leave the sales sequences, and at most one conversion email a week.
12. A test send to the owner, read on a phone.

---

## 10. Build order
**Phase 0 (owner, now):** the steps in §11.

**Phase 1 (about a week of build once Resend is ready; target Oct 9):**
- consent, persona and landing capture at sign-up, the rules change and the security check, and the opt-in banner
  for existing users;
- the Resend contact on sign-up, the transaction trigger events, and the nightly sync;
- the W0/W1 welcome and sort, activation A1-A3, and the conversion emails C1-C2;
- the reply Worker (log, persona, forward to the owner);
- email numbers in the monthly report.

**Phase 2 (live by Nov 10, before the Advent announcement on Nov 12):**
- the weekly Sunday Prep flagship (the first 4 approved by the owner) and the super-signature;
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
1. **Create a Resend account.** Verify `mail.biblesketch.app` (Resend can add the Cloudflare DNS records), then set
   `RESEND_API_KEY` yourself as a Firebase secret and as a Worker secret (`npx wrangler secret put RESEND_API_KEY`
   in `web/`).
2. **Sender:** is "Renaud at Bible Sketch", with replies to `hello@biblesketch.app`, OK? Where should replies be
   forwarded?
3. **A mailing address** for the footer (CASL).
4. **Approve** the consent checkbox wording and the persona question (§6.2).
5. **Bonus amounts:**
   - the first-purchase bonus (proposed: +10 pages for 7 days after running out);
   - the re-engagement gift (proposed: 3 pages);
   - the seasonal bonus (proposed: +20% pages on packs during the window);
   - the referral (proposed: 5 and 5).
6. **Implied consent** for the 4 past buyers: use it, or ask via the banner only?
7. **A standing approval** for the automated sequences once you've read the first versions, and later for the
   weekly flagship.

---

## 12. Test results and changes
*(Add a dated line for each test or change: what changed, the numbers, and what we kept.)*
