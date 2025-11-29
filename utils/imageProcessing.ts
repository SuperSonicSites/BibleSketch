
/**
 * Process image for download/print (Handles CORS and PNG conversion).
 */
export const embedLogoOnImage = (imageSource: string): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous"; // Attempt to load with CORS to avoid tainted canvas
    
    // Cache Busting for CORS safety when dealing with Storage URLs
    const src = imageSource.startsWith('http') && !imageSource.includes('base64') 
       ? `${imageSource}${imageSource.includes('?') ? '&' : '?'}t=${Date.now()}`
       : imageSource;

    img.onload = () => {
      try {
          canvas.width = img.width;
          canvas.height = img.height;
          if (!ctx) { 
              resolve(imageSource); 
              return; 
          }

          // Draw Base Image
          ctx.drawImage(img, 0, 0);

          try {
              // Return PNG for lossless quality
              resolve(canvas.toDataURL('image/png'));
          } catch (e) {
              // Tainted canvas (CORS failure), return original
              console.warn("Canvas tainted, returning original source", e);
              resolve(imageSource);
          }

      } catch (e) {
          console.error("Error during image processing", e);
          resolve(imageSource);
      }
    };
    
    img.onerror = (e) => {
        console.warn("Failed to load base image for processing", e);
        resolve(imageSource);
    };

    img.src = src;
  });
};

/**
 * Post-processes the raw AI output to meet coloring book standards.
 * 1. Adds padding (Zoom out to leave margins).
 * 2. Converts to Grayscale.
 * 3. Thresholds (Eliminates light grays -> White, Snaps darks -> Black).
 */
/**
 * Threshold image to pure B&W without adding margins.
 * Used for editing operations to avoid progressive shrinking.
 */
export const thresholdToBW = (base64Image: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(base64Image);
        return;
      }

      const width = img.width;
      const height = img.height;
      canvas.width = width;
      canvas.height = height;

      // Draw image at full size (no zoom-out)
      ctx.drawImage(img, 0, 0, width, height);

      // PIXEL MANIPULATION (Grayscale & Threshold)
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Calculate Luminance
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

          // Threshold: light grays (>160) become white, darks become black
          let finalVal = luminance < 160 ? 0 : 255;

          data[i] = finalVal;
          data[i + 1] = finalVal;
          data[i + 2] = finalVal;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error("Error processing pixel data", err);
        resolve(base64Image);
      }
    };

    img.onerror = (err) => {
      console.error("Failed to load image for thresholding", err);
      resolve(base64Image);
    };

    img.src = base64Image;
  });
};

/**
 * Post-processes the raw AI output to meet coloring book standards.
 * 1. Adds padding (Zoom out to leave margins).
 * 2. Converts to Grayscale.
 * 3. Thresholds (Eliminates light grays -> White, Snaps darks -> Black).
 */
export const postProcessImage = (base64Image: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; 

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(base64Image);
        return;
      }

      // 1. SETUP CANVAS
      const width = img.width;
      const height = img.height;
      canvas.width = width;
      canvas.height = height;

      // Fill Background with Pure White
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // 2. ZOOM OUT / MARGINS
      // Scale down to 85% to create nice margins
      const scale = 0.85; 
      const scaledW = width * scale;
      const scaledH = height * scale;
      const offsetX = (width - scaledW) / 2;
      const offsetY = (height - scaledH) / 2;

      ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);

      // 3. PIXEL MANIPULATION (Grayscale & Threshold)
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Calculate Luminance
          // Formula: 0.299*R + 0.587*G + 0.114*B
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

          // THRESHOLD LOGIC:
          // "Eliminate the gray... so that the gray becomes white."
          // "Keeping the black as black."
          
          let finalVal = 255; // Default to white

          // If it's dark enough, make it black.
          // This removes light shading (grays) effectively.
          // Threshold of 160 means light grays (>160) become 255 (white).
          // Dark grays/Blacks (<160) become 0 (black).
          if (luminance < 160) {
             finalVal = 0;
          }

          data[i] = finalVal;     // Red
          data[i + 1] = finalVal; // Green
          data[i + 2] = finalVal; // Blue
          // Alpha (data[i+3]) remains unchanged (255)
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));

      } catch (err) {
        console.error("Error processing pixel data (likely tainted canvas)", err);
        // Fallback to the padded image without pixel manip if CORS fails
        resolve(canvas.toDataURL('image/png'));
      }
    };

    img.onerror = (err) => {
      console.error("Failed to load image for post-processing", err);
      resolve(base64Image);
    };

    img.src = base64Image;
  });
};
