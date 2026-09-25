const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { GoogleGenAI } = require("@google/genai");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Initialize admin if not already done
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Define the secret for the API key
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// --- HELPER: Generate SEO Slug (Matches Frontend Logic) ---
const generateSketchSlug = (data) => {
    if (!data.promptData) return 'bible-sketch';
    const { book, chapter, start_verse, end_verse } = data.promptData;
    let slug = `${book}-${chapter}-${start_verse}`;
    if (end_verse && end_verse > start_verse) {
        slug += `-${end_verse}`;
    }
    return slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

// --- HELPER: Get Thumbnail URL from Storage Path ---
const getThumbnailUrl = (thumbnailPath, imageUrl) => {
    if (!thumbnailPath) return imageUrl;
    
    // If thumbnailPath ends with _400x533.png, construct Firebase Storage URL
    if (thumbnailPath.includes('_400x533')) {
        const bucket = 'biblesketch-5104c.firebasestorage.app';
        // Encode the path for URL
        const encodedPath = encodeURIComponent(thumbnailPath);
        return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
    }
    
    // Fallback to imageUrl if thumbnailPath doesn't match expected format
    return imageUrl;
};

const BUCKET = 'biblesketch-5104c.firebasestorage.app';
// Same prediction the client's saveSketch/LazyImage make: <original>_400x533.<ext>
const thumbPathOf = (s) => s.thumbnailPath || (s.storagePath && s.storagePath.replace(/(\.[^./]+)$/, '_400x533$1'));
// The exact URL the client's getDownloadURL() builds (first token), so the browser reuses the download.
// Falls back when the object or its token is missing (e.g. the thumbnail isn't generated yet).
const storageUrl = async (path, fallback) => {
    if (!path) return fallback;
    try {
        const [meta] = await admin.storage().bucket(BUCKET).file(path).getMetadata();
        const token = meta.metadata?.firebaseStorageDownloadTokens?.split(',')[0];
        return token
            ? `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${encodeURIComponent(token)}`
            : fallback;
    } catch (e) {
        console.warn('[storageUrl]', path, e.code || e.message);
        return fallback;
    }
};

// --- HELPER: Extract Sketch IDs from Markdown ---
const extractSketchIds = (markdown) => {
    if (!markdown) return [];
    const regex = /<<sketch="([^"]+)">>/g;
    const ids = [];
    let match;
    while ((match = regex.exec(markdown)) !== null) {
        ids.push(match[1]);
    }
    return [...new Set(ids)]; // Remove duplicates
};

// --- HELPER: Escape HTML ---
const escapeHtml = (str) => {
    if (str === null || str === undefined) return '';
    // Convert to string if not already
    const strValue = String(str);
    return strValue
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};


// --- HELPER: JSON-LD safe to embed in <script> (user text can't close the tag) ---
const jsonLd = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

// --- HELPER: Convert Markdown to HTML for SSR ---
const markdownToHtml = (markdown) => {
    if (!markdown) return '';
    
    let html = markdown;
    
    // Remove sketch embeds (<<sketch="id">>)
    html = html.replace(/<<sketch="[^"]+">>/g, '');
    
    // Remove CTA placeholders (<<CTA>>)
    html = html.replace(/<<CTA>>/g, '');
    
    // Remove horizontal rules (---)
    html = html.replace(/^---+$/gm, '');
    
    // Convert tables first (before other processing)
    html = html.replace(/\|(.+)\|\n\|[:\s\-|]+\|\n((?:\|.+\|\n?)+)/g, (match, header, rows) => {
        const headerCells = header.split('|').filter(c => c.trim()).map(c => c.trim());
        const rowLines = rows.trim().split('\n').filter(r => r.trim());
        const tableRows = rowLines.map(row => {
            const cells = row.split('|').filter(c => c.trim()).map(c => c.trim());
            return '<tr>' + cells.map(cell => `<td style="padding:8px 12px;border:1px solid #e5e7eb;">${cell}</td>`).join('') + '</tr>';
        }).join('');
        return '<table style="width:100%;border-collapse:collapse;margin:24px 0;"><thead><tr>' + 
               headerCells.map(h => `<th style="padding:12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;text-align:left;">${h}</th>`).join('') + 
               '</tr></thead><tbody>' + tableRows + '</tbody></table>';
    });
    
    // Convert headers (## -> <h2>, ### -> <h3>, etc.)
    html = html.replace(/^#### (.*)$/gm, '<h4 style="font-size:1rem;font-weight:600;color:#374151;margin-top:24px;margin-bottom:12px;">$1</h4>');
    html = html.replace(/^### (.*)$/gm, '<h3 style="font-size:1.25rem;font-weight:600;color:#374151;margin-top:32px;margin-bottom:16px;">$1</h3>');
    html = html.replace(/^## (.*)$/gm, '<h2 style="font-size:1.5rem;font-weight:600;color:#374151;margin-top:40px;margin-bottom:20px;">$1</h2>');
    
    // Convert bold (**text** -> <strong>)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert italic (*text* -> <em>)
    // Note: Bold already converted, so remaining * are italic
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    
    // Convert links ([text](url) -> <a>)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#7c3aed;text-decoration:none;">$1</a>');
    
    // Process line by line for lists and paragraphs
    const lines = html.split('\n');
    const processed = [];
    let inUnorderedList = false;
    let inOrderedList = false;
    let listItems = [];
    
    lines.forEach((line) => {
        const trimmed = line.trim();
        
        // Check for unordered list item
        const ulMatch = trimmed.match(/^[\*\-\+] (.+)$/);
        if (ulMatch) {
            if (!inUnorderedList) {
                if (inOrderedList) {
                    processed.push('</ol>');
                    inOrderedList = false;
                }
                inUnorderedList = true;
                listItems = [];
            }
            listItems.push(ulMatch[1]);
            return;
        }
        
        // Check for ordered list item
        const olMatch = trimmed.match(/^\d+\. (.+)$/);
        if (olMatch) {
            if (!inOrderedList) {
                if (inUnorderedList) {
                    processed.push('<ul style="list-style:disc;padding-left:24px;margin:16px 0;">');
                    listItems.forEach(item => processed.push(`<li style="margin-bottom:8px;">${item}</li>`));
                    processed.push('</ul>');
                    inUnorderedList = false;
                }
                inOrderedList = true;
                listItems = [];
            }
            listItems.push(olMatch[1]);
            return;
        }
        
        // Close any open list
        if (inUnorderedList && listItems.length > 0) {
            processed.push('<ul style="list-style:disc;padding-left:24px;margin:16px 0;">');
            listItems.forEach(item => processed.push(`<li style="margin-bottom:8px;">${item}</li>`));
            processed.push('</ul>');
            listItems = [];
            inUnorderedList = false;
        }
        if (inOrderedList && listItems.length > 0) {
            processed.push('<ol style="list-style:decimal;padding-left:24px;margin:16px 0;">');
            listItems.forEach(item => processed.push(`<li style="margin-bottom:8px;">${item}</li>`));
            processed.push('</ol>');
            listItems = [];
            inOrderedList = false;
        }
        
        // Process regular lines
        if (trimmed && !trimmed.startsWith('<')) {
            processed.push(`<p style="color:#374151;line-height:1.75;margin-bottom:16px;">${trimmed}</p>`);
        } else if (trimmed) {
            processed.push(trimmed);
        }
    });
    
    // Close any remaining lists
    if (inUnorderedList && listItems.length > 0) {
        processed.push('<ul style="list-style:disc;padding-left:24px;margin:16px 0;">');
        listItems.forEach(item => processed.push(`<li style="margin-bottom:8px;">${item}</li>`));
        processed.push('</ul>');
    }
    if (inOrderedList && listItems.length > 0) {
        processed.push('<ol style="list-style:decimal;padding-left:24px;margin:16px 0;">');
        listItems.forEach(item => processed.push(`<li style="margin-bottom:8px;">${item}</li>`));
        processed.push('</ol>');
    }
    
    return processed.join('\n');
};

// --- HELPER: Constants (Mirrored from Frontend) ---
const AGE_GROUPS = ["Toddler", "Young Child", "Teen", "Adult"];
const ART_STYLES = ["Sunday School", "Stained Glass", "Iconography", "Comic Book", "Classic", "Doodles"];
const VERSE_FONT_STYLES = ["Elegant Script", "Modern Brush", "Playful", "Classic Serif"];

// Liturgical tags for static sitemap generation and SSR
const LITURGICAL_TAGS = [
  // Liturgical Seasons
  { id: 'advent', label: 'Advent', category: 'season' },
  { id: 'christmas', label: 'Christmas', category: 'season' },
  { id: 'epiphany', label: 'Epiphany', category: 'season' },
  { id: 'lent', label: 'Lent', category: 'season' },
  { id: 'holy-week', label: 'Holy Week', category: 'season' },
  { id: 'easter', label: 'Easter', category: 'season' },
  { id: 'pentecost', label: 'Pentecost', category: 'season' },
  { id: 'ordinary-time', label: 'Ordinary Time', category: 'season' },

  // Themes
  { id: 'creation', label: 'Creation', category: 'theme' },
  { id: 'the-fall', label: 'The Fall', category: 'theme' },
  { id: 'exile', label: 'Exile', category: 'theme' },
  { id: 'prophets', label: 'Prophets', category: 'theme' },
  { id: 'miracles', label: 'Miracles', category: 'theme' },
  { id: 'parables', label: 'Parables', category: 'theme' },
  { id: 'resurrection', label: 'Resurrection', category: 'theme' },
];

// --- generateContent guards ---
// Only the models the app uses; the value is the kind of call.
const ALLOWED_MODELS = {
    'gemini-2.5-flash': 'text',
    'gemini-3.1-pro-preview': 'text',
    'gemini-3-pro-image-preview': 'image',
    'gemini-3.1-flash-image': 'image',
};
const ALLOWED_CONFIG_KEYS = ['responseMimeType', 'responseModalities', 'imageConfig', 'safetySettings'];
// ponytail: fixed daily caps (client retries count too); raise here if real users hit them.
const DAILY_LIMITS = { image: 60, text: 300 };
const GLOBAL_DAILY_IMAGE_LIMIT = 500;
// Owner decision 2026-09-23: the master account batch-generates the Pinterest pages, so it gets its own higher
// image cap, outside the global pool (its batches never use up the users' share).
const MASTER_UID = 'TiAEiMqWxpWqxCLtoI5OgHAvtf33';
const MASTER_DAILY_IMAGE_LIMIT = 250;
const MAX_PARTS = 12;
const MAX_TEXT_CHARS = 60000;
const MAX_INLINE_CHARS = 9 * 1024 * 1024;

const validateContents = (contents) => {
    const list = Array.isArray(contents) ? contents : [contents];
    const parts = list.flatMap(c => (c && Array.isArray(c.parts)) ? c.parts : [null]);
    if (parts.length === 0 || parts.length > MAX_PARTS) {
        throw new HttpsError('invalid-argument', 'Invalid request contents.');
    }
    let textChars = 0;
    let inlineChars = 0;
    for (const part of parts) {
        if (part && typeof part.text === 'string') {
            textChars += part.text.length;
        } else if (part && part.inlineData && typeof part.inlineData.data === 'string'
            && /^image\//.test(part.inlineData.mimeType || '')) {
            const b64 = part.inlineData.data;
            // Check for "<!DOCTYPE" (PCFET0) or "<html" (PGh0bW) in base64
            if (b64.startsWith("PCFET0") || b64.startsWith("PGh0bW")) {
                throw new HttpsError('invalid-argument', 'A reference image failed to load and returned an HTML error page. Please check client-side file paths.');
            }
            inlineChars += b64.length;
        } else {
            throw new HttpsError('invalid-argument', 'Invalid request contents.');
        }
    }
    if (textChars > MAX_TEXT_CHARS || inlineChars > MAX_INLINE_CHARS) {
        throw new HttpsError('invalid-argument', 'Request is too large.');
    }
    return list;
};

// Counts this call against the user's and the global daily limits. Throws when a limit is hit.
// Calls are counted before Gemini runs, so failed and retried calls count too.
const reserveDailyCall = async (uid, kind) => {
    const db = admin.firestore();
    const day = new Date().toISOString().slice(0, 10);
    const expireAt = Timestamp.fromMillis(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const userRef = db.collection('rateLimits').doc(`${uid}_${day}`);
    const globalRef = db.collection('rateLimits').doc(`global_${day}`);

    await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        const master = uid === MASTER_UID && kind === 'image';
        const globalSnap = kind === 'image' && !master ? await tx.get(globalRef) : null;
        const userCount = (userSnap.exists && userSnap.get(kind)) || 0;
        if (userCount >= (master ? MASTER_DAILY_IMAGE_LIMIT : DAILY_LIMITS[kind])) {
            throw new HttpsError('resource-exhausted', 'Daily generation limit reached. Please try again tomorrow.');
        }
        if (globalSnap) {
            const globalCount = (globalSnap.exists && globalSnap.get('image')) || 0;
            if (globalCount >= GLOBAL_DAILY_IMAGE_LIMIT) {
                console.error(`Global daily image limit (${GLOBAL_DAILY_IMAGE_LIMIT}) reached`);
                throw new HttpsError('unavailable', 'Generation is paused for today. Please try again tomorrow.');
            }
            tx.set(globalRef, { image: globalCount + 1, expireAt }, { merge: true });
        }
        tx.set(userRef, { [kind]: userCount + 1, expireAt }, { merge: true });
    });
};

exports.generateContent = onCall({
    secrets: [geminiApiKey],
    cors: true,
    timeoutSeconds: 300,
    memory: "1GiB"
}, async (request) => {
    // 1. Only signed-in, verified, non-anonymous users (the UI already requires this).
    const token = request.auth && request.auth.token;
    if (!token || token.firebase?.sign_in_provider === 'anonymous') {
        throw new HttpsError('unauthenticated', 'Please sign in to create sketches.');
    }
    if (token.email_verified !== true) {
        throw new HttpsError('permission-denied', 'Please verify your email address first.');
    }
    const uid = request.auth.uid;

    // 2. Validate the request: known model, known config keys, bounded contents.
    const { model, contents, config } = request.data || {};
    const kind = ALLOWED_MODELS[model];
    if (!kind || !contents) {
        throw new HttpsError('invalid-argument', 'Invalid request.');
    }
    if (config !== undefined && (typeof config !== 'object' || config === null
        || Object.keys(config).some(k => !ALLOWED_CONFIG_KEYS.includes(k)))) {
        throw new HttpsError('invalid-argument', 'Invalid request config.');
    }
    const requestContents = validateContents(contents);

    // 3. Image calls need at least one credit. The client still deducts it after generating.
    if (kind === 'image') {
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        if (!userDoc.exists || !(userDoc.get('credits') >= 1)) {
            throw new HttpsError('failed-precondition', 'INSUFFICIENT_CREDITS');
        }
    }
    await reserveDailyCall(uid, kind);

    try {
        const genai = new GoogleGenAI({ apiKey: geminiApiKey.value().trim() });
        console.log(`generateContent uid=${uid} model=${model} parts=${requestContents.reduce((n, c) => n + c.parts.length, 0)}`);

        const response = await genai.models.generateContent({
            model: model,
            contents: requestContents,
            config: config
        });

        // Convert to plain object so Firebase can serialize it
        return {
            candidates: response.candidates?.map(candidate => ({
                content: {
                    parts: candidate.content?.parts?.map(part => ({
                        text: part.text,
                        inlineData: part.inlineData ? {
                            mimeType: part.inlineData.mimeType,
                            data: part.inlineData.data
                        } : undefined
                    }))
                },
                finishReason: candidate.finishReason,
                safetyRatings: candidate.safetyRatings
            })),
            usageMetadata: response.usageMetadata
        };
    } catch (error) {
        console.error("Gemini API Error:", error);
        // Keep Gemini's message: the client retries on "overloaded"/"quota" wording.
        throw new HttpsError('internal', `Gemini Error: ${error.message}`);
    }
});

// ---------------------------------------------------------
// 1. SITEMAP (one Firestore scan, each URL in exactly one sub-sitemap)
// ---------------------------------------------------------
const SITE = 'https://biblesketch.app';
// Profiles need this many public sketches to be listed. Profiles with 0 are noindexed (profileRender), so
// every listed URL stays indexable.
const MIN_PROFILE_SKETCHES = 3;
const MAX_SITEMAP_URLS = 50000;
const keyPart = (s) => s.toLowerCase().replace(/ /g, '-');
const isoOf = (ts) => (ts && ts.toDate ? ts.toDate().toISOString() : null);
const newestOf = (dates) => dates.filter(Boolean).sort().pop() || null; // ISO strings sort by time

// Exactly one sub-sitemap per sketch; unknown values go to 'sketches-other' so no public sketch is dropped.
const sketchBucket = (s) => {
  const p = s.promptData || {};
  if (s.type === 'verse') return VERSE_FONT_STYLES.includes(p.font_style) ? `verses-${keyPart(p.font_style)}` : 'sketches-other';
  const age = p.age_group === 'Pre-Teen' ? 'Teen' : p.age_group;
  return AGE_GROUPS.includes(age) && ART_STYLES.includes(p.art_style) ? `${keyPart(age)}-${keyPart(p.art_style)}` : 'sketches-other';
};

const readBlogPosts = () => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'blog-posts.json'), 'utf-8')); }
  catch (e) { console.error('blog-posts.json:', e); return []; }
};

// One scan of public sketches -> Map of sub-sitemap key -> [{ loc, lastmod, image }], newest first.
// Only indexable URLs: no /terms, /privacy or /verified (noindex), no empty tags, no thin profiles.
const buildSitemapGroups = async () => {
  const snap = await admin.firestore().collection('sketches').where('isPublic', '==', true)
    .select('userId', 'type', 'promptData', 'tags', 'createdAt', 'imageUrl', 'isBookmark').get();
  const sketches = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => !s.isBookmark)
    .map((s) => ({ ...s, lastmod: isoOf(s.createdAt) }))
    .sort((a, b) => (b.lastmod || '').localeCompare(a.lastmod || ''));
  const posts = readBlogPosts();
  const groups = new Map(); // a Map, so ?type=constructor is a 404, not a crash
  const add = (key, loc, lastmod = null, image = null) => {
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ loc: SITE + loc, lastmod, image });
  };
  // Listing pages show the most-blessed sketches, not the newest, so they get no lastmod
  ['/', '/gallery', '/bible-verse-coloring', '/about', '/pricing'].forEach((p) => add('pages', p));
  add('blog', '/blog', newestOf(posts.map((p) => p.lastmod)));
  posts.forEach((p) => add('blog', `/blog/${p.slug}`, p.lastmod || null, p.coverImage ? SITE + p.coverImage : null));
  LITURGICAL_TAGS.forEach((t) => {
    const s = sketches.find((x) => Array.isArray(x.tags) && x.tags.includes(t.id));
    if (s) add('tags', `/tags/${t.id}`, s.lastmod);
  });
  const byUser = new Map();
  for (const s of sketches) {
    if (!s.userId) continue;
    if (!byUser.has(s.userId)) byUser.set(s.userId, []);
    byUser.get(s.userId).push(s);
  }
  byUser.forEach((list, uid) => {
    if (list.length >= MIN_PROFILE_SKETCHES) add('profiles', `/profile/${encodeURIComponent(uid)}`, list[0].lastmod);
  });
  sketches.forEach((s) => add(sketchBucket(s), `/coloring-page/${generateSketchSlug(s)}/${encodeURIComponent(s.id)}`, s.lastmod, s.imageUrl));
  return groups;
};

const urlXml = (u) => `<url><loc>${escapeHtml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}`
  + `${typeof u.image === 'string' && u.image.startsWith('https://') ? `<image:image><image:loc>${escapeHtml(u.image)}</image:loc></image:image>` : ''}</url>`;

exports.sitemap = onRequest(async (req, res) => {
  const type = String(req.query.type || 'index');
  try {
    const groups = await buildSitemapGroups();
    let xml;
    if (type === 'index') {
      xml = '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + [...groups].map(([key, urls]) => {
          const last = newestOf(urls.map((u) => u.lastmod));
          return `<sitemap><loc>${SITE}/sitemap.xml?type=${key}</loc>${last ? `<lastmod>${last}</lastmod>` : ''}</sitemap>`;
        }).join('')
        + '</sitemapindex>';
    } else if (groups.has(type)) {
      const urls = groups.get(type);
      // ponytail: truncates past 50k URLs per sub-sitemap; add &page=N chunking when a bucket nears that
      if (urls.length > MAX_SITEMAP_URLS) console.error(`sitemap ${type}: ${urls.length} URLs, truncated`);
      xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
        + urls.slice(0, MAX_SITEMAP_URLS).map(urlXml).join('') + '</urlset>';
    } else {
      return res.status(404).send('Sitemap not found'); // retired keys (recent, popular, *-comic) and empty groups
    }
    res.set('Content-Type', 'application/xml; charset=utf-8');
    // 1 h while the new structure settles; raise s-maxage to 21600 (6 h) once Search Console shows it clean
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(xml);
  } catch (error) {
    console.error('Sitemap Error:', error);
    return res.status(500).end();
  }
});

// ---------------------------------------------------------
// 2. SEO RENDERER (Social Previews + Canonical Tags)
// ---------------------------------------------------------

// Cache the index.html template in memory to reduce fetch calls/latency
// Note: Cache is cleared on each function cold start
// Version: 1.1 (Force update for index.html refresh)
let cachedIndexHtml = null;

// Helper to get index.html
async function getIndexHtml(baseUrl) {
  // Skip cache during initial development/debugging
  // if (cachedIndexHtml) return cachedIndexHtml;

  // 1. Try reading from local filesystem (Best for speed & stability)
  try {
    const localPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(localPath)) {
        const html = fs.readFileSync(localPath, 'utf8');
        console.log("[getIndexHtml] Loaded from local file system.");
        // Basic validation
        if (html.includes("<html")) {
            cachedIndexHtml = html;
            return html;
        }
    }
  } catch (fsError) {
    console.warn("[getIndexHtml] Local file read failed:", fsError);
  }

  try {
    // 2. Try local hosting URL first with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch(`${baseUrl}/index.html`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Failed to fetch local index.html: ${response.status}`);
    const html = await response.text();

    if (html.includes("<!doctype html") || html.includes("<html")) {
      cachedIndexHtml = html;
      return html;
    } else {
      throw new Error("Invalid HTML content");
    }
  } catch (e) {
    console.error("Primary fetch failed, trying fallback:", e);
    // Fallback to production URL if local fails (e.g. inside function emulator or weird routing)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch("https://biblesketch.app/index.html", { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("Fallback fetch failed");
      return await response.text();
    } catch (fallbackError) {
      console.error("All fetches failed:", fallbackError);
      // Absolute fallback
      return `<!doctype html><html lang="en"><head><meta charset="UTF-8"/><title>Bible Sketch</title></head><body><div id="root"></div><script>window.location.reload();</script></body></html>`;
    }
  }
}

