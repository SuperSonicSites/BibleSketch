# Manual checklist

Only work that needs a human: console access, dashboards, decisions, or accounts an agent can't use. Code work lives in [ROADMAP.md](ROADMAP.md). Tick items and add the date. The complete copy is on branch astro-rebuild (it has the Cloudflare/rebuild items); seo-fixes is merged into it regularly.

## Open

### Start here (priority order, updated 2026-09-25)
0. **Approve the 15 phase 1 emails** (test sends of Sep 25 to renaud@supersonicsites.com; plan §10). Reply "approved", or say what to change. Once they're approved, Claude sets `config/email` `live: true` and the sequences start (W0 for new sign-ups, the outage follow-ups from Oct 22, and so on).
   - The links in the tests are placeholders (`u=test`): "Unsubscribe" says "Link not recognised" and "Keep printing" says "This offer has ended". In the real emails they're personal and work.
   - The +10 first-pack bonus in C2 ("get any pack by <date> and I'll add 10 extra pages") is live code. Approving C2 approves the bonus.
0b. **Point hello@ at the Worker** so replies are read automatically, after you've approved the emails: Cloudflare > biblesketch.app > Email > Email Routing > Routing rules > `hello@biblesketch.app` > Edit > Action: **Send to a Worker** > `biblesketch-web` > Save.
   - The Worker forwards every message to renaud@supersonicsites.com first, exactly as today.
   - Then it acts on "unsubscribe" replies and answers to "a class, or your kids at home?".
   - Test it: send "hello" to hello@. It should arrive in Zoho as before.
1. **Test the opt-in live:** sign in on biblesketch.app. The banner appears once; click "Yes, sign me up", then Account should show 5 more Downloads/Prints. This also puts your account on the list.
2. **Check the test email** (sent Sep 25 to renaud@supersonicsites.com). The real one goes to 80 people on **Tue Sep 29 at 11:00 AM ET**, after Claude's name review of Sep 25. To change or stop it, cancel in Resend > Emails, or tell Claude before Monday night (the Resend MCP is connected).
3. **Zoho Mail alias** so you can answer as `hello@biblesketch.app` (below).
4. **Brent's Cloudflare verification click** (below).
5. **Keep an eye on `pinterest-daily`:** its first run succeeded; if a run stops on a permission prompt, approve it once.

### Decisions
- [x] **Unpaid premium/credits accounts.** 8 accounts have premium or credits without any payment (beta-week sign-ups, Nov 24-28, 2025; one orphan doc `EIV569…` with no Auth user). Keep or revoke? - ANSWER: KEEP
- [x] **Bucket CORS.** Allow GET from `https://biblesketch.app` on the Storage bucket now, or wait for the rebuild (needed before any browser-side image editing; see ROADMAP 1.1). - ANSWER: ENABLED 2026-09-23 (verified: GET from biblesketch.app returns Access-Control-Allow-Origin)
- [x] **"Remove Color" pricing.** Free (rate-limited) or 1 credit (ROADMAP 1.1). - ANSWER: 1 CREDIT (2026-09-23)

