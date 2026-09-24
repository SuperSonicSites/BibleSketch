# Manual checklist

Only work that needs a human: console access, dashboards, decisions, or accounts an agent can't use. Code work lives in [ROADMAP.md](ROADMAP.md). Tick items and add the date. The complete copy is on branch astro-rebuild (it has the Cloudflare/rebuild items); seo-fixes is merged into it regularly.

## Open

### Start here (priority order, 2026-09-24)
1. **Tonight, after 8 pm EDT:** connect `sunday-school.xml` (Pinterest auto-publish, below).
2. **Zaraz sign-up fix,** if the browser agent hasn't finished it (below).
3. **"Run now" once on `pinterest-daily`** and approve its prompts (below).
4. **Before mid-October: the outage win-back decision** (Lifecycle email, below). The April sign-ups age out of CASL's 6-month window during October.
5. **Resend:** the key into Firebase secrets, and domain verification (the account is done; Lifecycle email, below).
6. **The email decisions,** then tell Claude "go" for phase 0.5 (below).
7. **Zoho:** create the $1.99 prints plans with the browser-agent prompt Claude gave you (below).
8. **Brent's Cloudflare verification click** (below).

### Decisions
- [x] **Unpaid premium/credits accounts.** 8 accounts have premium or credits without any payment (beta-week sign-ups, Nov 24-28, 2025; one orphan doc `EIV569…` with no Auth user). Keep or revoke? - ANSWER: KEEP
- [x] **Bucket CORS.** Allow GET from `https://biblesketch.app` on the Storage bucket now, or wait for the rebuild (needed before any browser-side image editing; see ROADMAP 1.1). - ANSWER: ENABLED 2026-09-23 (verified: GET from biblesketch.app returns Access-Control-Allow-Origin)
- [x] **"Remove Color" pricing.** Free (rate-limited) or 1 credit (ROADMAP 1.1). - ANSWER: 1 CREDIT (2026-09-23)

