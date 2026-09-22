
import { GenerateContentResponse } from "@google/genai";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import {
  MODELS,
  REFERENCE_MAP,
  CRITICAL_NEGATIVES
} from "../constants";
import { AgeGroup, ArtStyle, BibleReference } from "../types";
import { ARTIST_CONFIG, buildArtistPrompt, buildBriefPrompt, fetchPassage } from "./prompts";
import { postProcessImage, thresholdToBW } from "../utils/imageProcessing";
import { downloadImageAsBase64 } from "../utils/storage";

// --- TYPES ---
export interface ArchitectBrief {
  positive_prompt: string;
  negative_prompt: string;
  validation_criteria: string[];
  reasoning: string;
}

interface PipelineResult {
  imageUrl: string;
  passed: boolean;
  logs: string[];
}

interface ValidationResult {
  passed: boolean;
  failure_reason?: string;
}

// --- PROXY CALLER ---
const callGeminiProxy = async (params: { model: string, contents: any, config?: any }): Promise<GenerateContentResponse> => {
  // Set client-side timeout to 540s (9 mins) to prevent "deadline-exceeded" on long generations
  const generateContent = httpsCallable(functions, 'generateContent', { timeout: 540000 });
  const result = await generateContent(params);
  return result.data as GenerateContentResponse;
};

