import { db } from '@/firebase';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';

/**
 * @fileOverview Base Service for multi-tenant Firestore access.
 */

export abstract class BaseAIService {
  protected async getTenantData(collectionName: string, tenantId: string): Promise<DocumentData[]> {
    const q = query(collection(db, collectionName), where("tenantId", "==", tenantId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  }
}
