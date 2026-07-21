import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import { GEMINI_MODEL } from '@/lib/ai-config';

/**
 * @fileOverview Genkit Initialization
 * 
 * Configures the Google AI plugin using the standardized GOOGLE_GENAI_API_KEY.
 * Uses the centralized GEMINI_MODEL from ai-config.ts.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
