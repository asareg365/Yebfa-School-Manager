import { genkit } from 'genkit';
import { getPlugins } from './providers';
import { AI_CONFIG } from './config';

/**
 * @fileOverview Centralized Genkit Initialization.
 * 
 * Every AI feature must import this instance.
 */

export const ai = genkit({
  plugins: getPlugins(),
  model: AI_CONFIG.defaultModel,
});
