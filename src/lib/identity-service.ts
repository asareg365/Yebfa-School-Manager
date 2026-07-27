
import { db } from '@/firebase';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

/**
 * @fileOverview Strategic Identity Service for Multi-Tenant Sequential IDs.
 * Uses Firestore Transactions to ensure uniqueness and zero reuse.
 */

export type RegistryType = 'STU' | 'STF' | 'PAR' | 'ADM';

/**
 * Generates a transactional sequential ID for a specific institution.
 * Format: {SchoolCode}-{Type}-{Year}-{Sequence}
 * Example: YSM-STU-2026-0001
 */
export async function generateInstitutionId(
  type: RegistryType,
  institutionId: string,
  schoolCode?: string
): Promise<string> {
  const counterRef = doc(db, 'counters', `${institutionId}_${type}`);
  const year = new Date().getFullYear();

  return await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    let nextSeq = 1;

    if (counterSnap.exists()) {
      nextSeq = (counterSnap.data().currentSequence || 0) + 1;
    }

    transaction.set(counterRef, {
      currentSequence: nextSeq,
      type,
      institutionId,
      updatedAt: serverTimestamp()
    }, { merge: true });

    const sequenceStr = String(nextSeq).padStart(4, '0');
    // Fallback if schoolCode is missing - ensure we always return a valid string
    const cleanCode = schoolCode ? schoolCode.replace(/\s+/g, '').toUpperCase().substring(0, 4) : 'SCH';
    return `${cleanCode}-${type}-${year}-${sequenceStr}`;
  });
}

/**
 * Generates a random 4-digit PIN for student access.
 */
export function generateStudentPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Helper to normalize phone numbers for security passwords.
 */
export function normalizeSecurityPhone(num: string): string {
  if (!num) return "";
  // Strip all non-numeric characters except + and then normalize +233 to 0
  let clean = num.replace(/\s+/g, '').replace(/-/g, '').replace(/\(/g, '').replace(/\)/g, '');
  if (clean.startsWith('+233')) return '0' + clean.substring(4);
  if (clean.startsWith('233')) return '0' + clean.substring(3);
  return clean;
}
