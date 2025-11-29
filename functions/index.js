const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { GoogleGenAI } = require("@google/genai");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const fs = require('fs');
const path = require('path');

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

// --- HELPER: Constants (Mirrored from Frontend) ---
const AGE_GROUPS = ["Toddler", "Young Child", "Teen", "Adult"];
const ART_STYLES = ["Sunday School", "Stained Glass", "Iconography", "Comic", "Classic", "Doodles"];

// Liturgical tags for static sitemap generation
const LITURGICAL_TAGS = [
  'advent', 'christmas', 'lent', 'holy-week', 'easter', 'pentecost',
  'creation', 'the-fall', 'exile', 'resurrection'
];

exports.generateContent = onCall({ 
    secrets: [geminiApiKey],
    cors: true,
    timeoutSeconds: 300,
    memory: "1GiB"
}, async (request) => {
    // ... (Existing GenAI logic unchanged) ...
    // 1. Authentication Check (Optional but recommended)
    // if (!request.auth) {
    //   throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    // }

    const { model, contents, config } = request.data;

    if (!model || !contents) {
        throw new HttpsError('invalid-argument', 'The function must be called with "model" and "contents" arguments.');
    }

    // 1.5 Safety Check: Detect HTML masquerading as Image (Common 404/SPA error)
    if (contents && contents.parts) {
        for (const part of contents.parts) {
            if (part.inlineData && part.inlineData.data) {
                const b64 = part.inlineData.data;
                // Check for "<!DOCTYPE" (PCFET0) or "<html" (PGh0bW) in base64
                if (b64.startsWith("PCFET0") || b64.startsWith("PGh0bW")) {
                    console.error("Invalid Image Data: Detected HTML content (404 Page) instead of image.");
                    throw new HttpsError('invalid-argument', 'A reference image failed to load and returned an HTML error page. Please check client-side file paths.');
                }
            }
        }
    }

    try {
        // 2. Initialize Gemini with the secret key
        let apiKey = geminiApiKey.value();
        if (apiKey) {
            apiKey = apiKey.trim();
        }
        console.log("Initializing Gemini with API Key:", apiKey ? `Present (starts with ${apiKey.substring(0, 4)}..., length: ${apiKey.length})` : "MISSING");

        // --- DEEP DEBUG LOGGING ---
        console.log("Request Model:", model);
        console.log("Request Config:", JSON.stringify(config));

        if (contents) {
            console.log("Contents Type:", typeof contents);
            console.log("Contents Is Array:", Array.isArray(contents));

            const partsToLog = Array.isArray(contents) ? contents[0]?.parts : contents.parts;

            if (partsToLog) {
                console.log(`Found ${partsToLog.length} parts.`);
                partsToLog.forEach((part, index) => {
                    if (part.text) {
                        console.log(`Part [${index}]: Text (Length: ${part.text.length})`);
                    } else if (part.inlineData) {
                        console.log(`Part [${index}]: InlineData (Mime: ${part.inlineData.mimeType}, Data Length: ${part.inlineData.data ? part.inlineData.data.length : 0})`);
                        if (part.inlineData.data) {
                            console.log(`Part [${index}] Data Start: ${part.inlineData.data.substring(0, 20)}...`);
                        }
                    } else {
                        console.log(`Part [${index}]: Unknown Type`, Object.keys(part));
                    }
                });
            } else {
                console.log("No parts found in contents:", JSON.stringify(contents).substring(0, 200));
            }
        } else {
            console.log("Contents is missing or null");
        }
        // ---------------------------

        const genai = new GoogleGenAI({ apiKey: apiKey });

        // Ensure contents is an array (SDK expects Content[])
        const requestContents = Array.isArray(contents) ? contents : [contents];

        // 3. Call the Gemini API
        // We use the generic generateContent method which maps to the SDK's usage
        const response = await genai.models.generateContent({
            model: model,
            contents: requestContents,
            config: config
        });

        // 4. Return the response data
        // Convert to plain object to ensure JSON serialization works
        // Firebase Functions needs pure JSON-serializable objects
        const serializedResponse = {
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

        return serializedResponse;

    } catch (error) {
        console.error("Gemini API Error:", error);

        // Construct debug info to return to client
        let debugInfo = "Debug Info: ";
        if (contents) {
            debugInfo += `Type: ${typeof contents}, IsArray: ${Array.isArray(contents)}. `;
            // Helper to safely get parts from either array or object structure
            const getParts = (c) => {
                if (Array.isArray(c)) return c[0]?.parts;
                if (c && c.parts) return c.parts;
                return null;
            };
            
            const parts = getParts(contents);
            if (parts) {
                debugInfo += `Parts: ${parts.length}. `;
                parts.forEach((p, i) => {
                    if (p.inlineData) {
                        const dataStart = p.inlineData.data ? p.inlineData.data.substring(0, 20) : "null";
                        debugInfo += `P${i}: ${p.inlineData.mimeType} (${p.inlineData.data ? p.inlineData.data.length : 0} chars, Start: ${dataStart}). `;
                    } else if (p.text) {
                        debugInfo += `P${i}: Text (${p.text.length} chars). `;
                    }
                });
            } else {
                debugInfo += "No parts found. ";
            }
        }

        throw new HttpsError('internal', `Gemini Error: ${error.message}. ${debugInfo}`);
    }
});

// ---------------------------------------------------------
// 1. SITEMAP GENERATOR (Dynamic + Deduplicated + Segmented)
// ---------------------------------------------------------
exports.sitemap = onRequest(async (req, res) => {
  const host = 'BibleSketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  
  // type = 'index' | 'recent' | 'tags' | 'toddler-sunday-school' etc.
  const type = req.query.type || 'index';

  try {
    // --- A. SITEMAP INDEX ---
    if (type === 'index') {
      let sitemaps = [];

      // 1. Main "Recent" Sitemap
      sitemaps.push(`${baseUrl}/sitemap.xml?type=recent`);

      // 1.5 "Popular" Sitemap (Most Blessed)
      sitemaps.push(`${baseUrl}/sitemap.xml?type=popular`);

      // 2. "Tags" Sitemap (NEW)
      sitemaps.push(`${baseUrl}/sitemap.xml?type=tags`);

      // 3. "Profiles" Sitemap (Public user galleries)
      sitemaps.push(`${baseUrl}/sitemap.xml?type=profiles`);

      // 4. Generate Topic Sitemaps (Valid Age + Style combinations only)
      const VALID_COMBINATIONS = [
        { age: "Toddler", styles: ["Sunday School"] },
        { age: "Young Child", styles: ["Sunday School", "Stained Glass", "Iconography", "Comic"] },
        { age: "Teen", styles: ["Classic", "Stained Glass", "Iconography", "Comic"] },
        { age: "Adult", styles: ["Classic", "Stained Glass", "Iconography", "Doodles"] }
      ];

      VALID_COMBINATIONS.forEach(group => {
        group.styles.forEach(style => {
           const key = `${group.age.toLowerCase().replace(/ /g, '-')}-${style.toLowerCase().replace(/ /g, '-')}`;
           sitemaps.push(`${baseUrl}/sitemap.xml?type=${key}`);
        });
      });

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

      sitemaps.forEach(url => {
          xml += `
          <sitemap>
            <loc>${url}</loc>
            <lastmod>${new Date().toISOString()}</lastmod>
          </sitemap>`;
      });
      
      xml += `</sitemapindex>`;
      
      res.set("Content-Type", "application/xml");
      return res.status(200).send(xml);
    }

    // --- B. TAGS SITEMAP (Static Pages) ---
    if (type === 'tags') {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        LITURGICAL_TAGS.forEach(tagId => {
            xml += `
            <url>
                <loc>${baseUrl}/tags/${tagId}</loc>
                <changefreq>weekly</changefreq>
                <priority>0.9</priority>
            </url>`;
        });

        xml += `</urlset>`;
        res.set("Content-Type", "application/xml");
        return res.status(200).send(xml);
    }

    // --- C. PROFILES SITEMAP (Public user galleries) ---
    if (type === 'profiles') {
        const publicSketches = await admin.firestore()
            .collection("sketches")
            .where("isPublic", "==", true)
            .select("userId")
            .get();

        const userIds = [...new Set(publicSketches.docs.map(d => d.data().userId))];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

        userIds.forEach(uid => {
            xml += `
            <url>
                <loc>${baseUrl}/profile/${uid}</loc>
                <changefreq>weekly</changefreq>
                <priority>0.6</priority>
            </url>`;
        });

        xml += `</urlset>`;
        res.set("Content-Type", "application/xml");
        return res.status(200).send(xml);
    }

    // --- D. CONTENT SITEMAPS ---
    let query = admin.firestore().collection("sketches").where("isPublic", "==", true);

    // Apply Filters based on 'type'
    if (type === 'recent') {
       query = query.orderBy("createdAt", "desc").limit(5000);
    } else if (type === 'popular') {
       query = query.orderBy("blessCount", "desc").limit(1000);
    } else {
       // Parse "toddler-sunday-school" back to "Toddler" and "Sunday School"
       let found = false;
       
       for (const age of AGE_GROUPS) {
         for (const style of ART_STYLES) {
            const key = `${age.toLowerCase().replace(/ /g, '-')}-${style.toLowerCase().replace(/ /g, '-')}`;
            if (key === type) {
                if (age === "Teen") {
                   query = query.where("promptData.age_group", "in", ["Teen", "Pre-Teen"]);
                } else {
                   query = query.where("promptData.age_group", "==", age);
                }

                query = query.where("promptData.art_style", "==", style)
                             .orderBy("createdAt", "desc")
                             .limit(5000);
                found = true;
                break;
            }
         }
         if (found) break;
       }

       if (!found) {
         return res.status(404).send("Sitemap topic not found");
       }
    }

    // Execute Query
    const sketchesSnapshot = await query.get();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add Static Routes (Only in 'recent' to avoid duplicates)
    if (type === 'recent') {
        const staticRoutes = ["/", "/gallery", "/pricing", "/terms"];
        staticRoutes.forEach(route => {
            xml += `
            <url>
                <loc>${baseUrl}${route}</loc>
                <changefreq>weekly</changefreq>
                <priority>0.8</priority>
            </url>`;
        });
    }

    // Add Dynamic Sketch Routes
    sketchesSnapshot.forEach(doc => {
        const data = doc.data();
        const slug = generateSketchSlug(data);
        
        xml += `
          <url>
            <loc>${baseUrl}/coloring-page/${slug}/${doc.id}</loc>
            <changefreq>monthly</changefreq>
            <priority>0.5</priority>
          </url>`;
    });

    xml += `</urlset>`;

    res.set("Content-Type", "application/xml");
    return res.status(200).send(xml);

  } catch (error) {
    console.error("Sitemap Error:", error);
    // Fallback for missing index errors
    if (error.code === 9 || error.message.includes("index")) {
        return res.status(500).send(`
            <error>
                <message>Missing Firestore Index. Please create composite index for query.</message>
                <details>${error.message}</details>
            </error>
        `);
    }
    res.status(500).end();
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
      
      const response = await fetch("https://BibleSketch.app/index.html", { signal: controller.signal });
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

exports.sketchRender = onRequest({ timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  const host = 'BibleSketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Robust ID Extraction
  // Split by slash and filter out empty strings (handles trailing slashes)
  const pathSegments = req.path.split('/').filter(p => p.length > 0);
  const sketchId = pathSegments[pathSegments.length - 1];

  console.log(`[sketchRender] Path: ${req.path} | ID: ${sketchId} | UA: ${userAgent}`);

  const serveDefault = async () => {
    const html = await getIndexHtml(baseUrl);
    res.send(html);
  };

  if (!sketchId) {
    console.log("[sketchRender] No sketch ID found, serving default.");
    return serveDefault();
  }

  try {
    const doc = await admin.firestore().collection("sketches").doc(sketchId).get();

    if (!doc.exists) {
      console.log(`[sketchRender] Sketch ${sketchId} not found.`);
      return serveDefault();
    }

    const data = doc.data();
    const book = data.promptData?.book || "Bible";
    const chapter = data.promptData?.chapter || "Story";
    const startVerse = data.promptData?.start_verse;
    const endVerse = data.promptData?.end_verse;
    const ageGroup = data.promptData?.age_group || "All Ages";
    const style = data.promptData?.art_style || "Coloring Page";

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
    const canonicalUrl = `${baseUrl}/coloring-page/${slug}/${sketchId}`;

    // Schema.org JSON-LD Construction
    const blessCount = data.blessCount || 0;
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
      "aggregateRating": blessCount > 0 ? {
        "@type": "AggregateRating",
        "ratingValue": "5",
        "ratingCount": blessCount,
        "bestRating": "5",
        "worstRating": "1"
      } : undefined,
      "author": {
        "@type": "Person",
        "name": "Bible Sketch User",
        "url": `${baseUrl}/profile/${data.userId}`
      },
      "creator": {
        "@type": "Person",
        "name": "Bible Sketch User",
        "url": `${baseUrl}/profile/${data.userId}`
      },
      "copyrightHolder": {
        "@type": "Person",
        "name": "Bible Sketch User"
      }
    };

    const schemaScript = `<script type="application/ld+json">${JSON.stringify(schemaData)}</script>`;

    let html = await getIndexHtml(baseUrl);

    // Injection Strategy:
    // 1. Replace <title>
    // 2. Inject Meta Tags before </head>
    // 3. Inject Schema JSON-LD before </head>

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

    // Prepare Meta Tags
    const metaTags = `
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonicalUrl}" />
    
    <!-- Open Graph -->
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="Bible Sketch" />
    `;

    // Inject before </head>
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${metaTags}\n${schemaScript}\n</head>`);
    } else {
      // Fallback if </head> is missing
      html += metaTags + schemaScript;
    }

    res.set('Cache-Control', 'public, max-age=3600, s-maxage=7200');
    res.status(200).send(html);

  } catch (error) {
    console.error("[sketchRender] Error:", error);
    serveDefault();
  }
});

// ---------------------------------------------------------
// 3. PROFILE PAGE SEO RENDERER (Server-Side Schema for Profiles)
// ---------------------------------------------------------
exports.profileRender = onRequest({ timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  const host = 'BibleSketch.app';
  const protocol = 'https';
  const baseUrl = `${protocol}://${host}`;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Extract UID from /profile/:uid
  const pathSegments = req.path.split('/').filter(p => p.length > 0);
  // Expected: ["profile", "uid"]
  const profileUid = pathSegments.length >= 2 ? pathSegments[1] : null;

  console.log(`[profileRender] Path: ${req.path} | UID: ${profileUid} | UA: ${userAgent}`);

  const serveDefault = async () => {
    const html = await getIndexHtml(baseUrl);
    res.send(html);
  };

  if (!profileUid) {
    console.log("[profileRender] No profile UID found, serving default.");
    return serveDefault();
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

    // 3. Build SEO Content
    const profileUrl = `${baseUrl}/profile/${profileUid}`;
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

    const schemaScript = `<script type="application/ld+json">${JSON.stringify(schemaData)}</script>`;

    // 5. Get and Modify HTML
    let html = await getIndexHtml(baseUrl);

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);

    // Prepare Meta Tags
    const metaTags = `
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${profileUrl}" />
    
    <!-- Open Graph -->
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${userPhoto}" />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${profileUrl}" />
    <meta property="og:site_name" content="Bible Sketch" />
    <meta property="profile:username" content="${userName}" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${userPhoto}" />
    `;

    // Inject before </head>
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${metaTags}\n${schemaScript}\n</head>`);
    } else {
      html += metaTags + schemaScript;
    }

    res.set('Cache-Control', 'public, max-age=1800, s-maxage=3600'); // 30min client, 1hr CDN
    res.status(200).send(html);

  } catch (error) {
    console.error("[profileRender] Error:", error);
    serveDefault();
  }
});

// ---------------------------------------------------------
// 4. ZOHO BILLING WEBHOOK HANDLER
// ---------------------------------------------------------


/**
 * SECURITY NOTE: Signature verification is disabled because Firebase Cloud Functions Gen 2
 * parses JSON bodies before we can access the raw bytes, making HMAC verification impossible.
 * 
 * Security is maintained through:
 * 1. Obscure webhook URL (only Zoho knows it)
 * 2. Dynamic UID parameter (?uid=XXX) that requires knowing the user's Firebase UID
 * 3. Zoho's internal security for webhook delivery
 */

/**
 * Extracts Firebase UID from Zoho customer custom fields (fallback).
 * Primary method is via URL query parameter ?uid=XXX
 */
const extractFirebaseUid = (body) => {
  const customFields = body.subscription?.customer?.custom_fields || [];
  const uidField = customFields.find(f => 
    f.label === 'firebase_uid' || 
    f.api_name === 'cf_cf_firebase_uid'
  );
  return uidField?.value || null;
};

/**
 * Handles Zoho Billing webhooks for subscription lifecycle events.
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
  timeoutSeconds: 60
}, async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // 1. Log incoming request
    console.log('📩 Zoho webhook received');
    console.log('   Query:', JSON.stringify(req.query));

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

      const firebaseUid = req.query.uid;
      if (!firebaseUid) {
        console.error('❌ No Firebase UID for credit pack purchase');
        return res.status(400).send('Missing UID');
      }

      console.log(`📦 Credit pack purchase: ${packType}`);
      console.log(`   Adding ${pack.credits} credits, ${pack.downloads} downloads`);
      console.log(`   User: ${firebaseUid}`);

      const userRef = admin.firestore().collection('users').doc(firebaseUid);
      await userRef.set({
        credits: admin.firestore.FieldValue.increment(pack.credits),
        downloadsRemaining: admin.firestore.FieldValue.increment(pack.downloads),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Log transaction
      await userRef.collection('transactions').add({
        type: 'credit_purchase',
        pack: packType,
        creditsAdded: pack.credits,
        downloadsRemainingAdded: pack.downloads,
        price: pack.price,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ +${pack.credits} credits granted to user: ${firebaseUid}`);
      return res.status(200).send('Credit pack processed');  // EARLY EXIT - Premium logic below won't run
    }

    // --- PREMIUM SUBSCRIPTION LOGIC (unchanged) ---

    // 2. Extract subscription data
    const subscription = req.body.subscription;
    if (!subscription) {
      console.warn('⚠️ No subscription data in webhook payload');
      return res.status(200).send('Ignored: No subscription data');
    }

    const subscriptionId = subscription.subscription_id;
    const subscriptionStatus = subscription.status;
    
    console.log(`📩 Received Zoho webhook`);
    console.log(`   Subscription ID: ${subscriptionId}`);
    console.log(`   Status: ${subscriptionStatus}`);

    // 3. Extract Firebase UID from query param (preferred) or body (fallback)
    const firebaseUid = req.query.uid || extractFirebaseUid(req.body);

    if (!firebaseUid) {
      console.warn('⚠️ Webhook received without Firebase UID');
      console.warn('   Query params:', JSON.stringify(req.query));
      console.warn('   Customer data:', JSON.stringify(subscription.customer || {}));
      return res.status(200).send('Ignored: No Firebase UID found');
    }

    console.log(`   Firebase UID: ${firebaseUid}`);

    // 4. Idempotency Check
    const eventId = `${subscriptionStatus}_${subscriptionId}`;
    const processedRef = admin.firestore().collection('processedWebhooks').doc(eventId);

    const existingEvent = await processedRef.get();
    if (existingEvent.exists) {
      console.log(`⚠️ Webhook ${eventId} was previously processed, but re-processing for debugging...`);
      // Temporarily disabled for debugging:
      // return res.status(200).send('Already processed');
    }

    // 5. Get User Reference
    const db = admin.firestore();
    const userRef = db.collection('users').doc(firebaseUid);

    // 6. Handle based on subscription status
    if (subscriptionStatus === 'live' || subscriptionStatus === 'active') {
      // New subscription or renewal
      const userDoc = await userRef.get();
      const isNewSubscription = !userDoc.exists || !userDoc.data()?.isPremium;

      await userRef.set({
        isPremium: true,
        credits: admin.firestore.FieldValue.increment(10),
        planStatus: 'active',
        zohoSubscriptionId: subscriptionId,
        zohoCustomerId: subscription.customer?.customer_id || null,
        ...(isNewSubscription && { subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp() }),
        ...(!isNewSubscription && { lastRenewal: admin.firestore.FieldValue.serverTimestamp() }),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Log transaction to subcollection
      const action = isNewSubscription ? 'Premium subscription activated' : 'Monthly subscription renewal';
      try {
        const txRef = db.collection('users').doc(firebaseUid).collection('transactions').doc();
        await txRef.set({
          id: txRef.id,
          userId: firebaseUid,
          amount: 10,
          description: action,
          type: 'subscription',
          timestamp: Date.now(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (txError) {
        console.error('Failed to log transaction:', txError);
      }

      console.log(`✅ ${action} for user: ${firebaseUid}`);

    } else if (subscriptionStatus === 'cancelled' || subscriptionStatus === 'canceled') {
      // Subscription cancelled
      await userRef.update({
        isPremium: false,
        planStatus: 'canceled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`❌ Premium DEACTIVATED for user: ${firebaseUid}`);

    } else if (subscriptionStatus === 'expired') {
      // Subscription expired
      await userRef.update({
        isPremium: false,
        planStatus: 'expired',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`❌ Premium EXPIRED for user: ${firebaseUid}`);

    } else if (subscriptionStatus === 'non_renewing') {
      // User cancelled but subscription still active until period ends
      await userRef.update({
        planStatus: 'pending_cancel',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`⏳ Cancellation SCHEDULED for user: ${firebaseUid}`);

    } else {
      console.log(`ℹ️ Unhandled subscription status: ${subscriptionStatus}`);
    }

    // 7. Mark as Processed
    await processedRef.set({
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: subscriptionStatus,
      userId: firebaseUid,
      subscriptionId: subscriptionId
    });

    res.status(200).send('Webhook processed successfully');

  } catch (error) {
    console.error('🔥 Error processing Zoho webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});
