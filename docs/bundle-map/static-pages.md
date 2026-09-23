# Static pages: /about, /privacy, /terms, /verified

Source of truth: `hosting-public/assets/index-DHKtGwi1.js` (offsets below are UTF-8 string indexes from
`readFileSync(...,'utf8')`). Server side: `functions/index.js`. Older source: `components/PrivacyPage.tsx`,
`components/TermsPage.tsx`, `components/VerifiedPage.tsx`, `App.tsx:241-289`.

| Route | Client component | Bundle offset | Server function | functions/index.js |
|---|---|---|---|---|
| `/about` | `AU` (AboutSEO, Helmet only) + `Zte` (body) | AU 2012823, Zte 2001716 | `aboutRender` | 2389-2645 |
| `/privacy` | `hq` | 995814 | `privacyRender` | 2650-2890 |
| `/terms` | `pq` | 986633 | `termsRender` | 2895-3079 |
| `/verified` | `Nq` | 1058710 | `verifiedRender` | 3084-3103 |

Route table: bundle ~2020084-2020420. Hosting rewrites: `firebase.json:96-113`.

**Old source vs bundle:** Privacy, Terms and Verified in `components/` match the bundle (same headings, same
"Last Updated" dates, same copy as far as checked). **About exists only in the bundle** (no `AboutPage` in
`components/`, no `/about` route in `App.tsx`). The old `App.tsx` footer (`App.tsx:268-289`) matches the bundle
footer.

---

## 1. Routes and URL behaviour

- All four are exact paths, no params. `onBack` for about/privacy/terms = `navigate("/")` (bundle 2020130-2020320).
- **No query params are read by any of these pages.** `/verified` in particular reads nothing from the URL.
- Global, every route: `Qte()` (bundle 2015499) reads `?epik=` once on app mount (Pinterest click id), see §5.
- Server: every render function starts with `redirectToCanonical(req,res)` (`functions/index.js:570-579`):
  301 to `https://biblesketch.app` when the host is a Firebase host (`WRONG_HOSTS`) and the request did not
  come through Cloudflare (`cf-ray`); 301 to the path with empty segments removed (so `/about/` -> `/about`,
  `//about` -> `/about`), query string preserved. Redirect Cache-Control `public, max-age=300, s-maxage=3600`.
- Client: `functions/index.html` head script also `location.replace`s `*.web.app` / `*.firebaseapp.com` to
  biblesketch.app.
