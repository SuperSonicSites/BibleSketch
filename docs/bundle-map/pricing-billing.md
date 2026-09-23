# /pricing and billing: live bundle map

Source of truth: `hosting-public/assets/index-DHKtGwi1.js` (offsets below are UTF-16 string indexes from `readFileSync(...,'utf8')`).
Older source for naming: `App.tsx`, `components/PricingPage.tsx`, `components/PremiumModal.tsx`, `components/ProfileModal.tsx`.
Server: `functions/index.js` (`pricingRender` :2223, `handleZohoWebhook` :3177), `firebase.json` :92.

Minified names in this area:

| Name | Offset | What it is |
|---|---|---|
| `fq` | 1010018 | Pricing page (`PricingPage`) |
| `D` (inside `ene`) | ~2017400 | `handlePlanSelection`: builds the Zoho checkout URL, fires AddToCart |
| `X` / `Y` (inside `ene`) | ~2017200 | `requireAuth(action, view)` / `requireAuth(action,'login')` |
| `KP` | 901488 | Upgrade modal (`PremiumModal`), opened when downloads run out |
| `dq` | 985915 | Generic error modal, used for "Out of Credits" |
| `cq` | ~977000 | Profile/Account modal: plan, credits, downloads, Zoho portal link |
| `a5` | 255277 | Header: "Pricing", "Buy Credits", "Claim Free Credits" |
| `Ec` | ~839700 | `checkDownloadPermission(uid)` |
| `fm` | ~839900 | `deductDownload(uid)` (client transaction) |
| `ig` | 845836 | `deductCredits(uid, n, description)` (client transaction) |
| `ol` / `R8` | ~846900 | `getUserProfile` (getDoc) / `subscribeToUserProfile` (onSnapshot) |
| `uS` | ~840700 | user doc create/sync (5 credits, 5 downloads, Welcome Bonus) |
| `transactions-CpWNcXvd.js` | separate chunk | `addTransaction(uid, {...})` → `users/{uid}/transactions` |
| `ua` | — | react-helmet-async `Helmet` |
| `W_` | — | `useSearchParams` |
| `ot` | — | `Button` (ui) |
| icons `Bi` `Q_` `uc` `Fr` `L4` `Wi` `h4` | — | lucide icons (Sparkles/Flame?/Crown/Check/CheckCircle/ArrowLeft/HelpCircle); exact mapping not needed |

## 1. Routes and URL behaviour

- Route: `<Route path="/pricing" element={<fq onBack={()=>navigate('/')} onSelectPlan={D} isPremium={user?.isPremium||false} userEmail={user?.email} userId={user?.uid}/>}>` (offset ~2019880). Same as `App.tsx:233`.
- No `*` catch-all route exists in the router (offset ~2019400–2021000): an unknown path renders the header/footer with an empty body, no 404 page. Not pricing-specific, but `/pricing/` and `/pricing/x` fall through to it on the client.
- Hosting: `firebase.json:92` rewrites exactly `/pricing` to `pricingRender`. Anything else (`/pricing/`, `/pricing/foo`) hits the `**` → `/index.html` rewrite (SPA shell, no pricing meta).
- `pricingRender` first calls `redirectToCanonical(req,res)` (`functions/index.js:570`): 301 to `https://biblesketch.app` when the host is a Firebase host without `cf-ray`, and collapses duplicate/trailing slashes within a path hit by this function. Query string is preserved.
- Query params read by `fq` (offset 1010100–1011100):
  - `?subscription=success` → premium success banner + Purchase events.
  - `?purchase=spark|torch|beacon` → pack success banner + Purchase events. Other values are ignored.
  - `?order_id=` → used as `order_id`/`event_id` in tracking if present. Our own `redirect_url` never includes it; it only appears if Zoho appends it (old comment `PricingPage.tsx:26` says Zoho passes `%SubscriptionID%`; unverified).
  - After handling, `setSearchParams({})` strips all params (history replace? no: `setSearchParams` pushes by default in RR6, so Back returns to the `?purchase=` URL and re-fires the events; see §7).
- Canonical: server emits `<link rel="canonical" href="https://biblesketch.app/pricing">`. Client Helmet emits none (§2).
- No redirects to/from pricing in the client other than `KP`'s `window.location.href="/pricing"` (full page load, not SPA navigation).

## 2. `<head>`

