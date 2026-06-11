
'use server';
/**
 * @fileOverview A flow to generate a demo video of the school management system.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';

const GenerateDemoVideoOutputSchema = z.object({
  videoUrl: z.string().describe("The data URI of the generated MP4 video."),
});
export type GenerateDemoVideoOutput = z.infer<typeof GenerateDemoVideoOutputSchema>;

export async function generateDemoVideo(): Promise<GenerateDemoVideoOutput> {
  return generateDemoVideoFlow();
}

const generateDemoVideoFlow = ai.defineFlow(
  {
    name: 'generateDemoVideoFlow',
    inputSchema: z.void(),
    outputSchema: GenerateDemoVideoOutputSchema,
  },
  async () => {
    let { operation } = await ai.generate({
      model: 'googleai/veo-2.0-generate-001',
      prompt: 'A cinematic walkthrough of a futuristic, clean school management dashboard with bright interfaces, student profiles, and interactive graphs. Modern lighting, 4k, smooth camera motion.',
      config: {
        durationSeconds: 5,
        aspectRatio: '16:9',
      },
    });

    if (!operation) {
      throw new Error('Expected the model to return an operation');
    }

    // Wait until the operation completes.
    while (!operation.done) {
      operation = await ai.checkOperation(operation);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    if (operation.error) {
      throw new Error('failed to generate video: ' + operation.error.message);
    }

    const videoPart = operation.output?.message?.content.find((p) => !!p.media);
    if (!videoPart || !videoPart.media) {
      throw new Error('Failed to find the generated video');
    }

    const fetch = (await import('node-fetch')).default;
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
    const videoDownloadResponse = await fetch(
      `${videoPart.media.url}&key=${apiKey}`
    );

    if (!videoDownloadResponse || !videoDownloadResponse.ok || !videoDownloadResponse.body) {
      throw new Error('Failed to fetch video data from Google servers');
    }

    const arrayBuffer = await videoDownloadResponse.arrayBuffer();
    const base64Video = Buffer.from(arrayBuffer).toString('base64');
    
    return {
      videoUrl: `data:video/mp4;base64,${base64Video}`,
    };
  }
);
