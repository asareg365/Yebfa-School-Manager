'use client';

import { useMemo } from 'react';

/**
 * A wrapper around useMemo that is specifically intended for memoizing
 * Firebase references and queries. This helps to stabilize the references
 * passed to useCollection and useDoc, preventing infinite render loops.
 */
export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, deps);
}
