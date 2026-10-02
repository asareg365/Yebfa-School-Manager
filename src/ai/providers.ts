import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview AI Provider Configuration.
 * 
 * Centralizes the plugins used by Genkit.
 */

export const getPlugins = () => [
    googleAI(),
];