- 404: the React router has **no `*` route** (routes end at `/blog/:slug`, bundle 2020734). Not relevant to these
  four fixed paths; unknown paths are handled by Hosting rewrites (other agent's area).
- Canonical: only `/about` has one (`https://biblesketch.app/about`, both client and server). `/privacy`,
  `/terms`, `/verified` have none on either side.
- Sitemap (`functions/index.js:414,429`): `/about` is in the `pages` sub-sitemap (no lastmod); `/terms`,
  `/privacy`, `/verified` are deliberately excluded (noindex).
- ScrollTo(0,0) on every pathname change (App shell `ene` 2016039, effect at 2016091).

## 2. `<head>`

Base template `functions/index.html` head: `<base href="/">`, `robots=max-image-preview:large`, default title
"Bible Sketch Platform", favicons, manifest, fonts, the aggregateRating-stripping MutationObserver, then the
bundle script + `index-B89PR4wM.css`. Render functions replace `<title>` and insert extra tags before `</head>`.
Zaraz is injected by Cloudflare, not in the template.

### /about
| | Client (Helmet `AU`, 2012823) | Server (`aboutRender`, 2401-2480) |
|---|---|---|
| title | `About Bible Sketch - Our Story & Mission \| Free Bible Coloring Pages` | same |
| description | `Meet Renaud, founder of Bible Sketch. Learn how we create AI-powered Bible coloring pages for Sunday School, VBS, and homeschooling families.` | same |
| canonical | `https://biblesketch.app/about` | same |
| og:title | `About Bible Sketch - Our Story & Mission` | same |
| og:description / og:type / og:site_name / og:url / og:locale | description / `website` / `Bible Sketch` / canonical / `en_US` | same |
| og:image / og:image:alt | `https://biblesketch.app/logo.png` / `Bible Sketch Logo` | same |
| twitter:card | **`summary_large_image`** | **`summary`** (mismatch) |
| twitter:title/description/url/image | same values as og | same |
| robots | none (inherits template `max-image-preview:large`) | same |
| JSON-LD | `@graph`: Person (Renaud Gagne, Founder, description, knowsAbout[6], worksFor Org), Organization (url, name, description, founder, logo ImageObject `/logo.png`, contactPoint email `support@biblesketch.com` "Customer Service"), WebPage (`@id`=url=`/about`, name "About Bible Sketch", description, isPartOf WebSite) | identical object (`functions/index.js:2407-2461`), serialised with `jsonLd()` |

`Dt` = site origin constant `https://biblesketch.app`.

### /privacy (client `hq` 995814, server 2662-2672)
- title `Privacy Policy - Bible Sketch`
- description `Read the Privacy Policy for Bible Sketch. Learn how we collect, use, and protect your data when using our Bible coloring page generation service.`
- og:title `Privacy Policy - Bible Sketch`, og:description `Read the Privacy Policy for Bible Sketch.`, og:type `website`
- `robots: noindex, follow`
- No canonical, no og:url/og:image, no twitter tags, no JSON-LD. Client and server identical.

### /terms (client `pq` 986633, server 2907-2916)
- title `Terms of Service - Bible Sketch`
- description `Read the Terms of Service for Bible Sketch. Learn about our policies for creating and using Bible coloring pages, credits, subscriptions, and AI-generated content.`
- og:title `Terms of Service - Bible Sketch`, og:description `Read the Terms of Service for Bible Sketch.`, og:type `website`
- `robots: noindex, follow`. Otherwise as privacy. Client and server identical.

### /verified
- Client `Nq` has **no Helmet**: on direct load the title stays whatever the server sent; after SPA navigation
  it keeps the previous page's Helmet title.
- Server (`functions/index.js:3094`): only replaces title with `Email Verified | Bible Sketch`, sends header
  `X-Robots-Tag: noindex`. No meta description, no body content.

### Head oddities
- Server-injected tags carry no `data-rh`, so Helmet does not replace them: after hydration /about has the
  description, canonical, og/twitter tags and JSON-LD **twice** (server copy + Helmet copy), privacy/terms
  have description/og/robots twice. Harmless for Google but noisy; the rebuild renders them once.
- The template's `robots=max-image-preview:large` sits beside `noindex, follow` on privacy/terms (two robots
  metas; combined meaning is fine).

## 3. Page structure

Shared shell (App `ene`): header `a5` (nav buttons incl. "About" -> `/about`, `currentView="about"` highlights
it, bundle 257346/2018628), `<div class="flex-grow">` routes, footer. Footer (bundle ~2021100):
`© {year} Bible Sketch. All rights reserved.` + **`<button>`s** "Terms of Service" -> `/terms`, "Privacy Policy" ->
`/privacy` (onClick navigate, not links). No footer link to /about.

Legal/about layout: `max-w-4xl mx-auto px-4 py-12`, "Back to Home" `<button>` (lucide `arrow-left` = `Wi`,
bundle 235247) calling `onBack` -> `/`, then a white card `rounded-3xl p-8 md:p-12`, body in
`prose prose-purple ... space-y-8`. Headings: h1 `font-display text-3xl md:text-4xl`, h2 `font-display text-2xl`,
h3 `font-bold text-lg`. About wraps everything in an extra `min-h-screen bg-[#FFF7ED]` div.

Server HTML: a plain `<article style="max-width:896px...">` with the same text (inline styles, no Back button),
followed by a `<script>` that empties `#root` before React mounts. The server copy was checked heading by heading
against the bundle and matches (about: `functions/index.js:2483-2605`; privacy 2675-2860; terms 2920-3040).

### /about (Zte, 2001716) - bundle only
Intro (`<header>`): h1 **About Bible Sketch**; lead paragraph starting with a bold "Bible Sketch is an AI-powered
platform that generates custom, free printable Bible coloring pages instantly."

