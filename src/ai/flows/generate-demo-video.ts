'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MODELS } from '@/ai/models';
import { wrapAIError } from '@/ai/errors';

const GenerateDemoVideoOutputSchema = z.object({
  videoUrl: z.string().describe("The data URI of the generated MP4 video."),
});
export type GenerateDemoVideoOutput = z.infer<typeof GenerateDemoVideoOutputSchema>;

export async function generateDemoVideo(): Promise<GenerateDemoVideoOutput> {
  try {
    let { operation } = await ai.generate({
      model: MODELS.VIDEO,
      prompt: 'A cinematic high-definition walkthrough of a futuristic, clean school management dashboard. The interface shows student profiles, financial growth graphs in Ghana Cedis, and academic reports. Smooth camera motion, professional lighting, 4k resolution.',
      config: {
        durationSeconds: 5,
        aspectRatio: '16:9',
      },
    });

    if (!operation) {
      throw new Error('The video generation service did not return an operation.');
    }

    const startTime = Date.now();
    const maxDuration = 115000;

    while (!operation.done) {
      if (Date.now() - startTime > maxDuration) {
        throw new Error('Video generation timed out.');
      }
      operation = await ai.checkOperation(operation);
      if (operation.done) break;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    if (operation.error) {
      throw new Error(operation.error.message);
    }

    const videoPart = operation.output?.message?.content.find((p) => !!p.media);
    if (!videoPart?.media) {
      throw new Error('Failed to return video media.');
    }

    const fetch = (await import('node-fetch')).default;
    const videoDownloadResponse = await fetch(videoPart.media.url);

    if (!videoDownloadResponse.ok) {
      throw new Error('Failed to download video.');
    }

    const arrayBuffer = await videoDownloadResponse.arrayBuffer();
    const base64Video = Buffer.from(arrayBuffer).toString('base64');
    
    return {
      videoUrl: `data:video/mp4;base64,${base64Video}`,
    };
  } catch (error) {
    throw wrapAIError(error);
  }
}
