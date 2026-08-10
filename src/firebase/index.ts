'use client';

/**
 * @fileOverview Central Firebase Registry.
 * Exports core instances and client-side hooks.
 * Standardized to prevent boundary violations in the 2026 Registry Hub.
 */

export * from './core';
export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './firestore/use-memo-firebase';
