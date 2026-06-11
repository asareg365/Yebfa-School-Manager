
'use server';
/**
 * @fileOverview A flow to generate a demo video of the school management system.
 *
 * This flow uses the Veo model to generate a cinematic walkthrough of the platform.
 * It polls for completion and returns a data URI of the generated MP4.
 */

import { ai } from '@/ai/genkit';
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
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('AI Configuration Error: Missing API Key. Please ensure GEMINI_API_KEY is set in the environment.');
    }

    let { operation } = await ai.generate({
      model: 'googleai/veo-2.0-generate-001',
      prompt: 'A cinematic high-definition walkthrough of a futuristic, clean school management dashboard. The interface shows student profiles, financial growth graphs in Ghana Cedis, and academic reports. Smooth camera motion, professional lighting, 4k resolution.',
      config: {
        durationSeconds: 5,
        aspectRatio: '16:9',
      },
    });

    if (!operation) {
      throw new Error('The video generation service did not return an operation. This may be due to rate limits.');
    }

    // Polling for completion with a maximum timeout to prevent server action hanging
    const startTime = Date.now();
    const maxDuration = 110000; // 110 seconds

    while (!operation.done) {
      if (Date.now() - startTime > maxDuration) {
        throw new Error('Video generation timed out. Please try again.');
      }
      
      operation = await ai.checkOperation(operation);
      if (operation.done) break;
      
      // Sleep for 5 seconds before checking again.
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    if (operation.error) {
      throw new Error('AI Generation failed: ' + operation.error.message);
    }

    const videoPart = operation.output?.message?.content.find((p) => !!p.media);
    if (!videoPart || !videoPart.media) {
      throw new Error('The model completed but failed to return a video media part.');
    }

    const fetch = (await import('node-fetch')).default;
    const videoDownloadResponse = await fetch(
      `${videoPart.media.url}&key=${apiKey}`
    );

    if (!videoDownloadResponse || !videoDownloadResponse.ok || !videoDownloadResponse.body) {
      throw new Error('Failed to download the generated video from the AI provider.');
    }

    const arrayBuffer = await videoDownloadResponse.arrayBuffer();
    const base64Video = Buffer.from(arrayBuffer).toString('base64');
    
    return {
      videoUrl: `data:video/mp4;base64,${base64Video}`,
    };
  }
);
