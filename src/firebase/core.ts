import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './config';

/**
 * @fileOverview Durable Firebase Core Initialization.
 * Safe for use in both Server Components (Genkit) and Client Components.
 */

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');
const auth = getAuth(app);

export { app, db, auth };
