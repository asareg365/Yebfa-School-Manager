import { db } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';

/**
 * @fileOverview Centralized ID Generation Service.
 * Uses Firestore Transactions to ensure unique, sequential IDs across all institutional nodes.
 */

export type IDType = 'students' | 'staff' | 'parents' | 'admissions' | 'invoices' | 'receipts';

/**
 * Generates a unique sequential ID for a specific entity type.
 * Format: [Prefix][6-digit-padded-number]
 * Example: YSM-ST-000001
 */
export async function generateId(type: IDType, prefix: string): Promise<string> {
  const counterRef = doc(db, 'counters', type);

  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let next = 1;

    if (counterDoc.exists()) {
      const data = counterDoc.data();
      next = (typeof data.nextNumber === 'number' ? data.nextNumber : 1);
    }

    // Atomically increment the counter
    transaction.set(counterRef, { nextNumber: next + 1 }, { merge: true });

    const sequenceStr = String(next).padStart(6, '0');
    return `${prefix}${sequenceStr}`;
  });
}