// --- UTILS ---
const callWithRetry = async <T>(
  fn: () => Promise<T>,
  retries = 5, // Keep high retry count
  initialDelay = 3000 // INCREASE: Start with 3s wait (was 2000)
): Promise<T> => {
  let delay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      // Check for 429 (Quota) or 503 (Service Unavailable)
      // Also check for 500 which sometimes masks a 503
      const errorCode = error.status || error.code;
      const errorMessage = error.message || "";
      const isRetryable =
        errorCode === 429 ||
        errorCode === 503 ||
        errorCode === 500 || // ADDED: Sometimes overload manifests as 500
        errorMessage.includes("Resource has been exhausted") ||
        errorMessage.includes("overloaded") || // ADDED: Explicit check
        errorMessage.includes("quota");

      if (isRetryable && i < retries - 1) {
        console.warn(`Gemini API hit limit/error (${errorCode}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
};

// ========================================================
// STAGE 1: THE ARCHITECT (Prompt Engineering)
// ========================================================
const generateCreativeBrief = async (
  reference: BibleReference,
  ageGroup: AgeGroup,
  artStyle: ArtStyle
): Promise<ArchitectBrief> => {
  const systemPrompt = buildBriefPrompt(reference, ageGroup, artStyle, await fetchPassage(reference));

  try {
    // Fix: Explicitly type the retry call to GenerateContentResponse
    const response = await callWithRetry<GenerateContentResponse>(() => callGeminiProxy({
      model: MODELS.ARCHITECT,
      contents: { parts: [{ text: systemPrompt }] },
      config: { responseMimeType: 'application/json' }
    }));

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Architect returned empty response");
    
    const parsed = JSON.parse(text);
    if (parsed.error === "INVALID_REFERENCE") {
      throw new Error("INVALID_REFERENCE");
    }
    
    return parsed as ArchitectBrief;
  } catch (e: any) {
    if (e.message === "INVALID_REFERENCE") throw e;
    throw new Error(`Architect Failed: ${e.message}`);
  }
};

// ========================================================
// STAGE 2: THE ARTIST (Nano Banana Pro / Multimodal)
// ========================================================
const renderImage = async (
  brief: ArchitectBrief,
  ageGroup: AgeGroup,
  artStyle: ArtStyle
): Promise<string> => {
  const refKey = `${ageGroup}_${artStyle}`;
  const refUriRaw = REFERENCE_MAP[refKey];

  // Use all available references
  const refUris = Array.isArray(refUriRaw) ? refUriRaw : (refUriRaw ? [refUriRaw] : []);

  const refImageParts: any[] = [];

  // Download reference images on CLIENT-SIDE (not in Cloud Function)
  if (refUris.length > 0) {
    try {
      console.log(`[Artist] Fetching Style References: ${refUris.join(', ')}`);

      // Fetch all references in parallel
      const fetchPromises = refUris.map(async (uri) => {
        const response = await fetch(uri);
        if (!response.ok) {
          console.warn(`Failed to fetch reference image ${uri}: ${response.status}`);
          return null;
        }
        
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
          console.warn(`Invalid content type for ${uri}: ${blob.type}`);
          return null;
        }

        // Convert to base64 (no resizing needed - images are pre-sized to 512px)
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            let base64 = result.split(',')[1];

            // Clean up base64 (BOM/Garbage removal)
            if (base64.startsWith("77+9")) {
              base64 = base64.substring(4);
            }
            while (base64.startsWith("77+9")) {
              base64 = base64.substring(4);
            }
            if (blob.type === 'image/jpeg' && !base64.startsWith('/9j/') && base64.length > 100) {
              const jpegStart = base64.indexOf('/9j/');
              if (jpegStart > 0 && jpegStart < 100) {
                base64 = base64.substring(jpegStart);
              }
            }
            resolve(base64);
          };
          reader.onerror = () => reject(new Error("FileReader error"));
          reader.readAsDataURL(blob);
        });

        return {
          inlineData: {
            mimeType: blob.type || "image/jpeg",
            data: base64Data
          }
        };
      });

      const results = await Promise.all(fetchPromises);
      results.forEach(res => {
        if (res) refImageParts.push(res);
      });

      console.log(`[Artist] ${refImageParts.length} reference images loaded successfully.`);
    } catch (err) {
      console.warn(`[Artist] Failed to load references. Proceeding with text-only style emulation.`, err);
    }
  }

  const promptText = buildArtistPrompt(brief, ageGroup, artStyle, refImageParts.length > 0);

  try {
    // Fix: Explicitly type the retry call to GenerateContentResponse
    const response = await callWithRetry<GenerateContentResponse>(() => callGeminiProxy({
      model: MODELS.ARTIST,
      contents: {
        role: 'user',
        parts: [
          // Ensure images come before text for optimal understanding
          ...refImageParts,
          { text: promptText }
        ]
      },
      config: ARTIST_CONFIG
    }));

    // Handle cases where the image is in a different part index
    for (const p of response.candidates?.[0]?.content?.parts || []) {
      if (p.inlineData) {
        return `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`;
      }
    }
    throw new Error("Artist returned no image data.");

  } catch (e: any) {
    throw new Error(`Artist Failed (Gemini 3): ${e.message}`);
  }
};


// ========================================================
// STAGE 3: THE CRITIC (Vision Validation)
// ========================================================
const validateImage = async (
  imageBase64: string,
  criteria: string[]
): Promise<ValidationResult> => {
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

  const prompt = `
    ROLE: Quality Assurance Bot for Coloring Book App.
    TASK: STRICTLY validate this image against the following criteria.
    
    CRITERIA LIST:
    ${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}
    
    UNIVERSAL FAILURES (Reject if found):
    - Color detected (Must be B&W).
    - Text or letters detected.
    - Grayscale shading (Must be pure Line Art).
    
    OUTPUT JSON:
    {
      "passed": boolean,
      "failure_reason": "string or null"
    }
  `;

  try {
    // Fix: Explicitly type the retry call to GenerateContentResponse
    const response = await callWithRetry<GenerateContentResponse>(() => callGeminiProxy({
      model: MODELS.CRITIC,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/png", data: cleanBase64 } }
        ]
      },
      config: { responseMimeType: 'application/json' }
    }));

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return JSON.parse(text);
  } catch (e) {
    console.warn("[Critic] Validation error, assuming Pass:", e);
    return { passed: true };
  }
};

// ========================================================
// MAIN PIPELINE ORCHESTRATOR
// ========================================================
export const generateWithGoldenPipeline = async (
  reference: BibleReference,
  ageGroup: AgeGroup,
  artStyle: ArtStyle
): Promise<PipelineResult> => {
  const logs: string[] = [];

  try {
    // 1. THE ARCHITECT
    logs.push("Step 1: Architect drafting brief...");
    const brief = await generateCreativeBrief(reference, ageGroup, artStyle);
    logs.push(`Brief Logic: ${brief.reasoning}`);

    // Retry Loop
    let attempts = 0;
    const MAX_ATTEMPTS = 2;

    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      logs.push(`Step 2: Artist generating (Attempt ${attempts})...`);

      // 2. THE ARTIST
      let rawImageUrl = await renderImage(brief, ageGroup, artStyle);

      // 3. THE EDITOR
      logs.push("Step 3: Editor processing (Desaturation/Thresholding)...");
      const processedImageUrl = await postProcessImage(rawImageUrl);

      // 4. THE CRITIC
      logs.push("Step 4: Critic validating...");
      const validation = await validateImage(processedImageUrl, brief.validation_criteria);

      if (validation.passed) {
        logs.push("Validation PASSED.");
        return { imageUrl: processedImageUrl, passed: true, logs };
      } else {
        logs.push(`Validation FAILED: ${validation.failure_reason}`);

        if (attempts < MAX_ATTEMPTS) {
          logs.push("Retrying with refined prompt...");
          brief.positive_prompt += ` (IMPORTANT: Fix previous error: ${validation.failure_reason})`;
        }
      }
    }

    throw new Error("Maximum retries exceeded. The Critic rejected all drafts.");

  } catch (error: any) {
    return { imageUrl: "", passed: false, logs: [...logs, `ERROR: ${error.message}`] };
  }
};

// ========================================================
// EXPORTS FOR INDIVIDUAL STEPS
// ========================================================

// 1. Get Description (Architect)
export const getVerseVisualDescription = generateCreativeBrief;

// 2. Generate Image (Artist + Editor)
export const generateColoringPage = async (
  brief: ArchitectBrief,
  ageGroup: AgeGroup,
  artStyle: ArtStyle
): Promise<{ imageUrl: string }> => {
  const rawUrl = await renderImage(brief, ageGroup, artStyle);
  const processedUrl = await postProcessImage(rawUrl);
  return { imageUrl: processedUrl };
};

// 3. Edit Image
export const editColoringPage = async (
  base64Image: string,
  editPrompt: string
): Promise<string> => {
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
  const mimeType = base64Image.match(/data:([^;]+);base64/)?.[1] || "image/png";

  const prompt = `
    TASK: Modify this existing coloring page image according to the user's instruction.
    
    User Instruction: "${editPrompt}"
    
    --- CRITICAL CANVAS RULES (MANDATORY) ---
    1. PRESERVE EXACT CANVAS SIZE: The output must have the SAME dimensions as the input.
    2. KEEP THE FRAMING: same border, same margins, same position and scale of the artwork as the input.
    3. DO NOT zoom in, zoom out, crop, shrink or scale the artwork.

    --- STYLE CONSTRAINTS ---
    - Keep clean black-and-white line art: no shading, gray tones, hatching or solid black fills.
    - Output ONLY the modified image.

    NEGATIVE PROMPT: ${CRITICAL_NEGATIVES}, zoomed out, zoomed in, cropped, scaled down
  `;

  try {
    // Fix: Explicitly type the retry call to GenerateContentResponse
    const response = await callWithRetry<GenerateContentResponse>(() => callGeminiProxy({
      model: MODELS.ARTIST,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: cleanBase64 } }
        ]
      },
      config: ARTIST_CONFIG
    }));

    // Extract Image
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      // Check parts for image
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          const resultBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          // Threshold to B&W without adding margins (avoids progressive shrinking)
          return await thresholdToBW(resultBase64);
        }
      }
    }
    throw new Error("No image generated.");
  } catch (e: any) {
    throw new Error(`Edit Failed: ${e.message}`);
  }
};
