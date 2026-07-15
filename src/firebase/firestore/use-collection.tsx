
'use client';

import { useState, useEffect } from 'react';
import { Query, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If query is null, we assume we're waiting for auth/context
    if (!query) {
      setLoading(false);
      setData([]);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setData(items);
        setLoading(false);
        setError(null);
      },
      async (err: any) => {
        // Only emit error if it's truly a permission issue and not a transient state
        if (err.code === 'permission-denied') {
          // Attempt to extract path from the query object for better debugging
          const path = (query as any)._query?.path?.segments?.join('/') || (query as any).path || 'Query';
          const permissionError = new FirestorePermissionError({
            path: path, 
            operation: 'list',
          });
          errorEmitter.emit('permission-error', permissionError);
        }
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [query]);

  return { data, loading, error };
}