const CANONICAL_ORIGIN = 'https://biblesketch.app';

// The SPA shell with a real status. The app still boots from it (createRoot ignores the status), so an
// owner opening their own private sketch still sees it; crawlers get 404 + noindex, or 503.
// cacheable: only for URLs that can't become public later (missing doc, unknown slug, tag or user).
const sendShell = async (res, status, cacheable = false) => {
  const html = await getIndexHtml(CANONICAL_ORIGIN);
  if (status === 404) res.set('X-Robots-Tag', 'noindex');
  if (status === 503) res.set('Retry-After', '120');
  res.set('Cache-Control', cacheable ? 'public, max-age=0, s-maxage=3600' : 'private');
  res.status(status).send(html);
};

// A URL segment Firestore accepts as a document ID. Reserved ones (__x__, ., ..) make get() throw, which
// would otherwise land in the 503 catch instead of a 404.
const isDocId = (id) => Boolean(id) && id !== '.' && id !== '..' && !/^__.*__$/.test(id) && Buffer.byteLength(id) <= 1500;

// 301 the default Firebase hosts to biblesketch.app, and path variants (trailing or double slashes, a wrong
// sketch slug) to canonicalPath. Keeps the query string. Returns true when it answered the request.
// Cached briefly: a Functions rollback doesn't purge the Hosting CDN, so a bad redirect must not stick for long.
const WRONG_HOSTS = new Set(['biblesketch-5104c.web.app', 'biblesketch-5104c.firebaseapp.com']);
const redirectToCanonical = (req, res, canonicalPath, cacheControl = 'public, max-age=300, s-maxage=3600') => {
  const host = String(req.get('x-fh-requested-host') || req.get('x-forwarded-host') || '').split(',')[0].trim().toLowerCase();
  const wrongHost = WRONG_HOSTS.has(host) && !req.get('cf-ray'); // Cloudflare only fronts biblesketch.app
  const path = canonicalPath || '/' + req.path.split('/').filter(Boolean).join('/');
  if (!wrongHost && path === req.path) return false;
  const q = req.originalUrl.indexOf('?');
  res.set('Cache-Control', cacheControl);
  res.redirect(301, (wrongHost ? CANONICAL_ORIGIN : '') + path + (q >= 0 ? req.originalUrl.slice(q) : ''));
  return true;
};

// ---------------------------------------------------------
// 2. HOMEPAGE SSR RENDERER (Minimal SSR for SEO - Hidden from Users)
// ---------------------------------------------------------
exports.homeRender = onRequest({ timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  if (redirectToCanonical(req, res)) return;
  const host = 'biblesketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`[homeRender] Called - Path: ${req.path} | Method: ${req.method} | UA: ${userAgent}`);
  
  try {
    // Query top 10-15 public sketches (not bookmarks, not verse type)
    let sketches = [];
    try {
      const query = admin.firestore()
        .collection("sketches")
        .where("isPublic", "==", true)
        .orderBy("createdAt", "desc")
        .limit(50);
      
      const snapshot = await query.get();
      sketches = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(s => !s.isBookmark && s.type !== 'verse')
        .sort((a, b) => {
          const blessDiff = (b.blessCount || 0) - (a.blessCount || 0);
          if (blessDiff !== 0) return blessDiff;
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        })
        .slice(0, 15); // Top 15
    } catch (error) {
      console.warn("[homeRender] Error fetching sketches:", error);
      // Continue with empty sketches array
    }
    
    // Generate ordered list of links
    const linkItems = [];
    
    // Static key pages
    linkItems.push(`<li><a href="${baseUrl}/gallery">Browse Gallery</a></li>`);
    linkItems.push(`<li><a href="${baseUrl}/bible-verse-coloring">Create Verse Art</a></li>`);
    linkItems.push(`<li><a href="${baseUrl}/blog">Read Blog</a></li>`);
    linkItems.push(`<li><a href="${baseUrl}/pricing">View Pricing</a></li>`);
    
    // Top sketches
    sketches.forEach(sketch => {
      const slug = generateSketchSlug(sketch);
      const sketchUrl = `${baseUrl}/coloring-page/${slug}/${sketch.id}`;
      const book = sketch.promptData?.book || "Bible";
      const chapter = sketch.promptData?.chapter || "";
      const startVerse = sketch.promptData?.start_verse || "";
      const endVerse = sketch.promptData?.end_verse;
      const verseText = endVerse && endVerse > startVerse 
        ? `${startVerse}-${endVerse}` 
        : String(startVerse);
      const linkText = `${book} ${chapter}:${verseText} Coloring Page`;
      
      linkItems.push(`<li><a href="${sketchUrl}">${escapeHtml(linkText)}</a></li>`);
    });
    
    // Generate minimal SSR content
    const homeSeoContent = `
      <h1>Create Faith-Filled Coloring Pages</h1>
      <p>Turn any bible verse into a custom, print-ready coloring page in seconds.</p>
      <ol>
        ${linkItems.join('\n        ')}
      </ol>`;
    
    // Get HTML template
    let html = await getIndexHtml(baseUrl);
    
    // Set meta tags
    const title = "Create Faith-Filled Coloring Pages | Bible Sketch";
    const description = "Turn any bible verse into a custom, print-ready coloring page in seconds. AI-powered Bible coloring pages for Sunday School, VBS, and personal devotion.";
    
    html = html.replace(/<title>.*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
    
    const metaTags = `
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${baseUrl}/" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${baseUrl}/" />
    <meta property="og:site_name" content="Bible Sketch" />
    <meta property="og:image" content="${baseUrl}/og.png" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${baseUrl}/og.png" />`;
    
    // Script to remove SSR content immediately (before React loads)
    // This ensures React mounts into empty #root, preventing hydration conflicts
    // Crawlers see SSR content in HTML source, users see React content
    const removeSSRScript = `
    <script>
      // Remove SSR content immediately (synchronous, before React bundle loads)
      (function() {
        var root = document.getElementById('root');
        if (root) {
          root.innerHTML = '';
        }
      })();
    </script>`;
    
    // Inject meta tags before </head>
    if (html.includes('</head>')) {
      html = html.replace('</head>', () => `${metaTags}\n</head>`);
    } else {
      html += metaTags;
    }
    
    // Inject body content into <div id="root"> followed by removal script
    if (html.includes('<div id="root">')) {
      // Replace self-closing tag
      html = html.replace(/<div id="root"><\/div>/g, () => `<div id="root">${homeSeoContent}${removeSSRScript}</div>`);
      // If still not replaced, replace opening tag
      if (!html.includes(homeSeoContent)) {
        html = html.replace(/<div id="root">/g, () => `<div id="root">${homeSeoContent}${removeSSRScript}`);
      }
      
      // Verify injection succeeded
      if (!html.includes(homeSeoContent)) {
        console.error("[homeRender] Failed to inject SEO content into HTML");
      } else {
        console.log(`[homeRender] Successfully injected SEO content with ${sketches.length} sketches`);
      }
    } else {
      console.error("[homeRender] Could not find <div id=\"root\"> in HTML template");
    }
    
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=7200');
    res.status(200).send(html);
    
  } catch (error) {
    console.error("[homeRender] Error:", error);
    sendShell(res, 503);
  }
});

// ---------------------------------------------------------
// 3. SKETCH PAGE SEO RENDERER (Server-Side Meta Tags for Individual Sketches)
// ---------------------------------------------------------
exports.sketchRender = onRequest({ timeoutSeconds: 60, memory: "256MiB", minInstances: 1 }, async (req, res) => {
  if (redirectToCanonical(req, res)) return;
  const host = 'biblesketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Robust ID Extraction
  // Split by slash and filter out empty strings (handles trailing slashes)
  const pathSegments = req.path.split('/').filter(p => p.length > 0);
  const sketchId = pathSegments[pathSegments.length - 1];

  console.log(`[sketchRender] Path: ${req.path} | ID: ${sketchId} | UA: ${userAgent}`);

  if (!isDocId(sketchId)) {
    console.log("[sketchRender] No valid sketch ID found, serving 404.");
    return sendShell(res, 404, true);
  }

  try {
    const doc = await admin.firestore().collection("sketches").doc(sketchId).get();

    if (!doc.exists) {
      console.log(`[sketchRender] Sketch ${sketchId} not found.`);
      return sendShell(res, 404, true);
    }

    const data = doc.data();

    // Private: 404 for crawlers, uncached, no redirect (the slug would reveal the verse). The owner's
    // browser still boots the app from this shell and loads the sketch client-side.
    if (data.isPublic !== true) {
      console.log(`[sketchRender] Sketch ${sketchId} is not public.`);
      return sendShell(res, 404);
    }
    
    const book = data.promptData?.book || "Bible";
    const chapter = data.promptData?.chapter || "Story";
    const startVerse = data.promptData?.start_verse;
    const endVerse = data.promptData?.end_verse;
    const ageGroup = data.promptData?.age_group || "All Ages";
    const style = data.promptData?.art_style || "Coloring Page";
    const sketchType = data.type || 'scene';
    const fontStyle = data.promptData?.font_style;

    let verseRange = "";
    if (startVerse) {
      verseRange = `:${startVerse}`;
      if (endVerse && endVerse > startVerse) {
        verseRange += `-${endVerse}`;
      }
    }

    const title = `${book} ${chapter}${verseRange} Coloring Page - ${style} Style | Bible Sketch`;
    const description = `Free printable ${book} ${chapter}${verseRange} coloring page for ${ageGroup} in ${style} style. Created with Bible Sketch.`;
    const imageUrl = data.imageUrl;

    const slug = generateSketchSlug(data);
    const canonicalPath = `/coloring-page/${slug}/${encodeURIComponent(sketchId)}`;
    const canonicalUrl = `${baseUrl}${canonicalPath}`;
    // Wrong or missing slug: 301, cached like the page so a sketch made private stops redirecting soon.
    if (redirectToCanonical(req, res, canonicalPath, 'public, max-age=3600, s-maxage=7200')) return;

    // Fetch author name
    let authorName = "A Bible Sketch User";
    try {
      if (data.userId) {
        const userDoc = await admin.firestore().collection("users").doc(data.userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData && userData.displayName) {
            authorName = userData.displayName;
          }
        }
      }
    } catch (error) {
      console.warn("[sketchRender] Could not fetch author name:", error);
    }

    // Schema.org JSON-LD Construction (no aggregateRating: blesses aren't ratings)
    const keywords = data.tags ? data.tags.join(', ') : "Bible, Coloring Page, Christian Art";
    const genre = data.promptData?.art_style || "Religious Art";
    const datePublished = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();

    const schemaData = {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "name": title,
      "headline": title,
      "description": description,
      "image": imageUrl,
      "url": canonicalUrl,
      "datePublished": datePublished,
      "keywords": keywords,
      "genre": genre,
      "author": {
        "@type": "Person",
        "name": authorName,
        "url": `${baseUrl}/profile/${encodeURIComponent(data.userId || '')}`
      },
      "creator": {
        "@type": "Person",
        "name": authorName,
        "url": `${baseUrl}/profile/${encodeURIComponent(data.userId || '')}`
      },
      "copyrightHolder": {
        "@type": "Person",
        "name": authorName
      }
    };

    // data-rh: the client's SketchSEO emits its own CreativeWork, so Helmet replaces this one after JS.
    // The breadcrumb is server-only (the client has none), so it must NOT carry data-rh.
    const schemaScript = `<script type="application/ld+json" data-rh="true">${jsonLd(schemaData)}</script>
    <script type="application/ld+json">${jsonLd({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${baseUrl}/` },
        { "@type": "ListItem", "position": 2, "name": "Gallery", "item": `${baseUrl}/gallery` },
        { "@type": "ListItem", "position": 3, "name": `${book} ${chapter}${verseRange} Coloring Page`, "item": canonicalUrl },
      ],
    })}</script>`;

    let html = await getIndexHtml(baseUrl);

    // Injection Strategy:
    // 1. Replace <title>
    // 2. Inject Meta Tags before </head>
    // 3. Inject Schema JSON-LD before </head>

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);

    // Prepare Meta Tags
    const metaTags = `
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    
    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:site_name" content="Bible Sketch" />
    <meta name="twitter:card" content="summary_large_image" />
    `;

    // Inject before </head>
    if (html.includes('</head>')) {
      html = html.replace('</head>', () => `${metaTags}\n${schemaScript}\n</head>`);
    } else {
      // Fallback if </head> is missing
      html += metaTags + schemaScript;
    }

    // Query related sketches
    let relatedSketches = [];
    try {
      let relatedQuery;
      
      if (sketchType === 'verse') {
        // Verse-specific query - try with font_style first, fallback to simpler query
        try {
          if (fontStyle) {
            relatedQuery = admin.firestore()
              .collection("sketches")
              .where("isPublic", "==", true)
              .where("type", "==", "verse")
              .where("promptData.font_style", "==", fontStyle)
              .orderBy("createdAt", "desc")
              .limit(9);
            
            const relatedSnapshot = await relatedQuery.get();
            relatedSketches = relatedSnapshot.docs
              .map(doc => ({
                id: doc.id,
                ...doc.data()
              }))
              .filter(s => s.id !== sketchId && !s.isBookmark && s.type === 'verse')
              .slice(0, 8);
          } else {
            // Try query with type filter
            relatedQuery = admin.firestore()
              .collection("sketches")
              .where("isPublic", "==", true)
              .where("type", "==", "verse")
              .orderBy("createdAt", "desc")
              .limit(9);
            
            const relatedSnapshot = await relatedQuery.get();
            relatedSketches = relatedSnapshot.docs
              .map(doc => ({
                id: doc.id,
                ...doc.data()
              }))
              .filter(s => s.id !== sketchId && !s.isBookmark && s.type === 'verse')
              .slice(0, 8);
          }
        } catch (verseError) {
          // Fallback: use simpler query without type filter (client-side will filter)
          console.warn("[sketchRender] Verse query with type filter failed, trying fallback:", verseError);
          relatedQuery = admin.firestore()
            .collection("sketches")
            .where("isPublic", "==", true)
            .orderBy("createdAt", "desc")
            .limit(20);
          
          const relatedSnapshot = await relatedQuery.get();
          relatedSketches = relatedSnapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .filter(s => s.id !== sketchId && !s.isBookmark && s.type === 'verse')
            .slice(0, 8);
        }
      } else {
        // Scene-specific query: require age_group and art_style (has index)
        if (ageGroup && style) {
          relatedQuery = admin.firestore()
            .collection("sketches")
            .where("isPublic", "==", true)
            .where("promptData.age_group", "==", ageGroup)
            .where("promptData.art_style", "==", style)
            .orderBy("createdAt", "desc")
            .limit(9);
          
          const relatedSnapshot = await relatedQuery.get();
          relatedSketches = relatedSnapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .filter(s => s.id !== sketchId && !s.isBookmark)
            .slice(0, 8);
        }
      }
    } catch (error) {
      console.warn("[sketchRender] Error fetching related sketches:", error);
      // Continue without related sketches
    }

    // Hero = the ~100 KB thumbnail the client shows too (not the uncached full-size original); og:image,
    // JSON-LD and the Pinterest link keep the full-size image.
    const [heroUrl, ...relatedThumbUrls] = await Promise.all([
      storageUrl(thumbPathOf(data), imageUrl),
      ...relatedSketches.map(s => storageUrl(thumbPathOf(s), getThumbnailUrl(s.thumbnailPath, s.imageUrl))),
    ]);

    // Generate related sketches HTML
    let relatedSketchesHtml = '';
    if (relatedSketches.length > 0) {
      const sectionTitle = sketchType === 'verse'
        ? 'More Bible Verse Art'
        : `More Bible Coloring Pages For ${ageGroup}`;

      const relatedItems = relatedSketches.map((sketch, i) => {
        const relatedSlug = generateSketchSlug(sketch);
        const relatedUrl = `${baseUrl}/coloring-page/${relatedSlug}/${encodeURIComponent(sketch.id)}`;
        const thumbnailUrl = relatedThumbUrls[i];
        const relatedBook = sketch.promptData?.book || "Bible";
        const relatedChapter = sketch.promptData?.chapter || "";
        const relatedVerse = sketch.promptData?.start_verse || "";
        const relatedStyle = sketchType === 'verse' 
          ? (sketch.promptData?.font_style || 'Verse Art')
          : (sketch.promptData?.art_style || 'Coloring Page');
        const relatedAlt = `${relatedBook} ${relatedChapter}:${relatedVerse} Coloring Page`;
        
        return `
          <li style="flex-shrink:0;width:calc(50% - 8px);margin-bottom:16px;">
            <a href="${escapeHtml(relatedUrl)}" style="display:block;text-decoration:none;color:inherit;">
              <article style="background:white;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border:1px solid #f3f4f6;overflow:hidden;transition:all 0.3s;">
                <img src="${escapeHtml(thumbnailUrl)}" alt="${escapeHtml(relatedAlt)}" width="398" height="533" loading="lazy" decoding="async" style="width:100%;height:auto;aspect-ratio:3/4;object-fit:contain;background:#f9fafb;padding:8px;transition:transform 0.5s;" />
                <div style="padding:12px;">
                  <h3 style="font-weight:700;font-size:0.875rem;color:#1f2937;margin:0 0 4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${escapeHtml(relatedBook)} ${escapeHtml(relatedChapter)}:${escapeHtml(String(relatedVerse))}
                  </h3>
                  <p style="font-size:0.75rem;color:#6b7280;margin:0;">
                    ${escapeHtml(relatedStyle)}
                  </p>
                </div>
              </article>
            </a>
          </li>`;
      }).join('');
      
      relatedSketchesHtml = `
        <section style="margin-top:64px;padding-top:32px;border-top:1px solid #e5e7eb;">
          <h2 style="font-size:1.5rem;font-weight:600;color:#374151;margin-bottom:24px;">
            ${escapeHtml(sectionTitle)}
          </h2>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:16px;">
            ${relatedItems}
          </ul>
        </section>`;
    }
    
    // Generate main sketch content HTML (non-logged-in version)
    const tagsHtml = data.tags && data.tags.length > 0
      ? `<div style="margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:8px;font-size:0.75rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">
            <span>Tags</span>
          </div>
          <div style="display:flex;flex-wrap:gap:8px;">
            ${data.tags.map(tag => `<span style="background:#f3f4f6;color:#374151;padding:4px 12px;border-radius:9999px;font-size:0.75rem;font-weight:600;">${escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>`
      : '';
    
    const datePublishedFormatted = data.createdAt && data.createdAt.toDate 
      ? data.createdAt.toDate().toLocaleDateString()
      : new Date().toLocaleDateString();
    
    const sketchSeoContent = `
<article style="max-width:1200px;margin:0 auto;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif;">
  <div style="margin-bottom:32px;">
    <a href="${baseUrl}/gallery" style="display:inline-flex;align-items:center;gap:8px;color:#6b7280;font-weight:700;text-decoration:none;margin-bottom:32px;">
      <div style="padding:4px;background:white;border-radius:9999px;border:1px solid #e5e7eb;">←</div>
      Back to Gallery
    </a>
  </div>
  
  <div style="display:grid;grid-template-columns:1fr;gap:48px;margin-bottom:48px;">
    <!-- Image Column -->
    <div style="background:white;border-radius:24px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);border:1px solid #f3f4f6;padding:24px;background-color:#e5e5e5;display:flex;align-items:center;justify-content:center;">
      <div style="position:relative;background:white;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);width:100%;max-width:500px;aspect-ratio:3/4;">
        <img src="${escapeHtml(heroUrl)}" alt="${escapeHtml(`${book} ${chapter}${verseRange} Coloring Page`)}" width="398" height="533" fetchpriority="high" style="width:100%;height:100%;object-fit:contain;background:white;" />
      </div>
    </div>
    
    <!-- Details Column -->
    <div style="display:flex;flex-direction:column;">
      <div style="background:white;border-radius:24px;padding:32px;border:1px solid #f3f4f6;box-shadow:0 1px 3px rgba(0,0,0,0.1);flex:1;">
        <h1 style="font-size:2rem;font-weight:700;color:#1f2937;margin:0 0 4px 0;">
          ${escapeHtml(book)} ${escapeHtml(chapter)}${escapeHtml(verseRange)} Coloring Page
        </h1>
        <p style="font-size:1rem;color:#6b7280;margin:0 0 16px 0;">
          ${sketchType === 'verse' 
            ? `${escapeHtml(fontStyle || 'Elegant Script')} verse art coloring page`
            : `Free printable Bible coloring sheet for ${escapeHtml(ageGroup)}s`}
        </p>
        
        <div style="display:flex;flex-wrap:gap:12px;font-size:0.875rem;color:#6b7280;margin-bottom:16px;">
          <span style="background:#f3f4f6;color:#7c3aed;padding:4px 12px;border-radius:9999px;font-weight:700;font-size:0.75rem;text-transform:uppercase;">
            ${sketchType === 'verse' ? escapeHtml(fontStyle || 'Verse Art') : escapeHtml(ageGroup)}
          </span>
          <span style="display:flex;align-items:center;gap:4px;">
            Created by 
            <a href="${baseUrl}/profile/${escapeHtml(encodeURIComponent(data.userId || ''))}" style="font-weight:700;color:#7c3aed;text-decoration:none;">${escapeHtml(authorName)}</a>
          </span>
          <span style="color:#d1d5db;">•</span>
          <span>${datePublishedFormatted}</span>
        </div>
        
        ${tagsHtml}
        
        <!-- Guest Signup CTA -->
        <div style="background:#7c3aed;border-radius:16px;padding:24px;margin-bottom:24px;color:white;">
          <h2 style="font-size:1.25rem;font-weight:700;margin:0 0 12px 0;">Unlock This Coloring Page</h2>
          <p style="color:#c4b5fd;font-size:0.875rem;margin:0 0 16px 0;">
            Create a free account to print, download, and save coloring pages.
          </p>
          <a href="${baseUrl}" style="display:block;background:#fbbf24;color:#1f2937;font-weight:700;padding:12px;border-radius:12px;text-align:center;text-decoration:none;">
            Create Free Account
          </a>
        </div>
        
        <!-- Share Buttons -->
        <div style="padding-top:24px;border-top:1px solid #e5e7eb;">
          <p style="font-size:0.75rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px 0;">Share this sketch</p>
          <div style="display:flex;gap:12px;">
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}" target="_blank" style="flex:1;padding:12px;border-radius:12px;border:1px solid #dbeafe;background:#eff6ff;color:#2563eb;text-align:center;text-decoration:none;font-weight:700;font-size:0.875rem;">
              Facebook
            </a>
            <a href="https://pinterest.com/pin/create/button/?url=${encodeURIComponent(canonicalUrl)}&media=${encodeURIComponent(imageUrl)}" target="_blank" style="flex:1;padding:12px;border-radius:12px;border:1px solid #fecaca;background:#fef2f2;color:#dc2626;text-align:center;text-decoration:none;font-weight:700;font-size:0.875rem;">
              Pinterest
            </a>
            <button onclick="navigator.clipboard.writeText(${escapeHtml(JSON.stringify(canonicalUrl))});alert('Link copied!');" style="flex:1;padding:12px;border-radius:12px;border:1px solid #e5e7eb;background:white;color:#374151;font-weight:700;font-size:0.875rem;cursor:pointer;">
              Copy Link
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  ${relatedSketchesHtml}
</article>`;
    
    // Inject body content into <div id="root">
    // Use regex to handle both self-closing and open tags reliably
    if (html.includes('<div id="root">')) {
      // Replace self-closing tag
      html = html.replace(/<div id="root"><\/div>/g, () => `<div id="root">${sketchSeoContent}</div>`);
      // If still not replaced, replace opening tag (handles case with whitespace or content)
      if (!html.includes(sketchSeoContent)) {
        html = html.replace(/<div id="root">/g, () => `<div id="root">${sketchSeoContent}`);
      }
      
      // Verify injection succeeded
      if (!html.includes(sketchSeoContent)) {
        console.error("[sketchRender] Failed to inject SEO content into HTML");
      } else {
        console.log(`[sketchRender] Successfully injected SEO content for sketch ${sketchId}`);
      }
    } else {
      console.error("[sketchRender] Could not find <div id=\"root\"> in HTML template");
    }

    res.set('Cache-Control', 'public, max-age=3600, s-maxage=7200');
    res.status(200).send(html);

  } catch (error) {
    console.error("[sketchRender] Error:", error);
    sendShell(res, 503);
  }
});