### Pinterest auto-publish (ROADMAP 1.5)
- [x] Connect the feeds (Pinterest > Settings > Bulk create Pins > Auto-publish > Connect RSS feed > pick the board > Save). Pinterest refuses an empty feed, so connect each one on a day it has an item. Done: `christmas.xml` (2026-09-23, Luke 2:15-16 published); `scripture.xml` → Scripture Coloring Sheets | Bible Verse Coloring (2026-09-24 00:01 UTC, by Claude). `sunday-school.xml` → Sunday School Activities & Bible Coloring Lessons (2026-09-24 evening, by the owner). `easter.xml` from Feb 1; `adult.xml` stays unconnected (paused).
- [x] **Verse art translation.** Decided 2026-09-23: keep WEB but print "the LORD" instead of "Yahweh" (`withLord()` in `functions/generation/pipeline.js`). See docs/pinterest-scripture-plan.md §2.
- [ ] **Pinterest API app** "Bible Sketch Pin Publisher" (id 1615048, Trial access since 2026-09-23; redirect URI `https://biblesketch.app/api/pinterest/callback` registered). Done 2026-09-23/24: app secret set, connected in Sandbox, test Pins published, **Standard upgrade requested with the demo video** (`C:\Users\renau\Videos\bible-sketch-pinterest-api-demo-final.mp4`). Waiting on Pinterest (watch the developer email). After Standard: tell Claude; it switches `PINTEREST_ENV` to `production`, you reconnect once at https://biblesketch.app/api/pinterest, then the daily API publisher replaces the RSS feeds.
- [ ] **Decision: AI label on API Pins.** Pinterest's create-Pin call can mark a Pin "AI modified" (`ai_disclosures`). Our pages are AI-generated; Pinterest may label them itself either way. Label them, or not?
- [ ] **Decision: "Free Printable" on the kids' Pin banners** (`web/public/pin-banners/paper.png`, `purple.png`). The first 5 prints are free, then pages cost credits. Keep the wording, or change it (e.g. "Printable Coloring Page")?
- [ ] **Gemini spend alert.** On 2026-09-23 the AI Studio monthly spend cap stopped all generations (customers too) until you raised it. Add a Cloud Billing budget alert on the Gemini project at ~80% of the cap (ROADMAP S1) so it never surprises you.
- [x] **Deploy the drawing guidance** (2026-09-24, run by Claude at the owner's request; verified with a live Genesis 8:11 generation).
- [ ] **Daily Pinterest task (`pinterest-daily`, 7:00 every day):** keep the Claude desktop app open (a missed run happens at the next launch) and the in-app browser signed in to biblesketch.app (master account) and Pinterest. Click "Run now" once on the task (sidebar > Scheduled) and approve its tool prompts, so later runs don't stop on a permission prompt. Raise the Gemini spend cap in AI Studio if a run reports the cap.
- [x] **Zaraz: fix Pinterest sign-up tracking** (done by the owner, 2026-09-24) (Cloudflare dashboard > Zaraz > Tools > Pinterest Conversions API > the "Signup" action). Skip it if the browser agent already did this.
  - **Why:** Pinterest rejects the sign-ups with a 400, because Zaraz sends the email and external ID as text where Pinterest needs a list.
  - **The fix:**
    - remove the **Email** and **External ID** fields;
    - keep **Click ID** (cookie `_epik`) and **Event ID** (event property `event_id`; the site sends `signup_<uid>` since 2026-09-24);
    - keep only the "Signup - Google" trigger (`CompleteRegistration`), and change nothing else.
  - **Test in Zaraz debug mode** on biblesketch.app: `zaraz.track('CompleteRegistration', { event_id: 'signup_zaraz-debug-2' })`. Pinterest should answer 200, and a sign-up should appear in Pinterest Ads > Conversions within minutes. Turn debug mode off afterwards.
- [x] **Credits for the daily Pinterest task:** 2026-09-24, the owner set the master account to 9,999 credits (verified). The Gemini spend cap stays the real limit.
- [ ] **Brent: click Cloudflare's verification email** (sent 2026-09-24 to brent@supersonicsites.com, "verify your destination address"). Until then his CC of the monthly Pinterest report is skipped (renaud@ still gets it).
- [ ] Weekly (Claude can do it): alt text on the Pins RSS published that week. In `web/`: `node scripts/pins-alt.mjs`, then run the printed snippet in the signed-in Pinterest tab (DevTools console, or ask Claude). Idempotent.
- [x] Old Pin "Joshua 1:9 Memory Verse" (385 saves) had no link: linked on 2026-09-23 to `/coloring-page/joshua-1-9/5SISdcUP4jxzkCc7qUXw` (a different Joshua 1:9 page than the RSS one, so each page keeps one Pin). Its creator stats (22,469 impressions, 385 saves) were intact after the edit; watch its analytics for a few days.

### Lifecycle email (ROADMAP 1.6, plan in docs/email-marketing-plan.md)
- [ ] **Resend account.**
  - [x] Account created, `RESEND_API_KEY` set as a Firebase secret, and the stray `.env` deleted (2026-09-24, verified).
  - [x] **Sending domain `e.biblesketch.app`: verified in Resend** (owner, 2026-09-24). The DNS was checked the same day: DKIM, the `send.e` return path, the receiving MX, and the root DMARC `p=none`, which covers the subdomain. Confirm Resend shows the domain as "Verified", and keep "receiving" on, because replies come back through it (plan §6.8).
  - [x] **Outage win-back: approved and scheduled** (2026-09-25; plan §12.1). The owner approved it after a lawyer check. 80 emails for Tue Sep 29, 11:00 AM ET, after the name review; the 85 accounts have unlimited prints until Oct 29. Skipped: 2 unverified addresses, 1 bot, and the owner's 2 test accounts.
  - [x] **Opt-in bonus: +5 prints and the checkbox wording approved** (2026-09-24). The wording is `CONSENT_TEXT` in `web/src/lib/session.ts`.
  - [x] **Billing webhook fix deployed** (2026-09-24, owner-approved; revision handlezohowebhook-00137; unsigned calls still 401). Only the Premium plan code grants Premium.
  - [x] **Unlimited Prints plans created in Zoho** (2026-09-24): `bible-sketch-prints-monthly` CAD 2.79 and `bible-sketch-prints-yearly` CAD 20.99, under the Premium product, off the pricing page. The code is built and tested (commit c76724e). Details: plan §12.20.
  - [x] **Deployed 2026-09-24, owner-approved:** webhook revision handlezohowebhook-00138 (unsigned calls still 401) and Worker version 637f9390 (pages 200, print endpoint 401 on a bad token, the live `store` chunk has the dated-pass check).
  - [x] **Self-cancellation and tax check: done by the owner's browser agent (2026-09-24).** Claude hasn't seen the report: paste it if US buyers were shown Canadian tax. Original item: **Turn on self-cancellation in the Zoho customer portal** (Settings > Customer Portal: allow cancelling at the end of the current term). Right now subscribers can't cancel on their own, but Premium and the prints plans both say "Cancel anytime". That's a consumer-protection risk (online sign-ups must be cancellable online in several places, California among them) and a source of chargebacks. The webhook already handles end-of-term cancellations.
  - [x] **Sales tax check:** the checkout showed GST 5% + BC PST 7% on top of the price. Confirm Zoho charges these by the customer's address, not on every sale: open a hosted page, enter a US address, and don't pay. Exports of digital services to non-residents are usually zero-rated for GST, but ask your accountant.
  - Secrets (plan §6.5): `RESEND_API_KEY` is set. No other secret is needed for phase 1: the reply reader reuses the purge hook's shared secret. `RESEND_WEBHOOK_SECRET` waits for the Resend webhook, which isn't built yet.
- [ ] **Personal mail as @biblesketch.app, at no extra cost** (plan §6.7): receive through Cloudflare Email Routing, send from Zoho Mail. Keep the MX on Cloudflare: moving it breaks the monthly report and the forwarding.
  1. **Receive:** Cloudflare > biblesketch.app > Email > Email Routing > Routing rules: forward `hello@` (and `renaud@`, if you want it) to `renaud@supersonicsites.com`.
  2. **Send:** Zoho Mail Admin Console > Domains: add `biblesketch.app`. It looks already verified: the `zoho-verification` TXT record exists. Skip the MX step.
     - Then Users > you > Email alias: add `hello@biblesketch.app`, and choose it as "From" when composing.
     - A second domain needs a paid Zoho Mail plan. The Forever Free plan hosts one domain only.
  3. **Deliverability:**
     - Zoho Admin > Domains > biblesketch.app > DKIM: create a key, add its TXT record in Cloudflare DNS, then click Verify.
     - Add the SPF `include:` that Zoho shows for Zoho Mail to the existing record (`v=spf1 include:_spf.mx.cloudflare.net include:zcsend.ca ~all`). Keep a single SPF record.
     - DMARC (`p=none`) is already there.
  4. **Test:** send from `hello@biblesketch.app` to a Gmail address, then Gmail > Show original: SPF, DKIM and DMARC should all say PASS.
- [x] **Decided 2026-09-24:**
  - replies go to `hello@biblesketch.app`;
  - the sender is "Renaud from Bible Sketch" `<renaud@e.biblesketch.app>`. The owner wrote "Renaud @ Bible Sketch"; Claude suggests "from", because an "@" in a display name can look like a fake address to spam filters. Say if you prefer the "@";
  - +5 opt-in prints;
  - the weekly page is **free to print from the email only**, through a signed PDF link built with the weekly email in phase 2. The checkbox says: *"Send me a free Bible story page to print each week, plus occasional offers, and get 5 extra prints now. Unsubscribe anytime."* (final, approved);
  - "go" for phase 0.5.
- [x] **Phase 0.5 deployed 2026-09-24 (owner-approved):**
  - `firestore:rules`;
  - `functions:onPrivateProfileWritten` (created) and `functions:onUserDeleted`;
  - Worker version c8b5a730.
  - Verified live: pages 200, the privacy text is live, the first-visit script is in the HTML, the consent text is in the live JS, the private record returns 403 without sign-in, the trigger is ACTIVE, and there are no function warnings since the deploy.
  - Not verified live: a real opt-in and its bonus (a real user's write; the owner tests it, item 1 of Start here).
  - The deploy order was:
  1. `firebase deploy --only "firestore:rules"`;
  2. `firebase deploy --only "functions:onPrivateProfileWritten,functions:onUserDeleted"`;
  3. the Worker (sign-up box, banner, first-visit record, privacy page).
- [x] **Privacy policy additions approved and live** (2026-09-24, dated Sept 25):
  - email preferences and how you found us, in 1.1;
  - the weekly email, in 2;
  - Resend, in 5;
  - how opt-in and unsubscribe work, in 7.4.
- [x] **Mailing address (decided 2026-09-24):** Supersonic Sites Inc., 109b - 1917 Peninsula Rd, Ucluelet, BC V0R 3A0, Canada, from supersonicsites.com. It's in the privacy page's Contact section, which the sign-up box links to, and in the email footer.
- [ ] **Still open:**
  - implied consent for the 4 past buyers;
  - the other bonus amounts (first purchase, win-back, seasonal, referral) when those emails are built.
- [x] **A second Resend API key with full access** (added by the owner, 2026-09-25). Nothing uses it yet: contacts, topics and Broadcasts come with the weekly flagship in phase 2. The send-only `RESEND_API_KEY` does all phase 1 sending.
- [ ] **Check how many accounts never verified their email (§12.6).** It's an Auth export, so you run it, because it contains personal data. Claude can give you the command. If the number is high, the verification email is the first thing to fix.
- [ ] **Later:** a standing approval for the automated emails, once you've read the first versions (§11).

### Astro rebuild, phases 3-5
- [x] ~~**Let the preview site sign in**~~ Not needed: the owner chose to test on the live site (2026-09-23). (the browser API key only accepts biblesketch.app): Google Cloud console > APIs & Services > Credentials > the Firebase browser key (`AIzaSyAxrH…`) > Website restrictions: add `https://biblesketch-web.supersonicworkers.workers.dev/*`, Save (up to 5 min to apply). For Google sign-in there too: Firebase console > Authentication > Settings > Authorized domains: add `biblesketch-web.supersonicworkers.workers.dev`. **Remove both after cutover step 2.**
- [ ] **Test the new pages on https://biblesketch.app** (live since 2026-09-23): make one Scene Art page and one Verse Art page, try Make changes, Remove Color and Add Ref on the result, publish one, check My Gallery and Saved on /gallery, open /pricing (don't buy). Each generation or paid edit uses 1 of your credits; failures are refunded.
- [x] 2026-09-23: Cutover steps 1 and 2 approved and live (owner: "push live, we'll debug there").
- [ ] One real purchase test (the cheapest pack) to see the credits land and the Purchase event fire.
- [ ] Cloudflare dashboard (optional, saves Worker requests): Workers Routes on biblesketch.app, add routes with Worker = **None** for `biblesketch.app/__/*`, `biblesketch.app/assets/*`, `biblesketch.app/references/*`, `biblesketch.app/sitemap.xml`. Today the Worker passes them through to Firebase, which works.
- [ ] **Around 2026-09-30, approve the cleanup (phase 5):** removes the old app's functions and routes; after it there is no rollback to the old site.
- [ ] Firebase console > Authentication > Sign-in method: disable **Anonymous** (owner decision; nothing uses it).
- [ ] (Optional) Cloudflare Cache Rule: ignore the query string for `/` and `/bible-verse-coloring` in the cache key, so ad clicks (`?utm_…`, `?gclid`, `?fbclid`, `?epik`) share one cached page. Not needed for correctness.
- [x] **Thumbnail palette PNGs** (optional). Firebase console > Extensions > Resize Images (0.3.0) > Reconfigure: set output options to palette PNG. Smaller thumbnails; slightly lossy where verse text is colored, so check a few by eye.

### Google Cloud / Firebase console (confirm these were done in the Phase A hotfix)
- [ ] Gemini API: per-model quota caps and a billing budget alert.
- [x] Old Gemini keys deleted at the source; old secret versions disabled; current key restricted to the Generative Language API (API restriction only, no referrer restriction).
- [x] Auth > Authorized domains: remove the stale `bible-sketch-platform-267611631790.us-west1.run.app`.
- [ ] Monitoring alerts for generation failures (ROADMAP S1) — until then, try one generation on the live site each week.

### Zoho
- [ ] Make the customer "User ID" custom field read-only in the customer portal (ROADMAP S5).

### Recurring
- [ ] **Monthly:** run `node scripts/optimize-sketch-images.mjs --apply` (or ask an agent to), until a Storage trigger replaces it.
- [ ] **2-4 weeks after 2026-09-22:** Search Console > Pages and Sitemaps: soft 404s and duplicate-canonical counts should fall; the sitemap should show 338 discovered URLs with no errors.

## Done
- [x] 2026-09-23: Purge secret + WORKER_PURGE_URL set, `onSketchWritten` deployed; private → 404 → public test passed on a live sketch.
- [x] 2026-09-23: Live auth tested by the owner on phase 1 pages (sign-up and login work). Phase 2 cutover approved and live (coloring pages, tags, profiles, /api).
- [x] 2026-09-23: Phase 1 cutover approved and live (about, privacy, terms, verified, blog on the Worker).
- [x] 2026-09-23: Phase 0 /labs probe routes deleted in the Cloudflare dashboard (`_astro/*` and `img/*` kept for phase 1).
- [x] 2026-09-23: Phase 1 copy changes approved as drafted (docs/copy-review-phase1.md). Set LAST_UPDATED in privacy/terms to the go-live date at cutover.
- [x] 2026-09-23: Workers Paid confirmed active on the Cloudflare account; Phase 0 zone probe routes approved.
- [x] 2026-09-22: Cloudflare purge of `/og.png`, `/logo.png`, Christmas blog cover; Email Obfuscation off; Bot Fight Mode decided.
- [x] 2026-09-22: Sitemap resubmitted in Search Console.