| h2 | Content outline |
|---|---|
| Our Story | Photo `<img src="/about-Renaud.webp" alt="Renaud Gagne, founder of Bible Sketch">` floated right on md (`md:float-right md:max-w-xs`), no width/height attrs (CLS risk). P1 begins "Hi, I'm **Renaud Gagne**, the founder of Bible Sketch." (father of four, homeschooling, "chaos hour"). P2 begins "I built Bible Sketch because I needed a way to channel that energy..." with external links `https://dioceseofcanada.ca/gods-big-story` ("God's Big Story") and `https://www.sttimothysabc.org/` ("St. Timothy's Anglican Bible Church"), both `target=_blank rel="noopener noreferrer"`. P3 (`md:clear-right`) begins "My core philosophy is simple: **"Slowness is sacred."**" (Verse Art / GRACE tracing example). |
| Our Mission | "Bible Sketch exists to solve a common problem for ministry leaders and parents: finding specific artwork for specific Bible verses." Then list: **Scene Art** (storytelling; Sunday School, VBS), **Verse Art** (typography, memorisation). Then values: biblical accuracy, educational development, accessibility. |
| What Makes Bible Sketch Different | "The platform utilizes generative AI to interpret biblical text and render it into high-resolution line art suitable for printing." List by complexity: Toddlers (Ages 2-4), Children (Ages 5-10), Teens (Ages 11-17, "Comic Book"), Adults (18+, stained glass / fine art). Closing: "creating a page takes approximately 30 seconds... Download the PDF for high-quality printing." |
| Trust & Accuracy | "Look, I'm a dad, and I'm protective of what my kids see." ... "**Trust, but verify.**" Then guardrails disclaimer; then "Content generated on Bible Sketch is cleared for use in non-commercial ministry settings... Churches can print unlimited copies for their classes." |
| Who Uses Bible Sketch? | three h3: **For Sunday School and VBS** ("Teachers can generate materials that align perfectly with their specific curriculum."), **For Homeschooling** ("Parents can integrate art into Bible history or scripture memorization."), **For Personal Devotion** ("Many adults use the tool to create "Bible journaling" pages."). |
| Get in Touch (border-top) | "Have questions? We'd love to hear from you." Support: `mailto:support@biblesketch.com`; General Inquiries: `mailto:hello@biblesketch.app`. Closing paragraph "You don't need another subscription that you'll forget to use..." |
| Ready to Get Started? (border-top) | Four **`<button>`s** (onClick `navigate`): "Try Scene Art" -> `/`, "Try Verse Art" -> `/bible-verse-coloring`, "View Pricing" -> `/pricing`, "Read Our Blog" -> `/blog`. Server version uses real `<a href>` joined with ` \| `. |

### /privacy (hq, 995814) - "Last Updated: November 26, 2025"
h1 **🔒 Bible Sketch: Privacy Policy**. Intro: "Welcome to **Bible Sketch** ("we," "our," or "us"). This Privacy
Policy explains how we collect, use, disclose, and safeguard your information..." then `<hr>`.

1. **Information We Collect** - h3 1.1 Personal Information ("When you create an account or make a purchase, we may collect:" Account Information / Payment Information (Zoho Billing) / Generated Content); h3 1.2 Automatically Collected Information (Device Information / Usage Data / IP Address / Cookies, "See Section 3").
2. **How We Use Your Information** - "We use the information we collect to:" 7 bullets (operate service ... "Deliver targeted advertising and measure ad effectiveness.").
3. **Cookies and Tracking Technologies** - "We use cookies and similar tracking technologies..."; h3 3.1 Google Analytics 4 (link `https://tools.google.com/dlpage/gaoptout`), 3.2 Facebook Pixel (link `https://www.facebook.com/settings/?tab=ads`), 3.3 Pinterest Tag (link `https://www.pinterest.com/settings/privacy`), 3.4 Managing Cookies.
4. **Payment Processing** - "All payment transactions are processed through **Zoho Billing**..." 3 bullets, link `https://www.zoho.com/privacy.html`.
5. **Data Sharing and Disclosure** - "We may share your information in the following circumstances:" Service Providers / Legal Requirements / Business Transfers / With Your Consent; "We do **not** sell your personal information to third parties."
6. **Data Security** - "We implement appropriate technical and organizational measures..."
7. **Your Rights and Choices** - "Depending on your location, you may have certain rights..."; h3 7.1 Access and Portability, 7.2 Correction, 7.3 Deletion, 7.4 Opt-Out of Marketing, 7.5 Opt-Out of Tracking.
8. **Data Retention** - "We retain your personal information for as long as your account is active..."
9. **Children's Privacy** - "Bible Sketch is not intended for children under the age of 13." Contact `mailto:hello@biblesketch.app`.
10. **International Data Transfers** - "Your information may be transferred to and processed in countries other than your own."
11. **Changes to This Privacy Policy** - "We may update this Privacy Policy from time to time."
12. **Contact Us** - "If you have any questions about this Privacy Policy..." `mailto:hello@biblesketch.app`.

All external links `target=_blank rel="noopener noreferrer"`.

### /terms (pq, 986633) - "Last Updated: November 19, 2025"
h1 **⚖️ Bible Sketch: Terms of Service**. Intro: "Welcome to **Bible Sketch** ("we," "our," or "us"). By creating an
account, purchasing credits, or using our AI generation services, you agree to these legally binding Terms of
Service." then `<hr>`.

