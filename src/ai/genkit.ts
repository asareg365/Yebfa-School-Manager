import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * @fileOverview Genkit Initialization
 * 
 * Configures the Google AI plugin using a standardized GOOGLE_GENAI_API_KEY.
 * Standardizes the model to gemini-2.0-flash for all flows.
 */

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
