import { googleAI } from '@genkit-ai/google-genai';
import { vertexAI } from '@genkit-ai/vertexai';

/**
 * @fileOverview AI Provider Configuration.
 * 
 * Centralizes the plugins used by Genkit.
 */

export const getPlugins = () => [
  googleAI(),
  vertexAI({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'yebfa-ai',
    location: 'us-central1',
  }),
];