### Pinterest auto-publish (ROADMAP 1.5)
- [ ] Connect the feeds (Pinterest > Settings > Bulk create Pins > Auto-publish > Connect RSS feed > pick the board > Save). Pinterest refuses an empty feed, so connect each one on a day it has an item. Done: `christmas.xml` (2026-09-23, Luke 2:15-16 published); `scripture.xml` → Scripture Coloring Sheets | Bible Verse Coloring (2026-09-24 00:01 UTC, by Claude). Next: `https://biblesketch.app/pins/sunday-school.xml` → Sunday School Activities & Bible Coloring Lessons after 2026-09-25 00:00 UTC (8 pm EDT on the 24th). `easter.xml` from Feb 1; `adult.xml` stays unconnected (paused).
- [x] **Verse art translation.** Decided 2026-09-23: keep WEB but print "the LORD" instead of "Yahweh" (`withLord()` in `functions/generation/pipeline.js`). See docs/pinterest-scripture-plan.md §2.
- [ ] **Pinterest API app** "Bible Sketch Pin Publisher" (id 1615048, Trial access since 2026-09-23; redirect URI `https://biblesketch.app/api/pinterest/callback` registered). Done 2026-09-23/24: app secret set, connected in Sandbox, test Pins published, **Standard upgrade requested with the demo video** (`C:\Users\renau\Videos\bible-sketch-pinterest-api-demo-final.mp4`). Waiting on Pinterest (watch the developer email). After Standard: tell Claude; it switches `PINTEREST_ENV` to `production`, you reconnect once at https://biblesketch.app/api/pinterest, then the daily API publisher replaces the RSS feeds.
- [ ] **Decision: AI label on API Pins.** Pinterest's create-Pin call can mark a Pin "AI modified" (`ai_disclosures`). Our pages are AI-generated; Pinterest may label them itself either way. Label them, or not?
- [ ] **Decision: "Free Printable" on the kids' Pin banners** (`web/public/pin-banners/paper.png`, `purple.png`). The first 5 prints are free, then pages cost credits. Keep the wording, or change it (e.g. "Printable Coloring Page")?
- [ ] **Gemini spend alert.** On 2026-09-23 the AI Studio monthly spend cap stopped all generations (customers too) until you raised it. Add a Cloud Billing budget alert on the Gemini project at ~80% of the cap (ROADMAP S1) so it never surprises you.
- [x] **Deploy the drawing guidance** (2026-09-24, run by Claude at the owner's request; verified with a live Genesis 8:11 generation).
- [ ] **Daily Pinterest task (`pinterest-daily`, 7:00 every day):** keep the Claude desktop app open (a missed run happens at the next launch) and the in-app browser signed in to biblesketch.app (master account) and Pinterest. Click "Run now" once on the task (sidebar > Scheduled) and approve its tool prompts, so later runs don't stop on a permission prompt. Raise the Gemini spend cap in AI Studio if a run reports the cap.
- [ ] **Zaraz: fix Pinterest sign-up tracking** (Cloudflare dashboard > Zaraz > Tools > Pinterest Conversions API > the "Signup" action). Skip it if the browser agent already did this.
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
  - [x] Account created (2026-09-24).
    - The API key is in `C:\Users\renau\Coding\BibleSketch-recovered-prod\.env` (as `RESEND_API`). That's outside the project and not in git, but nothing reads it there.
    - Move it into Firebase's secret store: in `C:\Users\renau\Coding\BibleSketch-astro`, run `firebase functions:secrets:set RESEND_API_KEY --project biblesketch-5104c` and paste the key when asked.
    - Then delete that `.env`: a plain-text key in an old folder is one more place to leak.
  - [ ] Verify the sending domain `biblesketch.app` in Resend (Resend can add the Cloudflare DNS records; its return path goes on a `send.` subdomain, and Email Routing keeps receiving mail).
  - **Urgent decision (plan §12.1):** a one-time, honest win-back email to the 85 people who signed up since Mar 26 and never got to make a page (the generator was down Jun-Sep), relying on CASL implied consent. The April sign-ups age out during October. Decided 2026-09-24: the gift is a month of unlimited prints. Still open: the implied-consent basis (a lawyer check is worth it), plus approval of the Worker deploy and the grant script.
  - **Opt-in bonus** (decided 2026-09-24: extra free prints for joining the emails): confirm the number (+5 proposed) and the checkbox wording.
  - [x] **Billing webhook fix deployed** (2026-09-24, owner-approved; revision handlezohowebhook-00137; unsigned calls still 401). Only the Premium plan code grants Premium.
  - [ ] **$1.99 prints-only test (plan §12.20):**
    - decide yes or no, and monthly, annual ($14.99), or both;
    - if yes, create the plan in Zoho Billing (no automation rule is needed yet) and give Claude its plan code;
    - keep it off the pricing page: the offer only goes out by email.
  - Set the secrets yourself (plan §6.5):
    - `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET` as Firebase secrets (`firebase functions:secrets:set <NAME>`);
    - `EMAIL_HOOK_SECRET` (any random value) as both a Firebase secret and a Worker secret (`npx wrangler secret put EMAIL_HOOK_SECRET` in `web/`).
- [ ] **Decisions (plan §11):**
  - the sender name ("Renaud at Bible Sketch"?) and where replies to hello@biblesketch.app go;
  - the mailing address for the CASL footer;
  - the consent checkbox wording and the persona question;
  - the bonus amounts (first purchase, win-back, seasonal, referral);
  - implied consent for the 4 past buyers;
  - is the weekly Thursday page free to print, so it doesn't use up one of the free prints (§12.4)? If not, the checkbox drops "free";
  - the privacy policy update, which Claude drafts for your approval before launch (§6.10);
  - **"go" for phase 0.5 (§10):** the consent checkbox and persona question, the opt-in bonus, and "unlimited prints until". None of it needs Resend yet. It then needs your approval of one Worker deploy and one functions deploy.
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
