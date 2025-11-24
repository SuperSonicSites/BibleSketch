const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { GoogleGenAI } = require("@google/genai");
const { defineSecret } = require("firebase-functions/params");

// Define the secret for the API key
const geminiApiKey = defineSecret("GEMINI_API_KEY");

exports.generateContent = onCall({ 
    secrets: [geminiApiKey],
    cors: true,
    timeoutSeconds: 300,
    memory: "1GiB"
}, async (request) => {
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
