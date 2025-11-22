import { db } from './firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';

// Transaction type definition
export interface Transaction {
    id?: string;
    userId: string;
    amount: number;
    description: string;
    type: 'purchase' | 'usage' | 'bonus' | 'refund';
    timestamp: any; // Firestore Timestamp or number
    metadata?: any;
}

/**
 * Add a transaction to the user's transactions subcollection
 */
export const addTransaction = async (
    userId: string,
    transaction: Omit<Transaction, 'id' | 'userId' | 'timestamp'>
): Promise<string> => {
    try {
        const transactionsRef = collection(db, 'users', userId, 'transactions');
        const docRef = await addDoc(transactionsRef, {
            userId,
            ...transaction,
            timestamp: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding transaction:", error);
        throw error;
    }
};

/**
 * Get purchase history only (for UI display)
 */
export const getPurchaseHistory = async (userId: string, maxResults = 50): Promise<Transaction[]> => {
    try {
        const transactionsRef = collection(db, 'users', userId, 'transactions');
        const q = query(
            transactionsRef,
            where('type', '==', 'purchase'),
            orderBy('timestamp', 'desc'),
            limit(maxResults)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toMillis?.() || Date.now()
        })) as Transaction[];
    } catch (error) {
        console.error("Error fetching purchase history:", error);
        return [];
    }
};

/**
 * Get all transactions (if needed for admin/debugging)
 */
export const getAllTransactions = async (userId: string, maxResults = 100): Promise<Transaction[]> => {
    try {
        const transactionsRef = collection(db, 'users', userId, 'transactions');
        const q = query(
            transactionsRef,
            orderBy('timestamp', 'desc'),
            limit(maxResults)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toMillis?.() || Date.now()
        })) as Transaction[];
    } catch (error) {
        console.error("Error fetching all transactions:", error);
        return [];
    }
};