| Tag | Client Helmet (`fq`, offset ~1011950) | Server `pricingRender` (`functions/index.js:2236–2256`) |
|---|---|---|
| title | `Pricing - Affordable Bible Coloring Page Credits \| Bible Sketch` | same |
| description | "Get credits to create custom Bible coloring pages. Subscribe monthly or pay once — your credits never expire. Perfect for Sunday School teachers, homeschool families, and church ministries. Plans start at $4.99." | same text |
| canonical | **missing** | `https://biblesketch.app/pricing` |
| og:title | same as title | same |
| og:description | description without "Plans start at $4.99." | full description |
| og:type | `website` | `website` |
| og:url | **missing** | `https://biblesketch.app/pricing` |
| og:site_name | missing | `Bible Sketch` |
| og:image | **missing** | `https://biblesketch.app/logo.png` |
| twitter:card | `summary_large_image` | `summary` (**mismatch**) |
| twitter:title | same as title | same |
| twitter:description | "Get credits … pay once — your credits never expire." (short) | full description (**mismatch**) |
| twitter:image | missing | `https://biblesketch.app/logo.png` |
| JSON-LD | none | none |
| robots | none (indexable) | none |

- Server tags are plain tags inserted before `</head>`; Helmet adds its own `data-rh` tags after boot and does not remove the server ones, so the hydrated head carries duplicate og/twitter tags with conflicting `twitter:card`. The static `<title>Bible Sketch Platform</title>` in `functions/index.html:9` is replaced by the server.
- No `Product`/`Offer` structured data anywhere, despite fixed prices. Rebuild opportunity.
- Server copy says Premium is `$4.99 / month` (`functions/index.js:2269`), same as the client. The real Zoho plan is $7/month (memory `zoho-billing.md`, ROADMAP.md:48).

## 3. Page structure (client `fq`, offsets 1011950–1019500)

Wrapper `div.max-w-7xl mx-auto px-4 py-12 md:py-20`. In order:

1. **Success banner** (only when `showSuccess`): green box, `h3` title + `p` subtitle.
   - Premium: "Welcome to Premium! 🎉" / "Your subscription is being activated. Features will unlock momentarily."
   - Pack: "Credits Added! 🎉" / "`{n}` credits + `{n}` bonus prints have been added to your account." (n = 20/80/200). Auto-hides after 8 s.
2. **Premium member banner** (when `isPremium && !showSuccess`): purple box, `h3` "You're a Premium Member!", "Enjoy unlimited downloads & prints.", real `<a href="https://billing.zohosecure.ca/portal/biblesketch" target="_blank" rel="noopener noreferrer">Manage Subscription →</a>`.
3. **Back button**: `<button onClick={onBack}>` "Back to Home" (navigates `/`). Should be `<a href="/">`.
4. **Hero**: `h1` "Pricing That Fits Your Needs"; `p` "Subscribe monthly or buy credits once — either way, your credits never expire."
5. **Premium card** (full width, purple gradient, "Best Value" pill): `h3` "Premium Plan", "For dedicated teachers & ministries", price "$4.99 / month" (hard-coded), 4 check items: "Unlimited Downloads & Prints", "10 Credits Per Month Included", "High-Res PDF Download", "No Watermark". Button "Get Premium" → `onSelectPlan('premium', 4.99, 10)`; when `isPremium`: disabled, label "Current Plan", caption "Thank you for your support!" (else "Cancel anytime").
6. **Divider**: "Or Pay As You Go".
7. **Pack grid** (3 columns md+), data array `g` (offset ~1011450):

| id | name | price | credits | $/image | savings | audience | button | variant | highlight |
|---|---|---|---|---|---|---|---|---|---|
| spark | The Spark | 4.99 | 20 | 0.25 | — | For a single lesson series | Get Spark Pack | outline | no |
| torch | The Torch | 14.99 | 80 | 0.19 | 25% | For families & devotionals | Get Torch Pack | primary | yes ("Most Popular", `md:-mt-8`, `md:scale-110`) |
| beacon | The Beacon | 29.99 | 200 | 0.15 | 40% | For Ministry Directors | Get Beacon Pack | secondary | no |

   Each card: icon, `h3` name, italic audience, "$price / one-time", chips "`n` Credits" and "+ `n` Free Prints ✨", "($x.xx / image)", "Save N% instantly" (spark renders a transparent placeholder "Save 0% instantly" for alignment), 4 check items: "High-Res PDF Download", "No Watermark", "Private Mode", "Commercial Rights". Button → `onSelectPlan(id, price, credits)`. Pack buttons stay enabled for premium users.
