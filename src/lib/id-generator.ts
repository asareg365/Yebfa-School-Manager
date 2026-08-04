import { db } from '@/firebase';
import { doc, runTransaction } from 'firebase/firestore';

export type IDType =
  | 'students'
  | 'staff'
  | 'parents'
  | 'admissions'
  | 'invoices'
  | 'receipts';

export async function generateId(
  type: IDType,
  prefix: string
): Promise<string> {

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

    return `${prefix.toUpperCase()}${String(nextNumber).padStart(6,"0")}`;
  });
}