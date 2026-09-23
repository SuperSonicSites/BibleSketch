# App shell: live bundle map

Source of truth: `hosting-public/assets/index-DHKtGwi1.js` (offsets below are UTF-8 string indices into that file, as `fs.readFileSync(...,'utf8')` returns them). Older repo source used for names: `App.tsx`, `components/Header.tsx`, `components/AuthModal.tsx`, `components/ProfileModal.tsx`, `components/ErrorModal.tsx`, `components/GlobalSEO.tsx`, `services/firebase.ts`, `utils/pinterestTracking.ts`. The bundle wins; differences are listed as **Diff**.

Minified name → meaning:

| Name | Offset | Meaning (old source) |
|---|---|---|
| `ene` | 2016039 | `AppContent` (App.tsx:34) |
| `tne` | 2021720 | `App`: `w2` (HelmetProvider) > `b3` (BrowserRouter) > `ene` |
| `nne` | 2021798 | ErrorBoundary class (not in old source) |
| `a5` | 255276 | `Header` (components/Header.tsx) |
| `lq` | 964328 | `AuthModal` |
| `cq` | 976275 | `ProfileModal` ("Account") |
| `uq` | 982641 | Profile-completion modal (**bundle only**) |
| `dq` | 985914 | `ErrorModal` |
| `Qte` | 2015499 | `capturePinterestClickId` (utils/pinterestTracking.ts:16) |
| `Jte` | 2015940 | `PublicProfileGallery` wrapper (App.tsx:22) |
| `X` / `Y` | inside `ene` (2016850) | `requireAuth(action, view)` / `handleSketchPageAuth` (App.tsx:115,126) |
| `D` | inside `ene` (2016964) | `handlePlanSelection` (App.tsx:128) |
| `R` | inside `ene` (2018496) | `getCurrentNav` (App.tsx:174) |
| `Iq` | 1061059 | `GlobalSEO` (home route only) |
| `ot` | 254078 | `Button` (components/ui) |
| `Ht` / `kt` / `Qo` / `LP` | 840632 | Firebase `auth` / `db` / `storage` / `functions` |
| `L8` | 845685 | `onAuthStateChanged` wrapper (firebase.ts:461) |
| `R8` | 844270 | `onUserProfileChanged` (firebase.ts:363) |
| `A8` | 842696 | `ensureAnonymousSession` (firebase.ts:227) |
| `D8` | 845658 | `logoutUser` (firebase.ts:457) |
| `uS` | 841746 | `syncUserToFirestore` (firebase.ts:161) |
| `N8` / `I8` / `k8` / `C8` | 843189 / 843530 / 843826 / 844063 | `registerUser` / `loginUser` / `loginWithGoogle` / `sendPasswordReset` |
| `ol` | 844163 | `getUserDocument` (firebase.ts:347) |
| `MP` / `bO` | 844350 / 844870 | `updateUserProfile` / mark profile complete (bundle only) |
| `O8` / `PP` | 845339 / 845102 | `deleteUserAccount` / `deleteStorageFolder` |
| `T8` / `v8` | 841296 / 840871 | `uploadProfileImage` (3 retries) / resize to 96px WebP |
| `ig` | 845836 | `deductCredits` (client-side charging, see ROADMAP 1.1) |
| `Dt` | 263943 | `"https://biblesketch.app"` (`APP_DOMAIN`) |

Icons are lucide-react 0.554 (`et("name")`): `qs` user, `XE` coins, `RC` settings, `kC` log-out, `IC` gift, `sa` x, `R4` menu, `Nf` mail, `A2` circle-check, `cp` chevron-left, `wc` circle-alert, `Ud` lock, `xc` arrow-right, `Vi` triangle-alert, `Hs` loader-circle, `F4` receipt, `uc` crown, `zf` download, `I2` image, `X_` save, `Z_` trash-2, `Bi` sparkles.

---

## 1. Routes and URL behaviour

Root render (offset 2022549): `createRoot(#root).render(<StrictMode><nne><tne/></nne></StrictMode>)`; throws `"Could not find root element to mount to"` if `#root` is missing. `nne` sits **outside** the router and HelmetProvider.

Route table in `ene` (offset 2019158, react-router 6 `c3`=Routes, `hr`=Route). No `basename`.

