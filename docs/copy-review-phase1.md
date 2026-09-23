# Copy changes in rollout phase 1: owner review

Nothing here goes live until you approve it. After approval: set the real go-live date as `LAST_UPDATED` in
`web/src/pages/privacy.astro` and `web/src/pages/terms.astro` (currently a draft date, September 23, 2026).
Pages: `/about`, `/privacy`, `/terms` on https://biblesketch-web.supersonicworkers.workers.dev (preview; the
live site is unchanged).

**Needs your answer** is marked ❓.

## Everywhere
- Contact: every `support@biblesketch.com` becomes **hello@biblesketch.app** (your decision). Terms §7 now has
  a clickable email link (it was plain text).

## About (`/about`)
| Where | Live today | New |
|---|---|---|
| What Makes Bible Sketch Different, last paragraph | "Based on our analysis of user workflows, creating a page takes approximately 30 seconds. You select your tool, input the scripture, define the audience, choose an art style, and generate. Download the PDF for high-quality printing." | "Creating a page takes about a minute. You select your tool, enter the scripture, choose the audience and an art style, and generate. Then download or print your page." (downloads are images today; the PDF print is ROADMAP 1.2. The Verse Art page itself says "60s to generate") |
| Get in Touch | Support: support@biblesketch.com / General Inquiries: hello@biblesketch.app | Email: hello@biblesketch.app |
| Organization JSON-LD | contactPoint support@biblesketch.com | hello@biblesketch.app |

## Privacy Policy (`/privacy`)
Based on what the site actually runs (checked 2026-09-23 in a browser: Zaraz loads GA4 and the Facebook Pixel,
Pinterest works through the `_epik` click id).

| Section | Live today | New |
|---|---|---|
| 1.1 Account Information | "…profile picture (if provided via Google Sign-In)" | "…profile picture (one you upload, or the one provided by Google Sign-In)" (you can upload a photo) |
| 1.1 Payment Information | "…purchase credits…We do not store your full credit card number or payment credentials on our servers." | "…purchase credits or a subscription…We do not see or store your card number or payment credentials." |
| 1.1 Generated Content | "The images you create and any prompts or settings you use." | "The images you create and the Bible verses, prompts, and settings you use." |
| 3 (new paragraph) | none | The tools are loaded through **Cloudflare Zaraz**, mostly server-side, with first-party cookies (`cfz_google-analytics_v4`, `cfz_facebook-pixel`); cookies also keep you signed in. |
| 3.3 | "Pinterest Tag … measure conversions … build audiences" | "Pinterest": measures conversions from Pinterest ads; the `_epik` click id is stored for 7 days. (There is no Pinterest tag script on the site.) ❓ Do you use Pinterest audiences? If yes, say so here. |
| 3.4 | "…some features may not function properly." | adds "(for example, staying signed in)" |
| 4, 2nd bullet | "We receive only limited information (such as the last four digits of your card, transaction ID, and payment status)" | "…which plan or credit pack you bought, the subscription or transaction ID, its status, and the account it belongs to." (what the billing webhook actually receives; no card digits) |
| 5 Service Providers | "(payment processing, analytics, advertising)" | Names them: Google Firebase (accounts, database, image storage), Google Gemini API (your verses/prompts/settings are sent to generate images), Cloudflare (hosting, security, analytics tools), Zoho Billing. |
| 7.1 | "You can request a copy…" | adds "by emailing us (Section 12)" |
| 7.2 | "…through your profile settings." | "You can update your display name and profile photo directly in Profile Settings." |
| 7.3 | "You can request deletion of your account and associated data." | "You can delete your account at any time in Profile Settings. This removes your sign-in, your profile, and the images stored in your account." (what the app does today) ❓ Today it deletes the images but leaves the sketch records; decide in CHECKLIST whether that should change. |
| 9 | "not intended for children under the age of 13" | adds "and children under 13 may not create an account" (matches Terms §1) |
| 12 | "please contact us at:" + link | same, one line |

## Terms of Service (`/terms`)
| Section | Live today | New |
|---|---|---|
| Intro | "By creating an account, purchasing credits, or using…" | "…purchasing credits or a subscription, or using…" |
| 1 | "at least 18 years old (or a parent/guardian consenting on behalf of a minor)" | "at least 18 years old, or a parent or guardian consenting on behalf of a minor who is at least 13. Children under 13 may not create an account." (the old text contradicted Privacy §9) |
| 1.1 | "designed **exclusively** for … three specific artistic styles: Sunday School, Stained Glass, Iconography" | "a specialized tool for creating Christian coloring pages from Bible verses, in the styles offered in the app. Currently these are: Scene Art in six styles (Sunday School, Stained Glass, Iconography, Comic Book, Classic, Doodles) and Verse Art in four lettering styles (Elegant Script, Modern Brush, Playful, Classic Serif)." |
| 1.1, last paragraph | "…photorealistic imagery, modern art styles, non-biblical content…" | drops "modern art styles" (Doodles and Modern Brush are modern) |
| 2.3 | "…view, download, print, and "Remix" (create variations of) that content." | "…view, download, print, and save that content to their own collections." (there is no remix feature) |
| 3.1 title + text | "Credit System: Bible Sketch operates on a pre-paid credit basis." | "Credits and Premium": adds "You can also subscribe to the optional Premium plan, billed monthly through Zoho Billing, and cancel it at any time from the receipt portal." ❓ Confirm customers can cancel from the Zoho portal (Account > Receipt Portal), and whether you want to state the price or what Premium includes. |
| 5 | "PLEASE READ THIS SECTION CAREFULLY." | same, now bold |
| 7 | "support@biblesketch.com" (plain text) | hello@biblesketch.app (link) |

## Verified page (`/verified`)
Adds a **Log In** button next to "Start Creating Now" (visitors arrive signed out after clicking the email link).
Copy unchanged.