8. **FAQ** (`h2` "Frequently Asked Questions", three `h3` + `p`): "Do these credits expire?", "Can I print these for my whole Sunday School class?", "Should I subscribe or buy a credit pack?" (answers identical in server HTML). No FAQPage schema.
9. **Footer note**: "Payments are securely processed. Need help? Contact support@biblesketch.com" (plain text, not a mailto link).

No images besides icons. The only real link on the page is the Zoho portal link (premium users only).

Server HTML (`functions/index.js:2259–2345`) has the same copy in a simplified inline-styled `<article>`: `h1`, `section` Premium (`h2`), `section` "Or Pay As You Go" (`h2`) with three `h3` packs, FAQ `section`. Differences: server uses "20 Credits (+ 20 Free Prints)" and "($0.19 / image) - Save 25% instantly"; no buttons; no back link. It is followed by an inline `<script>` that empties `#root` immediately (`:2347`), so humans never see it; crawlers without JS do.

Old source (`components/PricingPage.tsx`) matches the bundle structure and copy; differences are only in tracking (§6).

## 4. Interactive behaviour

### Plan buttons → `onSelectPlan` = `D` in `ene` (offset ~2017400; old `App.tsx:128–170`)

```
D(planId, price, credits) = requireAuth(() => {
  if (!user?.uid) { console.error("No authenticated user"); return }
  base = ZOHO[planId]               // unknown id → console.error, return
  qs   = planId==='premium' ? 'subscription=success' : `purchase=${planId}`
  url  = base + (base.includes('?')?'&':'?')
         + 'cf_cf_firebase_uid=' + encodeURIComponent(uid)
         + '&redirect_url=' + encodeURIComponent(`${location.origin}/pricing?${qs}`)
  zaraz.ecommerce('Product Added', …); zaraz.track('AddToCart', …)   // §6
  window.location.href = url
}, 'signup')
```

Zoho hosted-page URLs (Zoho Billing, Canada DC `billing.zohosecure.ca`), identical to `App.tsx:137–140`:

| plan | URL |
|---|---|
| premium | `https://billing.zohosecure.ca/subscribe/c4eda214b750306200eded5d860ee14ac337b81ca6421fdb875baa1a2a7b3c2f/bible-sketch-premium` |
| spark | `https://billing.zohosecure.ca/subscribe/c4eda214b750306200eded5d860ee14af89aa6dc60075c271e442233279cd445/Spark?addon_code%5B0%5D=20credits&addon_quantity%5B0%5D=20` |
| torch | `https://billing.zohosecure.ca/subscribe/c4eda214b750306200eded5d860ee14af01b06f31285bf8e05af38a9b0c1e6f3/Torch?addon_code%5B0%5D=80credits&addon_quantity%5B0%5D=80` |
| beacon | `https://billing.zohosecure.ca/subscribe/c4eda214b750306200eded5d860ee14a60094b8252300a63400de1ca08bc5eda/200credits?addon_code%5B0%5D=200credit&addon_quantity%5B0%5D=200` |

A pack is a $0 plan plus a one-time add-on (`addon_code[0]`, quantity = credits). Beacon plan code `200credits` vs add-on code `200credit` is intentional (memory `zoho-billing.md`).

### Auth gating
- `X(action, view)` (offset ~2017150): if `user && profileLoaded` run now; else store `pendingAction` and open auth modal `lq` in `view` ('signup' for plans). An effect runs `pendingAction` once `user && profileLoaded` become true.
- **Bug**: the stored closure captured `user = null`, so after sign-up/login it hits `if(!user?.uid) return` and nothing happens. A logged-out visitor must click the plan again after signing in. Same in `App.tsx:128`.
- `user` = Firebase auth user merged with the live `users/{uid}` snapshot (`R8`); `isPremium` updates live after the webhook lands. Anonymous users count as logged out.
- Email/password users must verify email; unverified non-Google users are signed out by `L8` (offset ~845900), so a new email sign-up cannot check out until verified (`/verified` return page, `Nq`).

### Success return (`useEffect` in `fq`, deps `[searchParams, setSearchParams]`)
- Fires purely from the query string: no Firestore read, no check that a webhook/credit grant happened. Anyone can open `/pricing?purchase=beacon` and see "Credits Added!" and fire a $29.99 Purchase event.
- The banner says credits "have been added" although the webhook may not have run yet (Zoho redirect and webhook are independent).