| Path | Element | Props from shell |
|---|---|---|
| `/` | `Iq` + `iq` | `user`, `onRequireAuth=X`, `onNavigateToGallery`, `onNavigateToProfile(uid)`, `setShowErrorModal`, `setErrorModalContent` |
| `/bible-verse-coloring` | `Lq` | same as `iq` |
| `/gallery` | `QP` | `userId`, `onAuthorClick(uid)` |
| `/profile/:uid` | `Jte` → `QP` with `publicProfileId=:uid` | `currentUserId`, `onBack→/gallery`, `onAuthorClick` |
| `/pricing` | `fq` | `onBack→/`, `onSelectPlan=D`, `isPremium`, `userEmail`, `userId` (**Diff**: old passed only `isPremium`) |
| `/terms` | `pq` | `onBack→/` |
| `/privacy` | `hq` | `onBack→/` |
| `/about` | `AU` (AboutSEO) + `Zte` | `onBack→/` |
| `/verified` | `Nq` | none |
| `/coloring-page/:id`, `/coloring-page/:slug/:id` | `_O` | `user`, `onRequireAuth=Y` |
| `/tags/:tagId` | `Aq` | `userId`, `onRequireAuth=(a)=>X(a,"login")`, `onAuthorClick` |
| `/blog` | `NW` | none |
| `/blog/:slug` | `Xte` | `user`, `onRequireAuth=Y` |

**Diff vs App.tsx**: bundle adds `/bible-verse-coloring`, `/about`, `/blog`, `/blog/:slug`; old `/` route used `GlobalSEO` + `CreateTool`.

URL behaviour owned by the shell:
- **No catch-all route.** An unknown client-side path renders header + empty `flex-grow` + footer (blank body). Server side, unknown paths fall to the `"**" → /index.html` rewrite (`firebase.json`); `hosting-public/index.html` does not exist (and must never be added), so Hosting serves `hosting-public/404.html` (static, `noindex`, links to `/`, `/gallery`, `/bible-verse-coloring`, `/blog`). Invalid IDs on rendered routes get `sendShell(res,404,true)` (`functions/index.js:554`): the SPA shell with status 404 + `X-Robots-Tag: noindex`; the SPA still boots on it.
- **Host/path canonicalisation is server-only**: `redirectToCanonical` (`functions/index.js:570`) 301s `biblesketch-5104c.web.app` / `.firebaseapp.com` (when no `cf-ray`) to `https://biblesketch.app`, and collapses trailing/double slashes, keeping the query string. `functions/index.html:16-21` also has a client-side `location.replace` for those hosts. The client does no redirects.
- **Query params read by the shell**: `?epik=` (Pinterest click ID, any route, `Qte`). The Zoho return params `?subscription=success`, `?purchase=<plan>`, `?order_id=` are produced by `D` and read by the pricing page (`fq`, offset ~1010350; mapped in the pricing spec).
- Scroll: `window.scrollTo(0,0)` on every `pathname` change (`ene`, 2016091). No scroll restoration on back.
- Header active state `R()` (2018496): `/pricing`→pricing, `/bible-verse-coloring`→verse-art, `startsWith('/blog')`→blog, `/about`→about, `startsWith('/gallery'|'/profile')`→gallery, **everything else → "home"** (so `/coloring-page/*`, `/tags/*`, `/terms`, `/privacy`, `/verified` highlight "Scene Art").
- Header navigation map (`onNavigate`, 2018884): `home→/`, `verse-art→/bible-verse-coloring`, `about→/about`, otherwise `/${key}` (`/gallery`, `/pricing`, `/blog`).

## 2. `<head>`

### Global template (every route): `functions/index.html`
Served by every render function via `getIndexHtml()` (`functions/index.js:492`; local file first, then `https://biblesketch.app/index.html`, last-resort stub that reloads). Contents: `<base href="/">`, charset, viewport, `<meta name="robots" content="max-image-preview:large">`, default `<title>Bible Sketch Platform</title>`, preconnect `firebasestorage.googleapis.com`, apple-touch-icon / favicon-32 / favicon-16 / `manifest.json` (name "Bible Sketch Platform", theme `#FFF7ED`), web.app redirect script, a `MutationObserver` that strips `aggregateRating` from any JSON-LD Helmet adds (patch for the sketch page), preload of Quicksand latin, layout-patch CSS (`html,body{overflow-x:clip}#root>div>.flex-grow{min-height:100vh}`), self-hosted Inter 400/600 + Quicksand 600/700 `@font-face`, the bundle `<script type=module>` and `index-B89PR4wM.css`. Body: Pinterest `<noscript>` pixel `https://ct.pinterest.com/v3/?event=init&tid=2614149303230&noscript=1`, `<div id="root">`.

No Zaraz or Pinterest script tag in the HTML: Zaraz is injected by Cloudflare at the edge (ROADMAP 1, Phase 0 table).

### Global client SEO
**There is no SEO component rendered on every page.** `ene` renders no `Helmet`; each page brings its own (`ua` = `Helmet`, 12 uses). Routes without a Helmet (`/verified` `Nq`) keep whatever title the previous route or server set.

