
import { storage } from "../services/firebase";
import { ref, getDownloadURL } from "firebase/storage";

/**
 * Downloads an image from a gs:// URL OR a direct HTTPS URL and returns the raw base64 string
 * (without data:mime/type;base64, prefix) suitable for Gemini API inlineData.
 */
export const downloadImageAsBase64 = async (urlOrPath: string): Promise<string> => {
  if (!urlOrPath) return "";
  
  try {
    let url = urlOrPath;
    
    // If it's a Google Storage reference, try to get the download URL via SDK first
    if (urlOrPath.startsWith('gs://')) {
      try {
        const storageRef = ref(storage, urlOrPath);
        url = await getDownloadURL(storageRef);
      } catch (storageError: any) {
        // Fallback: Construct public URL manually if SDK fails
        // Note: This fallback only works if the file exists and is publicly readable.
        console.warn(`[Storage] SDK access failed for ${urlOrPath} (${storageError.code}). Attempting manual URL fallback.`);
        
        const matches = urlOrPath.match(/^gs:\/\/([^\/]+)\/(.+)$/);
        if (matches) {
            const bucket = matches[1];
            const path = matches[2];
            // Ensure path is encoded for URL (spaces -> %20)
            url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
        } else {
            throw storageError;
        }
      }
    }
    
    // Fetch the actual image data
    // Added credentials: 'omit' to potentially bypass strict CORS checks on public resources
    const response = await fetch(url, { 
        mode: 'cors',
        credentials: 'omit' 
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch image (Status: ${response.status}) from ${url}`);
    }
    
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (!base64String) {
            reject(new Error("Failed to convert blob to base64"));
            return;
        }
        // Gemini expects raw base64 for inlineData, strip the data URI prefix
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = () => reject(new Error("FileReader error"));
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    console.error(`Error downloading image reference: ${error.message}`);
    
    if (error.message === "Failed to fetch" || error.message.includes("CORS")) {
        console.error("🚨 CORS ERROR DETECTED 🚨");
        console.error("Your Firebase Storage bucket is blocking the browser from reading the image data.");
        console.error("TO FIX THIS, RUN THESE COMMANDS IN YOUR TERMINAL:");
        console.error(`echo '[{"origin": ["*"],"method": ["GET"], "maxAgeSeconds": 3600}]' > cors.json`);
        console.error(`gsutil cors set cors.json gs://biblesketch-5104c.firebasestorage.app`);
    }
    // Rethrow so the caller knows to skip this reference
    throw error;
  }
};
