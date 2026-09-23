# Data layer (cross-cutting): live bundle `hosting-public/assets/index-DHKtGwi1.js`

Every Firestore, Storage, Auth, callable-function, web-storage, fetch and tracking call in the production bundle. Offsets are character offsets into the bundle read as UTF-8 (`s.indexOf(...)`). "Old source" = root `services/`, `components/`, `App.tsx`. The bundle wins where they differ.

All app data access lives in one service block at **~839,900–878,000** (right after the Firebase Storage SDK). The only Firebase SDK calls outside it are `LazyImage` (`lo`, Storage `getDownloadURL`) and the app shell `ene` (auth listener). The lazy chunk `hosting-public/assets/transactions-CpWNcXvd.js` holds `addTransaction`.

## 0. Minified-name key

| Minified | SDK function | Minified | SDK function |
|---|---|---|---|
| `Vn` | `doc` | `Lc` | storage `ref` |
| `Aa` | `collection` | `RP` | `uploadBytes` |
| `oi` | `query` | `y8` | `uploadString` |
| `un` | `where` | `hm` | `getDownloadURL` |
| `bc` | `orderBy` | `OP` | `deleteObject` |
| `yc` | `limit` | `E8` | `listAll` |
| `KH` | `startAfter` | `fV` | `httpsCallable` |
| `sl` | `getDoc` | `GG` | `getAuth` (persistence `[indexedDB, localStorage, sessionStorage]`, popup resolver) |
| `oo` | `getDocs` | `Oz` | `onAuthStateChanged` |
| `S_` | `setDoc` (no merge) | `fz` | `signInAnonymously` |
| `JH` | `addDoc` | `_z` / `xz` | `createUserWithEmailAndPassword` / `signInWithEmailAndPassword` |
| `Tp` | `updateDoc` | `Qz` + `Pi` | `signInWithPopup` + `GoogleAuthProvider` |
| `tS` | `deleteDoc` | `kz` | `getAdditionalUserInfo` |
| `nS` | `runTransaction` | `wL` | `updateProfile` |
| `e7` | `onSnapshot` | `Sz` | `sendEmailVerification` |
| `$y` | `increment` | `Ez` | `sendPasswordResetEmail` |
| `a7` | `arrayUnion` | `Rm` / `TL` | `signOut` / `deleteUser` |
| `Ap` | `serverTimestamp` | `Z2` | Vite dynamic-import preload helper |

Instances: `ag` = app, `Ht` = auth, `kt` = Firestore (`getFirestore`, default memory cache, no persistence), `Qo` = Storage, `LP` = Functions (default region us-central1). The bundle exports `JH as a, Aa as c, kt as d, Ap as s` (end of file) for the transactions chunk.

## 1. Firebase config and emulator switch (offset 840,428)

```js
w8={apiKey:"AIzaSyAxrHQdjvie8JQnX18WRAqnwH3vwt5N5LI",authDomain:"biblesketch.app",projectId:"biblesketch-5104c",
    storageBucket:"biblesketch-5104c.firebasestorage.app",messagingSenderId:"31072353772",appId:"1:31072353772:web:2f992ceb14538c051f94c9"}
location.hostname==="localhost"&&(gL(Ht,"http://localhost:9099"),nP(kt,"localhost",8080),DP(Qo,"localhost",9199),X2(LP,"localhost",5001))
```
- `authDomain` is `biblesketch.app`, so the auth handler runs at `https://biblesketch.app/__/auth/handler`, served by Firebase Hosting. **Rebuild risk:** once the Worker serves `biblesketch.app`, it must proxy `/__/auth/*` (and `/__/firebase/init.json`) to `biblesketch-5104c.firebaseapp.com`, or Google sign-in breaks.
- Same as the old source `services/firebase.ts:73-84`. There is no App Check and no analytics SDK.

## 2. Service functions (the whole Firestore/Storage surface)

Old names come from `services/firebase.ts` / `downloads.ts` / `gemini.ts`. "Callers" are the enclosing components (see §3 for the component → route map).

### 2.1 `users/{uid}`