`Iq` ("GlobalSEO", 1061059) renders **only on `/`**:
- title `Bible Sketch - Create Custom Bible Coloring Pages | Free Printable Christian Coloring Sheets`
- description `Create free printable Bible coloring pages using AI. Custom Bible illustrations for Sunday School, VBS, and homeschool. Download high-quality Christian line art.`
- `keywords` meta; `og:type=website`, `og:url=https://biblesketch.app`, `og:title="Bible Sketch - AI Bible Coloring Pages"`, `og:description="Create custom Bible coloring pages with AI. Free printable Christian art for kids and adults."`, `og:image=/og.png` (+alt, 1200×630, image/png), `og:site_name`, `twitter:card=summary_large_image`, `twitter:url/title/description/image` (as `name=`).
- JSON-LD `@graph`: `WebSite` (url, name, description, `SearchAction` target `https://biblesketch.app/gallery?search={search_term_string}`) + `Organization` (url, name, logo `/logo.png`).
- **No canonical, no robots.**
- **Diff vs components/GlobalSEO.tsx**: old used `/logo.png` as og/twitter image, `property="twitter:*"`, no og:image dims/alt/type/site_name.

Server `homeRender` (`functions/index.js:584`) for `/`: title `Create Faith-Filled Coloring Pages | Bible Sketch`, description `Turn any bible verse into a custom, print-ready coloring page in seconds. AI-powered…`, canonical `https://biblesketch.app/`, og/twitter with the same title, `og.png`. No JSON-LD.

Mismatches (home): title, description, og:title and og:description all differ between server and Helmet; JSON-LD exists only client-side; canonical exists only server-side.