// ---------------------------------------------------------
// 3. PROFILE PAGE SEO RENDERER (Server-Side Schema for Profiles)
// ---------------------------------------------------------
exports.profileRender = onRequest({ timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  if (redirectToCanonical(req, res)) return;
  const host = 'biblesketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Extract UID from /profile/:uid
  const pathSegments = req.path.split('/').filter(p => p.length > 0);
  // Expected: ["profile", "uid"]
  const profileUid = pathSegments.length >= 2 ? pathSegments[1] : null;

  console.log(`[profileRender] Path: ${req.path} | UID: ${profileUid} | UA: ${userAgent}`);

  if (!isDocId(profileUid)) {
    console.log("[profileRender] No valid profile UID found, serving 404.");
    return sendShell(res, 404, true);
  }

  try {
    // 1. Fetch User Document
    const userDoc = await admin.firestore().collection("users").doc(profileUid).get();
    
    let userName = "Bible Sketch User";
    let userPhoto = `${baseUrl}/logo.png`;
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      userName = userData.displayName || "Bible Sketch User";
      userPhoto = userData.photoURL || `${baseUrl}/logo.png`;
    }

    // 2. Fetch User's Public Sketches (no orderBy - sort in memory to avoid index requirement)
    const sketchesSnapshot = await admin.firestore()
      .collection("sketches")
      .where("userId", "==", profileUid)
      .where("isPublic", "==", true)
      .limit(50)
      .get();

    const sketches = sketchesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.createdAt?.toMillis?.() || Date.now()
      };
    }).sort((a, b) => b.timestamp - a.timestamp); // Sort in memory (newest first)

    if (!userDoc.exists && sketches.length === 0) {
      console.log(`[profileRender] User ${profileUid} not found.`);
      return sendShell(res, 404, true);
    }

    // 3. Build SEO Content
    const profileUrl = `${baseUrl}/profile/${encodeURIComponent(profileUid)}`;
    const title = `${userName}'s Bible Coloring Pages | Bible Sketch Gallery`;
    const description = `Browse ${userName}'s collection of Bible coloring pages. Free printable Christian coloring sheets created with Bible Sketch.`;

    // 4. Build Schema.org JSON-LD
    const creativeWorks = sketches.map((sketch, index) => {
      const slug = generateSketchSlug(sketch);
      const sketchUrl = `${baseUrl}/coloring-page/${slug}/${sketch.id}`;
      const sketchName = sketch.promptData 
        ? `${sketch.promptData.book} ${sketch.promptData.chapter}` 
        : "Bible Sketch";
      
      return {
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "VisualArtwork",
          "name": sketchName,
          "image": sketch.imageUrl,
          "url": sketchUrl,
          "datePublished": new Date(sketch.timestamp).toISOString(),
          "author": {
            "@type": "Person",
            "name": userName,
            "url": profileUrl
          }
        }
      };
    });

    const schemaData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ProfilePage",
          "@id": profileUrl,
          "mainEntity": {
            "@type": "Person",
            "name": userName,
            "image": userPhoto,
            "url": profileUrl,
            "interactionStatistic": [
              {
                "@type": "InteractionCounter",
                "interactionType": "https://schema.org/WriteAction",
                "userInteractionCount": sketches.length
              }
            ]
          }
        }
      ]
    };

    // Add ItemList to the graph if there are sketches
    if (creativeWorks.length > 0) {
      schemaData["@graph"].push({
        "@type": "ItemList",
        "name": `Sketches by ${userName}`,
        "itemListElement": creativeWorks
      });
    }

    // data-rh: the client's ProfileSEO emits the same ProfilePage block, so Helmet replaces this one after JS
    const schemaScript = `<script type="application/ld+json" data-rh="true">${jsonLd(schemaData)}</script>`;

    // 5. Get and Modify HTML
    let html = await getIndexHtml(baseUrl);

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);

    // Crawler-only body (H1 + links to the sketches), removed before React mounts like the other listings
    if (sketches.length > 0) {
      const linkItems = sketches.map(sketch => {
        const sketchUrl = `${baseUrl}/coloring-page/${generateSketchSlug(sketch)}/${sketch.id}`;
        const endVerse = sketch.promptData?.end_verse;
        const startVerse = sketch.promptData?.start_verse || "";
        const verseText = endVerse && endVerse > startVerse ? `${startVerse}-${endVerse}` : String(startVerse);
        const linkText = `${sketch.promptData?.book || "Bible"} ${sketch.promptData?.chapter || ""}:${verseText} Coloring Page`;
        return `<li><a href="${escapeHtml(sketchUrl)}">${escapeHtml(linkText)}</a></li>`;
      });
      const profileSeoContent = `
      <h1>${escapeHtml(userName)}'s Bible Coloring Pages</h1>
      <ol>
        ${linkItems.join('\n        ')}
      </ol>
      <script>(function () { var root = document.getElementById('root'); if (root) root.innerHTML = ''; })();</script>`;
      html = html.replace('<div id="root"></div>', () => `<div id="root">${profileSeoContent}</div>`);
    }

    // Prepare Meta Tags
    const metaTags = `
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(profileUrl)}" />
    
    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(userPhoto)}" />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${escapeHtml(profileUrl)}" />
    <meta property="og:site_name" content="Bible Sketch" />
    <meta property="profile:username" content="${escapeHtml(userName)}" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(userPhoto)}" />
    `;

    // Inject before </head>
    if (html.includes('</head>')) {
      html = html.replace('</head>', () => `${metaTags}\n${schemaScript}\n</head>`);
    } else {
      html += metaTags + schemaScript;
    }

    // Existing user with nothing public: keep the page working, keep it out of the index
    if (sketches.length === 0) res.set('X-Robots-Tag', 'noindex');
    res.set('Cache-Control', 'public, max-age=1800, s-maxage=3600'); // 30min client, 1hr CDN
    res.status(200).send(html);

  } catch (error) {
    console.error("[profileRender] Error:", error);
    sendShell(res, 503);
  }
});

// ---------------------------------------------------------
// 4. BLOG PAGE SEO RENDERER (Server-Side Meta Tags for Blog Posts)
// ---------------------------------------------------------
exports.blogRender = onRequest({ timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  if (redirectToCanonical(req, res)) return;
  const host = 'biblesketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Extract slug from /blog/:slug
  const pathSegments = req.path.split('/').filter(p => p.length > 0);
  // Expected: ["blog", "slug"] or just ["blog"]
  const slug = pathSegments.length >= 2 ? pathSegments[1] : null;

  console.log(`[blogRender] Path: ${req.path} | Slug: ${slug} | UA: ${userAgent}`);

  // /blog itself is blogListingRender; /blog/ was already redirected there
  if (!slug) {
    console.log("[blogRender] No slug found, serving 404.");
    return sendShell(res, 404, true);
  }

  try {
    // Read blog posts metadata from JSON file
    const blogPostsPath = path.join(__dirname, 'blog-posts.json');
    let blogPosts = [];
    
    if (fs.existsSync(blogPostsPath)) {
      const blogPostsData = fs.readFileSync(blogPostsPath, 'utf-8');
      blogPosts = JSON.parse(blogPostsData);
    } else {
      console.warn('[blogRender] blog-posts.json not found');
      return sendShell(res, 503);
    }

    // Find the blog post by slug
    const post = blogPosts.find(p => p.slug === slug);

    if (!post || !post.title) {
      console.log(`[blogRender] Blog post "${slug}" not found.`);
      return sendShell(res, 404, true);
    }

    const title = `${post.title} - Bible Sketch Blog`;
    const description = post.excerpt || '';
    const imageUrl = post.coverImage 
      ? `${baseUrl}${post.coverImage}` 
      : `${baseUrl}/logo.png`;
    const canonicalUrl = `${baseUrl}/blog/${slug}`;
    const datePublished = post.date || new Date().toISOString();
    const author = post.author || 'Bible Sketch Team';

    // Schema.org JSON-LD
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title,
      "description": description,
      "image": {
        "@type": "ImageObject",
        "url": imageUrl
      },
      "datePublished": datePublished,
      "dateModified": post.lastmod || datePublished,
      "author": {
        "@type": "Person",
        "name": author
      },
      "publisher": {
        "@type": "Organization",
        "name": "Bible Sketch",
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/logo.png`
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonicalUrl
      },
      "url": canonicalUrl
    };

    // data-rh: the client's blog post emits its own BlogPosting, so Helmet replaces this one after JS.
    // The breadcrumb is server-only (the client has none), so it must NOT carry data-rh.
    const schemaScript = `<script type="application/ld+json" data-rh="true">${jsonLd(schemaData)}</script>
    <script type="application/ld+json">${jsonLd({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${baseUrl}/` },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${baseUrl}/blog` },
        { "@type": "ListItem", "position": 3, "name": post.title, "item": canonicalUrl },
      ],
    })}</script>`;

    let html = await getIndexHtml(baseUrl);

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);


    // Prepare Meta Tags
    const metaTags = `
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    
    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(post.title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="Bible Sketch" />
    <meta property="og:locale" content="en_US" />
    <meta property="article:published_time" content="${datePublished}" />
    <meta property="article:author" content="${escapeHtml(author)}" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(post.title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${imageUrl}" />
    `;

    // Inject before </head>
    if (html.includes('</head>')) {
      html = html.replace('</head>', () => `${metaTags}\n${schemaScript}\n</head>`);
    } else {
      html += metaTags + schemaScript;
    }

    // Extract sketch IDs from markdown body and fetch sketches
    let sketchMap = new Map(); // Map of sketchId -> sketch data
    if (post.body) {
      const sketchIds = extractSketchIds(post.body);
      if (sketchIds.length > 0) {
        console.log(`[blogRender] Found ${sketchIds.length} sketch IDs: ${sketchIds.join(', ')}`);
        
        // Batch fetch sketches from Firestore
        try {
          const sketchPromises = sketchIds.map(async (id) => {
            try {
              const sketchDoc = await admin.firestore().collection("sketches").doc(id).get();
              if (sketchDoc.exists && sketchDoc.data()) {
                const sketchData = sketchDoc.data();
                // Only include public sketches
                if (sketchData.isPublic && !sketchData.isBookmark) {
                  return { id, data: { id, ...sketchData } };
                }
              }
              return null;
            } catch (error) {
              console.warn(`[blogRender] Error fetching sketch ${id}:`, error);
              return null;
            }
          });
          
          const sketchResults = await Promise.all(sketchPromises);
          sketchResults.forEach(result => {
            if (result) {
              sketchMap.set(result.id, result.data);
            }
          });
          
          console.log(`[blogRender] Successfully fetched ${sketchMap.size} sketches`);
        } catch (error) {
          console.error("[blogRender] Error batch fetching sketches:", error);
          // Continue without sketches rather than failing
        }
      }
    }

    // Same tokened thumbnail URLs the client requests, so embeds are downloaded once
    const embedUrls = new Map(await Promise.all([...sketchMap].map(async ([id, s]) =>
      [id, await storageUrl(thumbPathOf(s), getThumbnailUrl(s.thumbnailPath, s.imageUrl))])));

    // Replace sketch placeholders with image tags before markdown conversion
    let processedBody = post.body || '';
    if (sketchMap.size > 0) {
      processedBody = processedBody.replace(/<<sketch="([^"]+)">>/g, (match, sketchId) => {
        const sketch = sketchMap.get(sketchId);
        if (!sketch) {
          console.warn(`[blogRender] Sketch ${sketchId} not found or not public, removing placeholder`);
          return ''; // Remove placeholder if sketch not found
        }
        
        // Generate sketch URL
        const slug = generateSketchSlug(sketch);
        const sketchUrl = `${baseUrl}/coloring-page/${slug}/${sketchId}`;
        
        // Get image URL (prefer thumbnail)
        let imageUrl = embedUrls.get(sketchId);
        
        // Ensure image URL is absolute (required for Pinterest crawling)
        if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
          // If relative URL, construct absolute URL
          imageUrl = imageUrl.startsWith('/') ? `${baseUrl}${imageUrl}` : `${baseUrl}/${imageUrl}`;
        }
        
        // Generate alt text
        const book = sketch.promptData?.book || "Bible";
        const chapter = sketch.promptData?.chapter || "";
        const startVerse = sketch.promptData?.start_verse || "";
        const endVerse = sketch.promptData?.end_verse;
        const verseText = endVerse && endVerse > startVerse 
          ? `${startVerse}-${endVerse}` 
          : String(startVerse);
        const altText = `${book} ${chapter}:${verseText} Coloring Page`;
        
        // Return image tag wrapped in link (Pinterest crawlable)
        return `<figure style="margin:24px 0;"><a href="${escapeHtml(sketchUrl)}"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(altText)}" width="400" height="533" loading="lazy" decoding="async" style="max-width:100%;height:auto;border-radius:8px;" /></a></figure>`;
      });
    } else {
      // Remove placeholders if no sketches found
      processedBody = processedBody.replace(/<<sketch="[^"]+">>/g, '');
    }

    // Convert markdown body to HTML (after replacing sketch placeholders)
    const articleBodyHtml = processedBody ? markdownToHtml(processedBody) : '';
    
    // SEO body content (visible to Google, replaced by React on hydration)
    const blogSeoContent = `
<article style="max-width:720px;margin:0 auto;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif;">
  <h1 style="font-size:2rem;font-weight:700;color:#1f2937;margin-bottom:8px;">${escapeHtml(post.title)}</h1>
  <p style="color:#6b7280;font-size:0.875rem;margin-bottom:24px;">By ${escapeHtml(author)} · ${datePublished}</p>
  ${imageUrl !== `${baseUrl}/logo.png` ? `<figure style="margin:0 0 24px 0;"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(post.title)}" width="1200" height="630" fetchpriority="high" style="max-width:100%;height:auto;border-radius:12px;" /></figure>` : ''}
  <div style="color:#374151;line-height:1.75;">
    ${articleBodyHtml}
  </div>
</article>`;

    // Inject body content into <div id="root">
    html = html.replace('<div id="root"></div>', () => `<div id="root">${blogSeoContent}</div>`);

    // Static content: cache a day at the CDN (a no-op Hosting release purges it after an edit)
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(html);

  } catch (error) {
    console.error("[blogRender] Error:", error);
    sendShell(res, 503);
  }
});

// ---------------------------------------------------------
// 5. GALLERY PAGE SSR RENDERER (Minimal SSR for SEO - Hidden from Users)
// ---------------------------------------------------------
exports.galleryRender = onRequest({ timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  if (redirectToCanonical(req, res)) return;
  const host = 'biblesketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`[galleryRender] Called - Path: ${req.path} | Method: ${req.method} | UA: ${userAgent}`);
  
  try {
    // Query all public sketches (both scene and verse types, not bookmarks)
    let sketches = [];
    try {
      const query = admin.firestore()
        .collection("sketches")
        .where("isPublic", "==", true)
        .orderBy("createdAt", "desc")
        .limit(50);
      
      const snapshot = await query.get();
      sketches = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(s => !s.isBookmark)
        .sort((a, b) => {
          const blessDiff = (b.blessCount || 0) - (a.blessCount || 0);
          if (blessDiff !== 0) return blessDiff;
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        })
        .slice(0, 30); // Top 30
    } catch (error) {
      console.warn("[galleryRender] Error fetching sketches:", error);
      // Continue with empty sketches array
    }
    
    // Generate ordered list of links
    const linkItems = [];
    
    // Static key pages
    linkItems.push(`<li><a href="${baseUrl}/">Create Scene Art</a></li>`);
    linkItems.push(`<li><a href="${baseUrl}/bible-verse-coloring">Create Verse Art</a></li>`);
    linkItems.push(`<li><a href="${baseUrl}/blog">Read Blog</a></li>`);
    linkItems.push(`<li><a href="${baseUrl}/pricing">View Pricing</a></li>`);
    
    // Top sketches (both scene and verse types)
    sketches.forEach(sketch => {
      const slug = generateSketchSlug(sketch);
      const sketchUrl = `${baseUrl}/coloring-page/${slug}/${sketch.id}`;
      const book = sketch.promptData?.book || "Bible";
      const chapter = sketch.promptData?.chapter || "";
      const startVerse = sketch.promptData?.start_verse || "";
      const endVerse = sketch.promptData?.end_verse;
      const verseText = endVerse && endVerse > startVerse 
        ? `${startVerse}-${endVerse}` 
        : String(startVerse);
      const sketchType = sketch.type === 'verse' ? 'Verse Art' : 'Coloring Page';
      const linkText = `${book} ${chapter}:${verseText} ${sketchType}`;
      
      linkItems.push(`<li><a href="${sketchUrl}">${escapeHtml(linkText)}</a></li>`);
    });
    
    // Generate minimal SSR content
    const gallerySeoContent = `
      <h1>Bible Coloring Pages Gallery</h1>
      <p>Browse thousands of free printable Bible coloring pages. Discover coloring sheets for every Bible book, age group, and art style. Perfect for Sunday School, VBS, homeschool, and family devotionals.</p>
      <ol>
        ${linkItems.join('\n        ')}
      </ol>`;
    
    // Get HTML template
    let html = await getIndexHtml(baseUrl);
    
    // Set meta tags
    const title = "Bible Coloring Pages Gallery - Free Printable Christian Coloring Sheets | Bible Sketch";
    const description = "Browse thousands of free printable Bible coloring pages. Discover coloring sheets for every Bible book, age group, and art style. Perfect for Sunday School, VBS, homeschool, and family devotionals.";
    
    html = html.replace(/<title>.*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
    
    const metaTags = `
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${baseUrl}/gallery" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${baseUrl}/gallery" />
    <meta property="og:site_name" content="Bible Sketch" />
    <meta property="og:image" content="${baseUrl}/logo.png" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${baseUrl}/logo.png" />`;
    
    // Script to remove SSR content immediately (before React loads)
    // This ensures React mounts into empty #root, preventing hydration conflicts
    // Crawlers see SSR content in HTML source, users see React content
    const removeSSRScript = `
    <script>
      // Remove SSR content immediately (synchronous, before React bundle loads)
      (function() {
        var root = document.getElementById('root');
        if (root) {
          root.innerHTML = '';
        }
      })();
    </script>`;
    
    // Inject meta tags before </head>
    if (html.includes('</head>')) {
      html = html.replace('</head>', () => `${metaTags}\n</head>`);
    } else {
      html += metaTags;
    }
    
    // Inject body content into <div id="root"> followed by removal script
    if (html.includes('<div id="root">')) {
      // Replace self-closing tag
      html = html.replace(/<div id="root"><\/div>/g, () => `<div id="root">${gallerySeoContent}${removeSSRScript}</div>`);
      // If still not replaced, replace opening tag
      if (!html.includes(gallerySeoContent)) {
        html = html.replace(/<div id="root">/g, () => `<div id="root">${gallerySeoContent}${removeSSRScript}`);
      }
      
      // Verify injection succeeded
      if (!html.includes(gallerySeoContent)) {
        console.error("[galleryRender] Failed to inject SEO content into HTML");
      } else {
        console.log(`[galleryRender] Successfully injected SEO content with ${sketches.length} sketches`);
      }
    } else {
      console.error("[galleryRender] Could not find <div id=\"root\"> in HTML template");
    }
    
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=7200');
    res.status(200).send(html);
    
  } catch (error) {
    console.error("[galleryRender] Error:", error);
    sendShell(res, 503);
  }
});