| Fn @offset | Old name | Operation | Callers |
|---|---|---|---|
| `Ec` @839,653 | `canDownload` (downloads.ts:10) | `ol(uid)` → `{allowed, remaining, isPremium}`: premium → `remaining:-1`; else `downloadsRemaining ?? 0 > 0` | `gS` (mount, print, download), `_O` (print, download) |
| `fm` @839,993 | `deductDownload` (downloads.ts:42) | `runTransaction`: get `users/uid`; premium → no-op; `downloadsRemaining<1` → throw `NO_DOWNLOADS_REMAINING`; `update {downloadsRemaining: n-1}` | `gS` print + download, `_O` print + download (called **after** the print or download) |
| `uS` @841,785 | `syncUserToFirestore` (firebase.ts:161) | Builds `{uid,email,displayName,photoFileName,photoURL,storagePath,credits:5,downloadsRemaining:5,isPremium:false,blessedSketchIds:[],profileComplete:!!photoURL,createdAt:serverTimestamp(),...extra}`. `isNewUser` → `setDoc` (overwrite) and then `addTransaction(uid,{amount:5,description:"Welcome Bonus",type:"bonus"})`; else `getDoc` and `setDoc` only if missing (no Welcome Bonus transaction on that path) | `N8` (true), `I8` (false), `k8` (`isNewUser` from `getAdditionalUserInfo`) |
| `ol` @844,162 | `getUserDocument` | `getDoc(users/uid)` → data or null (errors swallowed) | `Ec`, `gS` (author name/photo), `sg` ArtistBadge, `QP` (public-profile header), `cq` ProfileModal, `_O` (author), `Wte` (author) |
| `R8` @844,270 | `onUserProfileChanged` | **`onSnapshot(users/uid)`**: the only realtime listener in the app | `ene` (merged into the `user` state; drives credits and the profile-completion modal) |
| `MP` @844,349 | `updateUserProfile` | Requires `Ht.currentUser.uid===uid`. Optional photo upload via `T8`, then Auth `updateProfile({displayName,photoURL})`, then `updateDoc {updatedAt, displayName?, photoURL?, photoFileName?, storagePath?}`, then `user.reload()` | `cq` (save), `uq` (save photo) |
| `bO` @844,869 | (bundle only) `markProfileComplete` | `updateDoc {profileComplete:true, updatedAt}` | `uq` (save and skip) |
| `O8` @845,338 | `deleteUserAccount` | `PP("user_uploads/{uid}")` (recursive `listAll` + delete), `deleteDoc(users/uid)`, Auth `deleteUser`. **Does not delete `sketches` docs**: public sketches stay listed with dead image URLs | `cq` (delete account, `window.confirm`) |
| `ig` @845,835 | `deductCredits` (firebase.ts:475) | `runTransaction`: get; `credits<amount` → throw `INSUFFICIENT_CREDITS`; `update {credits: c-amount}`. Then `addTransaction(uid,{amount:-amount,description,type:"usage"})` (errors swallowed) | see §4 (credit charging) |
| `Wc` @849,216 | `getUserBlessedSketchIds` | `getDoc(users/uid).blessedSketchIds || []` | `aq`, `QP`, `_O`, `Aq`, `Lq`→`Rq` (prop), `Wte` |

Transactions chunk `transactions-CpWNcXvd.js`: `addTransaction(uid, o)` = `addDoc(collection(db,"users",uid,"transactions"), {userId:uid, ...o, timestamp:serverTimestamp()})`. It is loaded with a dynamic `import()` from `uS` and `ig`. **Never read in the bundle**: the old `getPurchaseHistory` / `getAllTransactions` (transactions.ts:39,64) and `getTransactionHistory` (firebase.ts:520) are absent, so there is no purchase-history UI.

### 2.2 `sketches/{id}`

Doc shape written by `dS` (@847,545, old `saveSketch` firebase.ts:667):
```
{ userId, imageUrl (download URL), storagePath "user_uploads/{uid}/sketches/{ts}.{png|jpg}",
  thumbnailPath "user_uploads/{uid}/sketches/{ts}_400x533.{ext}" (predicted, made server-side),
  isPublic, blessCount:0, createdAt:serverTimestamp(), isBookmark, type:"scene"|"verse",
  promptData:{book, chapter, start_verse, end_verse?, aspect_ratio:"3:4",
              age_group? (scene), art_style? (scene), font_style? (verse)},
  tags? (only if non-empty) }
```
Bundle-only differences from the old source: the `type` parameter (7th argument, default `"scene"`) and `font_style`. The old `saveSketch` always wrote `age_group` and `art_style` and had no `type`.

Bookmark doc (`pS`), id `bookmark_{uid}_{originalId}`: `{userId, isBookmark:true, isPublic:false, createdAt, blessCount:0, originalSketchId, originalOwnerId, promptData, imageUrl, storagePath, thumbnailPath}`. It copies the image URL and paths, so it breaks when the original is deleted.