### Upgrade modal `KP` (offset 901488; old `PremiumModal.tsx`)
- Props `isOpen, onClose, remainingDownloads`. Header "Upgrade to Premium" / "Unlock unlimited prints & downloads".
- If `remainingDownloads > 0`: "⚠️ You have N free download(s) remaining", else "❌ You've used all your free downloads".
- Bullets: "Unlimited prints & downloads", "Priority support", "Early access to new features".
- "View Premium Options" → `onClose(); window.location.href="/pricing"` (full reload). "Maybe Later" → close. X button → close.
- Opened from: gallery modal `gS` (offset ~911000, print `Wt` / download `bn`) and sketch page `_O` (offset ~1031500, print `De` / download `Ue`) when `Ec(uid).allowed` is false. `Ec`: premium → allowed, remaining −1; else allowed iff `downloadsRemaining > 0`.
- On successful print/download `fm(uid)` decrements `downloadsRemaining` in a client transaction (skipped for premium; throws `NO_DOWNLOADS_REMAINING` at 0).

### "Out of Credits" (generation)
- Scene tool `iq` (offset ~936600) and Verse tool `Lq` (offset ~1075880): inside `requireAuth(…,'signup')`, `if (user.credits===undefined || user.credits<1)` → error modal `dq` with title "Out of Credits" and message "You need at least 1 credit to generate a coloring page. Please purchase a pack to continue." (verse: "…to generate verse art…").
- `dq` has only a "Try Again" button that closes it. **No link to /pricing** from the out-of-credits state.
- Gallery AI edit (`gS.Jt`, offset ~912900) charges `ig(uid,1,…)` first; on `INSUFFICIENT_CREDITS` shows inline text "Not enough credits. Please purchase more." (no link).

### Where credits/premium are shown
- Header `a5`: never shows a credit count. Logged-out: "Claim Free Credits" (opens signup). Logged-in dropdown: "Buy Credits" → `/pricing` (button). Mobile menu label "Pricing & Credits". All are `<button onClick>` navigation.
- Account modal `cq` (offset ~977000): reads the user doc once (`ol`), shows "Receipt Portal" `<a href="https://billing.zohosecure.ca/portal/biblesketch" target="_blank">`, plan "Premium"/"Free Plan", "Image Credits" = `credits`, "Downloads/Prints" = "Unlimited" if premium else `data.downloads`. **Bug**: the field is `downloadsRemaining`; `downloads` does not exist, so free users always see 0 (same bug in `ProfileModal.tsx:40`).
- Pricing page: premium state only (banner + disabled button). No balance shown anywhere on /pricing.

## 5. Backend contract

### Firestore (client)
- `users/{uid}` read: `getDoc` (`ol`) and `onSnapshot` (`R8`) in the App shell; fields used here: `credits`, `downloadsRemaining`, `isPremium`, (`downloads` by mistake in `cq`).
- `users/{uid}` write, transaction `ig`: `credits = credits - n`, throws `INSUFFICIENT_CREDITS`; then `addTransaction(uid, {amount:-n, description, type:'usage'})` → `users/{uid}/transactions` auto-id `{userId, amount, description, type, timestamp: serverTimestamp()}`.
- `users/{uid}` write, transaction `fm`: `downloadsRemaining - 1` unless premium.
- `users/{uid}` create at sign-up (`uS`): `credits:5, downloadsRemaining:5, isPremium:false, …` + transaction `{amount:5, description:'Welcome Bonus', type:'bonus'}`. Rules (`firestore.rules:36–40, 67–72`) only allow the client to create with exactly these values and to decrease `credits`/`downloadsRemaining`.
- /pricing itself makes **no** Firestore calls.