// ---------------------------------------------------------
// 6. VERSE ART PAGE SSR RENDERER (Minimal SSR for SEO - Hidden from Users)
// ---------------------------------------------------------
exports.verseRender = onRequest({ timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  if (redirectToCanonical(req, res)) return;
  const host = 'biblesketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`[verseRender] Called - Path: ${req.path} | Method: ${req.method} | UA: ${userAgent}`);
  
  try {
    // Query top 10-15 public verse sketches (type === 'verse')
    let sketches = [];
    try {
      const query = admin.firestore()
        .collection("sketches")
        .where("isPublic", "==", true)
        .where("type", "==", "verse")
        .orderBy("createdAt", "desc")
        .limit(50);
      
      const snapshot = await query.get();
      sketches = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(s => !s.isBookmark)
        .sort((a, b) => {
          const blessDiff = (b.blessCount || 0) - (a.blessCount || 0);
          if (blessDiff !== 0) return blessDiff;
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        })
        .slice(0, 15); // Top 15
    } catch (error) {
      console.warn("[verseRender] Error fetching sketches:", error);
      // Fallback: try without type filter if index doesn't exist
      try {
        const fallbackQuery = admin.firestore()
          .collection("sketches")
          .where("isPublic", "==", true)
          .orderBy("createdAt", "desc")
          .limit(50);
        
        const fallbackSnapshot = await fallbackQuery.get();
        sketches = fallbackSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(s => !s.isBookmark && s.type === 'verse')
          .sort((a, b) => {
            const blessDiff = (b.blessCount || 0) - (a.blessCount || 0);
            if (blessDiff !== 0) return blessDiff;
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
          })
          .slice(0, 15);
      } catch (fallbackError) {
        console.warn("[verseRender] Fallback query also failed:", fallbackError);
        // Continue with empty sketches array
      }
    }
    
    // Generate ordered list of links
    const linkItems = [];
    
    // Static key pages
    linkItems.push(`<li><a href="${baseUrl}/">Create Scene Art</a></li>`);
    linkItems.push(`<li><a href="${baseUrl}/gallery">Browse Gallery</a></li>`);
    linkItems.push(`<li><a href="${baseUrl}/blog">Read Blog</a></li>`);
    
    // Top verse sketches
    sketches.forEach(sketch => {
      const slug = generateSketchSlug(sketch);
      const sketchUrl = `${baseUrl}/coloring-page/${slug}/${sketch.id}`;
      const book = sketch.promptData?.book || "Bible";
      const chapter = sketch.promptData?.chapter || "";
      const startVerse = sketch.promptData?.start_verse || "";
      const endVerse = sketch.promptData?.end_verse;
      const verseText = endVerse && endVerse > startVerse 
        ? `${startVerse}-${endVerse}` 
        : String(startVerse);
      const linkText = `${book} ${chapter}:${verseText} Verse Art`;
      
      linkItems.push(`<li><a href="${sketchUrl}">${escapeHtml(linkText)}</a></li>`);
    });
    
    // Generate minimal SSR content
    const verseSeoContent = `
      <h1>Create Bible Verse Coloring Pages</h1>
      <p>Turn any Bible verse into beautiful, decorative typography coloring art.</p>
      <ol>
        ${linkItems.join('\n        ')}
      </ol>`;
    
    // Get HTML template
    let html = await getIndexHtml(baseUrl);
    
    // Set meta tags
    const title = "Create Bible Verse Coloring Pages | Bible Sketch";
    const description = "Turn any Bible verse into beautiful, decorative typography coloring art. Choose from 4 font styles and generate print-ready verse art in 60 seconds.";
    
    html = html.replace(/<title>.*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
    
    const metaTags = `
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${baseUrl}/bible-verse-coloring" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${baseUrl}/bible-verse-coloring" />
    <meta property="og:site_name" content="Bible Sketch" />
    <meta property="og:image" content="${baseUrl}/logo.png" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${baseUrl}/logo.png" />`;
    
    // Script to remove SSR content immediately (before React loads)
    // This ensures React mounts into empty #root, preventing hydration conflicts
    // Crawlers see SSR content in HTML source, users see React content
    const removeSSRScript = `
    <script>
      // Remove SSR content immediately (synchronous, before React bundle loads)
      (function() {
        var root = document.getElementById('root');
        if (root) {
          root.innerHTML = '';
        }
      })();
    </script>`;
    
    // Inject meta tags before </head>
    if (html.includes('</head>')) {
      html = html.replace('</head>', () => `${metaTags}\n</head>`);
    } else {
      html += metaTags;
    }
    
    // Inject body content into <div id="root"> followed by removal script
    if (html.includes('<div id="root">')) {
      // Replace self-closing tag
      html = html.replace(/<div id="root"><\/div>/g, () => `<div id="root">${verseSeoContent}${removeSSRScript}</div>`);
      // If still not replaced, replace opening tag
      if (!html.includes(verseSeoContent)) {
        html = html.replace(/<div id="root">/g, () => `<div id="root">${verseSeoContent}${removeSSRScript}`);
      }
      
      // Verify injection succeeded
      if (!html.includes(verseSeoContent)) {
        console.error("[verseRender] Failed to inject SEO content into HTML");
      } else {
        console.log(`[verseRender] Successfully injected SEO content with ${sketches.length} sketches`);
      }
    } else {
      console.error("[verseRender] Could not find <div id=\"root\"> in HTML template");
    }
    
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=7200');
    res.status(200).send(html);
    
  } catch (error) {
    console.error("[verseRender] Error:", error);
    sendShell(res, 503);
  }
});

// ---------------------------------------------------------
// 6a. TAG PAGE SSR RENDERER (Minimal SSR for SEO - Hidden from Users)
// ---------------------------------------------------------
exports.tagRender = onRequest({ timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  if (redirectToCanonical(req, res)) return;
  const host = 'biblesketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`[tagRender] Called - Path: ${req.path} | Method: ${req.method} | UA: ${userAgent}`);
  
  // Extract tagId from path (/tags/:tagId)
  const pathSegments = req.path.split('/').filter(p => p.length > 0);
  const tagId = pathSegments.length > 1 && pathSegments[0] === 'tags' ? pathSegments[1] : null;

  if (!tagId) {
    console.log("[tagRender] No tagId found, serving 404.");
    return sendShell(res, 404, true);
  }

  // Validate tag exists
  const tagInfo = LITURGICAL_TAGS.find(t => t.id === tagId);
  if (!tagInfo) {
    console.log(`[tagRender] Tag ${tagId} not found, serving 404.`);
    return sendShell(res, 404, true);
  }

  try {
    // Query top 10-15 public sketches with this tag
    let sketches = [];
    let tagQueried = false; // true once a query succeeded, so an empty list really means "no sketches"
    try {
      const query = admin.firestore()
        .collection("sketches")
        .where("isPublic", "==", true)
        .where("tags", "array-contains", tagId)
        .orderBy("createdAt", "desc")
        .limit(50);
      
      const snapshot = await query.get();
      tagQueried = true;
      sketches = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(s => !s.isBookmark)
        .sort((a, b) => {
          const blessDiff = (b.blessCount || 0) - (a.blessCount || 0);
          if (blessDiff !== 0) return blessDiff;
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        })
        .slice(0, 15); // Top 15
    } catch (error) {
      console.warn("[tagRender] Error fetching sketches:", error);
      // Fallback: try without tag filter if index doesn't exist
      try {
        const fallbackQuery = admin.firestore()
          .collection("sketches")
          .where("isPublic", "==", true)
          .orderBy("createdAt", "desc")
          .limit(50);
        
        const fallbackSnapshot = await fallbackQuery.get();
        sketches = fallbackSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(s => !s.isBookmark && s.tags && s.tags.includes(tagId))
          .sort((a, b) => {
            const blessDiff = (b.blessCount || 0) - (a.blessCount || 0);
            if (blessDiff !== 0) return blessDiff;
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
          })
          .slice(0, 15);
      } catch (fallbackError) {
        console.warn("[tagRender] Fallback query also failed:", fallbackError);
        // Continue with empty sketches array
      }
    }
    
    // Generate ordered list of links
    const linkItems = [];
    
    // Static key pages
    linkItems.push(`<li><a href="${baseUrl}/gallery">Browse Gallery</a></li>`);
    linkItems.push(`<li><a href="${baseUrl}/bible-verse-coloring">Create Verse Art</a></li>`);
    linkItems.push(`<li><a href="${baseUrl}/blog">Read Blog</a></li>`);
    
    // Top tagged sketches
    sketches.forEach(sketch => {
      const slug = generateSketchSlug(sketch);
      const sketchUrl = `${baseUrl}/coloring-page/${slug}/${sketch.id}`;
      const book = sketch.promptData?.book || "Bible";
      const chapter = sketch.promptData?.chapter || "";
      const startVerse = sketch.promptData?.start_verse || "";
      const endVerse = sketch.promptData?.end_verse;
      const verseText = endVerse && endVerse > startVerse 
        ? `${startVerse}-${endVerse}` 
        : String(startVerse);
      const linkText = `${book} ${chapter}:${verseText} Coloring Page`;
      
      linkItems.push(`<li><a href="${sketchUrl}">${escapeHtml(linkText)}</a></li>`);
    });
    
    // Generate SEO content based on tag category
    const h1 = `${tagInfo.label} Coloring Pages`;
    const categoryDescriptions = {
      season: `Discover beautiful ${tagInfo.label} coloring pages from Bible stories. Perfect for celebrating the ${tagInfo.label} season in Sunday School, VBS, or family devotionals. Free printable Bible coloring sheets.`,
      theme: `Explore ${tagInfo.label} coloring pages from Scripture. These Biblical coloring sheets feature stories and lessons about ${tagInfo.label.toLowerCase()}. Perfect for Sunday School, homeschool, or personal Bible study.`
    };
    
    const description = categoryDescriptions[tagInfo.category] || `Browse ${tagInfo.label} Bible coloring pages. Free printable Christian coloring sheets.`;
    const title = `${tagInfo.label} Coloring Pages | Bible Sketch`;
    const canonicalUrl = `${baseUrl}/tags/${tagId}`;
    
    // Generate minimal SSR content
    const tagSeoContent = `
      <h1>${escapeHtml(h1)}</h1>
      <p>${escapeHtml(description)}</p>
      <ol>
        ${linkItems.join('\n        ')}
      </ol>`;
    
    // Get HTML template
    let html = await getIndexHtml(baseUrl);
    
    html = html.replace(/<title>.*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
    
    const metaTags = `
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="Bible Sketch" />
    <meta property="og:image" content="${baseUrl}/logo.png" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${baseUrl}/logo.png" />
    <script type="application/ld+json">${jsonLd({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${baseUrl}/` },
        { "@type": "ListItem", "position": 2, "name": "Gallery", "item": `${baseUrl}/gallery` },
        { "@type": "ListItem", "position": 3, "name": h1, "item": canonicalUrl },
      ],
    })}</script>`;
    
    // Script to remove SSR content immediately (before React loads)
    // This ensures React mounts into empty #root, preventing hydration conflicts
    // Crawlers see SSR content in HTML source, users see React content
    const removeSSRScript = `
    <script>
      // Remove SSR content immediately (synchronous, before React bundle loads)
      (function() {
        var root = document.getElementById('root');
        if (root) {
          root.innerHTML = '';
        }
      })();
    </script>`;
    
    // Inject meta tags before </head>
    if (html.includes('</head>')) {
      html = html.replace('</head>', () => `${metaTags}\n</head>`);
    } else {
      html += metaTags;
    }
    
    // Inject body content into <div id="root"> followed by removal script
    if (html.includes('<div id="root">')) {
      // Replace self-closing tag
      html = html.replace(/<div id="root"><\/div>/g, () => `<div id="root">${tagSeoContent}${removeSSRScript}</div>`);
      // If still not replaced, replace opening tag
      if (!html.includes(tagSeoContent)) {
        html = html.replace(/<div id="root">/g, () => `<div id="root">${tagSeoContent}${removeSSRScript}`);
      }
      
      // Verify injection succeeded
      if (!html.includes(tagSeoContent)) {
        console.error("[tagRender] Failed to inject SEO content into HTML");
      } else {
        console.log(`[tagRender] Successfully injected SEO content with ${sketches.length} sketches for tag ${tagId}`);
      }
    } else {
      console.error("[tagRender] Could not find <div id=\"root\"> in HTML template");
    }

    // A known tag with no public sketches is a thin page: keep it working, keep it out of the index
    // (the sitemap leaves it out by the same rule)
    if (tagQueried && sketches.length === 0) res.set('X-Robots-Tag', 'noindex');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=7200');
    res.status(200).send(html);
    
  } catch (error) {
    console.error("[tagRender] Error:", error);
    sendShell(res, 503);
  }
});

// ---------------------------------------------------------
// 6b. BLOG LISTING PAGE SSR RENDERER (List of Blog Posts)
// ---------------------------------------------------------
exports.blogListingRender = onRequest({ timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  if (redirectToCanonical(req, res)) return;
  const host = 'biblesketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`[blogListingRender] Called - Path: ${req.path} | Method: ${req.method} | UA: ${userAgent}`);
  
  try {
    // Read blog posts metadata from JSON file
    const blogPostsPath = path.join(__dirname, 'blog-posts.json');
    let blogPosts = [];
    
    if (fs.existsSync(blogPostsPath)) {
      const blogPostsData = fs.readFileSync(blogPostsPath, 'utf-8');
      blogPosts = JSON.parse(blogPostsData);
      // Sort by date descending (newest first)
      blogPosts.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
      });
    } else {
      console.warn('[blogListingRender] blog-posts.json not found');
    }
    
    let html = await getIndexHtml(baseUrl);
    
    const title = "Blog - Bible Sketch";
    const description = "Latest updates, tutorials, and news from Bible Sketch.";
    
    html = html.replace(/<title>.*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
    
    const metaTags = `
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${baseUrl}/blog" />
    <meta property="og:title" content="Blog - Bible Sketch" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${baseUrl}/blog" />
    <meta property="og:site_name" content="Bible Sketch" />
    <meta property="og:image" content="${baseUrl}/logo.png" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="Blog - Bible Sketch" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${baseUrl}/logo.png" />`;
    
    // Generate list of blog posts
    const blogListItems = blogPosts.map(post => {
      const blogUrl = `${baseUrl}/blog/${post.slug}`;
      return `<h2><a href="${blogUrl}">${escapeHtml(post.title || 'Untitled')}</a></h2>`;
    }).join('\n    ');
    
    const blogListingContent = `
  <h1>blog</h1>
  ${blogListItems}`;
    
    const removeSSRScript = `
    <script>
      (function() {
        var root = document.getElementById('root');
        if (root) {
          root.innerHTML = '';
        }
      })();
    </script>`;
    
    if (html.includes('</head>')) {
      html = html.replace('</head>', () => `${metaTags}\n</head>`);
    } else {
      html += metaTags;
    }
    
    if (html.includes('<div id="root">')) {
      html = html.replace(/<div id="root"><\/div>/g, () => `<div id="root">${blogListingContent}${removeSSRScript}</div>`);
      if (!html.includes(blogListingContent)) {
        html = html.replace(/<div id="root">/g, () => `<div id="root">${blogListingContent}${removeSSRScript}`);
      }
      
      if (!html.includes(blogListingContent)) {
        console.error("[blogListingRender] Failed to inject SEO content into HTML");
      } else {
        console.log(`[blogListingRender] Successfully injected SEO content with ${blogPosts.length} blog posts`);
      }
    } else {
      console.error("[blogListingRender] Could not find <div id=\"root\"> in HTML template");
    }
    
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(html);
    
  } catch (error) {
    console.error("[blogListingRender] Error:", error);
    sendShell(res, 503);
  }
});

