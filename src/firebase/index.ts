import { initializeFirebase } from './index';

/**
 * @fileOverview Central Firebase Registry.
 * Exports core instances and client-side hooks.
 */

export * from './core';
export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './firestore/use-memo-firebase';

export function initializeFirebase() {
  const { app, db, auth } = require('./core');
  return { app, db, auth };
}
