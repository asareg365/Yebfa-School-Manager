import { db } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';

/**
 * Transactional ID Generation Service.
 *
 * Generates unique, sequential IDs independently for each institution.
 *
 * Examples:
 * VOD-ST-000001
 * VOD-ST-000002
 * VOD-PR-000001
 * TES-ST-000001
 */

export type IDType =
  | 'students'
  | 'staff'
  | 'parents'
  | 'admissions'
  | 'invoices'
  | 'receipts';

/**
 * Generates a unique sequential ID for an institution/entity combination.
 *
 * Counter is isolated by institution short code and entity type.
 *
 * Example:
 * generateId('students', 'VOD', 'ST')
 * => VOD-ST-000001
 */
export async function generateId(
  type: IDType,
  shortCode: string,
  entityCode: string
): Promise<string> {
  if (!shortCode?.trim()) {
    throw new Error(
      'Institution shortCode is required for ID generation.'
    );
  }

  if (!entityCode?.trim()) {
    throw new Error(
      'Entity code is required for ID generation.'
    );
  }

  const cleanShortCode = shortCode.trim().toUpperCase();
  const cleanEntityCode = entityCode.trim().toUpperCase();

  /**
   * Each institution/entity gets its own counter.
   *
   * Examples:
   * counters/VOD_students
   * counters/VOD_staff
   * counters/TES_students
   */
  const counterId = `${cleanShortCode}_${type}`;
  const counterRef = doc(db, 'counters', counterId);

  return await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);

    let nextNumber = 1;

    if (counterSnap.exists()) {
      const data = counterSnap.data();

      if (
        typeof data.nextNumber === 'number' &&
        Number.isFinite(data.nextNumber) &&
        data.nextNumber > 0
      ) {
        nextNumber = data.nextNumber;
      }
    }

    /**
     * Reserve the next number atomically.
     */
    transaction.set(
      counterRef,
      {
        nextNumber: nextNumber + 1,
        shortCode: cleanShortCode,
        entityType: type,
        entityCode: cleanEntityCode,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    const sequence = String(nextNumber).padStart(6, '0');

    return `${cleanShortCode}-${cleanEntityCode}-${sequence}`;
  });
}
