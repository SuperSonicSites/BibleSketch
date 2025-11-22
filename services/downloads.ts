import { db, getUserDocument } from './firebase';
import { doc, runTransaction } from 'firebase/firestore';

// --- Download/Print Quota System ---

/**
 * Check if user can download/print
 * Premium users have unlimited downloads, free users have a quota
 */
export const canDownload = async (userId: string): Promise<{ allowed: boolean, remaining: number, isPremium: boolean }> => {
    try {
        const userData = await getUserDocument(userId);

        if (!userData) {
            return { allowed: false, remaining: 0, isPremium: false };
        }

        const isPremium = userData.isPremium || false;
        const downloadsRemaining = userData.downloadsRemaining ?? 0;

        // Premium users have unlimited downloads
        if (isPremium) {
            return { allowed: true, remaining: -1, isPremium: true }; // -1 indicates unlimited
        }

        // Free users must have downloads remaining
        return {
            allowed: downloadsRemaining > 0,
            remaining: downloadsRemaining,
            isPremium: false
        };
    } catch (error) {
        console.error("Error checking download permission:", error);
        return { allowed: false, remaining: 0, isPremium: false };
    }
};

/**
 * Deduct a download from user's quota
 * Only deducts for non-premium users
 */
export const deductDownload = async (userId: string): Promise<void> => {
    const userRef = doc(db, "users", userId);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("User does not exist!");
            }

            const data = userDoc.data();
            const isPremium = data.isPremium || false;

            // Skip deduction for premium users
            if (isPremium) {
                return;
            }

            const currentDownloads = data.downloadsRemaining ?? 0;
            if (currentDownloads < 1) {
                throw new Error("NO_DOWNLOADS_REMAINING");
            }

            const newDownloads = currentDownloads - 1;
            transaction.update(userRef, {
                downloadsRemaining: newDownloads
            });
        });
    } catch (e) {
        console.error("Download deduction failed: ", e);
        throw e;
    }
};
