
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword as firebaseCreateUser,
  signInWithEmailAndPassword as firebaseSignIn,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  deleteUser as firebaseDeleteUser,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  getAdditionalUserInfo,
  connectAuthEmulator
} from "firebase/auth";
import type { User } from "firebase/auth";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  arrayUnion,
  onSnapshot,
  serverTimestamp,
  increment,
  getDocs,
  connectFirestoreEmulator
} from "firebase/firestore";

import {
  getStorage,
  ref,
  uploadString,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getBytes,
  listAll,
  connectStorageEmulator
} from "firebase/storage";

import { BibleReference, AgeGroup, ArtStyle, Sketch, CreditTransaction } from "../types";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxrHQdjvie8JQnX18WRAqnwH3vwt5N5LI",
  authDomain: "BibleSketch.app",
  projectId: "biblesketch-5104c",
  storageBucket: "biblesketch-5104c.firebasestorage.app",
  messagingSenderId: "31072353772",
  appId: "1:31072353772:web:2f992ceb14538c051f94c9"
};

import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Connect to Emulators if running locally
if (location.hostname === "localhost") {
  console.log("🔌 Connecting to Firebase Emulators...");
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
export type { User };

// --- Helper: Upload Profile Image ---
const uploadProfileImage = async (uid: string, file: File): Promise<{ url: string, storagePath: string }> => {
  try {
    // Match Security Rules: match /user_uploads/{uid}/{allPaths=**}
    const storagePath = `user_uploads/${uid}/profile_${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    // Ensure content type is set correctly
    const metadata = { contentType: file.type || 'image/jpeg' };

    await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(storageRef);
    return { url, storagePath };
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw error;
  }
};

// --- Helper: Sync User to Firestore ---
const syncUserToFirestore = async (user: User, additionalData?: any, isNewUser: boolean = false) => {
  try {
    const userRef = doc(db, "users", user.uid);

    // Helper to create the initial document structure
    const createData = () => {
      // Prioritize additionalData.photoURL if present (from fresh upload)
      const photoURL = additionalData?.photoURL || user.photoURL || "";

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || additionalData?.displayName || "",
        photoFileName: additionalData?.photoFileName || "",
        photoURL: photoURL,
        storagePath: additionalData?.storagePath || "",
        credits: 5,
        downloadsRemaining: 5, // Free users get 5 prints/downloads
        isPremium: false,
        blessedSketchIds: [],
        // REMOVED: transactionHistory array (now using subcollection)
        createdAt: serverTimestamp(),
        ...additionalData
      };
    };

    if (isNewUser) {
      // If we know it's a new user (e.g. Registration or First Google Login),
      // skip the getDoc check. This prevents "Permission Denied" errors if
      // security rules forbid reading non-existent documents.
      await setDoc(userRef, createData());

      // Add Welcome Bonus transaction to subcollection
      try {
        const { addTransaction } = await import('./transactions');
        await addTransaction(user.uid, {
          amount: 5,
          description: "Welcome Bonus",
          type: 'bonus'
        });
      } catch (err) {
        console.error("Failed to add Welcome Bonus transaction:", err);
        // Don't throw - user creation succeeded, transaction is just missing from history
      }
    } else {
      // For returning users, check existence first
      try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, createData());
        }
      } catch (readErr) {
        console.warn("Could not read user doc (likely permission restricted), attempting safe creation/merge skipped to prevent overwrite.");
        // In strict mode, if we can't read, we might assume it exists to be safe, 
        // or if we really want to ensure it exists, we'd need a Blind Write which might overwrite credits.
        // For now, we rely on isNewUser=true for the critical creation moments.
      }
    }
  } catch (error) {
    console.error("Error syncing user to Firestore:", error);
  }
};

// --- Authentication & User Management ---

// Ensure we have at least an anonymous session for reading public data
export const ensureAnonymousSession = async () => {
  // If already logged in, or we already flagged it as disabled, stop.
  if (auth.currentUser || localStorage.getItem('anon_auth_disabled') === 'true') {
    return;
  }

  try {
    await signInAnonymously(auth);
  } catch (error: any) {
    // If Anon Auth is disabled (400 or admin-restricted), mark it disabled in localStorage to stop retrying
    if (error.code === 'auth/admin-restricted-operation' || error.message.includes('400') || error.code === 'auth/operation-not-allowed' || error.code === 'auth/invalid-credential') {
      console.warn("Anonymous auth is disabled/invalid in Firebase Console. Public read access may be restricted. Disabling auto-retry.");
      localStorage.setItem('anon_auth_disabled', 'true');
    } else {
      console.error("Error signing in anonymously", error);
    }
  }
};

export const registerUser = async (email: string, pass: string, name: string, photoFile: File | null) => {
  try {
    const userCredential = await firebaseCreateUser(auth, email, pass);
    const user = userCredential.user;

    let photoURL = "";
    let storagePath = "";

    // Safeguard: If image upload fails (e.g. permissions/bucket issues), continue registration without photo
    if (photoFile) {
      try {
        console.log("Starting profile image upload...");
        const result = await uploadProfileImage(user.uid, photoFile);
        photoURL = result.url;
        storagePath = result.storagePath;
        console.log("Profile image uploaded successfully:", photoURL);
      } catch (imgError) {
        console.error("Profile image upload failed, continuing without photo:", imgError);
        // Do not throw, allow registration to complete
      }
    }

    // Update Auth Profile
    await firebaseUpdateProfile(user, {
      displayName: name,
      photoURL: photoURL || null
    });

    // Initial sync handles the 5 credits logic
    // Pass true for isNewUser to force creation without checking (avoids permission errors)
    await syncUserToFirestore(user, {
      displayName: name,
      photoFileName: photoFile ? photoFile.name : "",
      photoURL: photoURL,
      storagePath: storagePath
    }, true);

    await firebaseSendEmailVerification(user, {
      url: window.location.origin + '/verified'
    });
    await firebaseSignOut(auth);

    return user;
  } catch (error: any) {
    console.error("Error registering user:", error);
    if (auth.currentUser) {
      try { await firebaseDeleteUser(auth.currentUser); } catch (e) { console.error("Rollback failed", e); }
    }
    throw error;
  }
};

export const loginUser = async (email: string, pass: string) => {
  try {
    const userCredential = await firebaseSignIn(auth, email, pass);
    const user = userCredential.user;

    if (!user.emailVerified) {
      await firebaseSignOut(auth);
      const error = new Error("Email not verified");
      (error as any).code = 'auth/email-not-verified';
      throw error;
    }

    await syncUserToFirestore(user, {}, false);
    // Clear disabled flag on successful login
    localStorage.removeItem('anon_auth_disabled');
    return user;
  } catch (error: any) {
    console.error("Error logging in:", error);
    throw error;
  }
};

export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const additionalInfo = getAdditionalUserInfo(result);

    // Use isNewUser flag to bypass permissions check on creation
    await syncUserToFirestore(user, {}, additionalInfo?.isNewUser || false);

    localStorage.removeItem('anon_auth_disabled');
    return user;
  } catch (error: any) {
    console.error("Error logging in with Google:", error);
    throw error;
  }
};

export const sendPasswordReset = async (email: string) => {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error("Error sending password reset:", error);
    throw error;
  }
};

export const getUserDocument = async (uid: string) => {
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    // Silence permission errors for public fetching
    // console.error("Error getting user document:", error); 
    return null;
  }
};

// Real-time User Listener
export const onUserProfileChanged = (uid: string, callback: (data: any) => void) => {
  const userRef = doc(db, "users", uid);
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  });
};

export const updateUserProfile = async (uid: string, data: { displayName?: string, photoFile?: File }) => {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw new Error("Unauthorized");

  try {
    let photoURL = user.photoURL;
    let photoFileName = "";
    let storagePath = "";

    // 1. Upload new image if provided
    if (data.photoFile) {
      const result = await uploadProfileImage(uid, data.photoFile);
      photoURL = result.url;
      storagePath = result.storagePath;
      photoFileName = data.photoFile.name;
    }

    // 2. Update Auth Profile
    await firebaseUpdateProfile(user, {
      displayName: data.displayName || user.displayName,
      photoURL: photoURL
    });

    // 3. Update Firestore Document
    const userRef = doc(db, "users", uid);
    const updateData: any = {
      updatedAt: serverTimestamp()
    };

    if (data.displayName) updateData.displayName = data.displayName;
    if (photoURL) updateData.photoURL = photoURL;
    if (photoFileName) updateData.photoFileName = photoFileName;
    if (storagePath) updateData.storagePath = storagePath;

    await updateDoc(userRef, updateData);
    await user.reload();

  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

// --- Helper: Recursive Storage Delete ---
const deleteStorageFolder = async (path: string) => {
  const listRef = ref(storage, path);
  try {
    const res = await listAll(listRef);

    // Delete all files in this folder
    const filePromises = res.items.map((itemRef) => deleteObject(itemRef));

    // Recursively delete subfolders
    const folderPromises = res.prefixes.map((folderRef) => deleteStorageFolder(folderRef.fullPath));

    await Promise.all([...filePromises, ...folderPromises]);
  } catch (error) {
    console.warn(`Error deleting folder ${path}, it might be empty or non-existent:`, error);
    // We don't throw here to allow account deletion to proceed even if storage is messy
  }
};

export const deleteUserAccount = async () => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    console.log("Deleting user storage...");
    // 1. Delete entire user_uploads folder in Storage
    await deleteStorageFolder(`user_uploads/${user.uid}`);

    console.log("Deleting user profile document...");
    // 2. Delete User Profile in Firestore
    await deleteDoc(doc(db, "users", user.uid));

    console.log("Deleting user authentication...");
    // 3. Delete Authentication Record
    await firebaseDeleteUser(user);

  } catch (error) {
    console.error("Error deleting account:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  await firebaseSignOut(auth);
};

export const onAuthStateChanged = (authObj: any, callback: (user: User | null) => void) => {
  return firebaseOnAuthStateChanged(authObj, (user) => {
    if (user && !user.emailVerified && user.providerData[0]?.providerId !== 'google.com' && !user.isAnonymous) {
      firebaseSignOut(authObj);
      callback(null);
    } else {
      callback(user);
    }
  });
};

// --- Credit System ---

// Deduct Credits Transactionally
export const deductCredits = async (userId: string, amount: number, description: string) => {
  const userRef = doc(db, "users", userId);

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        throw new Error("User does not exist!");
      }

      const data = userDoc.data();
      const currentCredits = data.credits || 0;
      if (currentCredits < amount) {
        throw new Error("INSUFFICIENT_CREDITS");
      }

      const newCredits = currentCredits - amount;

      // Update credits only (no more array manipulation)
      transaction.update(userRef, {
        credits: newCredits
      });
    });

    // Add transaction to subcollection after successful deduction
    try {
      const { addTransaction } = await import('./transactions');
      await addTransaction(userId, {
        amount: -amount,
        description: description,
        type: 'usage'
      });
    } catch (err) {
      console.error("Failed to record transaction:", err);
      // Don't throw - credits were deducted successfully
    }
  } catch (e) {
    console.error("Transaction failed: ", e);
    throw e;
  }
};

// Get Credit History
// DEPRECATED: Old array-based transaction history (kept for backward compatibility)
// This will return empty array for new users
export const getTransactionHistory = async (userId: string): Promise<CreditTransaction[]> => {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as any;
      // Return legacy array if it exists, otherwise empty
      return (data.transactionHistory || []) as CreditTransaction[];
    }
    return [];
  } catch (e) {
    console.error("Error fetching history:", e);
    return [];
  }
};

// NEW: Re-export subcollection-based functions
export { getPurchaseHistory, getAllTransactions } from './transactions';

// --- Sketches / Storage & Firestore Operations ---

interface AppSketchContext {
  reference: BibleReference;
  ageGroup: AgeGroup;
  artStyle: ArtStyle;
}

// --- Helper: Convert to PNG (Lossless) ---
const convertToPng = (base64: string): Promise<string> => {
  if (typeof window === 'undefined') return Promise.resolve(base64);

  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64); return; }

      // White background to handle transparency
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Export as PNG
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (e) => {
      console.warn("Image conversion failed, using original", e);
      resolve(base64);
    };
  });
};

// 1. Upload image to Firebase Storage
const uploadSketchImage = async (uid: string, imageData: string | Blob): Promise<{ url: string, path: string }> => {
  const imageId = Date.now().toString();

  let dataToUpload = imageData;
  let mimeType = 'image/png';
  let fileExtension = 'png';

  // 1. Ensure PNG Format for Base64 Strings
  if (typeof imageData === 'string' && imageData.startsWith('data:')) {
    try {
      const pngData = await convertToPng(imageData);
      dataToUpload = pngData;
      mimeType = 'image/png';
      fileExtension = 'png';
    } catch (error) {
      console.warn("PNG conversion skipped:", error);
      // If conversion fails, fallback to current mime type or default to png
      if (imageData.startsWith('data:image/jpeg')) {
        mimeType = 'image/jpeg';
        fileExtension = 'jpg';
      }
    }
  }
  // 2. Handle Blobs
  else if (imageData instanceof Blob) {
    if (imageData.type === 'image/jpeg') {
      // Strictly, we should probably convert blobs too, but usually blobs come from demo saves
      // which are acceptable. For generated images (strings), we enforce PNG.
      mimeType = 'image/jpeg';
      fileExtension = 'jpg';
    }
  }

  // IMPORTANT: This path MUST match "match /user_uploads/{uid}/{allPaths=**}" in security rules
  const storagePath = `user_uploads/${uid}/sketches/${imageId}.${fileExtension}`;

  console.log(`Attempting upload to: ${storagePath} (${mimeType})`);
  const storageRef = ref(storage, storagePath);

  // Add metadata to ensure content type is set correctly and downloads trigger automatically
  const metadata = {
    contentType: mimeType,
    contentDisposition: `attachment; filename="bible-sketch.${fileExtension}"`
  };

  if (typeof dataToUpload === 'string') {
    await uploadString(storageRef, dataToUpload, 'data_url', metadata);
  } else if (dataToUpload instanceof Blob) {
    await uploadBytes(storageRef, dataToUpload, metadata);
  } else {
    throw new Error("Invalid image data format");
  }

  const url = await getDownloadURL(storageRef);
  return { url, path: storagePath };
};

// Update Sketch Image (Edit)
export const updateSketchImage = async (sketchId: string, userId: string, oldStoragePath: string, newImageData: string) => {
  try {
    // 1. Upload new image
    const { url, path } = await uploadSketchImage(userId, newImageData);

    // Predict new thumbnail path
    const fileExt = path.split('.').pop();
    const lastSlash = path.lastIndexOf('/');
    const dir = path.substring(0, lastSlash);
    const filename = path.substring(lastSlash + 1, path.lastIndexOf('.'));

    // Thumbnail should be in the same directory as the main image
    const thumbnailPath = `${dir}/${filename}_400x533.${fileExt}`;

    // 2. Update Firestore
    const sketchRef = doc(db, "sketches", sketchId);
    await updateDoc(sketchRef, {
      imageUrl: url,
      storagePath: path,
      thumbnailPath: thumbnailPath, // Updated to user requested format
      updatedAt: serverTimestamp()
    });

    return { url, path };
  } catch (error) {
    console.error("Error updating sketch image:", error);
    throw error;
  }
};

// 2. Save Metadata
export const saveSketch = async (
  userId: string,
  imageData: string | Blob,
  promptContext: AppSketchContext,
  isPublic: boolean = true,
  isBookmark: boolean = false, // Optional flag to mark as bookmark immediately (e.g. for demo saves)
  tags: string[] = [] // Liturgical tags for categorization
): Promise<Sketch> => {
  try {
    if (!auth.currentUser) throw new Error("Must be logged in to save");

    console.log("Starting save process for user:", userId);

    // Upload to Storage first
    const { url, path } = await uploadSketchImage(userId, imageData);
    console.log("Image uploaded successfully to:", path);

    // Predict thumbnail path
    // Thumbnail should be in the same directory as the main image
    // Path structure: user_uploads/USERID/sketches/FILENAME_400x533.ext
    const fileExt = path.split('.').pop();
    const lastSlash = path.lastIndexOf('/');
    const dir = path.substring(0, lastSlash);
    const filename = path.substring(lastSlash + 1, path.lastIndexOf('.'));

    const thumbnailPath = `${dir}/${filename}_400x533.${fileExt}`;

    // Construct prompt data, conditionally adding undefined optional fields
    // Firestore 'addDoc' throws if any field is 'undefined'.
    const promptDataMap: any = {
      book: promptContext.reference.book,
      chapter: promptContext.reference.chapter,
      start_verse: promptContext.reference.startVerse,
      age_group: promptContext.ageGroup,
      art_style: promptContext.artStyle,
      aspect_ratio: "3:4"
    };

    // Only add end_verse if it exists (is not undefined and not null)
    if (promptContext.reference.endVerse !== undefined && promptContext.reference.endVerse !== null) {
      promptDataMap.end_verse = promptContext.reference.endVerse;
    }

    const sketchesRef = collection(db, "sketches");

    const newSketchData: any = {
      userId: userId,
      imageUrl: url,
      storagePath: path,
      thumbnailPath: thumbnailPath, // Saved
      isPublic: isPublic,
      blessCount: 0,
      createdAt: serverTimestamp(),
      isBookmark: isBookmark,
      promptData: promptDataMap // CRITICAL FIX: Added missing metadata saving
    };

    // Only add tags if provided (avoid empty array in Firestore)
    if (tags && tags.length > 0) {
      newSketchData.tags = tags;
    }

    const docRef = await addDoc(sketchesRef, newSketchData);

    console.log("Firestore document created successfully");

    // Return fully constructed Sketch object
    return {
      id: docRef.id,
      ...newSketchData,
      timestamp: Date.now(), // Approximate for client use
      // Helper casts for types that differ slightly in Firestore vs Client
      promptData: promptDataMap
    } as Sketch;

  } catch (error) {
    console.error("Error saving sketch:", error);
    throw error;
  }
};

// 3. Bless (Like) a Sketch (Transactional & Unique)
export const blessSketch = async (sketchId: string, userId?: string) => {
  try {
    const effectiveUserId = userId || auth.currentUser?.uid;
    const sketchRef = doc(db, "sketches", sketchId);

    if (!effectiveUserId) {
      await updateDoc(sketchRef, {
        blessCount: increment(1)
      });
      return;
    }

    const userRef = doc(db, "users", effectiveUserId);

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) {
        transaction.update(sketchRef, { blessCount: increment(1) });
        return;
      }

      const userData = userDoc.data();
      const blessedIds = userData.blessedSketchIds || [];

      if (blessedIds.includes(sketchId)) {
        throw new Error("ALREADY_BLESSED");
      }

      transaction.update(sketchRef, { blessCount: increment(1) });
      transaction.update(userRef, { blessedSketchIds: arrayUnion(sketchId) });
    });

  } catch (error: any) {
    if (error.message === "ALREADY_BLESSED") {
      console.log("User already blessed this sketch.");
      return;
    }
    console.error("Error blessing sketch:", error);
    throw error;
  }
};

// 4. Get List of Sketches Blessed by User
export const getUserBlessedSketchIds = async (userId: string): Promise<string[]> => {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as any;
      return data.blessedSketchIds || [];
    }
    return [];
  } catch (error) {
    console.error("Error getting blessed IDs:", error);
    return [];
  }
};

// 5. Get User's Personal Gallery (My Creations)
export const getUserGallery = async (userId: string) => {
  console.time('getUserGallery:firestore');
  try {
    const q = query(
      collection(db, "sketches"),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);
    console.timeEnd('getUserGallery:firestore');
    
    console.time('getUserGallery:processing');
    const sketches = snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data,
        timestamp: data.createdAt?.toMillis?.() || Date.now()
      };
    }) as any[];

    const creations = sketches.filter((s: any) => !s.isBookmark);
    const result = creations.sort((a, b) => b.timestamp - a.timestamp);
    console.timeEnd('getUserGallery:processing');
    return result;
  } catch (error) {
    console.error("Error fetching user gallery:", error);
    throw error;
  }
};

// 6. Get Public Community Gallery
export const getPublicGallery = async (currentUserId?: string) => {
  console.time('getPublicGallery:firestore');
  try {
    const q = query(
      collection(db, 'sketches'),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    console.timeEnd('getPublicGallery:firestore');

    console.time('getPublicGallery:processing');
    const sketches = snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data,
        timestamp: data.createdAt?.toMillis?.() || Date.now()
      };
    }) as any[];

    let publicSketches = sketches.filter((s: any) => !s.isBookmark);

    if (currentUserId) {
      publicSketches = publicSketches.filter((s: any) => s.userId !== currentUserId);
    }

    const result = publicSketches.sort((a, b) => {
      const blessDiff = (b.blessCount || 0) - (a.blessCount || 0);
      if (blessDiff !== 0) return blessDiff;
      return b.timestamp - a.timestamp;
    });
    console.timeEnd('getPublicGallery:processing');
    return result;
  } catch (error: any) {
    // If permission denied (e.g. Anon Auth is disabled + Security Rules require Auth), 
    // explicitly throw so UI can handle "Login Required" state.
    if (error.code === 'permission-denied' || error.message?.includes('permission')) {
      throw new Error("PERMISSION_DENIED");
    }
    console.error("Error fetching public gallery:", error);
    throw error;
  }
};

// 6b. Get Total Public Sketch Count (for social proof)
export const getTotalPublicSketchCount = async (): Promise<number> => {
  try {
    const q = query(
      collection(db, 'sketches'),
      where('isPublic', '==', true)
    );
    const snapshot = await getDocs(q);
    // Filter out bookmarks
    const count = snapshot.docs.filter(doc => !doc.data().isBookmark).length;
    return count;
  } catch (error) {
    console.error("Error fetching sketch count:", error);
    return 0; // Return 0 on error to avoid breaking the UI
  }
};

// 7. Get User's Public Gallery (For Profile View)
export const getUserPublicGallery = async (targetUserId: string) => {
  try {
    const q = query(
      collection(db, 'sketches'),
      where('userId', '==', targetUserId),
      where('isPublic', '==', true)
    );

    const snapshot = await getDocs(q);

    const sketches = snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data,
        timestamp: data.createdAt?.toMillis?.() || Date.now()
      };
    }) as any[];

    const originals = sketches.filter((s: any) => !s.isBookmark);

    return originals.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Error fetching user public gallery:", error);
    throw error;
  }
};

// 8. Delete Sketch
export const deleteSketch = async (sketchId: string, storagePath: string, isBookmark: boolean = false) => {
  try {
    // 1. Firestore Data Deletion
    // Note: We assume validation that the current user owns this sketch happens in security rules.
    const sketchRef = doc(db, "sketches", sketchId);

    // Retrieve data first to get accurate thumbnail path if possible before deleting the doc
    let thumbnailPath = "";
    try {
      const snap = await getDoc(sketchRef);
      if (snap.exists()) {
        const data = snap.data() as any;
        thumbnailPath = data.thumbnailPath || "";
      }
    } catch (e) {
      // Ignored (might be perm restricted if already deleted or edge case)
    }

    await deleteDoc(sketchRef); // DELETE DATA

    if (isBookmark) return;

    // --- Storage Deletion (Main Image + Thumbnails) ---
    if (storagePath) {
      const pathsToDelete = new Set<string>();

      // A. MAIN IMAGE
      pathsToDelete.add(storagePath);

      // B. THUMBNAIL (From Firestore Record if available)
      if (thumbnailPath) pathsToDelete.add(thumbnailPath);

      // C. HARDCODED THUMBNAIL (Structure: .../sketches/ID_400x533.ext)
      // This ensures the correct path is targeted for deletion.
      const lastSlash = storagePath.lastIndexOf('/');
      const lastDot = storagePath.lastIndexOf('.');
      if (lastSlash !== -1 && lastDot !== -1) {
        const dir = storagePath.substring(0, lastSlash);
        const filename = storagePath.substring(lastSlash + 1, lastDot);
        const ext = storagePath.substring(lastDot + 1);

        // Corrected path construction for the specific thumbnail extension.
        pathsToDelete.add(`${dir}/${filename}_400x533.${ext}`);
      }

      // D. Legacy Fallbacks (Standard resize location)
      const predictedWebP = storagePath.replace(/\.[^/.]+$/, "") + "_400x533.webp";
      pathsToDelete.add(predictedWebP);

      const ext = storagePath.split('.').pop();
      if (ext) {
        const predictedOrig = storagePath.replace(/\.[^/.]+$/, "") + `_400x533.${ext}`;
        pathsToDelete.add(predictedOrig);
      }

      // Execute Deletions
      // We use Promise.allSettled behavior via catch to ensure one failure doesn't stop others
      const deletePromises = Array.from(pathsToDelete).map(path => {
        const fileRef = ref(storage, path);
        return deleteObject(fileRef).catch(e => {
          // Ignore "object-not-found" errors, warn on others
          if (e.code !== 'storage/object-not-found') {
            console.warn(`Failed to delete storage object: ${path}`, e);
          }
        });
      });

      await Promise.all(deletePromises);
    }

    // 3. CASCADE DELETE: Disabled for now due to permissions.
    // Orphaned bookmarks are harmless - they just point to a non-existent sketch.
    // TODO: Implement via Cloud Function with admin privileges for proper cascade deletion.
    // try {
    //   const bookmarksQuery = query(
    //     collection(db, "sketches"),
    //     where("originalSketchId", "==", sketchId)
    //   );
    //
    //   const bookmarkSnaps = await getDocs(bookmarksQuery);
    //   const deletePromises = bookmarkSnaps.docs.map(d => deleteDoc(d.ref));
    //   await Promise.all(deletePromises);
    // } catch (cascadeError) {
    //   console.warn("Could not cascade delete bookmarks (likely permission issue):", cascadeError);
    // }

  } catch (error) {
    console.error("Error deleting sketch:", error);
    throw error;
  }
};

// 9. Update Visibility
export const updateSketchVisibility = async (sketchId: string, isPublic: boolean) => {
  try {
    const sketchRef = doc(db, "sketches", sketchId);
    await updateDoc(sketchRef, {
      isPublic: isPublic
    });
  } catch (error) {
    console.error("Error updating visibility:", error);
    throw error;
  }
};

// 9b. Update Sketch Tags
export const updateSketchTags = async (sketchId: string, tags: string[]) => {
  try {
    const sketchRef = doc(db, "sketches", sketchId);
    await updateDoc(sketchRef, {
      tags: tags.length > 0 ? tags : [] // Allow empty array to clear tags
    });
  } catch (error) {
    console.error("Error updating tags:", error);
    throw error;
  }
};

// 10. Bookmark/Save Sketch
export const toggleBookmark = async (userId: string, sketch: Sketch) => {
  try {
    const actualTargetId = sketch.originalSketchId || sketch.id;
    const bookmarkId = `bookmark_${userId}_${actualTargetId}`;
    const bookmarkRef = doc(db, "sketches", bookmarkId);
    const docSnap = await getDoc(bookmarkRef);

    if (docSnap.exists()) {
      await deleteDoc(bookmarkRef);
      return false;
    } else {
      const newBookmarkData = {
        userId: userId,
        isBookmark: true,
        isPublic: false,
        createdAt: serverTimestamp(),
        blessCount: 0,
        originalSketchId: sketch.originalSketchId || sketch.id,
        originalOwnerId: sketch.originalOwnerId || sketch.userId,
        promptData: sketch.promptData,
        imageUrl: sketch.imageUrl,
        storagePath: sketch.storagePath,
        thumbnailPath: sketch.thumbnailPath
      };

      // --- DEEP DIVE LOGGING ---
      console.log("--- Firebase Bookmark Attempt ---");
      console.log("Current User ID:", userId);
      console.log("Generated Bookmark ID:", bookmarkId);
      console.log("Data Payload:", JSON.stringify(newBookmarkData, null, 2));
      // --- END LOGGING ---

      await setDoc(bookmarkRef, newBookmarkData);
      return true;
    }
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    throw error;
  }
};

// 11. Get Saved Sketches
export const getSavedSketches = async (userId: string) => {
  try {
    const q = query(
      collection(db, "sketches"),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);
    const sketches = snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data,
        timestamp: data.createdAt?.toMillis?.() || Date.now()
      };
    }) as any[];

    const bookmarks = sketches.filter((s: any) => s.isBookmark === true);
    return bookmarks.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Error getting saved sketches:", error);
    throw error;
  }
};

// 12. Check if Bookmarked
export const checkIsBookmarked = async (userId: string, sketchId: string) => {
  try {
    const bookmarkId = `bookmark_${userId}_${sketchId}`;
    const bookmarkRef = doc(db, "sketches", bookmarkId);
    const docSnap = await getDoc(bookmarkRef);
    return docSnap.exists();
  } catch (error: any) {
    // Suppress permission-denied errors as they likely indicate the bookmark doesn't exist 
    // (and security rules prevent reading a non-existent doc owned by someone else)
    if (error.code === 'permission-denied') {
      return false;
    }
    console.error("Error checking bookmark status:", error);
    return false;
  }
};

// 13. Download Helper
export const downloadImageAsBlob = async (storagePath: string): Promise<Blob> => {
  try {
    const fileRef = ref(storage, storagePath);
    const arrayBuffer = await getBytes(fileRef);
    return new Blob([arrayBuffer], { type: 'image/png' });
  } catch (error) {
    console.error("Error downloading blob via SDK:", error);
    throw error;
  }
};

// 14. Get Single Sketch by ID
export const getSketchById = async (sketchId: string): Promise<Sketch | null> => {
  try {
    const sketchRef = doc(db, "sketches", sketchId);
    const snap = await getDoc(sketchRef);

    if (snap.exists()) {
      const data = snap.data() as any;
      return {
        id: snap.id,
        ...data,
        timestamp: data.createdAt?.toMillis?.() || Date.now()
      } as Sketch;
    }
    return null;
  } catch (error) {
    console.error("Error fetching sketch by ID:", error);
    throw error;
  }
};

// --- Download/Print Quota System ---
export { canDownload, deductDownload } from './downloads';

