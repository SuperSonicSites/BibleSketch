# Gemini 3 Pro Image Input Research

## Overview
This document outlines the best practices, constraints, and methods for sending images to the `gemini-3-pro-image-preview` model, based on current API specifications and SDK capabilities.

## Model Specifications
- **Model Name:** `gemini-3-pro-image-preview`
- **Capabilities:** Multimodal (Text + Image Input) -> Text/Image Output.
- **Default Output Resolution:** 1K (1024x1024).
- **Max Output Resolution:** 4K (4096x4096) via `image_config`.

## Input Methods

There are two primary ways to send image data to the model:

### 1. Inline Data (Base64)
Suitable for single requests, real-time applications, and smaller images.

*   **Method:** Encode binary image data as a Base64 string and include it directly in the JSON payload (`inlineData`).
*   **Limit:** Total request payload size must be **< 20 MB**. Base64 encoding adds ~33% overhead, so the actual image file size limit is roughly **14-15 MB**.
*   **Pros:** Simpler implementation; no need to manage file lifecycles; lower latency for single-turn interactions.
*   **Cons:** Increases payload size; hits hard limits faster with multiple images or high-res inputs.
*   **Current Project Usage:** This is the method currently used in `services/gemini.ts`.

### 2. File API (Upload & Reference)
Suitable for large files, multiple images, or reusing the same image context across multiple prompts.

*   **Method:** Upload the file to Google's temporary storage via the Files API (`files.upload`), then reference the `fileUri` in the generate request (`fileData`).
*   **Limit:** Supports files up to **2 GB**.
*   **Pros:** Keeps request payloads small; supports much larger files; allows caching/reuse.
*   **Cons:** Adds a network round-trip (Upload -> Generate); requires managing file cleanup (files expire after 48 hours automatically).

## Supported Formats
The model accepts the following MIME types:
*   `image/png`
*   `image/jpeg`
*   `image/webp`
*   `image/heic`
*   `image/heif`

**Note:** The model performs best with clear, high-contrast images. For coloring page generation, high-contrast black and white or clear line art references are ideal.

## Best Practices

1.  **Prompt Ordering:**
    *   When providing both text and images, the **Text Prompt should follow the Image** in the `contents` array.
    *   Order: `[ { image_part }, { text_prompt_part } ]`

2.  **Aspect Ratios:**
    *   The model respects the input aspect ratio for understanding.
    *   For **generation output**, you must explicitly set the `aspectRatio` in `imageConfig` (e.g., `"3:4"`, `"1:1"`, `"16:9"`).

3.  **Safety Settings:**
    *   Image inputs are subject to the same safety filters as text. Ensure inputs do not violate safety policies (Hate Speech, Sexually Explicit, etc.) to avoid `finishReason: SAFETY`.

## Implementation Example (Node.js SDK)

### Inline (Current Implementation)
```typescript
const parts = [
  { text: "Analyze this style..." },
  {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64String // Raw Base64 without "data:image/..." prefix
    }
  }
];
```

### File API (Recommended for > 20MB)
```typescript
// 1. Upload
const uploadResult = await fileManager.uploadFile("path/to/image.jpg", {
  mimeType: "image/jpeg",
  displayName: "Reference Image",
});

// 2. Generate
const parts = [
  {
    fileData: {
      mimeType: uploadResult.file.mimeType,
      fileUri: uploadResult.file.uri
    }
  },
  { text: "Analyze this style..." }
];
```

## Recommendations for BibleSketch
Given the current use case (User uploads/Style references):
1.  **Stick to Inline Base64** for now. The reference images are small (< 2MB), and user uploads are likely compressed. The 20MB limit is sufficient.
2.  **Optimize Client-Side:** Ensure images are resized or compressed on the client before sending to Firebase Functions to minimize bandwidth and execution time.
3.  **Strip Metadata:** Ensure strictly raw Base64 is sent (remove `data:image/xyz;base64,` prefix) as the SDK handles the MIME type separately.