| Fn @offset | Old name | Query / op | Callers |
|---|---|---|---|
| `dS` @847,545 | `saveSketch` | upload (`P8`) then `addDoc(sketches, doc)` → `{id,...doc,timestamp:Date.now()}` | `iq` onSave (scene), `Lq` onSave (verse, `type:"verse"`), `gS` "save edited copy" (`dS(uid,img,meta,false)`: private, no type → `"scene"`) |
| `Ip` @848,645 | `blessSketch` | No uid: `updateDoc {blessCount: increment(1)}`. With uid: `runTransaction`: get `users/uid`; missing → only bump the sketch; `blessedSketchIds` includes id → throw `ALREADY_BLESSED` (swallowed); else `update sketch {blessCount:increment(1)}` + `update user {blessedSketchIds: arrayUnion(id)}` | `aq`, `QP`, `Aq`, `Rq` (prop from `Lq`), `Wte`. All callers gate on auth first (`onRequireAuth`), so the no-uid branch is dead code |
| `j8` @849,390 | `getUserGallery` | `where userId==uid` (no order/limit); client filters `!isBookmark`, sorts by `createdAt` desc | `QP` tab "my" |
| `jP` @849,943 | `getPublicGallery` | `where isPublic==true, orderBy createdAt desc, limit 50`; client filters `!isBookmark && type!=="verse"` (**bundle only**: the old version at firebase.ts:840-863 keeps verse), sorts by `blessCount` desc then time | `aq` (home "community" strip), `B8` fallback |
| `UP` @850,733 | (bundle only) `getVerseGallery` | `isPublic==true, type=="verse", orderBy createdAt desc, limit 50`; filters bookmarks and **the viewer's own sketches** (`userId!==t`); same sort | `Lq` (`getVerseSketches` prop to `Rq`), `B8` fallback |
| `mm` @851,565 | `getFilteredPublicGallery` (firebase.ts:904) | base `[where isPublic==true, orderBy createdAt desc, limit(pageSize+10)]`; **one** extra `where` inserted at index 1, by priority: `tags array-contains tag` > `promptData.book == book` > `promptData.age_group` (`"Teen"` → `in ["Teen","Pre-Teen"]`) > `promptData.art_style`; `startAfter(cursor)` for paging. Remaining filters apply client-side (Pre-Teen maps to Teen). Returns `{sketches (≤pageSize), nextCursor: DocumentSnapshot, hasMore}`. Missing-index errors are re-thrown; the gallery then shows "Database Configuration Required" plus the console link | `QP` community tab (first page + "load more"), `Aq` tag page (first page + more) |
| `U8` @853,205 | `getTotalPublicSketchCount` | `where isPublic==true` with **no limit**: downloads every public sketch doc to count them (client `!isBookmark`) | `iq` (home, on mount) |
| `F8` @853,407 | `getUserPublicGallery` | `userId==X, isPublic==true`; filter bookmarks; sort by time | `QP` with `publicProfileId` (`/profile/:uid`) |
| `FP` @853,845 | `deleteSketch` | `getDoc` (for `thumbnailPath`), `deleteDoc`; if not a bookmark, `deleteObject` on {storagePath, thumbnailPath, `{base}_400x533.{ext}`, `{base}_400x533.webp`} and ignores `object-not-found` | `gS`, `_O` (then `navigate("/gallery")`) |
| `BP` @854,573 | `updateSketchVisibility` | `updateDoc {isPublic}` | `gS`, `_O` |
| `VP` @854,711 | `updateSketchTags` | `updateDoc {tags: [] or tags}` | `gS`, `_O` |
| `pS` @854,853 | `toggleBookmark` | `getDoc(bookmark_uid_orig)`: exists → `deleteDoc` → false; else `setDoc` (payload above) → true. Logs the payload to the console | `gS`, `_O`, `Wte` |
| `zP` @855,524 | `getSavedSketches` | `userId==uid` (same query as `j8`), keeps `isBookmark===true` | `QP` tab "saved", `aq` (builds a set of `originalSketchId`s already saved) |
| `hS` @855,897 | `checkIsBookmarked` | `getDoc(sketches/bookmark_{uid}_{id})` → exists. Permission errors → false | `gS`, `_O`, `Wte` |
| `GP` @856,099 | `getSketchById` | `getDoc(sketches/id)`; private and not owner → `permission-denied` (UI: "This sketch is private or restricted.") | `_O`, `Wte` |
| `B8` @856,389 | `getRelatedSketches` (firebase.ts:1310) | verse: `isPublic, type=="verse", [promptData.font_style==fs], orderBy createdAt desc, limit n+1`; scene: `isPublic, age_group==, art_style==, orderBy createdAt desc, limit n+1` (scene with no ageGroup → `[]`). Empty or error → client-scored fallback over `UP()`/`jP()` (up to 50 docs). **The verse branch is bundle only** | `mq` RelatedSketches (lazy: IntersectionObserver, rootMargin 200px, n=8), rendered by `_O` |