### Shell-wide head behaviour (all routes)
- Helmet (react-helmet-async, `data-rh` attribute) only replaces tags it created. The server-injected `<meta name="description">`, `<link rel="canonical">`, og/twitter tags have no `data-rh`, so after hydration **both sets coexist** (duplicate description/og tags, and a second canonical where a page's Helmet also emits one; 6 `rel:"canonical"` Helmets exist in the bundle). `<title>` is the only tag Helmet effectively overrides.
- After client-side navigation the landing route's server tags stay in `<head>` for every later route (e.g. land on a sketch, click Gallery: the sketch canonical and og:image remain). Harmless for crawlers (they land fresh), wrong for share buttons that read the DOM.
- Several render functions append a script that empties `#root` before the bundle runs (home, gallery, verse, tag, profile); Google indexes what React renders.
- `/verified`: server `verifiedRender` (`functions/index.js:3084`) sets `<title>Email Verified | Bible Sketch</title>` and `X-Robots-Tag: noindex`; the client sets nothing.

## 3. Page structure (shell)

Root `div.min-h-screen.bg-[#FFF7ED].text-[#1F2937].font-sans.flex.flex-col` (selection colours `#FCD34D`/`#7C3AED`), children in order:

### Header `a5` (255276)
`<nav>` sticky, `z-50`; scroll listener: `scrollY>10` → `bg-[#FFF7ED]/95 backdrop-blur-md border-purple-100 py-3 shadow-sm`, else `bg-[#FFF7ED] border-transparent py-5`.
- **Logo**: `div` with `onClick` (not a link) → home and closes mobile menu. `<img src="/logo.webp" alt="Bible Sketch Logo">` (no width/height: CLS) + `span` "Bible Sketch" (`font-display`, `text-xl md:text-3xl`).
- **Desktop (`hidden md:flex gap-8`)**: six `<button>`s (onClick navigation, **no hrefs**): "Scene Art", "Verse Art", "Gallery", "Pricing", "Blog", "About". Active = `text-[#7C3AED]`, else `text-gray-500`.
  - Guest: `button` "Log In" (opens auth modal, login) + `ot` primary "Claim Free Credits" with gift icon (`animate-wiggle`, yellow) → auth modal, signup.
  - Signed in: avatar button (44px circle; `user.photoURL` img `loading=lazy`, else user icon) + name (`displayName || email.split('@')[0]`). Toggles dropdown (w-64): "Signed in as" + email; "Buy Credits" (coins) → `/pricing`; "Profile Settings" (settings) → profile modal `cq`; "Sign Out" (log-out, red) → `D8`.
- **Mobile (`md:hidden`)**: signed in → 40px avatar button with the same dropdown (no name); guest → "Log In" text button. Hamburger button (`aria-label` "Open menu"/"Close menu", `aria-expanded`), icon menu/x.
- **Mobile menu panel** (absolute, `bg-white/95`, rounded-b-2xl): buttons "Scene Art", "Verse Art", "Gallery", "Pricing & Credits", "Blog", "About" (each navigates and closes); guest only: full-width "Claim Free Credits".
- **No credits balance anywhere in the header** (task brief assumed one; the bundle has none; balance is shown only in the Account modal and in the create tools).
- Dropdown and mobile menu do not close on outside click or Escape, nor on route change triggered elsewhere (only via their own buttons).
- **Diff vs Header.tsx**: old nav was "Create / Explore / Pricing" (3 items; mobile had "Pricing & Credits"); bundle adds Verse Art, Blog, About and renames Create→Scene Art, Explore→Gallery.

### Content
`div.flex-grow` > Routes (see §1).

### Footer (inline in `ene`, 2020804)
`footer.bg-[#FFF7ED].border-t.border-purple-50.py-12.mt-12`: `© {current year} Bible Sketch. All rights reserved.` and two `<button>`s "Terms of Service" → `/terms`, "Privacy Policy" → `/privacy` (onClick, **no hrefs**). Same as App.tsx:269. No links to About/Blog/Gallery.

### Global modals (always mounted after the footer)
`lq` (auth), `cq` (profile, only when `user`), `uq` (profile completion, only when `user`), `dq` (error). All are `fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm` overlays, `bg-white rounded-3xl` cards; none closes on backdrop click or Escape, none has `role="dialog"`/focus trap/`aria-modal`; close buttons are icon-only with no `aria-label`.

## 4. Interactive behaviour

### Auth state (`ene`, 2016478)
State: `n` user (merged Auth user + `users/{uid}` doc), `a` profileLoaded, `l` authModalOpen, `p` authInitialView, `m` profileModalOpen, `_` completionModalOpen, `I`/`C` error modal open/content, `j` pendingAction; `v` = userRef (assigned, **never read**).

`L8(Ht, cb)` wraps `onAuthStateChanged`: if a user is **not email-verified, not Google (`providerData[0].providerId!=="google.com"`) and not anonymous → `signOut` and `cb(null)`**.
- Real user (non-anonymous): `setUser({...prev, ...authUser, uid, email, photoURL, displayName})`, then `R8(uid)` = `onSnapshot(users/{uid})`; on each snapshot **that exists**: `setUser({...prev, ...doc, uid, email, photoURL: doc.photoURL || auth.photoURL})`, `profileLoaded=true`, and if `doc.profileComplete===false && !doc.photoURL && !auth.photoURL` → open completion modal `uq`. No error callback on the listener.
- Null or anonymous: `user=null`, `profileLoaded=false`, unsubscribe the doc listener; if **null** (not anonymous) → `A8()` anonymous sign-in.
- Spreading the Firebase `User` object into React state copies its own enumerable fields only (methods on the prototype are lost).

### requireAuth queue `X(action, view="login")`
`user && profileLoaded` → run now; else store `pendingAction`, set view, open auth modal. Effect: when `user && profileLoaded && pendingAction` → run it and clear. `Y = a => X(a,"login")`.
- The queued closure is the one created at click time, so it sees the **guest-time props/state** (e.g. `user=null`), see §7.
- Closing the auth modal does **not** clear `pendingAction`; any later sign-in fires it.
- A signed-in user whose `users/{uid}` doc does not exist never gets `profileLoaded`, so every gated action reopens the auth modal.

### Plan selection `D(planId, price, credits)` (2016964)
`X(fn, "signup")`. `fn`: if no `n.uid` → `console.error("No authenticated user")` and return. Plan URLs (Zoho Billing, `.ca` data centre):
- `premium`: `https://billing.zohosecure.ca/subscribe/c4eda214…a2a7b3c2f/bible-sketch-premium`
- `spark`: `…/c4eda214…279cd445/Spark?addon_code%5B0%5D=20credits&addon_quantity%5B0%5D=20`
- `torch`: `…/c4eda214…a9b0c1e6f3/Torch?addon_code%5B0%5D=80credits&addon_quantity%5B0%5D=80`
- `beacon`: `…/c4eda214…a08bc5eda/200credits?addon_code%5B0%5D=200credit&addon_quantity%5B0%5D=200`
(plan URL map at bundle offset ~2017100, redirect built at 2017933; same as App.tsx:136-141, identical.) Unknown plan → `console.error("Unknown plan: …")`.
Redirect: `${planUrl}${?|&}cf_cf_firebase_uid=${encodeURIComponent(uid)}&redirect_url=${encodeURIComponent(origin + "/pricing?" + (premium ? "subscription=success" : "purchase="+planId))}`, logged to console, Zaraz events (§6), then `window.location.href = …`. Third arg `credits` unused.
**Diff**: old fired `trackPinterestEvent('addtocart', …)` via `pintrk`; bundle uses Zaraz only.

### Auth modal `lq` (964328)
Props `isOpen`, `onClose`, `initialView`. Resets view and error when opened. Views: `login`, `signup`, `forgot_password`, `reset_sent`, `verification_sent`.
- **login / signup** shared: H2 "Welcome Back" / "Join Bible Sketch"; subtitle "Log in to access your gallery." / "Create an account to save your artwork."; signup banner "🎁 Start with 5 free credits" / "No credit card required"; error box (red; for `"User already exists. Sign in?"` adds a "Go to Sign In" button); Google button "Sign in with Google" / "Sign up with Google" (inline 4-colour G SVG); divider "Or continue with email"; form fields: signup-only "Full Name" (text, required, placeholder "David Goliath"), "Email Address" (email, required, placeholder "sarah@sundayschool.com"), "Password" (required); login-only "Forgot Password?" link-button; signup-only "Repeat Password" and checkbox `#terms-agree` "I agree to the **Terms of Service**. I confirm I am at least 18 years old or have parental consent." ("Terms of Service" is a styled `span`, **not a link**). Submit "Sign In" / "Create Account" (`ot` with spinner). Footer toggle "Don't have an account? Sign Up" / "Already have an account? Log In" (switching clears passwords and the checkbox).
- **Google** (`j`): signup view requires the checkbox ("You must agree to the Terms of Service to create an account."). `k8()` = `signInWithPopup(GoogleAuthProvider)`, `getAdditionalUserInfo().isNewUser` → `uS(user, {}, isNewUser)`, removes `localStorage.anon_auth_disabled`. On success: if view was signup → Zaraz `CompleteRegistration`; close. `auth/unauthorized-domain` → developer-facing message "Domain not authorized. Please go to Firebase Console > …"; other errors show `err.message`.
- **Email sign-up**: checks checkbox, `password === repeat` ("Passwords do not match"), length ≥ 6 ("Password must be at least 6 characters"). `N8(email, pass, name)`: `createUserWithEmailAndPassword` → `updateProfile({displayName})` → `uS(user,{displayName},true)` (setDoc + Welcome Bonus) → `sendEmailVerification(user, {url: origin + "/verified"})` → `signOut`. On error, deletes the just-created Auth user (rollback). `auth/email-already-in-use` → "User already exists. Sign in?". Success → view `verification_sent`. **No Zaraz event for email sign-up.**
  **Diff**: old `registerUser(email, pass, name, photoFile)` uploaded a profile photo during sign-up; bundle has no photo field (moved to `uq`) and doesn't set `photoURL: null`.
- **Email login**: `I8`: `signInWithEmailAndPassword`; if `!emailVerified` → `signOut` and throw `auth/email-not-verified` → view `verification_sent` (**no verification email is re-sent**); else `uS(user,{},false)` (create doc if missing) and remove `anon_auth_disabled`. Any other error → "Password or Email Incorrect".
- **forgot_password**: "Back" button, H2 "Reset Password", copy "Enter your email address and we'll send you a link to reset your password.", email field, "Send Reset Link" → `C8(email)` = `sendPasswordResetEmail` → view `reset_sent`. Empty email → "Please enter your email address".
- **reset_sent**: circle-check, H2 "Check your inbox", "We have sent password reset instructions to {email}.", "Return to Login".
- **verification_sent**: mail icon, H2 "Verify your email", "We have sent you a verification email to {email}. Verify it and log in.", amber note "**Can't find it?** Check your spam or junk folder.", "Go to Login".
- Verification link lands on `/verified` (`Nq`, 1058710): static "Congratulations!" page ("Your email has been verified successfully.", list "5 Free Credits" / "5 Downloads or Prints" / "Bless & Save"), button "Start Creating Now" → `/`. It does not sign the user in or reload the Auth user.

### Profile modal `cq` "Account" (976275)
On open: spinner, `ol(uid)` = `getDoc(users/{uid})` (one-shot, not the live listener) → displayName, `photoFileName`, `credits ?? 0`, **`downloads ?? 0`**, `isPremium`. Layout: header "Account"; `<a href="https://billing.zohosecure.ca/portal/biblesketch" target=_blank rel="noopener noreferrer">` "Receipt Portal"; three stat tiles "Status" (Premium / Free Plan, crown), "Image Credits" (credits), "Downloads/Prints" ("Unlimited" if premium else `downloads`); Email (disabled input); "Display Name" (required); "Profile Photo" (read-only filename text + `<input type=file accept="image/*">`, hint "Supported formats: JPG, PNG"); "Update Profile" (save icon); "Delete Account" (trash, red).
- Update: `MP(uid, {displayName, photoFile})`: if file → `T8` resize to ≤96px WebP 0.85 and upload to `user_uploads/{uid}/profile_{Date.now()}.webp` (retries on `storage/unauthorized` up to 3×, 1s/2s back-off) → `getDownloadURL`; `updateProfile(authUser, {displayName, photoURL})`; `updateDoc(users/{uid}, {updatedAt: serverTimestamp(), displayName?, photoURL?, photoFileName?, storagePath?})`; `user.reload()`. Success banner "Profile updated successfully!", auto-close after 1.5 s. Error "Failed to update profile. " + message. Old photo files are never deleted.
- Delete: `window.confirm("Are you sure you want to delete your account? This action cannot be undone.")` → `O8`: recursively delete Storage `user_uploads/{uid}` (**includes the user's sketch images**), `deleteDoc(users/{uid})`, `deleteUser(authUser)`. Error "Failed to delete account. You may need to re-login first." Sketch docs are not deleted.
- **Diff**: none in behaviour vs components/ProfileModal.tsx (same `downloads` bug at ProfileModal.tsx:40).

### Profile-completion modal `uq` (982641, bundle only)
Opens from the `users/{uid}` listener (see above), i.e. email sign-ups without a photo. Sparkles icon, H2 "Welcome, {first name}! 🎉" (name omitted if none), "Add a profile photo to personalize your account"; 128px dashed circle with transparent full-size `<input type=file accept="image/*">`, "Click to upload", preview via `URL.createObjectURL` + badge "Looking good!"; "Save Photo" (disabled until a file) → `MP(uid,{photoFile})` then `bO(uid)` = `updateDoc(users/{uid}, {profileComplete:true, updatedAt})`, close; error "Failed to save profile photo. Please try again."; "Skip for now" and the X button → `bO(uid)` then close (closes even if `bO` fails); footnote "You can always add or change your photo later in your profile settings."

### Error modal `dq` (985914)
Props `isOpen`, `onClose`, `title`, `message`; triangle-alert icon, H2 title, message, one button "Try Again" that only closes. Opened by `iq`/`Lq` through `setShowErrorModal` + `setErrorModalContent({title,message})`.

### Sign-out `D8`
`signOut(auth)` only. No navigation, no state reset beyond the auth listener; the listener then calls `A8()` (anonymous sign-in) unless disabled. The dropdown closes.

### ErrorBoundary `nne`
`getDerivedStateFromError` → inline-styled page: `h1` "Something went wrong.", `<pre>` with `error.message`, button "Reload Page" → `location.reload()`. `componentDidCatch` → `console.error("Uncaught error:", …)`. Not in old source.

### Loading/empty states
Shell has none: before auth resolves the header renders the guest state (Log In / Claim Free Credits) and flips when the listener fires (flash for signed-in users). The profile modal has its own spinner.

## 5. Backend contract (shell)

Firebase config (840200): apiKey `AIzaSyAxrHQdjvie8JQnX18WRAqnwH3vwt5N5LI`, **authDomain `biblesketch.app`** (old `services/firebase.ts:62` has `BibleSketch.app`), projectId `biblesketch-5104c`, bucket `biblesketch-5104c.firebasestorage.app`, appId `1:31072353772:web:2f992ceb14538c051f94c9`. Emulators only when `location.hostname==="localhost"` (auth 9099, firestore 8080, storage 9199, functions 5001).

Firebase Auth: `onAuthStateChanged`, `signInAnonymously`, `createUserWithEmailAndPassword`, `updateProfile`, `sendEmailVerification({url: origin+"/verified"})`, `signInWithEmailAndPassword`, `signInWithPopup(GoogleAuthProvider)` + `getAdditionalUserInfo`, `sendPasswordResetEmail`, `signOut`, `deleteUser`, `user.reload()`. Persistence: SDK default (IndexedDB/localStorage).

Firestore:
| Op | Path | Detail |
|---|---|---|
| listen | `users/{uid}` | `onSnapshot`, merged into app user (credits, isPremium, downloadsRemaining, photoURL, displayName, profileComplete, blessedSketchIds…) |
| get | `users/{uid}` | `ol`, profile modal; `uS` existence check on login |
| set | `users/{uid}` | `uS` create: `{uid, email, displayName, photoFileName:"", photoURL, storagePath:"", credits:5, downloadsRemaining:5, isPremium:false, blessedSketchIds:[], profileComplete: !!photoURL, createdAt: serverTimestamp(), ...extra}`. Forced on email sign-up and Google new user; on login only if missing (then no Welcome Bonus). Rules (`firestore.rules:34-43`) require exactly these keys and values. `onUserCreated` (`functions/index.js:3407`) then deletes `email` and restores tombstoned balances from `deletedUsers/{uid}`. |
| add | `users/{uid}/transactions` | via lazy chunk `transactions-CpWNcXvd.js`: `{userId, amount:5, description:"Welcome Bonus", type:"bonus", timestamp: serverTimestamp()}` (new users only; failure only logged) |
| update | `users/{uid}` | `MP`: `{updatedAt, displayName?, photoURL?, photoFileName?, storagePath?}`; `bO`: `{profileComplete:true, updatedAt}` |
| delete | `users/{uid}` | `O8` (triggers `onUserDeleted` tombstone) |

`users/{uid}` is `allow get: if true` (public), which is why the header/listener needs no auth for reads.

Storage: write `user_uploads/{uid}/profile_{ms}.webp` (`contentType: image/webp`); list + delete everything under `user_uploads/{uid}/` on account deletion.

Callable functions: none in the shell. External URLs: Zoho Billing hosted pages (above), Zoho customer portal `https://billing.zohosecure.ca/portal/biblesketch`. No bible-api.com or Gemini calls in the shell.

Browser storage:
| Key | Where | Use |
|---|---|---|
| `localStorage.anon_auth_disabled="true"` | set by `A8` when anonymous auth fails with `auth/admin-restricted-operation`, `auth/operation-not-allowed`, `auth/invalid-credential` or a message containing "400"; removed on successful email or Google login | skips future anonymous sign-ins |
| `localStorage.pinterest_epik` | `Qte`: `{value, expiry: now+7d}` | **written, never read** by the bundle |
| cookie `_epik` | `Qte`: `max-age=604800; path=/; SameSite=Lax` | presumably read by the Zaraz Pinterest tool (not verifiable from the bundle) |
| `localStorage.blessedSketches` | page components (927488, 949895, 1050080, 1064764) | not shell; listed for completeness |

## 6. Tracking (shell)

All calls are guarded by `typeof zaraz<"u"`. No `pintrk`, `fbq`, `gtag` or `dataLayer` in the bundle (0 occurrences).

| Where | Call | Payload |
|---|---|---|
| `lq` Google button, view=signup (964789) | `zaraz.track("CompleteRegistration", …)` | `{em: user.email, external_id: user.uid}`; fires for any Google sign-in started from the signup view, including existing accounts; never for email sign-up |
| `D` before Zoho redirect (2018058) | `zaraz.ecommerce("Product Added", …)` | `{value: price, currency:"USD", products:[{product_id: planId, name: "Premium Subscription" \| "<plan> Credit Pack", price}]}` |
| same | `zaraz.track("AddToCart", …)` | `{value: price, currency:"USD", content_name, em: user.email, external_id: user.uid, event_id: "addtocart_<uid>_<Date.now()>"}` |
| `fq` on Zoho return (1010350, pricing spec) | `zaraz.ecommerce("Order Completed")` + `zaraz.track("Purchase")` | premium hard-codes `value: 4.99` (ROADMAP 1 rollout phase 3: real price $7) |

Pinterest click ID: `Qte` on first mount reads `?epik`, writes cookie + localStorage, logs `[Pinterest] Click ID captured:`. **Diff**: old `utils/pinterestTracking.ts` also had `getPinterestClickId`/`trackPinterestEvent` via `window.pintrk`; the bundle kept only the capture.

Raw email is sent to Zaraz (`em`); hashing depends on the Zaraz tool configuration, not visible here.

## 7. Known bugs and oddities

1. **Stale closure in the requireAuth queue.** `D` captures `n` (user) at click time. A guest who picks a plan is sent to sign-up; after login the queued closure still sees `n=null`, logs "No authenticated user" and does nothing: the purchase intent is lost. Same pattern applies to every `onRequireAuth` closure in pages (they read props from the guest render). `v` (userRef) exists for this but is unused. Same bug in App.tsx:128.
2. **Queued action never expires.** Closing the auth modal keeps `pendingAction`; signing in later from the header runs it (e.g. a generation or bookmark clicked long before).
3. **Missing user doc → endless login prompts.** `profileLoaded` is only set when `users/{uid}` exists; a signed-in user without a doc (e.g. after a half-failed account deletion) reopens the auth modal on every gated action.
4. **Sign-up race (ROADMAP 1.1, 1.3).** `createUserWithEmailAndPassword` signs the unverified user in, `L8` immediately signs them out while `N8` is still running, so `uS`'s `setDoc` can run unauthenticated and fail (caught, logged "Error syncing user to Firestore"). The doc is then created at first verified login by `uS(user,{},false)`, without the Welcome Bonus transaction. Likely cause of "62 of 182 users have none" (PLAUSIBLE; not reproduced here).
5. **Login with unverified email** shows "We have sent you a verification email" but sends nothing; there is no resend button.
6. **Account "Downloads/Prints" always 0** for free users: reads `downloads`, field is `downloadsRemaining` (ROADMAP 1.1).
7. **Account deletion wipes `user_uploads/{uid}` including sketch images** but leaves `sketches` docs (public ones show broken images). Deletion order Storage → doc → Auth: if `deleteUser` fails with `requires-recent-login`, files and doc are already gone (doc balances survive via the `deletedUsers` tombstone).
8. **CompleteRegistration** is tied to the modal view, not to `isNewUser`: overcounts (returning Google users on the signup view) and misses all email sign-ups.
9. **AddToCart `em`** sends the raw email; the premium Purchase value is hard-coded 4.99.
10. `pinterest_epik` localStorage is written but never read.
11. Header shows the guest state until auth resolves (flash for signed-in users); dropdowns don't close on outside click/Escape; active-nav falls back to "Scene Art" on sketch, tag, legal and verified pages.
12. No client 404 route: unknown client-side paths render an empty page with status whatever the server gave.
13. `Iq` JSON-LD `SearchAction` targets `/gallery?search=`, but nothing in the bundle reads a `search` query param (0 `get("search")`): the sitelinks search box would land on an unfiltered gallery.
14. Duplicate head tags (server + Helmet) and stale landing-route tags after client navigation (§2).
15. Developer-facing error shown to users on `auth/unauthorized-domain`.
16. Modals lack dialog semantics, focus management, Escape/backdrop close and labelled close buttons; the terms checkbox references Terms of Service without a link.
17. `onUserUpdate` passed to `cq` is a no-op; profile modal reads the doc once instead of using the live listener (credits shown can be stale while open).
18. Anonymous sessions are created for every signed-out visitor (and again after every sign-out) purely for Firestore reads; `users/{uid}` and public sketches are readable without auth per current rules, so check which reads still need it before dropping it.

## 8. Rebuild notes

**Static (Astro, server-rendered, zero JS):**
- Header and footer markup with real `<a href>` for all nav items, logo and legal links (`web/src/components/Header.astro`, `Footer.astro` already do this for the guest state). Active state from `Astro.url.pathname` on the server (fix the "home" fallback). Mobile menu can stay `<details>` as in Phase 0.
- Global head in `web/src/layouts/Base.astro`: one set of title/description/canonical/og/twitter per page, generated server-side (no Helmet, no duplicates), favicons/manifest, font preloads. Drop the `functions/index.html` patches (rating stripper, layout CSS) once routes move (ROADMAP rollout phase 5).
- `/verified` can be fully static with `noindex`.
- 404: a real Astro 404 page with status 404 for unknown paths (reuse `hosting-public/404.html` copy).
- ErrorBoundary: per-island boundaries; pages themselves no longer depend on JS.

**Islands (React, `client:idle` or `client:load` where above the fold):**
- `AuthControls` island in the header slot: guest buttons vs avatar/dropdown. Render the guest state server-side and hydrate; avoid the flash by hiding the auth slot until `auth.authStateReady()` resolves (or render a neutral placeholder of fixed width).
- One modal host island (auth, account, profile completion, error) mounted once per page, driven by a shared store (nanostores, per ROADMAP "Shared work"). Other islands open modals by writing to the store.
- Shared auth store: `user`, `profile` (live `users/{uid}` listener), `profileLoaded`, `pendingAction`. `requireAuth(action)` must run the action with **current** state (read the store inside the action, not a captured prop), clear the pending action when the modal closes, and handle "signed in but no doc" explicitly.
- Keep behaviour: `L8` verified-email gate, Google popup, `/verified` continue URL, anonymous sign-in with the `anon_auth_disabled` flag (or drop anonymous auth after checking the rules, §7.18), Pinterest `?epik` capture (small inline script, no React needed).
- Plan selection: plain function in the pricing island (Zoho URLs + `cf_cf_firebase_uid` + `redirect_url`); fire Zaraz `Product Added`/`AddToCart` before `location.href`. Fix the stale-user bug. Consider a server endpoint that builds the URL so the UID field can't be tampered with (ROADMAP S5).

**Data at request time:** none for the shell. Everything user-specific (name, avatar, credits, premium) is client-only after Firebase Auth; the server must not vary cached HTML by user. The header/footer are identical for every visitor and cacheable at the edge.

**Risks:**
- Firebase Auth SDK weight: load it only in the auth island (dynamic import on idle or on first click) to keep Lighthouse at Phase 0 levels; `authDomain` is `biblesketch.app`, so the `/__/auth/*` handler must keep working when the Worker takes routes (proxy `/__/auth/**` and `/__/firebase/init.json` to Firebase Hosting or the Google popup breaks).
- Mixed SPA/Astro period: SPA routes and Astro routes share `localStorage`/IndexedDB auth on the same origin, so sessions carry over; but the SPA's client-side `navigate()` to an Astro route must become a full page load (react-router won't know Astro pages). Header links as `<a href>` in both worlds solve this.
- Client-side credit deduction (`ig`) lives in the page islands; don't add server charging until the old bundle is gone (CLAUDE.md, ROADMAP 1.1).
- Zaraz events must keep their names and payload shape (ad platforms are configured against them); fix `CompleteRegistration` (use `isNewUser`, add email sign-up) and the premium price deliberately, and note the change for the owner.
- Account deletion deleting sketch images is live behaviour; decide with the owner before copying it.