// ---------------------------------------------------------
// 7. PRICING PAGE SSR RENDERER (Full Content for SEO)
// ---------------------------------------------------------
exports.pricingRender = onRequest({ timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  if (redirectToCanonical(req, res)) return;
  const host = 'biblesketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`[pricingRender] Called - Path: ${req.path} | Method: ${req.method} | UA: ${userAgent}`);
  
  try {
    let html = await getIndexHtml(baseUrl);
    
    const title = "Pricing - Affordable Bible Coloring Page Credits | Bible Sketch";
    const description = "Get credits to create custom Bible coloring pages. Subscribe monthly or pay once — your credits never expire. Perfect for Sunday School teachers, homeschool families, and church ministries. Plans start at $4.99.";
    
    html = html.replace(/<title>.*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
    
    const metaTags = `
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${baseUrl}/pricing" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${baseUrl}/pricing" />
    <meta property="og:site_name" content="Bible Sketch" />
    <meta property="og:image" content="${baseUrl}/logo.png" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${baseUrl}/logo.png" />`;
    
    // Full pricing content HTML
    const pricingContent = `
<article style="max-width:1200px;margin:0 auto;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif;">
  <h1 style="font-size:2.5rem;font-weight:700;color:#1f2937;margin-bottom:24px;text-align:center;">Pricing That Fits Your Needs</h1>
  <p style="font-size:1.125rem;color:#6b7280;text-align:center;margin-bottom:48px;max-width:42rem;margin-left:auto;margin-right:auto;line-height:1.75;">
    Subscribe monthly or buy credits once — either way, your credits never expire.
  </p>

  <section style="margin-bottom:48px;">
    <h2 style="font-size:1.875rem;font-weight:700;color:#1f2937;margin-bottom:16px;">Premium Plan</h2>
    <p style="color:#6b7280;margin-bottom:16px;">For dedicated teachers & ministries</p>
    <p style="font-size:2.25rem;font-weight:700;color:#1f2937;margin-bottom:16px;">$4.99 <span style="font-size:1rem;font-weight:500;color:#6b7280;">/ month</span></p>
    <ul style="list-style:none;padding:0;margin:16px 0;">
      <li style="margin-bottom:8px;color:#374151;">✓ Unlimited Downloads & Prints</li>
      <li style="margin-bottom:8px;color:#374151;">✓ 10 Credits Per Month Included</li>
      <li style="margin-bottom:8px;color:#374151;">✓ High-Res PDF Download</li>
      <li style="margin-bottom:8px;color:#374151;">✓ No Watermark</li>
    </ul>
    <p style="color:#6b7280;font-size:0.875rem;margin-top:16px;">Cancel anytime</p>
  </section>

  <section style="margin-bottom:48px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:24px;text-align:center;">Or Pay As You Go</h2>
    
    <div style="margin-bottom:32px;">
      <h3 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:8px;">The Spark</h3>
      <p style="color:#6b7280;font-style:italic;margin-bottom:8px;">For a single lesson series</p>
      <p style="font-size:2rem;font-weight:700;color:#1f2937;margin-bottom:8px;">$4.99 <span style="font-size:0.875rem;font-weight:500;color:#6b7280;">/ one-time</span></p>
      <p style="color:#374151;margin-bottom:16px;">20 Credits (+ 20 Free Prints)</p>
      <p style="color:#6b7280;font-size:0.875rem;margin-bottom:16px;">($0.25 / image)</p>
      <ul style="list-style:none;padding:0;margin:16px 0;">
        <li style="margin-bottom:8px;color:#374151;">✓ High-Res PDF Download</li>
        <li style="margin-bottom:8px;color:#374151;">✓ No Watermark</li>
        <li style="margin-bottom:8px;color:#374151;">✓ Private Mode</li>
        <li style="margin-bottom:8px;color:#374151;">✓ Commercial Rights</li>
      </ul>
    </div>

    <div style="margin-bottom:32px;">
      <h3 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:8px;">The Torch</h3>
      <p style="color:#6b7280;font-style:italic;margin-bottom:8px;">For families & devotionals</p>
      <p style="font-size:2rem;font-weight:700;color:#1f2937;margin-bottom:8px;">$14.99 <span style="font-size:0.875rem;font-weight:500;color:#6b7280;">/ one-time</span></p>
      <p style="color:#374151;margin-bottom:16px;">80 Credits (+ 80 Free Prints)</p>
      <p style="color:#6b7280;font-size:0.875rem;margin-bottom:16px;">($0.19 / image) - Save 25% instantly</p>
      <ul style="list-style:none;padding:0;margin:16px 0;">
        <li style="margin-bottom:8px;color:#374151;">✓ High-Res PDF Download</li>
        <li style="margin-bottom:8px;color:#374151;">✓ No Watermark</li>
        <li style="margin-bottom:8px;color:#374151;">✓ Private Mode</li>
        <li style="margin-bottom:8px;color:#374151;">✓ Commercial Rights</li>
      </ul>
    </div>

    <div style="margin-bottom:32px;">
      <h3 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:8px;">The Beacon</h3>
      <p style="color:#6b7280;font-style:italic;margin-bottom:8px;">For Ministry Directors</p>
      <p style="font-size:2rem;font-weight:700;color:#1f2937;margin-bottom:8px;">$29.99 <span style="font-size:0.875rem;font-weight:500;color:#6b7280;">/ one-time</span></p>
      <p style="color:#374151;margin-bottom:16px;">200 Credits (+ 200 Free Prints)</p>
      <p style="color:#6b7280;font-size:0.875rem;margin-bottom:16px;">($0.15 / image) - Save 40% instantly</p>
      <ul style="list-style:none;padding:0;margin:16px 0;">
        <li style="margin-bottom:8px;color:#374151;">✓ High-Res PDF Download</li>
        <li style="margin-bottom:8px;color:#374151;">✓ No Watermark</li>
        <li style="margin-bottom:8px;color:#374151;">✓ Private Mode</li>
        <li style="margin-bottom:8px;color:#374151;">✓ Commercial Rights</li>
      </ul>
    </div>
  </section>

  <section style="margin-top:48px;padding:32px;background:#f9fafb;border-radius:24px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:24px;text-align:center;">Frequently Asked Questions</h2>
    
    <div style="margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #e5e7eb;">
      <h3 style="font-weight:700;color:#1f2937;margin-bottom:8px;">Do these credits expire?</h3>
      <p style="color:#374151;line-height:1.75;">No! Your purchased credits never expire. You can buy a pack today and use it next year for Easter.</p>
    </div>


    <div style="margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #e5e7eb;">
      <h3 style="font-weight:700;color:#1f2937;margin-bottom:8px;">Can I print these for my whole Sunday School class?</h3>
      <p style="color:#374151;line-height:1.75;">Yes! Once you generate an image, you own the rights to print it as many times as you need for your class or ministry.</p>
    </div>

    <div style="margin-bottom:24px;">
      <h3 style="font-weight:700;color:#1f2937;margin-bottom:8px;">Should I subscribe or buy a credit pack?</h3>
      <p style="color:#374151;line-height:1.75;">If you teach regularly (weekly Sunday School, homeschool), Premium gives you the best value with unlimited downloads and 10 monthly credits. If you only need images occasionally (VBS, special events), credit packs let you pay once and use whenever you're ready.</p>
    </div>
  </section>

  <p style="text-align:center;color:#9ca3af;font-size:0.875rem;margin-top:48px;">
    Payments are securely processed. Need help? Contact support@biblesketch.com
  </p>
</article>`;
    
    const removeSSRScript = `
    <script>
      (function() {
        var root = document.getElementById('root');
        if (root) {
          root.innerHTML = '';
        }
      })();
    </script>`;
    
    if (html.includes('</head>')) {
      html = html.replace('</head>', () => `${metaTags}\n</head>`);
    } else {
      html += metaTags;
    }
    
    if (html.includes('<div id="root">')) {
      html = html.replace(/<div id="root"><\/div>/g, () => `<div id="root">${pricingContent}${removeSSRScript}</div>`);
      if (!html.includes(pricingContent)) {
        html = html.replace(/<div id="root">/g, () => `<div id="root">${pricingContent}${removeSSRScript}`);
      }
      
      if (!html.includes(pricingContent)) {
        console.error("[pricingRender] Failed to inject SEO content into HTML");
      } else {
        console.log("[pricingRender] Successfully injected SEO content");
      }
    } else {
      console.error("[pricingRender] Could not find <div id=\"root\"> in HTML template");
    }
    
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(html);
    
  } catch (error) {
    console.error("[pricingRender] Error:", error);
    sendShell(res, 503);
  }
});

// ---------------------------------------------------------
// 8. ABOUT PAGE SSR RENDERER (Full Content for SEO)
// ---------------------------------------------------------
exports.aboutRender = onRequest({ timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  if (redirectToCanonical(req, res)) return;
  const host = 'biblesketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`[aboutRender] Called - Path: ${req.path} | Method: ${req.method} | UA: ${userAgent}`);
  
  try {
    let html = await getIndexHtml(baseUrl);
    
    const title = "About Bible Sketch - Our Story & Mission | Free Bible Coloring Pages";
    const description = "Meet Renaud, founder of Bible Sketch. Learn how we create AI-powered Bible coloring pages for Sunday School, VBS, and homeschooling families.";
    
    html = html.replace(/<title>.*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
    
    // Schema.org JSON-LD from AboutSEO component
    const schemaData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Person",
          "name": "Renaud Gagne",
          "jobTitle": "Founder",
          "description": "Christian father of 4, homeschooling educator, and creator of Bible Sketch. Teaches God's Big Story curriculum at St. Timothy's Anglican Bible Church.",
          "knowsAbout": [
            "Bible Coloring Pages",
            "Christian Education",
            "Homeschooling",
            "Sunday School",
            "Children's Ministry",
            "God's Big Story Curriculum"
          ],
          "worksFor": {
            "@type": "Organization",
            "name": "Bible Sketch",
            "url": baseUrl
          }
        },
        {
          "@type": "Organization",
          "url": baseUrl,
          "name": "Bible Sketch",
          "description": "AI-powered platform for creating custom, printable Bible coloring pages for Sunday School, VBS, and homeschooling families.",
          "founder": {
            "@type": "Person",
            "name": "Renaud Gagne"
          },
          "logo": {
            "@type": "ImageObject",
            "url": `${baseUrl}/logo.png`
          },
          "contactPoint": {
            "@type": "ContactPoint",
            "email": "support@biblesketch.com",
            "contactType": "Customer Service"
          }
        },
        {
          "@type": "WebPage",
          "@id": `${baseUrl}/about`,
          "url": `${baseUrl}/about`,
          "name": "About Bible Sketch",
          "description": "Meet Renaud, founder of Bible Sketch. Learn how we create AI-powered Bible coloring pages for Sunday School, VBS, and homeschooling families.",
          "isPartOf": {
            "@type": "WebSite",
            "url": baseUrl,
            "name": "Bible Sketch"
          }
        }
      ]
    };
    
    const schemaScript = `<script type="application/ld+json">${jsonLd(schemaData)}</script>`;
    
    const metaTags = `
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${baseUrl}/about" />
    <meta property="og:title" content="About Bible Sketch - Our Story & Mission" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Bible Sketch" />
    <meta property="og:url" content="${baseUrl}/about" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:image" content="${baseUrl}/logo.png" />
    <meta property="og:image:alt" content="Bible Sketch Logo" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="About Bible Sketch - Our Story & Mission" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:url" content="${baseUrl}/about" />
    <meta name="twitter:image" content="${baseUrl}/logo.png" />`;
    
    // Full about content HTML
    const aboutContent = `
<article style="max-width:896px;margin:0 auto;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif;">
  <h1 style="font-size:2.25rem;font-weight:700;color:#1f2937;margin-bottom:24px;">About Bible Sketch</h1>
  
  <p style="font-size:1.125rem;font-weight:500;color:#374151;line-height:1.75;margin-bottom:24px;">
    <strong>Bible Sketch is an AI-powered platform that generates custom, free printable Bible coloring pages instantly.</strong> Unlike traditional static libraries, it allows parents and ministry leaders to create unique scene art and scripture typography for any Bible verse, specifically tailored for Sunday School, VBS, and personal devotion.
  </p>

  <section style="margin-top:48px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">Our Story</h2>
    
    <img src="${baseUrl}/about-Renaud.webp" alt="Renaud Gagne, founder of Bible Sketch" style="max-width:300px;width:100%;height:auto;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);margin-bottom:16px;float:right;margin-left:24px;" />
    
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      Hi, I'm <strong>Renaud Gagne</strong>, the founder of Bible Sketch. I'm a Christian, a father of four children (all under age 8), and part of a homeschooling family. If you've ever tried to teach the story of Daniel in the Lions' Den to a room full of energetic six-year-olds, you know the struggle. The wiggles are real. In our house, we call this the "chaos hour."
    </p>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      I built Bible Sketch because I needed a way to channel that energy into something focused, quiet, and meaningful—without spending hours prepping the night before. As someone who teaches <a href="https://dioceseofcanada.ca/gods-big-story" target="_blank" rel="noopener noreferrer" style="color:#7c3aed;text-decoration:none;">God's Big Story</a> curriculum at <a href="https://www.sttimothysabc.org/" target="_blank" rel="noopener noreferrer" style="color:#7c3aed;text-decoration:none;">St. Timothy's Anglican Bible Church</a>, I understand firsthand the challenge of finding specific artwork for obscure verses or particular lessons.
    </p>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;clear:right;">
      My core philosophy is simple: <strong>"Slowness is sacred."</strong> I believe in using imagination to meditate on God's Word. I value "slow theology" over fast consumption. When my 5-year-old colors the word "GRACE" in our Verse Art tool, he isn't just seeing the word; he is physically tracing the shape of it. This builds the fine motor skills needed for handwriting while planting the scripture deep in his memory. It's handwriting practice and theology, all rolled into one.
    </p>
  </section>

  <section style="margin-top:48px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">Our Mission</h2>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      Bible Sketch exists to solve a common problem for ministry leaders and parents: finding specific artwork for specific Bible verses. Rather than searching through limited pre-made collections, users generate fresh content on demand.
    </p>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      We designed the platform with two distinct tools to cover different ministry needs:
    </p>
    <ul style="list-style:disc;padding-left:24px;margin:16px 0;color:#374151;line-height:1.75;">
      <li style="margin-bottom:8px;"><strong>Scene Art:</strong> Visual storytelling and biblical narrative. Best used for Sunday School lessons, VBS history, and teaching complex stories.</li>
      <li style="margin-bottom:8px;"><strong>Verse Art:</strong> Typography and scripture memorization. These designs are ideal for memory verses, meditation, and relaxation.</li>
    </ul>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      Our values center on <strong>biblical accuracy</strong>, <strong>educational development</strong>, and <strong>accessibility</strong>. We believe that every child should have access to quality resources that help them engage with Scripture in meaningful ways.
    </p>
  </section>

  <section style="margin-top:48px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">What Makes Bible Sketch Different</h2>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      The platform utilizes generative AI to interpret biblical text and render it into high-resolution line art suitable for printing. A key feature is the ability to adjust the "complexity level" of the output, ensuring the content is developmentally appropriate:
    </p>
    <ul style="list-style:disc;padding-left:24px;margin:16px 0;color:#374151;line-height:1.75;">
      <li style="margin-bottom:8px;"><strong>Toddlers (Ages 2–4):</strong> Produces thick lines and large, simple shapes. Focuses on central characters with minimal background noise.</li>
      <li style="margin-bottom:8px;"><strong>Children (Ages 5–10):</strong> Storybook-style illustrations. Balances character detail with background elements.</li>
      <li style="margin-bottom:8px;"><strong>Teens (Ages 11–17):</strong> Dynamic, graphic-novel style compositions with "Comic Book" aesthetics.</li>
      <li style="margin-bottom:8px;"><strong>Adults (18+):</strong> Intricate, stained glass-style or fine-art detail. Designed for stress relief, meditation, and extended coloring sessions.</li>
    </ul>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      Based on our analysis of user workflows, creating a page takes approximately 30 seconds. You select your tool, input the scripture, define the audience, choose an art style, and generate. Download the PDF for high-quality printing.
    </p>
  </section>

  <section style="margin-top:48px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">Trust & Accuracy</h2>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      Look, I'm a dad, and I'm protective of what my kids see. We've put guardrails on our AI to respect the Bible, but technology isn't perfect. I always tell parents: treat this like a partnership. Generate the image, take a second to look at it (maybe chuckle if Noah has an extra finger), and <em>then</em> hit print. <strong>Trust, but verify.</strong>
    </p>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      Our AI is prompted with strict guardrails to respect the context of scripture. However, as with all AI tools, we recommend reviewing the image to ensure it aligns with your theological interpretation before printing. We acknowledge that AI is a non-deterministic technology, and while we implement safety filters, the output may occasionally require review.
    </p>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      Content generated on Bible Sketch is cleared for use in non-commercial ministry settings, including Sunday School classes, church bulletins, and VBS packets. Churches can print unlimited copies for their classes.
    </p>
  </section>

  <section style="margin-top:48px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">Who Uses Bible Sketch?</h2>
    
    <div style="margin-bottom:24px;">
      <h3 style="font-weight:700;color:#1f2937;margin-bottom:8px;">For Sunday School and VBS</h3>
      <p style="color:#374151;line-height:1.75;margin-bottom:8px;">
        Teachers can generate materials that align perfectly with their specific curriculum. If a curriculum uses a non-standard verse, Bible Sketch creates a matching visual, eliminating the need to use unrelated generic artwork.
      </p>
    </div>

    <div style="margin-bottom:24px;">
      <h3 style="font-weight:700;color:#1f2937;margin-bottom:8px;">For Homeschooling</h3>
      <p style="color:#374151;line-height:1.75;margin-bottom:8px;">
        Parents can integrate art into Bible history or scripture memorization. The Verse Art tool is particularly effective for helping children memorize weekly verses by engaging their visual and kinesthetic learning senses.
      </p>
    </div>

    <div style="margin-bottom:24px;">
      <h3 style="font-weight:700;color:#1f2937;margin-bottom:8px;">For Personal Devotion</h3>
      <p style="color:#374151;line-height:1.75;margin-bottom:8px;">
        Many adults use the tool to create "Bible journaling" pages. Generating a coloring page based on a daily reading allows for quiet reflection and meditation on the text while coloring.
      </p>
    </div>
  </section>

  <section style="margin-top:48px;padding-top:32px;border-top:1px solid #e5e7eb;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">Get in Touch</h2>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      Have questions? We'd love to hear from you. Whether you're a Sunday School teacher looking for specific resources, a homeschooling parent exploring options, or just curious about how Bible Sketch works, we're here to help.
    </p>
    <div style="margin-bottom:16px;">
      <p style="color:#374151;line-height:1.75;margin-bottom:8px;">
        <strong>Support:</strong> <a href="mailto:support@biblesketch.com" style="color:#7c3aed;text-decoration:none;font-weight:700;">support@biblesketch.com</a>
      </p>
      <p style="color:#374151;line-height:1.75;margin-bottom:8px;">
        <strong>General Inquiries:</strong> <a href="mailto:hello@biblesketch.app" style="color:#7c3aed;text-decoration:none;font-weight:700;">hello@biblesketch.app</a>
      </p>
    </div>
    <p style="color:#374151;line-height:1.75;margin-top:24px;">
      You don't need another subscription that you'll forget to use. But if you're like me—tired of searching Google Images at 11 PM on a Saturday night—give the free tool a try first. Print a picture of Jonah for your kids. If it buys you 20 minutes of holy silence? Then we can talk about upgrading.
    </p>
  </section>

  <section style="margin-top:48px;padding-top:32px;border-top:1px solid #e5e7eb;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">Ready to Get Started?</h2>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      <a href="${baseUrl}/" style="color:#7c3aed;text-decoration:none;font-weight:500;">Try Scene Art</a> | 
      <a href="${baseUrl}/bible-verse-coloring" style="color:#7c3aed;text-decoration:none;font-weight:500;">Try Verse Art</a> | 
      <a href="${baseUrl}/pricing" style="color:#7c3aed;text-decoration:none;font-weight:500;">View Pricing</a> | 
      <a href="${baseUrl}/blog" style="color:#7c3aed;text-decoration:none;font-weight:500;">Read Our Blog</a>
    </p>
  </section>
</article>`;
    
    const removeSSRScript = `
    <script>
      (function() {
        var root = document.getElementById('root');
        if (root) {
          root.innerHTML = '';
        }
      })();
    </script>`;
    
    if (html.includes('</head>')) {
      html = html.replace('</head>', () => `${metaTags}\n${schemaScript}\n</head>`);
    } else {
      html += metaTags + schemaScript;
    }
    
    if (html.includes('<div id="root">')) {
      html = html.replace(/<div id="root"><\/div>/g, () => `<div id="root">${aboutContent}${removeSSRScript}</div>`);
      if (!html.includes(aboutContent)) {
        html = html.replace(/<div id="root">/g, () => `<div id="root">${aboutContent}${removeSSRScript}`);
      }
      
      if (!html.includes(aboutContent)) {
        console.error("[aboutRender] Failed to inject SEO content into HTML");
      } else {
        console.log("[aboutRender] Successfully injected SEO content");
      }
    } else {
      console.error("[aboutRender] Could not find <div id=\"root\"> in HTML template");
    }
    
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(html);
    
  } catch (error) {
    console.error("[aboutRender] Error:", error);
    sendShell(res, 503);
  }
});

