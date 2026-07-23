import { genkit } from 'genkit';
import { vertexAI } from '@genkit-ai/vertexai';
import { GEMINI_MODEL } from '@/lib/ai-config';

export const ai = genkit({
  plugins: [
    vertexAI({
      projectId: 'yebfa-ai',
      location: 'us-central1',
    }),
  ],

  model: GEMINI_MODEL,
});