1. **Scope of Service** - "By using Bible Sketch, you agree that you are at least 18 years old (or a parent/guardian consenting on behalf of a minor)."; h3 1.1 Defined Artistic Scope: "exclusively" three styles: Sunday School, Stained Glass, Iconography.
2. **Intellectual Property & Rights** - h3 2.1 User Ownership ("you own the images you generate"; commercial use allowed), 2.2 License Grant to Bible Sketch (perpetual worldwide licence; 3 bullets), 2.3 Public Gallery License (view/download/print/"Remix").
3. **Payment Terms** - h3 3.1 Credit System ("Bible Sketch operates on a pre-paid credit basis."; No Expiration; Final Sale), 3.2 Quality Disputes (single-credit refund at discretion, report within 24 hours).
4. **User Conduct & Prohibited Content** - "You agree NOT to use Bible Sketch to generate:" ordered list of 3; **Termination** paragraph.
5. **DISCLAIMERS & LIMITATION OF LIABILITY** - bold "PLEASE READ THIS SECTION CAREFULLY."; h3 5.1 No Liability for AI Output ("Hallucinations"), 5.2 No Guarantee of Accuracy, 5.3 Copyright Enforceability.
6. **General Limitation of Liability** - "To the maximum extent permitted by law, the Bible Sketch service is provided "AS IS" and "AS AVAILABLE.""
7. **Contact Information** - "For legal inquiries regarding these Terms, please contact:" **support@biblesketch.com** (bold text, **not a mailto link**).

