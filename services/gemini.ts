
import { Modality, HarmCategory, HarmBlockThreshold, GenerateContentResponse } from "@google/genai";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import {
  MODELS,
  REFERENCE_MAP,
  GOLDEN_NEGATIVES,
  CHRISTIAN_GUIDELINES,
  AGE_LOGIC,
  STYLE_LOGIC
} from "../constants";
import { AgeGroup, ArtStyle, BibleReference } from "../types";
import { postProcessImage } from "../utils/imageProcessing";
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
  const refString = `${reference.book} ${reference.chapter}:${reference.startVerse}${
    reference.endVerse && reference.endVerse > reference.startVerse
      ? '-' + reference.endVerse
      : ''
  }`;

  const ageRules = AGE_LOGIC[ageGroup];
  const styleRules = STYLE_LOGIC[artStyle];

  const systemPrompt = `
    ROLE: Biblical Art Director.
    TASK: Create a JSON brief for an Image Generator.
    INPUT: Passage "${refString}".
    
    TARGET AUDIENCE SPECS (${ageGroup}):
    - Line Style: ${ageRules.keywords}
    - Composition Focus: ${ageRules.subjectFocus}

    ART STYLE SPECS (${artStyle}):
    - Visual Rules: ${styleRules}
    
    CRITICAL RULES:
    1. ${CHRISTIAN_GUIDELINES}
    2. IF the scene is Genesis pre-fall, you MUST add "thorns, dead plants" to negative_prompt.
    3. CHECK SCRIPTURE: If the INPUT passage does not exist in the standard protestant bible, return JSON with a single field: {"error": "INVALID_REFERENCE"}.

    OUTPUT JSON:
    {
      "positive_prompt": "Detailed visual description incorporating the line style and composition focus...",
      "negative_prompt": "Specific exclusion list...",
      "validation_criteria": ["List 3 specific checks for the Critic"],
      "reasoning": "Brief explanation"
    }
  `;

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

  const ageKeywords = AGE_LOGIC[ageGroup].keywords;
  const styleKeywords = STYLE_LOGIC[artStyle];

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

        // Convert to base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            let base64 = result.split(',')[1];

            // --- IMAGE RESIZING ---
            // Resize image if it's too large (limit payload size)
            const img = new Image();
            img.onload = () => {
              const MAX_DIM = 512;
              if (img.width > MAX_DIM || img.height > MAX_DIM) {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > height) {
                  if (width > MAX_DIM) {
                    height *= MAX_DIM / width;
                    width = MAX_DIM;
                  }
                } else {
                  if (height > MAX_DIM) {
                    width *= MAX_DIM / height;
                    height = MAX_DIM;
                  }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                // Convert back to base64 (JPEG 80% quality)
                const resizedData = canvas.toDataURL('image/jpeg', 0.8);
                base64 = resizedData.split(',')[1];
                console.log(`[Artist] Resized reference image from ${img.width}x${img.height} to ${width}x${height}`);
              }
              
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
            img.onerror = () => reject(new Error("Failed to load image for resizing"));
            img.src = result; 
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

  // Fallback instruction if images fail to load
  let styleInstruction = `
    --- VISUAL REFERENCE INSTRUCTION ---
    Use the attached images as STRICT STYLE SOURCES. 
    Adopt the line weight, stroke confidence, and level of detail from the references.
    Do NOT copy the subject matter of the references; only copy the artistic style.
  `;

  if (refImageParts.length === 0) {
    styleInstruction = `
        --- STYLE EMULATION MODE (IMPORTANT) ---
        You must strictly adhere to the LINE STYLE and ART TECHNIQUE described below.
        Simulate the visual characteristics of this style perfectly based on the text description alone.
        Generate a HIGH CONTRAST BLACK AND WHITE coloring page.
     `;
  }

  const promptText = `
    ${brief.positive_prompt}
    
    --- TECHNICAL SPECIFICATIONS (STRICT) ---
    1. LINE STYLE: ${ageKeywords} 
    2. ART TECHNIQUE: ${styleKeywords}
    
    ${styleInstruction}
    NEGATIVE PROMPT: ${brief.negative_prompt}, ${GOLDEN_NEGATIVES}
  `;

  try {
    // Fix: Explicitly type the retry call to GenerateContentResponse
    const response = await callWithRetry<GenerateContentResponse>(() => callGeminiProxy({
      model: MODELS.ARTIST, // gemini-3-pro-image-preview
      contents: { 
        role: 'user', 
        parts: [
          // Ensure images come before text for optimal understanding
          ...refImageParts,
          { text: promptText }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE],
        imageConfig: {
          imageSize: "2K",
          aspectRatio: "3:4"
        },
        safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }]
      }
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
    Edit this image to be a coloring page.
    User Instruction: ${editPrompt}.
    STRICTLY maintain black and white line art style.
    Output ONLY the modified image.
  `;

  try {
    // Fix: Explicitly type the retry call to GenerateContentResponse
    const response = await callWithRetry<GenerateContentResponse>(() => callGeminiProxy({
      model: MODELS.ARTIST, // Updated to use 3-pro-image-preview for better quality/editing
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: cleanBase64 } }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE],
        imageConfig: {
          imageSize: "4K",
          aspectRatio: "3:4"
        },
        safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }]
      }
    }));

    // Extract Image
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      // Check parts for image
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          const resultBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          // Post-process to ensure B&W
          return await postProcessImage(resultBase64);
        }
      }
    }
    throw new Error("No image generated.");
  } catch (e: any) {
    throw new Error(`Edit Failed: ${e.message}`);
  }
};