### Zoho → `handleZohoWebhook` (`functions/index.js:3177`)
- Webhook URL configured in Zoho: `…/handleZohoWebhook?uid=${CONTACT.CF.User ID}&[pack=spark|torch|beacon]` (memory `zoho-billing.md`). The `uid` comes from the customer custom field that the checkout URL pre-fills via `cf_cf_firebase_uid`; fallback `extractFirebaseUid(body)` reads `subscription.customer.custom_field_hash.cf_cf_firebase_uid` or `custom_fields[]` (`:3153`).
- Auth: `x-webhook-token` header or Zoho HMAC signature; enforced when `ZOHO_ENFORCE_AUTH=true` (`:3115`).
- Pack (`?pack=`): `PACK_CREDITS` (`:3206`) spark 20/20/$4.99, torch 80/80/$14.99, beacon 200/200/$29.99 — matches the page. Transaction: `processedWebhooks/pack_<subscription_id>` idempotency; `users/{uid}` merge `credits += n, downloadsRemaining += n, updatedAt`; `users/{uid}/transactions` `{type:'credit_purchase', pack, creditsAdded, downloadsRemainingAdded, price, deliveryId, timestamp}`.
- Premium (no `pack`): status `live|active` → `isPremium:true, credits += 10, planStatus:'active', zohoSubscriptionId, zohoCustomerId, subscriptionStartDate|lastRenewal` with idempotency key `sub_<id>_<status>_<termStart>`; `cancelled|canceled` → `isPremium:false, planStatus:'canceled'`; `expired` → `isPremium:false, planStatus:'expired'`; `non_renewing` → `planStatus:'pending_cancel'`. Premium never touches `downloadsRemaining` (premium bypasses it via `isPremium`).
- Client and server agree on pack ids, credits, prints and pack prices. The server stores no premium price.
- `planStatus` is written but never read by the bundle (no "cancels on …" UI).

### External URLs
- Zoho checkout pages (table above), Zoho customer portal `https://billing.zohosecure.ca/portal/biblesketch`.
- Support email `support@biblesketch.com` (a `.com` domain; the site is `.app`, and About uses `hello@biblesketch.app`).

### Storage / callables / storage APIs
- None on /pricing. No localStorage/sessionStorage/cookies read or written by `fq`, `D` or `KP`.

## 6. Tracking (Zaraz; old source used Pinterest instead)

| When | Call | Payload |
|---|---|---|
| Plan click (`D`, offset 2018070) | `zaraz.ecommerce("Product Added", …)` | `{value: price, currency:"USD", products:[{product_id: planId, name: planId==='premium'?"Premium Subscription":`${planId} Credit Pack`, price}]}` |
| same | `zaraz.track("AddToCart", …)` | `{value: price, currency:"USD", content_name: <same name>, em: user.email, external_id: user.uid, event_id: `addtocart_${uid}_${Date.now()}`}` |
| Return `?subscription=success` (offset 1010362) | `zaraz.ecommerce("Order Completed", …)` | `{value:4.99, currency:"USD", order_id: order_id \|\| `premium_${now}`, products:[{product_id:"premium", name:"Premium Subscription", price:4.99}]}` |
| same | `zaraz.track("Purchase", …)` | `{value:4.99, currency:"USD", order_id, em: userEmail, external_id: userId, event_id: order_id \|\| `purchase_${userId}_${now}`}` |
| Return `?purchase=<pack>` (offset 1010534) | `zaraz.ecommerce("Order Completed", …)` | `{value: packPrice, currency:"USD", order_id: order_id \|\| `pack_${pack}_${now}`, products:[{product_id: pack, name: "Spark Credit Pack" (capitalised), price}]}` |
| same | `zaraz.track("Purchase", …)` | as premium with pack price |

All calls are guarded by `typeof zaraz < "u"`. Premium value is hard-coded `4.99` in three places (page price, `onSelectPlan('premium',4.99,10)` → AddToCart value, Order Completed/Purchase value); the Zoho plan is **$7/month**. Related, outside this page: `lq` fires `zaraz.track("CompleteRegistration",{em,external_id})` on Google sign-up (offset ~964800).

Old source differences: `App.tsx:161` and `PricingPage.tsx:32,47` call `trackPinterestEvent('addtocart'|'checkout', …)` from `utils/pinterestTracking`; the bundle has no `pintrk` calls at all and replaces them with the Zaraz calls above (Pinterest presumably wired as a Zaraz tool).

## 7. Known bugs and oddities