Not in the bundle (old source only): `updateSketchImage` (firebase.ts:636), `downloadImageAsBlob` (1272), `getTransactionHistory`, and the `registerUser` photo upload (firebase.ts:246: the bundle's `N8(email,pass,name)` takes no photo; the photo moved to the profile-completion modal `uq`).

All `sketches` queries are covered by `firestore.indexes.json` (isPublic+createdAt; +age_group; +age_group+art_style; +art_style; +book; +type; tags CONTAINS; +font_style+type). `userId==X[,isPublic==true]` is equality-only and needs no composite index.

### 2.3 Storage

| Where | Path | Op / metadata |
|---|---|---|
| `T8` @841,295 (profile photo) | `user_uploads/{uid}/profile_{Date.now()}.webp` | Client resize to at most 96 px (`v8`, canvas → webp 0.85), `uploadBytes` `{contentType:"image/webp"}`, `getDownloadURL`. Retries 3× (1 s, 2 s) on `storage/unauthorized` (token propagation race) |
| `P8` @846,836 (sketch) | `user_uploads/{uid}/sketches/{Date.now()}.{png|jpg}` | Data URLs are redrawn onto a white canvas → PNG (`M8`, needs no CORS because they are data URLs); `uploadString(ref, dataUrl, "data_url", meta)` or `uploadBytes(blob, meta)`; meta `{contentType, contentDisposition:'attachment; filename="bible-sketch.{ext}"'}`. The Content-Disposition is what makes `_O`'s cross-origin `<a download>` actually download |
| `PP` @845,101 | `user_uploads/{uid}` | recursive `listAll` + `deleteObject` (account deletion) |
| `FP` | sketch + thumbnail variants | `deleteObject` |
| `lo` LazyImage @904,755 (effect @905,197) | `thumbnailPath` (else predicted `{base}_400x533.{ext}` from `storagePath`) | `getDownloadURL` per card, fallback to `src` (`imageUrl`). One extra Storage metadata request per thumbnail on every grid |
| static | `https://firebasestorage.googleapis.com/v0/b/coloring-book-bce53.firebasestorage.app/o/sketches%2Fbible-sketch-coloring-page.webp?...` @943,764 | Example image on the home page, served from **another Firebase project's** bucket (`coloring-book-bce53`) |

The `_400x533` thumbnails are never written by the client: something server-side creates them (likely the Resize Images extension; not in this repo, unverified). The client predicts their names.

### 2.4 Callable functions and external URLs

- **`generateContent`** is the only callable: `Xc` @860,127 = `httpsCallable(LP,"generateContent",{timeout:540000})(payload)` → `.data` (a Gemini `GenerateContentResponse`). `Zc` @860,195 retries up to 5× with backoff from 3 s on 429/503/500/"exhausted"/"overloaded"/"quota". Every retry counts against the server's daily limit (`functions/index.js:286-315`).
  Payload `{model, contents, config}`. Models `Fc` @263,978: `ARCHITECT/CRITIC:"gemini-2.5-flash"`, `ARTIST:"gemini-3-pro-image-preview"`. Both are still in the server `ALLOWED_MODELS` (`functions/index.js:246`).
  | Fn | Model | contents | config |
  |---|---|---|---|
  | `z8` (alias `$8`) scene architect @860,621 | ARCHITECT | text prompt | `responseMimeType:"application/json"` → `{positive_prompt, negative_prompt, validation_criteria, reasoning}` or `{error:"INVALID_REFERENCE"}` |
  | `G8` scene artist @862,175 (via `H8` → `$P` post-process: 85 % scale on a white canvas + threshold 160) | ARTIST | `{role:"user", parts:[...refImages(inlineData), {text}]}` | `responseModalities:[IMAGE], imageConfig:{imageSize:"2K",aspectRatio:"3:4"}, safetySettings:[HATE_SPEECH BLOCK_MEDIUM_AND_ABOVE]` |
  | `T_` edit @864,824 (→ `V8` threshold) | ARTIST | `[{text}, {inlineData:{mimeType, data: base64 stripped from a data URL}}]` | same image config |
  | `Y8` verse architect @866,701 | ARCHITECT | text | JSON |
  | `W8` verse artist @870,360 | ARTIST | refs + text | image config |
  | `K8` verse critic @872,678 | CRITIC | text + PNG | JSON; on error returns `{passed:true}` |
  The scene pipeline has **no critic** (the old `generateWithGoldenPipeline`, gemini.ts:349, did). The verse pipeline `X8` @874,048 = `q8` bible-api → `Y8` → up to 2 × (`W8` → `$P` → `K8`). Verse rules `Ys` @272,477: EMBLEM ≤5 words, STACK ≤15, SCROLL ≤29; `MAX_WORDS:30` → `VERSE_TOO_LONG`.
- **Style references** (same origin, fetched → base64 inline parts): `i5` @264,092 maps `{ageGroup}_{artStyle}` → `/references/*.jpg` (for example `toddler-sundayschool(-2).jpg`, `adult-doodle(-2).jpg`); `u5` @274,563 maps verse font → `/references/verse-{elegant|modern|playful|classic}.jpg`. They live in `hosting-public/references/`, and the rebuild must keep serving them at `/references/`. The code strips a stray `77+9` (UTF-8 BOM/replacement) prefix from the base64.
- **bible-api.com** `q8` @866,317: `GET https://bible-api.com/{encodeURIComponent("Book+ch:vs")}?translation=web` → `.text`; non-OK or empty → `INVALID_REFERENCE`. Verse art only; the start verse only (it ignores endVerse).
- **Zoho Billing** (navigation, not fetch) in `ene` @~2,017,500: `window.location.href = {planUrl}{?|&}cf_cf_firebase_uid={uid}&redirect_url={origin}/pricing?{subscription=success|purchase=spark|torch|beacon}`. Plan URLs: premium `.../c4eda214…c2f/bible-sketch-premium`, spark `.../…d445/Spark?addon_code[0]=20credits&addon_quantity[0]=20`, torch `.../…e6f3/Torch?addon_code[0]=80credits…80`, beacon `.../…5eda/200credits?addon_code[0]=200credit…200` (full URLs identical to `App.tsx:137-140`). Customer portal: `https://billing.zohosecure.ca/portal/biblesketch` (`<a target=_blank>` in `cq` @978,555 and `fq` @1,014,973).
- **Share popups** (`window.open`, `$r` @909,107 600×700): `https://www.facebook.com/sharer/sharer.php?u=`, `https://pinterest.com/pin/create/button/?url=&media=&description=` (6 call sites: `gS` 914,743, `aq` 930,218, `QP` 953,052, `_O` 1,032,881, `Aq` 1,051,758, `Rq` 1,066,642), `https://twitter.com/intent/tweet` (blog `Xte` @1,996,452). Clipboard: `_O` @1,033,117, `Xte`.
- No other `fetch(` calls in app code (3 in total: two reference loaders and bible-api). Blog content is bundled; nothing is fetched.

### 2.5 Auth

- Providers: email/password (`N8` register, `I8` login), Google popup (`k8`), **anonymous** (`A8` @842,696: `signInAnonymously` whenever the auth state is null, unless `localStorage.anon_auth_disabled==="true"`; it sets that flag when the project rejects anonymous sign-in). `sendPasswordResetEmail` (`C8`). No email-link, One Tap or redirect flow.
- Register `N8` @843,188: create user → `updateProfile({displayName})` → `uS(user,{displayName},true)` → `sendEmailVerification(user,{url: origin+"/verified"})` → `signOut`. On error it deletes the new Auth user (rollback). The user doc write happens right after `createUser`: this is the race in ROADMAP 1.1 (write fails, so the Welcome Bonus is missing).
- Login `I8`: unverified email → `signOut` and throw `auth/email-not-verified` (the modal shows `verification_sent`). Success → `uS(user,{},false)`, then removes `anon_auth_disabled`.
- Auth listener `L8` @845,685 wraps `onAuthStateChanged`: a user who is not email-verified, not Google (`providerData[0].providerId!=="google.com"`) and not anonymous gets **signed out** and reported as null.
- `ene` @2,016,39x: a non-anonymous user subscribes `R8` (users doc snapshot → merged into the `user` state; sets `userDataLoaded`; `profileComplete===false && !photoURL` → opens the profile-completion modal `uq`). Null → unsubscribe, then `A8()` (anonymous). `requireAuth` `X(action, view="login")`: runs now if `user && userDataLoaded`; otherwise stores the action and opens `lq`; the pending action runs once both are true. `Y` = `X(action,"login")`. Logout `D8` = `signOut` (called in `ene` @2,019,093).
- The server rejects anonymous and unverified callers of `generateContent` (`functions/index.js:323-329`).

### 2.6 Web storage and cookies

| Key | Where | Semantics |
|---|---|---|
| `localStorage.anon_auth_disabled` | `A8` set, `I8`/`k8` remove | `"true"` stops anonymous sign-in retries |
| `localStorage.blessedSketches` | read + write in `aq` @927,488/929,606, `QP` @949,895/952,484, `Aq` @1,050,080/1,051,247, `Rq` @1,064,764/1,066,059 | JSON array of sketch ids. Merged with `users.blessedSketchIds` to disable the bless button. Written optimistically before `Ip`, and never rolled back on failure. Not used by `_O`/`Wte`/`gS` |
| `localStorage.pinterest_epik` | `Qte` @2,015,508 (in `ene` mount effect) | `{value, expiry: now+7d}` from `?epik=` |
| cookie `_epik` | same | `_epik={epik}; max-age=604800; path=/; SameSite=Lax` (for Pinterest CAPI via Zaraz) |
| Firebase Auth | SDK | indexedDB (fallback localStorage/sessionStorage) |

No `sessionStorage` use by the app. Old source matches for `blessedSketches` (`components/Gallery.tsx:189,397`, `FeaturedSection.tsx:65,220`, `TagPage.tsx:98,180`, `VerseFeaturedSection.tsx:73,172`) and epik (`App.tsx:43`).

## 3. Which page touches what

Component → route (routes from `ene` @~2,019,400): `/` = `Iq` (JSON-LD only) + `iq` (generator, contains `aq`); `/bible-verse-coloring` = `Lq` (contains `Rq`); `/gallery` = `QP`; `/profile/:uid` = `Jte` → `QP{publicProfileId}`; `/tags/:tagId` = `Aq`; `/coloring-page/...` = `_O` (contains `mq`); `/blog/:slug` = `Xte` (markdown `sketch:ID` placeholders render `Wte`, `[CTA_PLACEHOLDER]` renders `Kte`); `/pricing` = `fq`; the `/verified`, `/terms`, `/privacy` and `/about` pages have no data calls. Shared: `gS` = sketch modal (used by `aq`, `QP`, `Rq`), `qP` = result/editor view after generation (used by `iq`, `Lq`), `sg` = ArtistBadge, `lo` = LazyImage, `lq`/`cq`/`uq` = auth/profile/profile-completion modals.

| Page | Reads at load | Writes / actions |
|---|---|---|
| `/` (`iq`+`aq`) | `U8` (all public docs), `jP`, `Wc(uid)`, `zP(uid)`, `sg`→`ol` per card, `lo`→`getDownloadURL` per card | generate (`$8`,`H8`, `ig`), save (`dS`), bless (`Ip`), modal `gS` actions |
| `/bible-verse-coloring` (`Lq`+`Rq`) | `UP(uid)`, `Wc`, `sg`/`lo` | `X8` (bible-api + 3–5 Gemini calls), `ig`, `dS(type:"verse")`, `Ip` |
| `/gallery`, `/profile/:uid` (`QP`) | `ol(profileId)`, one of `F8` / `j8` / `zP` / `mm`, `Wc`, `sg`/`lo` | load more (`mm` cursor), `Ip`, `gS` actions |
| `/tags/:tagId` (`Aq`) | `mm({tag,...})`, `Wc` | load more, `Ip` |
| coloring page (`_O`) | `GP(id)`, `ol(author)`, `Wc`, `hS`, `Ec` (on print/download), `mq`→`B8` (lazy) | `pS`, `Ip`, `BP`, `VP`, `FP`, print/download (`fm`) |
| `/blog/:slug` (`Wte` cards) | `GP`, `ol`, `Wc`, `hS` per embedded sketch | `Ip`, `pS` |
| `/pricing` (`fq`) | none (reads `user.isPremium` from the shell state) | Zoho redirect (shell `D`), zaraz |
| shell (`ene`) | `onAuthStateChanged`, `onSnapshot(users/uid)` | `signInAnonymously`, `signOut` |
| modals | `cq`: `ol(uid)` | `cq`: `MP`, `O8`; `uq`: `MP`, `bO`; `lq`: `N8`/`I8`/`k8`/`C8` |

## 4. Credit and download charging (client-side; see ROADMAP 1.1)

| Action | Where | Charge | Order |
|---|---|---|---|
| Generate scene | `iq` @936,800 | `ig(uid,1,"Generated: {book} {ch}")` | **after** `$8`+`H8` succeed. Pre-check `user.credits<1` → "Out of Credits" modal |
| Generate verse | `Lq` @1,076,542 | `ig(uid,1,"Verse Art: {book} {ch}:{vs}")` | after `X8` passes (up to 5 Gemini calls per charge) |
| Refine ("Make changes") | `qP` `H` @885,978 | `ig(uid,1,"Refined Sketch")` | **before** `T_`, no refund |
| Remove Color | `qP` `F` @886,350 | none | `T_(img,"Make the image black and white")`: a free image call |
| Add reference text | `qP` `ge` → `J8` | none | local canvas |
| Gallery AI edit | `gS` `Jt` @912,960 | `ig(uid,1,"Edited Sketch: …")` | before `T_(n.imageUrl)`. It passes a **Storage URL** where a data URL is expected (the regex strip fails, so the "base64" is the URL): it always fails, and the credit is lost |
| Download / Print | `gS` @911,2xx/912,0xx, `_O` @1,031,5xx/1,032,1xx | `fm` (`downloadsRemaining-1`, premium free) | **after** the file is opened; `Ec` pre-check → PremiumModal `KP` |

Server side, `generateContent` only checks `credits>=1` (`functions/index.js:347-349`), plus 60 image / 300 text calls per uid per day and 500 global images per day. The server never deducts.

## 5. Rules cross-check (`firestore.rules`, `storage.rules`)

| Client write | Rule | Verdict |
|---|---|---|
| `uS` `setDoc users/uid` (create) | keys `hasOnly` the 12 listed; credits==5, downloads==5, isPremium false, blessed empty, name ≤100, photo from firebasestorage or `lh3.googleusercontent.com` | Allowed. Fails in the register race (token not yet propagated). The `...extra` spread only ever adds listed keys. `onUserCreated` then deletes `email` (functions/index.js:3407), and a tombstone restores balances |
| `uS` `setDoc` on a Google `isNewUser` | same `create` rule; a `set` over an existing doc would be an **update** with changed `credits` etc. | Only for new users, so it is a create. OK |
| `ig` credits decrement / `fm` downloads decrement | `userUpdateAllowed`: after ≤ before, ≥0 | Allowed |
| `MP` / `bO` profile fields | `displayName, photoURL, photoFileName, storagePath, updatedAt, profileComplete` | Allowed (photo URL from firebasestorage) |
| `Ip` `arrayUnion` blessedSketchIds + sketch `blessCount` increment | `hasAll(before)` / `blessCount == old+1`, only key | Allowed. The sketch bless branch requires an existing numeric `blessCount` (all client writes set 0) |
| `O8` `deleteDoc users/uid` | `allow delete: isOwner` | Allowed |
| `addTransaction` bonus (+5) / usage (−1) | type/amount pinned, `userId==uid` | Allowed. A client can create unlimited bonus rows (audit noise only, no balance effect) |
| `dS` `addDoc sketches` | `userId==auth.uid`, `blessCount==0` | Allowed. Anonymous users pass the rule too (UI-gated only) |
| `pS` `setDoc sketches/bookmark_…` / `hS` get of a missing doc | create rule / `isBookmarkOwner` regex | Allowed |
| `BP` / `VP` | owner, keys ⊆ {isPublic, tags} | Allowed |
| `FP` / bookmark delete | `isOwner(resource.data.userId)` | Allowed |
| queries `userId==uid` (`j8`,`zP`) | read if `isOwner(resource.data.userId)` | Allowed (the rule is provable from the query). Unauthenticated calls are UI-gated |
| `isPublic==true` queries | `resource.data.isPublic==true` | Allowed |
| users reads (`ol`,`Wc`,`Ec`, snapshot) | `allow get: if true`, no list | Allowed. Any user doc (credits, isPremium, blessedSketchIds) is world-readable by uid |
| Storage uploads `user_uploads/{uid}/profile_*.webp`, `/sketches/*` | owner, <15 MB, `image/*` | Allowed |
| `lo` `getDownloadURL` on another user's thumbnail | `sketches/**` `allow get: if true` | Allowed. Profile photos are owner-read only, but their tokenized URLs work anyway |
| `PP` `listAll` of own folder, `deleteObject` | owner read/write, `request.resource==null` | Allowed |

## 6. Tracking

`zaraz` (Cloudflare Zaraz, injected at the edge, not in the bundle; always guarded by `typeof zaraz<"u"`). There are **no `pintrk` calls**; Pinterest runs only through Zaraz and the `_epik` cookie. The old source has no zaraz (bundle only).

| Offset | Call | Payload | Trigger |
|---|---|---|---|
| 964,800 | `zaraz.track("CompleteRegistration")` | `{em:email, external_id:uid}` | `lq` Google sign-in while the modal is in `signup` view. **Not** fired for email sign-up |
| 1,010,362 | `zaraz.ecommerce("Order Completed")` | `{value:4.99, currency:"USD", order_id: order_id‖"premium_{ts}", products:[{product_id:"premium",name:"Premium Subscription",price:4.99}]}` | `fq` mount with `?subscription=success` |
| 1,010,534 | `zaraz.track("Purchase")` | `{value:4.99,currency,order_id,em,external_id:uid,event_id: order_id‖"purchase_{uid}_{ts}"}` | same |
| 1,010,911 / 1,011,108 | `ecommerce("Order Completed")` / `track("Purchase")` | pack price `{spark:4.99,torch:14.99,beacon:29.99}`, `product_id:pack`, `name:"{Pack} Credit Pack"`, order_id fallback `pack_{pack}_{ts}` | `?purchase={pack}`. The URL params are then cleared (`setSearchParams({})`) |
| 2,018,070 | `zaraz.ecommerce("Product Added")` | `{value:price,currency,products:[{product_id:plan,name,price}]}` | shell checkout handler, before the Zoho redirect |
| 2,018,223 | `zaraz.track("AddToCart")` | `{value,currency,content_name,em,external_id:uid,event_id:"addtocart_{uid}_{ts}"}` | same |

Anyone who opens `/pricing?purchase=beacon` fires a $29.99 Purchase conversion: there is no server confirmation, and `order_id` is only taken from `?order_id=` (not verified).

## 7. Bugs and oddities (data layer)

1. The client charges credits; see §4 and ROADMAP 1.1 (refine and gallery edit charge before failing, Remove Color is free, the gallery edit always fails because it sends a URL as base64, two tabs at 1 credit).
2. `cq` ProfileModal @976,586 reads `M.downloads ?? 0`, a field that does not exist, so it always shows 0 (should be `downloadsRemaining`). This is in ROADMAP 1.1.
3. Registration race: `uS` right after `createUser` fails, and the doc is later created by `I8`'s non-new path **without** the Welcome Bonus transaction (ROADMAP 1.1, 1.3).
4. `U8` downloads every public sketch doc just to show a count on the home page. This costs reads and grows with the collection; use `getCountFromServer` or a server-rendered number.
5. Account deletion leaves the `sketches` docs, both public (broken images in the gallery and sitemap) and bookmarks.
6. Bookmarks copy `imageUrl`/paths; deleting the original breaks the images of other users' bookmarks.
7. `blessedSketches` in localStorage is set optimistically and never reverted; `ALREADY_BLESSED` is swallowed, while local counts still went +1.
8. `UP` hides the viewer's own verse art from the verse community strip; `jP` hides all verse art from the home strip (bundle-only filters).
9. `mm` pushes only one `where` to the server and filters the rest client-side, so filtered pages can come back short (it fetches `pageSize+10` to compensate); `hasMore` can be wrong.
10. `$P`/`V8`/`yO`/`M8` use canvas with `crossOrigin="anonymous"`. `yO` (download and print in `gS`) loads the Storage URL with `?t=` cache-busting; with no bucket CORS the canvas is tainted, and it falls back to the raw URL (memory note "Storage CORS").
11. Print opens `window.open` after an `await` (popup blockers); ROADMAP 1.2.
12. Anonymous sessions are created for every signed-out visitor (`A8`), which creates Auth users at scale. The rules let anonymous users create `sketches` and `users/{anonUid}` docs; only the UI and `generateContent` block them.
13. `pS` and the generate paths leave heavy `console.log` output (bookmark payload, timings).
14. Home example image is hosted in the foreign bucket `coloring-book-bce53`.
15. Purchase conversions are client-trusted from URL params (§6).

## 8. Rebuild notes

- **Server-renderable (public, no auth):** all `isPublic==true` queries (`jP`, `UP`, `mm` first page, `F8`, `B8`, `GP` for public docs, `ol` for author name/photo). The render functions already run the same queries (`functions/index.js:598, 755/802, 902-962, 1179-1195, 1605, 1753, 1943`). Use the Firestore REST API from the Worker (or a cached JSON endpoint) and resolve thumbnails to URLs at render time instead of one `getDownloadURL` per card (`lo`). The public-token URL format `https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media` works without a token for `sketches/**` because of `allow get: if true`.
- **Must stay client-side (islands):** auth state and the `users/{uid}` snapshot (credits badge, profile modal), bless state (`Wc` + localStorage), bookmark state (`hS`), owner controls (`BP`/`VP`/`FP`), "my" and "saved" galleries, generation, print/download counting.
- **Keep exact contracts** while the live bundle and the rebuild coexist (phased rollout): the sketch doc shape (§2.2), the bookmark id format `bookmark_{uid}_{id}`, the Storage paths and `_400x533` thumbnail naming, `contentDisposition`, the `transactions` row shape, the `generateContent` payload (`{model, contents, config}` with the allowed config keys), and the Zoho `cf_cf_firebase_uid` + `redirect_url` params (the webhook maps credits by uid).
- **Credits:** do not move charging server-side until the old bundle stops calling `ig` (double charge); ROADMAP 1.1.
- **Auth domain:** keep `/__/auth/handler` reachable on `biblesketch.app` (proxy to `firebaseapp.com`) or change `authDomain` together with the OAuth redirect URIs.
- **Anonymous auth:** the rebuild does not need it for public reads (the rules allow unauthenticated `get` and public queries). Dropping `A8` removes needless Auth users. Check first whether Zaraz or anything else relies on it (nothing in the bundle does).
- **Index needs:** unchanged if the queries are kept; `getCountFromServer` for the count needs no new index.
- **Risks:** `gemini-3-pro-image-preview` shutdown (ROADMAP S0); the `/references/*.jpg` paths must stay same-origin; world-readable user docs (`allow get: if true`) expose credits and premium status. Email is already stripped server-side.
