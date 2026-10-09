'use client';

import React from 'react';
import { app, db, auth } from './core';
import { FirebaseProvider } from './provider';
import { TenantProvider } from '@/context/tenant-context';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseProvider app={app} db={db} auth={auth}>
      <TenantProvider>
        {children}
      </TenantProvider>
    </FirebaseProvider>
  );
}