1. **Premium price is wrong everywhere**: $4.99 on the page, server HTML, blog markdown (`HY` "Free Printable Bible Coloring Pages: The Bible Sketch Guide", offset 1126262; another post at 1135211 "subscription plans starting at $4.99/month"), and in AddToCart/Purchase values. Zoho charges $7 (ROADMAP.md:48).
2. **Pending checkout lost after login**: stale `user` in the `requireAuth` closure (§4). User has to click the plan again.
3. **Purchase events are unauthenticated**: fired from query params only; `/pricing?purchase=beacon` (or Back navigation to the pre-strip URL, since `setSearchParams` pushes a new entry) reports a sale. No server confirmation.
4. **Purchase `em`/`external_id` often empty**: the effect runs on first render, before the auth listener and `users/{uid}` snapshot resolve after the full-page return from Zoho; the effect does not depend on `userId`, so it never re-runs with the user.
5. `order_id` is never in our `redirect_url`; unless Zoho appends it, `order_id`/`event_id` are timestamp-based and not deduplicable against server-side conversions.
6. **Success copy is premature**: "have been added" before the webhook may have landed; the page never reads the balance.
7. **Account modal shows 0 downloads** for free users (reads `downloads` instead of `downloadsRemaining`).
8. **Out of Credits dead end**: `dq` modal has only "Try Again", no link to /pricing. Gallery-edit error text has no link either.
9. Premium users can still buy packs (fine) but the premium card only disables its own button; no "you have N credits" context.
10. Name inconsistency in Zaraz product names: AddToCart uses `"spark Credit Pack"`, Purchase uses `"Spark Credit Pack"`.
11. `twitter:card` summary vs summary_large_image and missing client canonical/og:url/og:image (§2); duplicate head tags after hydration.
12. Support email `support@biblesketch.com` vs `.app` domain elsewhere; not a mailto link on /pricing.
13. Credit charging is client-side (`ig`, `fm`); see ROADMAP.md §1.1 (charge-then-refund server-side, 60/day bypass, edit charges before failing). Premium "10 credits per month" is only granted by the renewal webhook, which has never fired (memory `zoho-billing.md`).
14. UID custom field is customer-editable in the Zoho portal, and one historical delivery had an empty uid → credits can go to the wrong/no account (`handleZohoWebhook` returns 400 on missing uid).

## 8. Rebuild notes

- **Static page**: all pricing copy, prices, FAQ, head tags are static. Render `/pricing` fully at build time (Astro page, no Firestore). Put prices in one shared constant used by the page, the JSON-LD (`Product` + `Offer`s, `FAQPage`) and the tracking values; set premium to the real Zoho price ($7, confirm with owner first).
- **Head**: canonical `https://biblesketch.app/pricing`, og:url, og:image, one `twitter:card`, both descriptions consistent. Drop the server-template/Helmet duplication.
- **Islands** (small):
  1. Plan buttons: one island that knows auth state. Logged out → open auth, then **continue to checkout** after login (fix the stale closure: read the uid at resume time). Logged in → build the Zoho URL and navigate. Could also be real `<a>` elements whose `href` is filled in once uid is known, with a plain `<a href="/pricing#signin">`-style fallback.
  2. Return handler: on `?subscription=success|purchase=…`, wait for auth, show banner, and ideally confirm via the user doc snapshot (credits increased / `isPremium` true, or a `users/{uid}/transactions` doc with `type:'credit_purchase'` newer than the click) before claiming "added" and before firing Purchase. Use `history.replaceState` to strip params. Include uid/email in the event.
  3. Premium state (banner + disabled button + Manage link) from the live user doc.
- **Checkout URL contract must stay byte-compatible**: `cf_cf_firebase_uid=<uid>` and `redirect_url=<origin>/pricing?subscription=success|purchase=<pack>`; the Zoho webhook config depends on the `CONTACT.CF` field filled by `cf_cf_firebase_uid`. Keep the four hosted-page URLs as-is. `redirect_url` uses `location.origin`, so a `workers.dev` preview would return to the preview host (Zoho may restrict allowed redirect domains; test before Phase rollout).
- Consider a Worker endpoint that builds the checkout URL server-side from the verified Firebase ID token (stops a client passing someone else's uid; today any uid can be put in the URL, which only gifts credits to that uid, low risk).
- Nav/back/"Buy Credits"/"View Premium Options"/footer links should be real `<a href>` (today all `<button onClick>` or `window.location.href`).
- Out-of-credits and upgrade modals: add a real link to `/pricing` from `dq`'s out-of-credits variant and the gallery-edit error.
- Account modal: read `downloadsRemaining`.
- Tracking: keep Zaraz event names (`Product Added`/`AddToCart`, `Order Completed`/`Purchase`) so existing Zaraz/Pinterest/Meta mappings keep working; fix the value and identity fields.
- Data at request time: none for /pricing. No need for SSR per request; cache at the edge like other static pages.
- Risk: don't change credit charging here (ROADMAP 1.1: client and server must switch together).
