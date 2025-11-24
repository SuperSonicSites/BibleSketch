const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { GoogleGenAI } = require("@google/genai");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

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
const AGE_GROUPS = ["Toddler", "Young Child", "Pre-Teen", "Adult"];
const ART_STYLES = ["Sunday School", "Stained Glass", "Iconography", "Comic", "Classic"];

// Liturgical tags for static sitemap generation
const LITURGICAL_TAGS = [
  'advent', 'christmas', 'lent', 'holy-week', 'easter', 'pentecost',
  'sunday-school', 'vbs', 'family-devotional', 'youth-group', 'bible-study',
  'miracles', 'parables', 'prophets', 'creation', 'the-fall', 'faith-heroes', 'prayer', 'worship'
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
  const host = req.headers.host || 'biblesketch.com';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${protocol}://${host}`;
  
  // type = 'index' | 'recent' | 'tags' | 'toddler-sunday-school' etc.
  const type = req.query.type || 'index';

  try {
    // --- A. SITEMAP INDEX ---
    if (type === 'index') {
      let sitemaps = [];

      // 1. Main "Recent" Sitemap
      sitemaps.push(`${baseUrl}/sitemap.xml?type=recent`);

      // 2. "Tags" Sitemap (NEW)
      sitemaps.push(`${baseUrl}/sitemap.xml?type=tags`);

      // 3. Generate Topic Sitemaps (Valid Age + Style combinations only)
      const VALID_COMBINATIONS = [
        { age: "Toddler", styles: ["Sunday School"] },
        { age: "Young Child", styles: ["Sunday School", "Stained Glass", "Iconography", "Comic"] },
        { age: "Pre-Teen", styles: ["Classic", "Stained Glass", "Iconography", "Comic"] },
        { age: "Adult", styles: ["Classic", "Stained Glass", "Iconography"] }
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

    // --- C. CONTENT SITEMAPS ---
    let query = admin.firestore().collection("sketches").where("isPublic", "==", true);

    // Apply Filters based on 'type'
    if (type === 'recent') {
       query = query.orderBy("createdAt", "desc").limit(5000);
    } else {
       // Parse "toddler-sunday-school" back to "Toddler" and "Sunday School"
       let found = false;
       
       for (const age of AGE_GROUPS) {
         for (const style of ART_STYLES) {
            const key = `${age.toLowerCase().replace(/ /g, '-')}-${style.toLowerCase().replace(/ /g, '-')}`;
            if (key === type) {
                query = query.where("promptData.age_group", "==", age)
                             .where("promptData.art_style", "==", style)
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
exports.sketchRender = onRequest(async (req, res) => {
  const host = req.headers.host || 'biblesketch.com';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${protocol}://${host}`;

  const pathParts = req.path.split('/');
  const sketchId = pathParts[pathParts.length - 1];

  const serveDefaultApp = () => {
     const fetchUrl = `${baseUrl}/index.html`;
     fetch(fetchUrl)
        .then(response => response.text())
        .then(html => res.send(html))
        .catch(e => {
            fetch("https://biblesketch.com/index.html")
                .then(r => r.text())
                .then(h => res.send(h))
                .catch(() => res.status(500).send("Error loading app."));
        });
  };

  if (!sketchId) {
    return serveDefaultApp();
  }

  try {
    const doc = await admin.firestore().collection("sketches").doc(sketchId).get();
    
    if (!doc.exists) {
      return serveDefaultApp();
    }

    const data = doc.data();
    const book = data.promptData?.book || "Bible";
    const chapter = data.promptData?.chapter || "Story";
    const verses = data.promptData?.start_verse ? `:${data.promptData.start_verse}` : "";
    const style = data.promptData?.art_style || "Coloring Page";
    
    const title = `${book} ${chapter}${verses} Coloring Page | Bible Sketch`;
    const description = `Free printable coloring page of ${book} ${chapter} in ${style} style. Created with Bible Sketch.`;
    const imageUrl = data.imageUrl;

    const slug = generateSketchSlug(data);
    const canonicalUrl = `${baseUrl}/coloring-page/${slug}/${sketchId}`;

    const appResponse = await fetch(`${baseUrl}/index.html`);
    let html = await appResponse.text();

    html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
               .replace('content="Bible Sketch Platform"', `content="${title}"`)
               .replace('</head>', `
                  <link rel="canonical" href="${canonicalUrl}" />
                  <meta property="og:title" content="${title}" />
                  <meta property="og:description" content="${description}" />
                  <meta property="og:image" content="${imageUrl}" />
                  <meta property="og:type" content="article" />
                  <meta property="og:url" content="${canonicalUrl}" />
                  <meta name="twitter:card" content="summary_large_image" />
                  <meta name="twitter:title" content="${title}" />
                  <meta name="twitter:description" content="${description}" />
                  <meta name="twitter:image" content="${imageUrl}" />
                  </head>`);

    res.set('Cache-Control', 'public, max-age=3600, s-maxage=7200');
    res.status(200).send(html);

  } catch (error) {
    console.error("SEO Render Error:", error);
    serveDefaultApp();
  }
});