// ---------------------------------------------------------
// 9. PRIVACY POLICY PAGE SSR RENDERER (Full Content for SEO)
// ---------------------------------------------------------
exports.privacyRender = onRequest({ timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  if (redirectToCanonical(req, res)) return;
  const host = 'biblesketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`[privacyRender] Called - Path: ${req.path} | Method: ${req.method} | UA: ${userAgent}`);
  
  try {
    let html = await getIndexHtml(baseUrl);
    
    const title = "Privacy Policy - Bible Sketch";
    const description = "Read the Privacy Policy for Bible Sketch. Learn how we collect, use, and protect your data when using our Bible coloring page generation service.";
    
    html = html.replace(/<title>.*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
    
    const metaTags = `
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="Privacy Policy - Bible Sketch" />
    <meta property="og:description" content="Read the Privacy Policy for Bible Sketch." />
    <meta property="og:type" content="website" />
    <meta name="robots" content="noindex, follow" />`;
    
    // Full privacy policy content HTML
    const privacyContent = `
<article style="max-width:896px;margin:0 auto;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif;">
  <h1 style="font-size:2.25rem;font-weight:700;color:#1f2937;margin-bottom:8px;">🔒 Bible Sketch: Privacy Policy</h1>
  <p style="color:#6b7280;font-weight:500;margin-bottom:32px;">Last Updated: November 26, 2025</p>

  <p style="color:#374151;line-height:1.75;margin-bottom:32px;">
    Welcome to <strong>Bible Sketch</strong> ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services. Please read this privacy policy carefully. By using Bible Sketch, you consent to the data practices described in this policy.
  </p>

  <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0;" />

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">1. Information We Collect</h2>
    
    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">1.1. Personal Information</h3>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      When you create an account or make a purchase, we may collect:
    </p>
    <ul style="list-style:disc;padding-left:24px;margin:16px 0;color:#374151;line-height:1.75;">
      <li style="margin-bottom:4px;"><strong>Account Information:</strong> Email address, display name, and profile picture (if provided via Google Sign-In).</li>
      <li style="margin-bottom:4px;"><strong>Payment Information:</strong> When you purchase credits, your payment is processed by our third-party payment processor, Zoho Billing. We do not store your full credit card number or payment credentials on our servers.</li>
      <li style="margin-bottom:4px;"><strong>Generated Content:</strong> The images you create and any prompts or settings you use.</li>
    </ul>

    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">1.2. Automatically Collected Information</h3>
    <p style="color:#374151;line-height:1.75;margin-bottom:8px;">
      When you access Bible Sketch, we automatically collect certain information, including:
    </p>
    <ul style="list-style:disc;padding-left:24px;margin:16px 0;color:#374151;line-height:1.75;">
      <li style="margin-bottom:4px;"><strong>Device Information:</strong> Browser type, operating system, device type, and screen resolution.</li>
      <li style="margin-bottom:4px;"><strong>Usage Data:</strong> Pages visited, features used, time spent on pages, and interaction patterns.</li>
      <li style="margin-bottom:4px;"><strong>IP Address:</strong> Your approximate geographic location based on IP address.</li>
      <li style="margin-bottom:4px;"><strong>Cookies and Tracking Technologies:</strong> See Section 3 for details.</li>
    </ul>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">2. How We Use Your Information</h2>
    <p style="color:#374151;line-height:1.75;margin-bottom:8px;">We use the information we collect to:</p>
    <ul style="list-style:disc;padding-left:24px;margin:16px 0;color:#374151;line-height:1.75;">
      <li style="margin-bottom:4px;">Provide, operate, and maintain our services.</li>
      <li style="margin-bottom:4px;">Process transactions and send related information (purchase confirmations, credit updates).</li>
      <li style="margin-bottom:4px;">Send you technical notices, security alerts, and support messages.</li>
      <li style="margin-bottom:4px;">Respond to your comments, questions, and customer service requests.</li>
      <li style="margin-bottom:4px;">Monitor and analyze usage trends to improve user experience.</li>
      <li style="margin-bottom:4px;">Detect, prevent, and address technical issues, fraud, or abuse.</li>
      <li style="margin-bottom:4px;">Deliver targeted advertising and measure ad effectiveness.</li>
    </ul>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">3. Cookies and Tracking Technologies</h2>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      We use cookies and similar tracking technologies to collect and track information about your activity on our service. This helps us understand how you use Bible Sketch and allows us to improve our services and deliver relevant advertising.
    </p>

    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">3.1. Google Analytics 4 (GA4)</h3>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      We use Google Analytics 4 to analyze website traffic and user behavior. GA4 collects information such as how often you visit, which pages you view, and what other sites you visited before coming to Bible Sketch. Google may use this data to contextualize and personalize ads in its advertising network. You can opt out of Google Analytics by installing the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style="color:#7c3aed;text-decoration:none;">Google Analytics Opt-out Browser Add-on</a>.
    </p>

    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">3.2. Facebook Pixel</h3>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      We use the Facebook Pixel to measure the effectiveness of our advertising on Facebook and Instagram, and to deliver targeted ads to you on those platforms. The Facebook Pixel collects information about your activity on Bible Sketch, which Facebook may associate with your Facebook account. You can manage your ad preferences in your <a href="https://www.facebook.com/settings/?tab=ads" target="_blank" rel="noopener noreferrer" style="color:#7c3aed;text-decoration:none;">Facebook Ad Settings</a>.
    </p>

    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">3.3. Pinterest Tag</h3>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      We use the Pinterest Tag to measure conversions from Pinterest ads and to build audiences for future advertising. The Pinterest Tag collects information about your activity on Bible Sketch. You can opt out of interest-based advertising from Pinterest by adjusting your <a href="https://www.pinterest.com/settings/privacy" target="_blank" rel="noopener noreferrer" style="color:#7c3aed;text-decoration:none;">Pinterest Privacy Settings</a>.
    </p>

    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">3.4. Managing Cookies</h3>
    <p style="color:#374151;line-height:1.75;">
      Most web browsers allow you to control cookies through their settings. You can set your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you disable cookies, some features of Bible Sketch may not function properly.
    </p>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">4. Payment Processing</h2>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      All payment transactions are processed through <strong>Zoho Billing</strong>, a third-party payment processor. When you make a purchase:
    </p>
    <ul style="list-style:disc;padding-left:24px;margin:16px 0;color:#374151;line-height:1.75;">
      <li style="margin-bottom:4px;">Your payment information is collected and processed directly by Zoho Billing.</li>
      <li style="margin-bottom:4px;">We receive only limited information (such as the last four digits of your card, transaction ID, and payment status) necessary to fulfill your order.</li>
      <li style="margin-bottom:4px;">Zoho Billing's use of your personal information is governed by their own <a href="https://www.zoho.com/privacy.html" target="_blank" rel="noopener noreferrer" style="color:#7c3aed;text-decoration:none;">Privacy Policy</a>.</li>
    </ul>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">5. Data Sharing and Disclosure</h2>
    <p style="color:#374151;line-height:1.75;margin-bottom:8px;">We may share your information in the following circumstances:</p>
    <ul style="list-style:disc;padding-left:24px;margin:16px 0;color:#374151;line-height:1.75;">
      <li style="margin-bottom:4px;"><strong>Service Providers:</strong> We share data with third-party vendors who perform services on our behalf (payment processing, analytics, advertising).</li>
      <li style="margin-bottom:4px;"><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid legal requests.</li>
      <li style="margin-bottom:4px;"><strong>Business Transfers:</strong> If Bible Sketch is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
      <li style="margin-bottom:4px;"><strong>With Your Consent:</strong> We may share information for other purposes with your explicit consent.</li>
    </ul>
    <p style="color:#374151;line-height:1.75;">
      We do <strong>not</strong> sell your personal information to third parties.
    </p>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">6. Data Security</h2>
    <p style="color:#374151;line-height:1.75;">
      We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your data, we cannot guarantee its absolute security.
    </p>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">7. Your Rights and Choices</h2>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">Depending on your location, you may have certain rights regarding your personal information:</p>
    
    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">7.1. Access and Portability</h3>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      You can request a copy of the personal information we hold about you.
    </p>

    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">7.2. Correction</h3>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      You can update your account information directly through your profile settings.
    </p>

    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">7.3. Deletion</h3>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      You can request deletion of your account and associated data. Note that some information may be retained for legal or legitimate business purposes.
    </p>

    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">7.4. Opt-Out of Marketing</h3>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      You can opt out of receiving promotional emails by following the unsubscribe instructions in those emails. You may still receive transactional communications (such as purchase confirmations).
    </p>

    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">7.5. Opt-Out of Tracking</h3>
    <p style="color:#374151;line-height:1.75;">
      You can opt out of tracking by adjusting your browser settings, using browser extensions, or adjusting your preferences in the third-party platforms mentioned in Section 3.
    </p>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">8. Data Retention</h2>
    <p style="color:#374151;line-height:1.75;">
      We retain your personal information for as long as your account is active or as needed to provide you services. We may also retain and use your information to comply with legal obligations, resolve disputes, and enforce our agreements. Generated images in your account are retained until you delete them or close your account.
    </p>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">9. Children's Privacy</h2>
    <p style="color:#374151;line-height:1.75;">
      Bible Sketch is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at <a href="mailto:hello@biblesketch.app" style="color:#7c3aed;text-decoration:none;">hello@biblesketch.app</a> so we can delete the information.
    </p>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">10. International Data Transfers</h2>
    <p style="color:#374151;line-height:1.75;">
      Your information may be transferred to and processed in countries other than your own. These countries may have different data protection laws. By using Bible Sketch, you consent to the transfer of your information to countries outside your country of residence, including the United States.
    </p>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">11. Changes to This Privacy Policy</h2>
    <p style="color:#374151;line-height:1.75;">
      We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes. Your continued use of Bible Sketch after any modifications indicates your acceptance of the updated Privacy Policy.
    </p>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">12. Contact Us</h2>
    <p style="color:#374151;line-height:1.75;">
      If you have any questions about this Privacy Policy or our data practices, please contact us at:<br/>
      <a href="mailto:hello@biblesketch.app" style="color:#7c3aed;text-decoration:none;font-weight:700;">hello@biblesketch.app</a>
    </p>
  </section>
</article>`;
    
    const removeSSRScript = `
    <script>
      (function() {
        var root = document.getElementById('root');
        if (root) {
          root.innerHTML = '';
        }
      })();
    </script>`;
    
    if (html.includes('</head>')) {
      html = html.replace('</head>', () => `${metaTags}\n</head>`);
    } else {
      html += metaTags;
    }
    
    if (html.includes('<div id="root">')) {
      html = html.replace(/<div id="root"><\/div>/g, () => `<div id="root">${privacyContent}${removeSSRScript}</div>`);
      if (!html.includes(privacyContent)) {
        html = html.replace(/<div id="root">/g, () => `<div id="root">${privacyContent}${removeSSRScript}`);
      }
      
      if (!html.includes(privacyContent)) {
        console.error("[privacyRender] Failed to inject SEO content into HTML");
      } else {
        console.log("[privacyRender] Successfully injected SEO content");
      }
    } else {
      console.error("[privacyRender] Could not find <div id=\"root\"> in HTML template");
    }
    
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(html);
    
  } catch (error) {
    console.error("[privacyRender] Error:", error);
    sendShell(res, 503);
  }
});

// ---------------------------------------------------------
// 10. TERMS OF SERVICE PAGE SSR RENDERER (Full Content for SEO)
// ---------------------------------------------------------
exports.termsRender = onRequest({ timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  if (redirectToCanonical(req, res)) return;
  const host = 'biblesketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`[termsRender] Called - Path: ${req.path} | Method: ${req.method} | UA: ${userAgent}`);
  
  try {
    let html = await getIndexHtml(baseUrl);
    
    const title = "Terms of Service - Bible Sketch";
    const description = "Read the Terms of Service for Bible Sketch. Learn about our policies for creating and using Bible coloring pages, credits, subscriptions, and AI-generated content.";
    
    html = html.replace(/<title>.*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
    
    const metaTags = `
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="Terms of Service - Bible Sketch" />
    <meta property="og:description" content="Read the Terms of Service for Bible Sketch." />
    <meta property="og:type" content="website" />
    <meta name="robots" content="noindex, follow" />`;
    
    // Full terms of service content HTML
    const termsContent = `
<article style="max-width:896px;margin:0 auto;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif;">
  <h1 style="font-size:2.25rem;font-weight:700;color:#1f2937;margin-bottom:8px;">⚖️ Bible Sketch: Terms of Service</h1>
  <p style="color:#6b7280;font-weight:500;margin-bottom:32px;">Last Updated: November 19, 2025</p>

  <p style="color:#374151;line-height:1.75;margin-bottom:32px;">
    Welcome to <strong>Bible Sketch</strong> ("we," "our," or "us"). By creating an account, purchasing credits, or using our AI generation services, you agree to these legally binding Terms of Service. Please read them carefully.
  </p>

  <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0;" />

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">1. Scope of Service</h2>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      By using Bible Sketch, you agree that you are at least 18 years old (or a parent/guardian consenting on behalf of a minor).
    </p>
    
    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">1.1. Defined Artistic Scope</h3>
    <p style="color:#374151;line-height:1.75;margin-bottom:8px;">
      Bible Sketch is a specialized tool designed <strong>exclusively</strong> for generating coloring pages in three specific artistic styles:
    </p>
    <ul style="list-style:disc;padding-left:24px;margin:16px 0;color:#374151;line-height:1.75;">
      <li style="margin-bottom:4px;"><strong>Sunday School</strong> (Cartoon/Line Art)</li>
      <li style="margin-bottom:4px;"><strong>Stained Glass</strong> (Geometric/Mosaic)</li>
      <li style="margin-bottom:4px;"><strong>Iconography</strong> (Byzantine/Orthodox)</li>
    </ul>
    <p style="color:#374151;line-height:1.75;">
      Any attempt to force the service to generate photorealistic imagery, modern art styles, non-biblical content, or content outside these parameters is a violation of these terms and is not supported.
    </p>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">2. Intellectual Property & Rights</h2>
    
    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">2.1. User Ownership</h3>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      As between you and Bible Sketch, <strong>you own the images you generate</strong> on the platform. We assign to you all rights, title, and interest in the assets you create, subject to your compliance with these Terms. You are free to print, sell, or distribute your generated images commercially.
    </p>

    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">2.2. License Grant to Bible Sketch</h3>
    <p style="color:#374151;line-height:1.75;margin-bottom:8px;">
      By generating content on Bible Sketch, you grant us a <strong>perpetual, worldwide, non-exclusive, royalty-free, sublicensable, and transferable license</strong> to use, reproduce, modify, display, and distribute your generated images. We require this license to:
    </p>
    <ul style="list-style:disc;padding-left:24px;margin:16px 0;color:#374151;line-height:1.75;">
      <li style="margin-bottom:4px;">Operate the service (rendering and storing images).</li>
      <li style="margin-bottom:4px;">Market the platform (showcasing examples).</li>
      <li style="margin-bottom:4px;">Improve our AI models and safety filters.</li>
    </ul>

    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">2.3. Public Gallery License</h3>
    <p style="color:#374151;line-height:1.75;">
      If you voluntarily choose to set an image to <strong>"Public"</strong> or share it to the Community Gallery, you grant other Bible Sketch users a non-exclusive license to view, download, print, and "Remix" (create variations of) that content.
    </p>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">3. Payment Terms</h2>
    
    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">3.1. Credit System</h3>
    <p style="color:#374151;line-height:1.75;margin-bottom:8px;">Bible Sketch operates on a pre-paid credit basis.</p>
    <ul style="list-style:disc;padding-left:24px;margin:16px 0;color:#374151;line-height:1.75;">
      <li style="margin-bottom:4px;"><strong>No Expiration:</strong> Purchased credits do not expire.</li>
      <li style="margin-bottom:4px;"><strong>Final Sale:</strong> All credit purchases are final and non-refundable. Credits have no monetary value outside of the Bible Sketch platform and cannot be exchanged for cash.</li>
    </ul>

    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">3.2. Quality Disputes</h3>
    <p style="color:#374151;line-height:1.75;">
      While purchases are non-refundable, we may, at our sole discretion, refund a single credit to your account balance if a generated image is technically defective (e.g., illegible text or severe distortion). You must report such issues within 24 hours of generation.
    </p>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">4. User Conduct & Prohibited Content</h2>
    <p style="color:#374151;line-height:1.75;margin-bottom:8px;">You agree NOT to use Bible Sketch to generate:</p>
    <ol style="list-style:decimal;padding-left:24px;margin:16px 0;color:#374151;line-height:1.75;">
      <li style="margin-bottom:4px;">Hate speech, violence, gore, or sexually explicit content.</li>
      <li style="margin-bottom:4px;">Images that mock, denigrate, or disrespect religious beliefs.</li>
      <li style="margin-bottom:4px;">Content that infringes on third-party intellectual property (e.g., requesting copyrighted characters).</li>
    </ol>
    <p style="color:#374151;line-height:1.75;">
      <strong>Termination:</strong> We reserve the right to suspend or ban any account that repeatedly attempts to bypass our safety filters or generates prohibited content.
    </p>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">5. DISCLAIMERS & LIMITATION OF LIABILITY</h2>
    <p style="font-weight:700;color:#374151;margin-bottom:16px;">PLEASE READ THIS SECTION CAREFULLY.</p>

    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">5.1. No Liability for AI Output ("Hallucinations")</h3>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      You acknowledge that Artificial Intelligence is a non-deterministic technology. While we implement strict safety filters, the AI may, on rare occasions and without warning, generate content that is unexpected, inappropriate, offensive, biologically inaccurate, or visually disturbing. <strong>Bible Sketch is NOT responsible or liable for any such content.</strong><br />
      By using the service, you agree to hold Bible Sketch harmless from any claims, damages, or distress arising from the visual nature of the AI output. Your sole remedy for an inappropriate generation is to report the image for deletion and request a credit refund.
    </p>

    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">5.2. No Guarantee of Accuracy</h3>
    <p style="color:#374151;line-height:1.75;margin-bottom:16px;">
      Bible Sketch does not guarantee that generated images are historically, anatomically, or theologically accurate.
    </p>

    <h3 style="font-weight:700;color:#1f2937;font-size:1.125rem;margin-bottom:8px;">5.3. Copyright Enforceability</h3>
    <p style="color:#374151;line-height:1.75;">
      You acknowledge that under current laws (including US Copyright Office guidance), purely AI-generated works may not be eligible for copyright registration. Bible Sketch makes no warranty regarding your ability to enforce copyright against third parties who copy your generated images.
    </p>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">6. General Limitation of Liability</h2>
    <p style="color:#374151;line-height:1.75;">
      To the maximum extent permitted by law, the Bible Sketch service is provided "AS IS" and "AS AVAILABLE." In no event shall Bible Sketch be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits or data, arising out of or in connection with your use of the service.
    </p>
  </section>

  <section style="margin-top:32px;">
    <h2 style="font-size:1.5rem;font-weight:700;color:#1f2937;margin-bottom:16px;">7. Contact Information</h2>
    <p style="color:#374151;line-height:1.75;">
      For legal inquiries regarding these Terms, please contact:<br/>
      <strong>support@biblesketch.com</strong>
    </p>
  </section>
</article>`;
    
    const removeSSRScript = `
    <script>
      (function() {
        var root = document.getElementById('root');
        if (root) {
          root.innerHTML = '';
        }
      })();
    </script>`;
    
    if (html.includes('</head>')) {
      html = html.replace('</head>', () => `${metaTags}\n</head>`);
    } else {
      html += metaTags;
    }
    
    if (html.includes('<div id="root">')) {
      html = html.replace(/<div id="root"><\/div>/g, () => `<div id="root">${termsContent}${removeSSRScript}</div>`);
      if (!html.includes(termsContent)) {
        html = html.replace(/<div id="root">/g, () => `<div id="root">${termsContent}${removeSSRScript}`);
      }
      
      if (!html.includes(termsContent)) {
        console.error("[termsRender] Failed to inject SEO content into HTML");
      } else {
        console.log("[termsRender] Successfully injected SEO content");
      }
    } else {
      console.error("[termsRender] Could not find <div id=\"root\"> in HTML template");
    }
    
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(html);
    
  } catch (error) {
    console.error("[termsRender] Error:", error);
    sendShell(res, 503);
  }
});

// ---------------------------------------------------------
// 11. VERIFIED PAGE RENDERER (Simple client-side route)
// ---------------------------------------------------------
exports.verifiedRender = onRequest({ timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  if (redirectToCanonical(req, res)) return;
  const host = 'biblesketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  
  console.log(`[verifiedRender] Called - Path: ${req.path} | Method: ${req.method} | UA: ${userAgent}`);
  
  try {
    // Email-verification landing page: real title, never indexed
    const html = (await getIndexHtml(baseUrl)).replace(/<title>.*?<\/title>/i, '<title>Email Verified | Bible Sketch</title>');
    res.set('X-Robots-Tag', 'noindex');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(html);
  } catch (error) {
    console.error("[verifiedRender] Error:", error);
    sendShell(res, 503);
  }
});

// ---------------------------------------------------------
// 12. ZOHO BILLING WEBHOOK HANDLER
// ---------------------------------------------------------


const zohoWebhookSecret = defineSecret("ZOHO_WEBHOOK_SECRET");

// Rollout switch (functions/.env): unset/false = log whether the request is authenticated but
// still process it; true = reject unauthenticated requests with 401.
// Set ZOHO_ENFORCE_AUTH=true once Zoho sends the header, then redeploy.
const ZOHO_ENFORCE_AUTH = process.env.ZOHO_ENFORCE_AUTH === 'true';
// Zoho plan codes that mean Premium (the /pricing checkout URL ends with the plan code).
const PREMIUM_PLANS = new Set(['bible-sketch-premium']);
// The email-only Unlimited Prints plans (docs/email-marketing-plan.md §12.20): unlimited prints, no credits.
const PRINTS_PLANS = new Set(['bible-sketch-prints-monthly', 'bible-sketch-prints-yearly']);

const safeEqual = (a, b) => {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

// Zoho's optional HMAC-SHA256 signature: sorted key+value pairs of the query string
// (plus form fields for form posts), then the raw JSON body. Returns null when unsigned.
const zohoSignatureValid = (req, secret) => {
  const signature = req.get('x-zoho-webhook-signature');
  if (!signature) return null;
  const isJson = req.is('application/json');
  const fields = { ...req.query, ...(isJson ? {} : (req.body || {})) };
  const pairs = Object.keys(fields).sort().map(k => k + String(fields[k])).join('');
  const payload = pairs + (isJson && req.rawBody ? req.rawBody.toString('utf8') : '');
  const mac = crypto.createHmac('sha256', secret).update(payload);
  const digest = mac.digest();
  return safeEqual(signature, digest.toString('hex')) || safeEqual(signature, digest.toString('base64'));
};

// A stable id for this delivery, so Zoho retries and resends don't grant twice.
// Zoho posts only {"subscription": {...}}. Each pack purchase is its own $0 subscription,
// so its id identifies the purchase; premium renewals get a new id because the term changes.
// Returns null when the payload has nothing usable.
const zohoDeliveryId = (body, packType) => {
  const s = (body && body.subscription) || {};
  if (!s.subscription_id) return null;
  if (packType) return `pack_${s.subscription_id}`;
  const term = s.current_term_starts_at || s.last_billing_at;
  return term ? `sub_${s.subscription_id}_${s.status}_${term}` : null;
};

/**
 * Extracts Firebase UID from Zoho customer custom fields (fallback).
 * Primary method is via URL query parameter ?uid=XXX
 */
const extractFirebaseUid = (body) => {
  const customer = body?.subscription?.customer || {};
  if (customer.custom_field_hash?.cf_cf_firebase_uid) return customer.custom_field_hash.cf_cf_firebase_uid;
  const customFields = customer.custom_fields || [];
  const uidField = customFields.find(f =>
    f.label === 'firebase_uid' ||
    f.api_name === 'cf_cf_firebase_uid'
  );
  return uidField?.value || null;
};

/**
 * Handles Zoho Billing webhooks: credit pack purchases (?pack=&uid=) and subscription lifecycle events.
 *
 * Authentication: Zoho must send the header `x-webhook-token: <ZOHO_WEBHOOK_SECRET>`
 * (Zoho Billing → Settings → Automation → Webhooks → Headers), or a valid X-Zoho-Webhook-Signature.
 *
 * Configure these events in Zoho Billing → Settings → Automation → Workflow Actions:
 * - New Subscription
 * - Subscription Renewal
 * - Cancel Subscription
 * - Subscription Expired
 * - Subscription Cancellation Scheduled (optional)
 */
exports.handleZohoWebhook = onRequest({
  cors: false,
  memory: "256MiB",
  timeoutSeconds: 60,
  secrets: [zohoWebhookSecret]
}, async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // 1. Authenticate before touching anything
    const secret = zohoWebhookSecret.value().trim();
    const token = req.get('x-webhook-token');
    const tokenValid = !!token && safeEqual(token.trim(), secret);
    const signatureValid = zohoSignatureValid(req, secret);
    console.log(`📩 Zoho webhook: token=${token ? tokenValid : 'absent'} signature=${signatureValid === null ? 'absent' : signatureValid}`);

    if (!tokenValid && signatureValid !== true) {
      if (ZOHO_ENFORCE_AUTH) {
        return res.status(401).send('Unauthorized');
      }
      console.warn('⚠️ Unauthenticated Zoho webhook processed (enforcement off)');
    }

    const db = admin.firestore();

    // --- CREDIT PACK HANDLER (early exit) ---
    const PACK_CREDITS = {
      'spark': { credits: 20, downloads: 20, price: 4.99 },
      'torch': { credits: 80, downloads: 80, price: 14.99 },
      'beacon': { credits: 200, downloads: 200, price: 29.99 },
    };

    const packType = req.query.pack;
    if (packType) {
      const pack = PACK_CREDITS[packType];
      if (!pack) {
        console.warn(`⚠️ Unknown pack type: ${packType}`);
        return res.status(200).send('Unknown pack');
      }

      const firebaseUid = req.query.uid || extractFirebaseUid(req.body);
      if (!firebaseUid) {
        console.error('❌ No Firebase UID for credit pack purchase');
        return res.status(400).send('Missing UID');
      }

      const deliveryId = zohoDeliveryId(req.body, packType);
      if (!deliveryId) {
        console.warn('⚠️ Credit pack webhook has no payment/invoice id; cannot de-duplicate');
      }

      const userRef = db.collection('users').doc(firebaseUid);
      const processedRef = deliveryId ? db.collection('processedWebhooks').doc(deliveryId) : null;

      const granted = await db.runTransaction(async (tx) => {
        if (processedRef && (await tx.get(processedRef)).exists) return false;

        tx.set(userRef, {
          credits: FieldValue.increment(pack.credits),
          downloadsRemaining: FieldValue.increment(pack.downloads),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        // Log transaction
        tx.set(userRef.collection('transactions').doc(), {
          type: 'credit_purchase',
          pack: packType,
          creditsAdded: pack.credits,
          downloadsRemainingAdded: pack.downloads,
          price: pack.price,
          ...(deliveryId && { deliveryId }),
          timestamp: FieldValue.serverTimestamp()
        });

        if (processedRef) {
          tx.set(processedRef, {
            processedAt: FieldValue.serverTimestamp(),
            status: 'credit_purchase',
            userId: firebaseUid,
            pack: packType
          });
        }
        return true;
      });

      if (!granted) {
        console.log(`↩️ Credit pack ${deliveryId} already processed`);
        return res.status(200).send('Already processed');
      }
      console.log(`✅ ${packType} pack: +${pack.credits} credits for ${firebaseUid} (${deliveryId || 'no id'})`);
      return res.status(200).send('Credit pack processed');  // EARLY EXIT - Premium logic below won't run
    }

    // --- PREMIUM SUBSCRIPTION LOGIC ---

    // 2. Extract subscription data
    const subscription = req.body?.subscription;
    if (!subscription) {
      console.warn('⚠️ No subscription data in webhook payload');
      return res.status(200).send('Ignored: No subscription data');
    }

    const subscriptionId = subscription.subscription_id;
    const subscriptionStatus = subscription.status;

    // Zoho routes deliveries here by workflow rule, so a new plan wired to this URL without ?pack= would
    // otherwise be granted (or have its cancellation remove) Premium. Only these plan codes touch premium.
    const planCode = String(subscription.plan?.plan_code || '').toLowerCase();
    if (!PREMIUM_PLANS.has(planCode) && !PRINTS_PLANS.has(planCode)) {
      console.error(`❌ Subscription ${subscriptionId} is on plan "${planCode}", not a known plan; nothing granted`);
      return res.status(400).send('Unknown plan');
    }

    // 3. Extract Firebase UID from query param (preferred) or body (fallback)
    const firebaseUid = req.query.uid || extractFirebaseUid(req.body);

    if (!firebaseUid) {
      console.warn(`⚠️ Subscription ${subscriptionId} webhook without Firebase UID`);
      return res.status(400).send('Missing UID');
    }

    console.log(`   Subscription ${subscriptionId} status=${subscriptionStatus} uid=${firebaseUid}`);

    // 4. Get User Reference
    const userRef = db.collection('users').doc(firebaseUid);

    // Prints plan: each paid term (new or renewal) extends printsUnlimitedUntil to the term's end plus 3 days'
    // grace for the renewal to arrive; it never shortens a longer pass (a gift). Other statuses change nothing:
    // a cancelled or unpaid plan simply lapses at that date.
    if (PRINTS_PLANS.has(planCode)) {
      if (subscriptionStatus !== 'live' && subscriptionStatus !== 'active') {
        console.log(`ℹ️ Prints plan ${subscriptionId} status=${subscriptionStatus}: nothing to change`);
        return res.status(200).send('No change');
      }
      const termEnd = Date.parse(`${String(subscription.current_term_ends_at).slice(0, 10)}T00:00:00Z`);
      if (!termEnd) {
        console.error(`❌ Prints plan ${subscriptionId} has no current_term_ends_at; nothing granted`);
        return res.status(400).send('Missing term end');
      }
      const until = Timestamp.fromMillis(termEnd + 3 * 24 * 60 * 60 * 1000);
      const deliveryId = zohoDeliveryId(req.body, null);
      const processedRef = deliveryId ? db.collection('processedWebhooks').doc(deliveryId) : null;
      const granted = await db.runTransaction(async (tx) => {
        if (processedRef && (await tx.get(processedRef)).exists) return false;
        const current = (await tx.get(userRef)).get('printsUnlimitedUntil');
        if (!current || current.toMillis() < until.toMillis()) {
          tx.set(userRef, { printsUnlimitedUntil: until, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
        tx.set(userRef.collection('transactions').doc(), {
          userId: firebaseUid,
          type: 'prints_subscription',
          plan: planCode,
          description: 'Unlimited prints',
          termEndsAt: subscription.current_term_ends_at,
          ...(subscription.amount !== undefined && { price: subscription.amount }),
          ...(deliveryId && { deliveryId }),
          timestamp: FieldValue.serverTimestamp()
        });
        if (processedRef) {
          tx.set(processedRef, { processedAt: FieldValue.serverTimestamp(), status: subscriptionStatus, userId: firebaseUid, subscriptionId });
        }
        return true;
      });
      if (!granted) return res.status(200).send('Already processed');
      console.log(`✅ Unlimited prints until ${until.toDate().toISOString()} for ${firebaseUid} (${planCode})`);
      return res.status(200).send('Prints plan processed');
    }

    // 5. Handle based on subscription status
    if (subscriptionStatus === 'live' || subscriptionStatus === 'active') {
      // New subscription or renewal: grant once per delivery id
      const deliveryId = zohoDeliveryId(req.body, null);
      if (!deliveryId) {
        console.warn('⚠️ Subscription webhook has no event id or billing term; cannot de-duplicate');
      }
      const processedRef = deliveryId ? db.collection('processedWebhooks').doc(deliveryId) : null;

      const action = await db.runTransaction(async (tx) => {
        if (processedRef && (await tx.get(processedRef)).exists) return null;

        const userDoc = await tx.get(userRef);
        const isNewSubscription = !userDoc.exists || !userDoc.data()?.isPremium;

        tx.set(userRef, {
          isPremium: true,
          credits: FieldValue.increment(10),
          planStatus: 'active',
          zohoSubscriptionId: subscriptionId,
          zohoCustomerId: subscription.customer?.customer_id || null,
          ...(isNewSubscription && { subscriptionStartDate: FieldValue.serverTimestamp() }),
          ...(!isNewSubscription && { lastRenewal: FieldValue.serverTimestamp() }),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        // Log transaction to subcollection
        const label = isNewSubscription ? 'Premium subscription activated' : 'Monthly subscription renewal';
        const txRef = userRef.collection('transactions').doc();
        tx.set(txRef, {
          id: txRef.id,
          userId: firebaseUid,
          amount: 10,
          description: label,
          type: 'subscription',
          ...(deliveryId && { deliveryId }),
          timestamp: Date.now(),
          createdAt: FieldValue.serverTimestamp()
        });

        if (processedRef) {
          tx.set(processedRef, {
            processedAt: FieldValue.serverTimestamp(),
            status: subscriptionStatus,
            userId: firebaseUid,
            subscriptionId: subscriptionId
          });
        }
        return label;
      });

      if (!action) {
        console.log(`↩️ Subscription webhook ${deliveryId} already processed`);
        return res.status(200).send('Already processed');
      }
      console.log(`✅ ${action} for user: ${firebaseUid}`);

    } else if (subscriptionStatus === 'cancelled' || subscriptionStatus === 'canceled') {
      // Subscription cancelled
      await userRef.set({
        isPremium: false,
        planStatus: 'canceled',
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`❌ Premium DEACTIVATED for user: ${firebaseUid}`);

    } else if (subscriptionStatus === 'expired') {
      // Subscription expired
      await userRef.set({
        isPremium: false,
        planStatus: 'expired',
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`❌ Premium EXPIRED for user: ${firebaseUid}`);

    } else if (subscriptionStatus === 'non_renewing') {
      // User cancelled but subscription still active until period ends
      await userRef.set({
        planStatus: 'pending_cancel',
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`⏳ Cancellation SCHEDULED for user: ${firebaseUid}`);

    } else {
      console.log(`ℹ️ Unhandled subscription status: ${subscriptionStatus}`);
    }

    res.status(200).send('Webhook processed successfully');

  } catch (error) {
    console.error('🔥 Error processing Zoho webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ---------------------------------------------------------
// 13. USER DOC TRIGGERS
// ---------------------------------------------------------
const { onDocumentCreated, onDocumentDeleted } = require("firebase-functions/v2/firestore");

// Server-owned fields kept when a user doc is deleted, restored if the same uid signs in again.
// Without this, deleting your own doc and signing back in resets you to the 5 welcome credits,
// and a premium user whose account deletion half-failed would come back without premium.
const RESTORED_USER_FIELDS = ['credits', 'downloadsRemaining', 'isPremium', 'planStatus',
  'zohoSubscriptionId', 'zohoCustomerId', 'subscriptionStartDate', 'lastRenewal'];

exports.onUserCreated = onDocumentCreated("users/{uid}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  // Emails live in Firebase Auth; the public profile doc must not expose them.
  const update = {};
  if (snap.get('email') !== undefined) {
    update.email = FieldValue.delete();
  }

  const tombstone = await admin.firestore().collection('deletedUsers').doc(event.params.uid).get();
  if (tombstone.exists) {
    for (const field of RESTORED_USER_FIELDS) {
      if (tombstone.get(field) !== undefined) update[field] = tombstone.get(field);
    }
  }

  if (Object.keys(update).length > 0) {
    await snap.ref.update(update);
  }
});

exports.onUserDeleted = onDocumentDeleted("users/{uid}", async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const kept = {};
  for (const field of RESTORED_USER_FIELDS) {
    if (data[field] !== undefined) kept[field] = data[field];
  }
  await admin.firestore().collection('deletedUsers').doc(event.params.uid).set({
    ...kept,
    deletedAt: FieldValue.serverTimestamp()
  });
  // The email choice, sign-up context and email records go with the account (the opt-in bonus marker stays, so
  // it's paid once).
  const db = admin.firestore();
  await db.doc(`users/${event.params.uid}/private/profile`).delete();
  await db.doc(`emailProfiles/${event.params.uid}`).delete();
  const replies = await db.collection('emailReplies').where('uid', '==', event.params.uid).get();
  await Promise.all(replies.docs.map((d) => d.ref.delete()));
});

// ---------------------------------------------------------
// 14. EDGE CACHE PURGE (Astro front end on Cloudflare Workers)
// ---------------------------------------------------------
// The Worker caches /coloring-page/* for up to a day (stale-while-revalidate). When a sketch is published,
// made private, deleted or retagged, ask it to drop that page and every page listing it as related.
// Does nothing while WORKER_PURGE_URL is unset, so it can ship before the Worker takes any route.
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineString } = require("firebase-functions/params");
const workerPurgeUrl = defineString("WORKER_PURGE_URL", { default: "" });
const workerPurgeSecret = defineSecret("WORKER_PURGE_SECRET");

// Only public pages are cached. Visitors see visibility, tags and the image (editSketch "addRef" moves it).
const sketchPageChanged = (before, after) => {
  if (!before?.isPublic && !after?.isPublic) return false;
  if (!before || !after) return true;
  return before.isPublic !== after.isPublic || before.storagePath !== after.storagePath
    || JSON.stringify(before.tags || []) !== JSON.stringify(after.tags || []);
};

// Listing pages (Worker cache tags) a public sketch appears on, so a newly published one shows up right away.
const listsFor = (before, after) => {
  const pub = [before, after].filter((d) => d?.isPublic);
  const lists = new Set(['gallery']);
  for (const d of pub) {
    lists.add(d.type === 'verse' ? 'verse' : 'home');
    if (d.userId) lists.add(`profile:${d.userId}`);
    for (const t of d.tags || []) lists.add(`tag:${t}`);
  }
  return [...lists].slice(0, 20);
};

exports.onSketchWritten = onDocumentWritten({ document: "sketches/{sketchId}", secrets: [workerPurgeSecret] }, async (event) => {
  const id = event.params.sketchId;
  if (id.startsWith('bookmark_') || !workerPurgeUrl.value()) return;
  if (!sketchPageChanged(event.data?.before?.data(), event.data?.after?.data())) return;
  try {
    const res = await fetch(workerPurgeUrl.value(), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-purge-secret': workerPurgeSecret.value() },
      body: JSON.stringify({ ids: [id], lists: listsFor(event.data?.before?.data(), event.data?.after?.data()) }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) console.error('[onSketchWritten] purge failed', id, res.status, await res.text());
  } catch (e) {
    // Never throw: a retry storm would not help, and the page expires on its own within a day.
    console.error('[onSketchWritten] purge error', id, e.message);
  }
});

// ---------------------------------------------------------
// 15. SERVER-SIDE GENERATION (Astro front end; ROADMAP 1.1)
// ---------------------------------------------------------
// One generation or edit = one credit, charged here before Gemini runs and refunded on any failure.
// The old bundle never calls these (it uses generateContent and deducts on the client), so both can run
// side by side without charging anyone twice. Ledger: generations/{uid}_{requestId}
// {status: charged → done | refunded}; a repeated requestId returns the ledger instead of running again.
const { onSchedule } = require("firebase-functions/v2/scheduler");
const gen = require("./generation/pipeline");
const GP = require("./generation/prompts");
const GI = require("./generation/image");

const GENERATION_DEADLINE_MS = 480 * 1000;   // Gemini stops here; the function times out at 540 s
const STALE_CHARGE_MS = 12 * 60 * 1000;      // the sweeper refunds charges older than this
const SKETCHES_PREFIX = (uid) => `user_uploads/${uid}/sketches/`;

const verifiedUid = (request) => {
  const token = request.auth && request.auth.token;
  if (!token || token.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('unauthenticated', 'Please sign in to create sketches.');
  }
  if (token.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Please verify your email address first.');
  }
  return request.auth.uid;
};

const intIn = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const validRequestId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id);

// Validates createSketch input and returns { reference, promptData, description, type, age, style, font }.
const parseCreate = (d) => {
  const { kind, book, chapter, startVerse, endVerse, age, style, font } = d || {};
  if (!GP.BIBLE_BOOKS.includes(book) || !intIn(chapter, 1, 150) || !intIn(startVerse, 1, 176)) {
    throw new HttpsError('invalid-argument', 'Invalid Bible reference.');
  }
  if (kind === 'scene') {
    const end = endVerse == null || endVerse === startVerse ? undefined : endVerse;
    if (end !== undefined && !intIn(end, startVerse + 1, startVerse + 40)) throw new HttpsError('invalid-argument', 'Invalid verse range.');
    if (!(GP.STYLES_BY_AGE[age] || []).includes(style)) throw new HttpsError('invalid-argument', 'Invalid age or style.');
    const reference = { book, chapter, startVerse, endVerse: end };
    return {
      type: 'scene', reference, age, style,
      description: `Generated: ${book} ${chapter}`,
      promptData: { book, chapter, start_verse: startVerse, ...(end ? { end_verse: end } : {}), aspect_ratio: '3:4', age_group: age, art_style: style },
    };
  }
  if (kind === 'verse') {
    if (!GP.FONT_STYLES.includes(font)) throw new HttpsError('invalid-argument', 'Invalid font style.');
    return {
      type: 'verse', reference: { book, chapter, startVerse }, font,
      description: `Verse Art: ${book} ${chapter}:${startVerse}`,
      promptData: { book, chapter, start_verse: startVerse, aspect_ratio: '3:4', font_style: font },
    };
  }
  throw new HttpsError('invalid-argument', 'Invalid request.');
};

const ledgerRef = (uid, requestId) => admin.firestore().collection('generations').doc(`${uid}_${requestId}`);
const ledgerResult = (l) => l.sketchId ? { status: 'done', sketchId: l.sketchId, imageUrl: l.imageUrl }
  : l.status === 'refunded' ? { status: 'refunded', error: l.error || 'FAILED' } : { status: 'running' };

// Charges `cost` credits and opens the ledger in one transaction. Returns the existing ledger on a retry.
const openCharge = (uid, requestId, cost, description) => admin.firestore().runTransaction(async (tx) => {
  const ref = ledgerRef(uid, requestId);
  const userRef = admin.firestore().collection('users').doc(uid);
  const [existing, user] = [await tx.get(ref), await tx.get(userRef)];
  if (existing.exists) return existing.data();
  if (!user.exists) throw new HttpsError('failed-precondition', 'NO_PROFILE');
  if (!(user.get('credits') >= cost)) throw new HttpsError('failed-precondition', 'INSUFFICIENT_CREDITS');
  tx.update(userRef, { credits: FieldValue.increment(-cost), updatedAt: FieldValue.serverTimestamp() });
  tx.create(userRef.collection('transactions').doc(), {
    userId: uid, amount: -cost, description, type: 'usage', timestamp: FieldValue.serverTimestamp(),
  });
  tx.create(ref, { uid, requestId, status: 'charged', cost, description, createdAt: FieldValue.serverTimestamp() });
  return null;
});

// Gives the credit back once: only a ledger still 'charged' is refunded (the catch block and the sweeper
// can both try). Never throws.
const refundCharge = async (ref, error) => {
  try {
    await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.get('status') !== 'charged') return;
      const { uid, cost, description } = snap.data();
      const userRef = admin.firestore().collection('users').doc(uid);
      if ((await tx.get(userRef)).exists) {
        tx.update(userRef, { credits: FieldValue.increment(cost), updatedAt: FieldValue.serverTimestamp() });
        tx.create(userRef.collection('transactions').doc(), {
          userId: uid, amount: cost, description: `Refund: ${description}`, type: 'refund', timestamp: FieldValue.serverTimestamp(),
        });
      }
      tx.update(ref, { status: 'refunded', error, updatedAt: FieldValue.serverTimestamp() });
    });
  } catch (e) {
    console.error('[refund] failed', ref.id, e.message);
  }
};

// Uploads a PNG the way the bundle's client did (dS/P8), with a download token so the URL works.
const uploadSketchPng = async (uid, png) => {
  const ts = Date.now();
  const storagePath = `${SKETCHES_PREFIX(uid)}${ts}.png`;
  const bucket = admin.storage().bucket();
  const token = crypto.randomUUID();
  await bucket.file(storagePath).save(png, {
    resumable: false,
    contentType: 'image/png',
    metadata: {
      cacheControl: 'private, max-age=31536000, immutable',
      contentDisposition: 'attachment; filename="bible-sketch.png"',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST
    ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}` : 'https://firebasestorage.googleapis.com';
  return {
    storagePath,
    // The Resize Images extension writes this thumbnail a few seconds later (predicted path, as the bundle).
    thumbnailPath: `${SKETCHES_PREFIX(uid)}${ts}_400x533.png`,
    imageUrl: `${host}/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`,
  };
};

const deleteSketchFiles = async (storagePath) => {
  const base = storagePath.replace(/\.[a-z]+$/, '');
  const bucket = admin.storage().bucket();
  await Promise.all([`${base}.`, `${base}_`].map((prefix) => bucket.deleteFiles({ prefix }).catch((e) => console.warn('[files] delete', prefix, e.message))));
};

// Runs `work` (returns a Jimp page, or { page, record }) under a charge: saves it as a private sketch, or refunds on
// any failure. `record` (what made the page: brief, guidance, models, references, prompt version, edit instruction)
// goes on the private ledger doc as `prompt`, never on the sketch doc, which is public once published.
const chargedGeneration = async ({ uid, requestId, cost, description, work, sketch, record: given }) => {
  const ref = ledgerRef(uid, requestId);
  const existing = await ref.get();
  if (existing.exists) return ledgerResult(existing.data());
  await reserveDailyCall(uid, 'image');
  const prior = await openCharge(uid, requestId, cost, description);
  if (prior) return ledgerResult(prior);
  try {
    const out = await work(gen.makeGemini(gen.FAKE ? '' : geminiApiKey.value().trim(), Date.now() + GENERATION_DEADLINE_MS));
    const page = out.page ?? out;
    const record = out.record ?? given;
    const qa = gen.measure(page.bitmap);
    const files = await uploadSketchPng(uid, await GI.toPng(page));
    const sketchRef = admin.firestore().collection('sketches').doc();
    await admin.firestore().runTransaction(async (tx) => {
      // Refunded meanwhile by the sweeper (a very slow run): still deliver the page, keep the refund.
      const charged = (await tx.get(ref)).get('status') === 'charged';
      tx.create(sketchRef, {
        userId: uid, ...files, isPublic: false, blessCount: 0, isBookmark: false,
        createdAt: FieldValue.serverTimestamp(), qa, generationId: ref.id, ...sketch,
      });
      tx.update(ref, {
        ...(charged ? { status: 'done' } : {}), sketchId: sketchRef.id, imageUrl: files.imageUrl,
        ...(record ? { prompt: record } : {}), updatedAt: FieldValue.serverTimestamp(),
      });
    });
    console.log(`[generation] done uid=${uid} sketch=${sketchRef.id} ${description} qa=${JSON.stringify(qa)}`);
    return { status: 'done', sketchId: sketchRef.id, imageUrl: files.imageUrl };
  } catch (e) {
    const code = ['INVALID_REFERENCE', 'VERSE_TOO_LONG', 'BLOCKED'].includes(e.code) ? e.code : 'FAILED';
    console.error(`[generation] ${code} uid=${uid} ${description}:`, e.message);
    await refundCharge(ref, code);
    return { status: 'refunded', error: code };
  }
};

const GENERATION_OPTS = { secrets: [geminiApiKey], cors: true, timeoutSeconds: 540, memory: "1GiB" };

// Master account only (the daily Pinterest task, docs/pinterest-runbook.md): `guidance` (the moment to draw and the
// composition notes learned from our best Pins, at most 500 chars) and, for verse art, `composition` (one of
// VERSE_COMPOSITIONS). Everyone else's are ignored, so no user text reaches the prompts.
const masterDirection = (uid, d) => {
  if (uid !== MASTER_UID) return {};
  const { guidance, composition } = d || {};
  if (guidance !== undefined && (typeof guidance !== 'string' || guidance.length > 500)) throw new HttpsError('invalid-argument', 'Invalid guidance.');
  return {
    ...(guidance?.trim() ? { guidance: guidance.trim() } : {}),
    ...(typeof composition === 'string' ? { composition } : {}),
  };
};

// { requestId, kind: 'scene'|'verse', book, chapter, startVerse, endVerse?, age, style | font, guidance?, composition? }
// → { status: 'done', sketchId, imageUrl } | { status: 'refunded', error } | { status: 'running' }
exports.createSketch = onCall(GENERATION_OPTS, async (request) => {
  const uid = verifiedUid(request);
  const { requestId } = request.data || {};
  if (!validRequestId(requestId)) throw new HttpsError('invalid-argument', 'Invalid request.');
  const p = parseCreate(request.data);
  const direction = masterDirection(uid, request.data);
  return chargedGeneration({
    uid, requestId, cost: 1, description: p.description,
    sketch: { type: p.type, promptData: p.promptData },
    work: (gemini) => p.type === 'scene'
      ? gen.runScene(gemini, { reference: p.reference, age: p.age, style: p.style, guidance: direction.guidance })
      : gen.runVerse(gemini, { reference: p.reference, font: p.font, ...direction }),
  });
});

// { requestId, sketchId, op: 'refine' | 'removeColor' | 'addRef', instruction? }
// refine / removeColor: 1 credit, the result is a new private sketch (the source is the caller's own or public).
// addRef: free, draws "Book ch:v" on the caller's own sketch in place (new file path, old files deleted).
exports.editSketch = onCall(GENERATION_OPTS, async (request) => {
  const uid = verifiedUid(request);
  const { requestId, sketchId, op, instruction } = request.data || {};
  if (typeof sketchId !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(sketchId)) throw new HttpsError('invalid-argument', 'Invalid request.');
  const snap = await admin.firestore().collection('sketches').doc(sketchId).get();
  const s = snap.exists ? snap.data() : null;
  if (!s || (s.userId !== uid && s.isPublic !== true) || !s.storagePath) throw new HttpsError('not-found', 'Sketch not found.');
  // A bookmark is a copy pointing at someone else's file; edit the original instead.
  const source = await admin.storage().bucket().file(s.storagePath).download().then(([b]) => b)
    .catch(() => { throw new HttpsError('not-found', 'Sketch image not found.'); });

  if (op === 'addRef') {
    if (s.userId !== uid || s.isBookmark) throw new HttpsError('permission-denied', 'Only the owner can change this sketch.');
    if (s.refAdded) return { status: 'done', sketchId, imageUrl: s.imageUrl };
    const pd = s.promptData || {};
    const text = GP.formatReference({ book: GP.displayBook(pd.book || ''), chapter: pd.chapter, startVerse: pd.start_verse, endVerse: pd.end_verse });
    const files = await uploadSketchPng(uid, await GI.toPng(await GI.addCaption(source, text)));
    await snap.ref.update({ ...files, refAdded: true, updatedAt: FieldValue.serverTimestamp() });
    await deleteSketchFiles(s.storagePath);
    return { status: 'done', sketchId, imageUrl: files.imageUrl };
  }

  if (!validRequestId(requestId)) throw new HttpsError('invalid-argument', 'Invalid request.');
  let text;
  if (op === 'removeColor') text = GP.REMOVE_COLOR_INSTRUCTION;
  else if (op === 'refine' && typeof instruction === 'string' && instruction.trim() && instruction.length <= 500) text = instruction.trim();
  else throw new HttpsError('invalid-argument', 'Invalid request.');
  return chargedGeneration({
    uid, requestId, cost: 1, description: op === 'removeColor' ? 'Remove Color' : 'Refined Sketch',
    // An edit keeps what the source image already shows (e.g. the Add Ref caption), so keep its flag too.
    sketch: { type: s.type || 'scene', promptData: s.promptData || {}, ...(s.tags ? { tags: s.tags } : {}), ...(s.refAdded ? { refAdded: true } : {}), editedFrom: sketchId },
    record: { version: gen.PROMPT_VERSION, models: { artist: GP.MODELS.ARTIST }, op, instruction: text, editedFrom: sketchId },
    work: (gemini) => gen.runEdit(gemini, source, text),
  });
});

// Refunds charges whose function instance died (timeout, crash, deploy) before it could refund itself.
exports.refundStaleGenerations = onSchedule({ schedule: "every 10 minutes", timeoutSeconds: 120 }, async () => {
  const cutoff = Timestamp.fromMillis(Date.now() - STALE_CHARGE_MS);
  const stale = await admin.firestore().collection('generations')
    .where('status', '==', 'charged').where('createdAt', '<', cutoff).limit(100).get();
  for (const doc of stale.docs) await refundCharge(doc.ref, 'TIMEOUT');
  if (!stale.empty) console.warn(`[refundStaleGenerations] refunded ${stale.size}`);
});

// Account deletion: the client deletes users/{uid} (onUserDeleted writes deletedUsers/{uid}) and then the Auth
// account. Once the Auth account is really gone (deleteUser can fail with requires-recent-login, and the same
// person may sign back in), remove their sketches and bookmarks, other users' bookmarks of them, and every
// file under user_uploads/{uid}/. Scheduled rather than an Auth trigger: those are 1st gen, which has no Node 24.
const ACCOUNT_CLEANUP_DELAY_MS = 10 * 60 * 1000;
const cleanupDeletedAccount = async (uid) => {
  const db = admin.firestore();
  const refs = [];
  for (const field of ['userId', 'originalOwnerId']) {
    const snap = await db.collection('sketches').where(field, '==', uid).select().get();
    refs.push(...snap.docs.map((d) => d.ref));
  }
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    refs.slice(i, i + 400).forEach((r) => batch.delete(r));
    await batch.commit();
  }
  await admin.storage().bucket().deleteFiles({ prefix: `user_uploads/${uid}/` })
    .catch((e) => console.warn('[cleanupDeletedAccounts] files', uid, e.message));
  return refs.length;
};

exports.cleanupDeletedAccounts = onSchedule({ schedule: "every 60 minutes", timeoutSeconds: 300 }, async () => {
  const cutoff = Timestamp.fromMillis(Date.now() - ACCOUNT_CLEANUP_DELAY_MS);
  const tombstones = await admin.firestore().collection('deletedUsers').where('deletedAt', '<', cutoff).limit(200).get();
  for (const t of tombstones.docs) {
    if (t.get('sketchesCleanedAt')) continue;
    try {
      await admin.auth().getUser(t.id);
      continue; // the account still exists (deletion failed, or they signed back in): keep everything
    } catch (e) {
      if (e.code !== 'auth/user-not-found') { console.error('[cleanupDeletedAccounts]', t.id, e.message); continue; }
    }
    const n = await cleanupDeletedAccount(t.id);
    await t.ref.update({ sketchesCleanedAt: FieldValue.serverTimestamp() });
    console.log(`[cleanupDeletedAccounts] ${t.id}: ${n} sketch docs deleted`);
  }
});

// ---------------------------------------------------------
// 16. EMAIL OPT-IN BONUS (docs/email-marketing-plan.md §12.2)
// ---------------------------------------------------------
// Every write is mirrored to emailProfiles (section 17). The first opt-in on an account (sign-up checkbox or banner,
// users/{uid}/private/profile) earns bonus prints.
// The marker in processedWebhooks is never deleted, so opting out and back in, or deleting and recreating the
// user doc, never pays twice. Opting out later doesn't take the prints back.
const OPT_IN_BONUS_PRINTS = 5;
exports.onPrivateProfileWritten = onDocumentWritten("users/{uid}/private/{docId}", async (event) => {
  const uid = event.params.uid;
  const after = event.data?.after;
  if (event.params.docId !== 'profile' || !after?.exists) return;
  await mirrorEmailChoice(uid, after.data());
  if (after.get('emailOptIn') !== true || event.data.before?.get('emailOptIn') === true) return;
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const markerRef = db.collection('processedWebhooks').doc(`optin_bonus_${uid}`);
  const granted = await db.runTransaction(async (tx) => {
    const [marker, user] = [await tx.get(markerRef), await tx.get(userRef)];
    if (marker.exists || !user.exists) return false;
    tx.update(userRef, { downloadsRemaining: FieldValue.increment(OPT_IN_BONUS_PRINTS), updatedAt: FieldValue.serverTimestamp() });
    tx.create(userRef.collection('transactions').doc(), {
      userId: uid, amount: 0, downloadsAdded: OPT_IN_BONUS_PRINTS, description: 'Email opt-in bonus', type: 'bonus',
      timestamp: FieldValue.serverTimestamp(),
    });
    tx.create(markerRef, { processedAt: FieldValue.serverTimestamp(), status: 'optin_bonus', userId: uid });
    return true;
  });
  if (granted) console.log(`[optin] +${OPT_IN_BONUS_PRINTS} prints for ${uid}`);
});

// ---------------------------------------------------------
// 17. LIFECYCLE EMAIL (docs/email-marketing-plan.md §5-6, §6.11, §12.1, §12.20)
// ---------------------------------------------------------
// emailProfiles/{uid} is server only (no rule matches it, so clients are denied): the email choice mirrored from
// private/profile, the counters the rules need, the unsubscribe token, open offers, and when each email went out
// (`fired`). emailTick asks functions/email.js which email each person is due and sends it through Resend.
// Nothing is sent until the owner sets config/email {live: true}; until then each tick only logs what it would send.
const EM = require('./email');
const resendApiKey = defineSecret('RESEND_API_KEY'); // send only
const resendAdminKey = defineSecret('RESEND_ADMIN_KEY'); // full access: reads a sent email's Message-ID
const EMAIL_LINKS = 'https://biblesketch.app/api/email'; // the Worker forwards these to emailAction
const PURCHASES = new Set(['credit_purchase', 'subscription', 'prints_subscription']);
const MAX_SENDS_PER_TICK = 40; // Resend's free plan allows 100 a day
const ms = (v) => v?.toMillis?.() ?? (typeof v === 'string' ? Date.parse(v) || 0 : Number(v) || 0);
const newToken = () => crypto.randomBytes(16).toString('base64url');
// Constant-time, so a token or secret can't be guessed byte by byte from response timing.
const sameSecret = (a, b) => {
  const h = (x) => crypto.createHash('sha256').update(String(x)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
};
const pause = (t) => new Promise((r) => setTimeout(r, t));
// The Message-ID an email really went out with (Amazon SES sets it), for the "re:" that answers it.
const sentMessageId = async (emailId) => {
  const r = await fetch(`https://api.resend.com/emails/${encodeURIComponent(emailId)}`, { headers: { authorization: `Bearer ${resendAdminKey.value()}` } });
  const id = r.ok ? (await r.json()).message_id : null;
  return id ? (id.startsWith('<') ? id : `<${id}>`) : null;
};
const offerUrl = (uid, token) => `${EMAIL_LINKS}/offer?u=${encodeURIComponent(uid)}&t=${token}`;

// private/profile -> emailProfiles, so a tick needs one read per person. A new opt-in after an unsubscribe clears
// it: only the person, in the app, can resubscribe (§6.11 rule 1).
const mirrorEmailChoice = (uid, d) => admin.firestore().runTransaction(async (tx) => {
  const ref = admin.firestore().doc(`emailProfiles/${uid}`);
  const cur = await tx.get(ref);
  const update = {
    optIn: d.emailOptIn === true, optInSource: d.optInSource ?? null, optInAt: d.optInAt ?? null,
    persona: d.persona ?? null, timezone: d.timezone ?? null, landingPath: d.signup?.path ?? null,
  };
  if (!cur.get('unsubToken')) update.unsubToken = newToken();
  const unsubscribed = ms(cur.get('unsubscribedAt'));
  if (update.optIn && unsubscribed && ms(d.optInAt) > unsubscribed) update.unsubscribedAt = FieldValue.delete();
  tx.set(ref, update, { merge: true });
});

// Both the unsubscribe link and an "unsubscribe" reply: every marketing email stops at once.
const unsubscribe = async (uid, source) => {
  const db = admin.firestore();
  await db.doc(`emailProfiles/${uid}`).set({ optIn: false, unsubscribedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.doc(`users/${uid}/private/profile`).set({
    emailOptIn: false, optOutAt: FieldValue.serverTimestamp(), optOutSource: source, updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
};

// The counters the rules read, and the first-pack bonus C2 promises (granted here, once, inside its window).
// Existing history was counted once by scripts/email-backfill.mjs.
const pageRef = (description) => /^(?:Generated|Verse Art): (.+)$/.exec(description || '')?.[1] ?? null;
exports.onTransactionCreated = onDocumentCreated("users/{uid}/transactions/{id}", async (event) => {
  const t = event.data?.data();
  const uid = event.params.uid;
  if (!t || !(t.type === 'usage' || PURCHASES.has(t.type))) return;
  const db = admin.firestore();
  const ref = db.doc(`emailProfiles/${uid}`);
  const bonus = await db.runTransaction(async (tx) => {
    const cur = await tx.get(ref);
    if (t.type === 'usage') {
      tx.set(ref, {
        pagesMade: FieldValue.increment(1),
        ...(!cur.get('firstPageAt') && { firstPageAt: t.timestamp ?? FieldValue.serverTimestamp(), firstPageRef: pageRef(t.description) }),
      }, { merge: true });
      return false;
    }
    const offer = cur.get('offers')?.c2;
    const grant = t.type === 'credit_purchase' && Boolean(offer) && !offer.redeemedAt && Date.now() <= ms(offer.expiresAt);
    tx.set(ref, { bought: true, ...(grant && { offers: { c2: { redeemedAt: FieldValue.serverTimestamp() } } }) }, { merge: true });
    if (grant) {
      const userRef = db.doc(`users/${uid}`);
      tx.update(userRef, { credits: FieldValue.increment(EM.FIRST_PACK_BONUS), updatedAt: FieldValue.serverTimestamp() });
      tx.create(userRef.collection('transactions').doc(), {
        userId: uid, amount: EM.FIRST_PACK_BONUS, description: 'First pack bonus', type: 'bonus', timestamp: FieldValue.serverTimestamp(),
      });
    }
    return grant;
  });
  if (bonus) console.log(`[email] first pack bonus: +${EM.FIRST_PACK_BONUS} credits for ${uid}`);
});

// W0: the book of the coloring page they landed on, when it's a public one.
const landingBook = async (db, path) => {
  const id = /^\/coloring-page\/[^/]+\/([^/?#]+)/.exec(path || '')?.[1];
  if (!id || !isDocId(id)) return null;
  const s = await db.doc(`sketches/${id}`).get();
  return s.get('isPublic') === true ? s.get('promptData.book') ?? null : null;
};

// A3: the 3 newest finished pages from the master (Pinterest) account, from 3 different books.
const masterPicks = async (db) => {
  const snap = await db.collection('sketches').where('userId', '==', MASTER_UID).where('isPublic', '==', true).get();
  const books = new Set();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => s.type === 'scene' && !s.isBookmark && s.promptData?.book)
    .sort((a, b) => ms(b.createdAt) - ms(a.createdAt))
    .filter((s) => !books.has(s.promptData.book) && books.add(s.promptData.book))
    .slice(0, 3)
    .map(({ id, promptData: { book, chapter, start_verse: v, end_verse: to } }) => {
      const ref = `${book} ${chapter}:${v}${to > v ? `-${to}` : ''}`;
      const slug = `${book}-${chapter}-${v}${to > v ? `-${to}` : ''}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return { label: ref, path: `/coloring-page/${slug}/${encodeURIComponent(id)}` };
    });
};

// Everyone who opted in, plus the outage cohort while its follow-ups run (§12.1).
const emailCandidates = async (db, now) => {
  const docs = new Map((await db.collection('emailProfiles').where('optIn', '==', true).get()).docs.map((d) => [d.id, d]));
  const outage = new Set();
  if (now >= EM.OUTAGE.checkIn - EM.DAY && now < EM.OUTAGE.until) {
    const markers = await db.collection('processedWebhooks')
      .where('status', 'in', ['outage_email_scheduled', 'outage_email_rescheduled']).get();
    markers.docs.forEach((m) => outage.add(m.id.slice('outage2026_'.length)));
  }
  const missing = [...outage].filter((uid) => !docs.has(uid));
  for (let i = 0; i < missing.length; i += 100) {
    (await db.getAll(...missing.slice(i, i + 100).map((uid) => db.doc(`emailProfiles/${uid}`)))).forEach((d) => docs.set(d.id, d));
  }
  docs.delete(MASTER_UID);
  return { docs, outage };
};

async function runEmailTick(now = Date.now(), { dryRun = false } = {}) {
  const db = admin.firestore();
  const live = !dryRun && (await db.doc('config/email').get()).get('live') === true;
  const { docs, outage } = await emailCandidates(db, now);
  const uids = [...docs.keys()];
  const auth = new Map();
  const users = new Map();
  for (let i = 0; i < uids.length; i += 100) {
    const chunk = uids.slice(i, i + 100);
    (await admin.auth().getUsers(chunk.map((uid) => ({ uid })))).users.forEach((a) => auth.set(a.uid, a));
    (await db.getAll(...chunk.map((uid) => db.doc(`users/${uid}`)))).forEach((d) => d.exists && users.set(d.id, d.data()));
  }
  const decisions = [];
  let picks;
  for (const uid of uids) {
    const a = auth.get(uid);
    const u = users.get(uid);
    if (!a || !u) continue;
    const e = docs.get(uid).data() || {};
    const c7 = e.offers?.c7;
    // When this balance was first seen: offers about it wait until it has stayed put (EM.STUCK_MS).
    const credits = typeof u.credits === 'number' ? u.credits : null;
    const printsLeft = typeof u.downloadsRemaining === 'number' ? u.downloadsRemaining : null;
    const seen = e.balance || {};
    const balance = {
      credits, creditsSince: seen.credits === credits ? seen.creditsSince : Timestamp.fromMillis(now),
      prints: printsLeft, printsSince: seen.prints === printsLeft ? seen.printsSince : Timestamp.fromMillis(now),
    };
    if (seen.credits !== credits || seen.prints !== printsLeft) await docs.get(uid).ref.set({ balance }, { merge: true });
    const s = {
      verified: a.emailVerified, email: a.email, createdAt: ms(u.createdAt) || Date.parse(a.metadata.creationTime),
      optIn: e.optIn === true, optInSource: e.optInSource, persona: e.persona, timezone: e.timezone,
      credits, printsLeft, creditsSince: ms(balance.creditsSince), printsSince: ms(balance.printsSince),
      unlimitedUntil: ms(u.printsUnlimitedUntil), isPremium: u.isPremium === true, bought: e.bought === true,
      pagesMade: e.pagesMade || 0, firstPageAt: ms(e.firstPageAt), unsubscribedAt: ms(e.unsubscribedAt),
      fired: Object.fromEntries(Object.entries(e.fired || {}).map(([k, v]) => [k, ms(v)])),
      offers: c7 ? { c7: { expiresAt: ms(c7.expiresAt) } } : {}, outage: outage.has(uid),
    };
    const id = EM.due(s, now);
    if (!id) continue;
    decisions.push({ uid, id });
    if (!live) { console.log(`[emailTick] ${dryRun ? 'test' : 'not live'}: ${id} due for ${uid}`); continue; }

    const at = Timestamp.fromMillis(now);
    const unsubToken = e.unsubToken || newToken();
    const update = { fired: { [id]: at }, ...(!e.unsubToken && { unsubToken }) };
    const p = {
      uid, email: a.email, first: EM.firstName(a.displayName), optInAt: ms(e.optInAt), timezone: e.timezone,
      unsubUrl: `${EMAIL_LINKS}/unsubscribe?u=${encodeURIComponent(uid)}&t=${unsubToken}`,
      printsLeft: s.printsLeft, unlimitedUntil: s.unlimitedUntil, persona: e.persona, firstPageRef: e.firstPageRef,
      outageSubject: EM.firstName(a.displayName) ?? 'quick question',
    };
    if (id === 'w0') p.landingBook = await landingBook(db, e.landingPath);
    const parent = e.sentIds?.[EM.REPLIES[id]];
    if (parent) p.inReplyTo = await sentMessageId(parent).catch(() => null);
    if (id === 'a3') p.picks = picks ??= await masterPicks(db);
    if (id === 'c2') {
      p.offerEnds = EM.offerEnd(now, e.timezone);
      update.offers = { c2: { sentAt: at, expiresAt: Timestamp.fromMillis(p.offerEnds) } };
    }
    if (id === 'c7') {
      const token = newToken();
      Object.assign(p, { offerStart: now, offerEnds: EM.offerEnd(now, e.timezone), offerUrl: offerUrl(uid, token) });
      update.offers = { c7: { token, sentAt: at, expiresAt: Timestamp.fromMillis(p.offerEnds) } };
    }
    if (id === 'c7b' || id === 'c7c') Object.assign(p, { offerStart: ms(c7.sentAt), offerEnds: ms(c7.expiresAt), offerUrl: offerUrl(uid, c7.token) });
    if (id === 'o27' || id === 'o30') {
      const token = e.offers?.outage?.token || newToken();
      p.offerUrl = offerUrl(uid, token);
      if (!e.offers?.outage) update.offers = { outage: { token, sentAt: at, expiresAt: Timestamp.fromMillis(EM.OUTAGE.offerUntil) } };
    }
    const key = `${id}_${uid}${id.startsWith('c7') ? `_${p.offerStart}` : ''}`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${resendApiKey.value()}`, 'content-type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify(EM.render(id, p, now)),
    });
    const out = await res.json().catch(() => ({}));
    if (res.status === 429 || res.status >= 500) { console.warn(`[emailTick] Resend ${res.status}, stopping this tick`); break; }
    // A rejected email isn't retried (it would fail every tick); the error stays on the profile.
    if (res.ok) Object.assign(update, { lastEmail: { id, emailId: out.id ?? null, at }, sentIds: { [id]: out.id ?? null }, emailsSent: FieldValue.increment(1) });
    else { update.lastError = { id, status: res.status, message: String(out.message || '').slice(0, 200), at }; console.error(`[emailTick] ${id} for ${uid}: ${res.status}`); }
    await docs.get(uid).ref.set(update, { merge: true });
    if (decisions.length >= MAX_SENDS_PER_TICK) break;
    await pause(600); // Resend allows a few requests a second
  }
  console.log(`[emailTick] ${uids.length} checked, ${decisions.length} due (${live ? 'live' : 'not live'}): ${decisions.map((d) => d.id).join(' ')}`);
  return decisions;
}

exports.emailTick = onSchedule({ schedule: "every 30 minutes", timeoutSeconds: 300, secrets: [resendApiKey, resendAdminKey] }, () => runEmailTick());

// Emulator only: one tick now (or at ?now=<ms>) that returns its decisions and sends nothing (security-check).
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  exports.emailTickNow = onRequest(async (req, res) => res.json(await runEmailTick(Number(req.query.now) || Date.now(), { dryRun: true })));
}

// Links in the emails, through the Worker's /api/email/<action>. Unsubscribe is one click from the mail app
// (RFC 8058: a POST unsubscribes); a GET shows a button instead, so link scanners can't unsubscribe anyone. The
// offer link redirects to the Prints plan's checkout (monthly, or yearly with &p=yearly) until the offer ends.
const emailPage = (res, status, title, body) => res.status(status).set('Cache-Control', 'no-store').type('html').send(
  `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>`
  + `<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#1f2937"><h1 style="font-size:1.5rem">${title}</h1>${body}`
  + '<p><a href="https://biblesketch.app/" style="color:#7c3aed">Back to Bible Sketch</a></p>');
exports.emailAction = onRequest({ timeoutSeconds: 30 }, async (req, res) => {
  const { a, u, t } = req.query;
  if (typeof u !== 'string' || typeof t !== 'string' || !t || !isDocId(u)) {
    return emailPage(res, 400, 'Link not recognised', '<p>This link is incomplete. Write to <a href="mailto:hello@biblesketch.app">hello@biblesketch.app</a> and we’ll sort it out.</p>');
  }
  const e = (await admin.firestore().doc(`emailProfiles/${u}`).get()).data() || {};
  if (a === 'unsubscribe') {
    if (!e.unsubToken || !sameSecret(e.unsubToken, t)) {
      return emailPage(res, 404, 'Link not recognised', '<p>Write to <a href="mailto:hello@biblesketch.app?subject=Unsubscribe">hello@biblesketch.app</a> and we’ll take you off the list.</p>');
    }
    if (req.method === 'POST') {
      await unsubscribe(u, 'link');
      return emailPage(res, 200, 'You’re unsubscribed', '<p>You won’t get any more emails from Bible Sketch, apart from receipts for anything you buy. Changed your mind? You can sign up again in your account.</p>');
    }
    return emailPage(res, 200, 'Unsubscribe from Bible Sketch emails?', '<form method="post"><button style="font:inherit;padding:.6rem 1.2rem;border-radius:.5rem;border:0;background:#7c3aed;color:#fff;cursor:pointer">Unsubscribe</button></form>');
  }
  if (a === 'offer') {
    const offer = Object.values(e.offers || {}).find((o) => o?.token && sameSecret(o.token, t));
    if (!offer || Date.now() > ms(offer.expiresAt)) {
      return emailPage(res, 410, 'This offer has ended', '<p>See what’s available now on the <a href="https://biblesketch.app/pricing" style="color:#7c3aed">pricing page</a>.</p>');
    }
    const plan = req.query.p === 'yearly' ? 'yearly' : 'monthly';
    return res.redirect(302, `${EM.PRINTS_PLANS[plan]}?cf_cf_firebase_uid=${encodeURIComponent(u)}`);
  }
  return emailPage(res, 404, 'Link not recognised', '<p>This link is incomplete.</p>');
});

// Replies to hello@ that the Email Worker could read (web/src/worker.ts): an unsubscribe, or the answer to the
// sorting question. The Worker forwards every reply to the owner first; this only records and applies it. It uses
// the purge hook's shared secret, in the other direction.
exports.emailReply = onRequest({ secrets: [workerPurgeSecret], timeoutSeconds: 30 }, async (req, res) => {
  const secret = workerPurgeSecret.value();
  if (req.method !== 'POST' || !secret || !sameSecret(req.get('x-purge-secret') || '', secret)) return res.status(403).send('Forbidden');
  const { from, subject, text, kind, value } = req.body || {};
  if (typeof from !== 'string' || !['unsubscribe', 'persona'].includes(kind)
    || (kind === 'persona' && !['teacher', 'family', 'adult'].includes(value))) return res.status(400).send('Bad request');
  let user;
  try { user = await admin.auth().getUserByEmail(from); } catch { return res.status(200).send('No account'); }
  const db = admin.firestore();
  await db.collection('emailReplies').add({
    uid: user.uid, at: FieldValue.serverTimestamp(), subject: String(subject || '').slice(0, 200),
    text: String(text || '').slice(0, 2000), parsed: { kind, value: value ?? null },
  });
  if (kind === 'unsubscribe') await unsubscribe(user.uid, 'reply');
  else await db.doc(`users/${user.uid}/private/profile`).set({ persona: value, personaSource: 'reply', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  res.status(200).send('ok');
});
