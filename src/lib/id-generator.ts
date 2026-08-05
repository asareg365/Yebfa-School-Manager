
import { db } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';

/**
 * @fileOverview Transactional ID Generation Service.
 * Generates unique, sequential IDs for institutional entities.
 */

export type IDType =
  | 'students'
  | 'staff'
  | 'parents'
  | 'admissions'
  | 'invoices'
  | 'receipts';

/**
 * Generates a unique sequential ID for a specific entity type.
 * Format: {SHORTCODE}-{ENTITY}-{SEQUENCE}
 * Example: VOD-ST-000001
 */
export async function generateId(
  type: IDType,
  shortCode: string,
  entityCode: string
): Promise<string> {
  if (!shortCode) throw new Error("Institution shortCode is required for ID generation.");

  const counterRef = doc(db, "counters", type);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    let nextNumber = 1;

    if (snap.exists()) {
      nextNumber = snap.data().nextNumber ?? 1;
    }

    tx.set(counterRef, {
      nextNumber: nextNumber + 1
    }, { merge: true });

    const sequenceStr = String(nextNumber).padStart(6, "0");
    const cleanShort = shortCode.toUpperCase().trim();
    const cleanEntity = entityCode.toUpperCase().trim();

    return `${cleanShort}-${cleanEntity}-${sequenceStr}`;
  });
}