### /verified (Nq, 1058710)
No Back button, no Helmet. Centered card `min-h-[80vh]`, gradient top bar (#FCD34D -> #7C3AED -> #FCD34D),
bouncing 🎉 circle.
- h1 **Congratulations!**; p "Your email has been verified successfully."
- Box h3 **Your Free Account Includes:** (uppercase), list:
  - 🎨 **5 Free Credits** - "To create your own custom coloring pages from any Bible verse."
  - 🖨️ **5 Downloads or Prints** - "High-quality exports of any creation you find on the website."
  - ❤️ **Bless & Save** - "Like ("Bless") and save your favorite creations to your personal collection."
- `<button>` **Start Creating Now** -> `navigate("/")`.

## 4. Interactive behaviour

- about/privacy/terms: only "Back to Home" (button -> `/`) and, on about, the four CTA buttons. No forms, no
  modals, no auth gating, no loading/empty/error states (all content is static JSX).
- /verified: one button -> `/`. **It is not the Zoho return page.** It is the `continueUrl` of Firebase email
  verification: registration `N8` (bundle 843349) calls `sendEmailVerification(user, {url: origin + "/verified"})`.
  Flow: user clicks the email link -> Firebase's hosted action handler verifies -> its "Continue" goes to
  `/verified`. The page does not check `emailVerified`, does not sign the user in, reads no `oobCode`/`mode`.
  Registration signs the user out right after sending the email (`Rm(Ht)` = `signOut`), and `L8` (bundle
  845814) signs out any non-Google user whose email is unverified, so the visitor lands on /verified signed out
  and must log in (`I8`, bundle 843609, which rejects unverified users with `auth/email-not-verified`).
- Zoho checkout returns to **`/pricing?subscription=success`** or **`/pricing?purchase=<plan>`** (App `D`, plan URLs at bundle 2017051,
  `redirect_url`), handled by `fq` (pricing agent's area), not /verified.
- The sign-up form's "I agree to the Terms of Service" checkbox (auth modal `lq`, bundle 975675) shows
  "Terms of Service" as a `<span>`, **not a link** to /terms.

## 5. Backend contract

- These four pages make **no Firestore reads/writes, no Storage access, no callable calls, no fetches**.
- Relevant data behind the /verified copy: the user doc is created client-side by `uS` (bundle 841746) with
  `credits: 5, downloadsRemaining: 5, isPremium: false, blessedSketchIds: [], profileComplete, createdAt` and a
  `"Welcome Bonus"` +5 transaction via lazily imported `transactions-CpWNcXvd.js`. The copy "5 Free Credits /
  5 Downloads or Prints" mirrors those defaults. See ROADMAP 1.1 (email sign-up write race: doc created later
  without the Welcome Bonus for 62 of 182 users).
- Global storage touched on every page load (App `Qte`, bundle 2015499): if `?epik=` present, cookie
  `_epik=<value>; max-age=604800; path=/; SameSite=Lax` and `localStorage.pinterest_epik =
  {"value","expiry": now+7d}`. Also `localStorage.anon_auth_disabled` (auth code, not these pages).
- External URLs on these pages: listed in §3 (two about links, four privacy links, mailto addresses).

## 6. Tracking

- **None of the four pages calls `zaraz.track`, `zaraz.ecommerce` or any Pinterest function.** /verified fires
  no sign-up/conversion event (the sign-up event is fired in the auth modal `lq`, bundle 964768: `zaraz.track("CompleteRegistration",{em,external_id})` for Google sign-up).
- Page views are whatever Cloudflare Zaraz auto-collects (not visible in the bundle). Pinterest `epik` capture
  is global (§5).

## 7. Known bugs and oddities

1. /verified claims the email is verified without checking anything; any visitor to `/verified` sees
   "Congratulations!". And the user is signed out on arrival, but the CTA says "Start Creating Now" and drops
   them on `/` with no login prompt.
2. /verified has no Helmet title; SPA navigation leaves the previous page's title.
3. twitter:card on /about: server `summary`, client `summary_large_image` with a square logo image.
4. Duplicate head tags after hydration (server tags + Helmet tags), §2.
5. Contact emails are split across domains: `support@biblesketch.com` (about, terms, Organization JSON-LD) vs
   `hello@biblesketch.app` (about, privacy). Terms shows the .com address as plain text, not a link. Whether
   `biblesketch.com` mail is received is unknown (open question).
6. Terms 1.1 says the service generates "exclusively" three styles (Sunday School, Stained Glass,
   Iconography); the app has six (`functions/index.js:219`: + Comic Book, Classic, Doodles) plus Verse Art
   typography. Terms says users must be 18+ while Privacy says "not intended for children under 13" and About
   targets families; legal text may need an owner review (not a code fix).
7. About says Verse Art is part of the product and "Download the PDF"; downloads today are images (ROADMAP 1.2
   plans PDF print). Content claim vs behaviour.
8. Footer, Back-to-Home, About CTAs and header nav are `<button onClick=navigate>`: no crawlable internal links
   in the client DOM (server HTML for /about does have `<a href>`s, but it is wiped on boot).
9. `about-Renaud.webp` has no width/height (layout shift when it loads); the terms/privacy "Last Updated"
   dates are hard-coded strings.
10. /verified's "5 Free Credits" depends on the client-side user doc creation that sometimes fails (ROADMAP 1.1).

## 8. Rebuild notes

- All four pages are **fully static Astro pages, zero islands** (the shared header auth widget is the only
  island, owned by the shell). Prerender them at build time; no request-time data.
- Port copy from the bundle text above (or from `functions/index.js` server HTML, which matches and is already
  plain HTML: about 2483-2605, privacy 2675-2860, terms 2920-3040). Keep h1/h2/h3 hierarchy.
- Use real `<a href>` for Back to Home, About CTAs, footer Terms/Privacy (add About to the footer), and link
  "Terms of Service" in the sign-up checkbox to `/terms` (and Privacy).
- Head: /about keeps title, description, canonical, og/twitter (pick one twitter:card; `summary` fits the
  square logo, or use `/og.png` with `summary_large_image`) and the Person/Organization/WebPage JSON-LD.
  Privacy/terms: `noindex, follow`, add a self canonical. /verified: `noindex` (meta and/or `X-Robots-Tag`),
  title `Email Verified | Bible Sketch`.
- Cache: current server sends `public, max-age=3600, s-maxage=86400`; static assets on Workers can be cached
  longer.
- Trailing-slash and wrong-host 301s must be reproduced in the Worker (Astro `trailingSlash: 'never'` plus a
  redirect) so `/about/` does not become a duplicate URL.
- /verified: better as a real verification page. Option A (small): keep static copy, add a "Log in" CTA that
  opens the auth modal, since the user is signed out. Option B (ROADMAP 1.3): custom email action handler that
  applies the `oobCode` (`applyActionCode`) and signs the user in; needs a Firebase console change (owner).
- Assets: `public/about-Renaud.webp` (69,862 B; also in `hosting-public/`), `/logo.png` (408,845 B, og/twitter
  and JSON-LD image; `web/public/` currently has only `logo.webp`, so copy `logo.png` or change the og image),
  `/og.png` (5.87 MB, too large for an og image if used). Fonts already in `web/public/fonts`.
- Risk: legal copy is a contract with paying customers; port it verbatim, keep "Last Updated" dates unless the
  owner changes the text.
