'use server';
/**
 * @fileOverview AI Lesson Plan Generator.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';

const GenerateLessonPlanInputSchema = z.object({
  subject: z.string(),
  gradeLevel: z.string(),
  topic: z.string(),
  duration: z.string().default("60 minutes"),
});
export type GenerateLessonPlanInput = z.infer<typeof GenerateLessonPlanInputSchema>;

const GenerateLessonPlanOutputSchema = z.object({
  objectives: z.array(z.string()),
  materials: z.array(z.string()),
  procedure: z.array(z.object({
    step: z.string(),
    duration: z.string(),
    activity: z.string(),
  })),
  assessment: z.string(),
  homework: z.string(),
});
export type GenerateLessonPlanOutput = z.infer<typeof GenerateLessonPlanOutputSchema>;

export async function generateLessonPlan(input: GenerateLessonPlanInput): Promise<GenerateLessonPlanOutput> {
  const { output } = await ai.generate({
    model: googleAI.model('gemini-1.5-flash'),
    input: input,
    output: { schema: GenerateLessonPlanOutputSchema },
    prompt: `You are an expert curriculum developer for schools in Ghana.
Create a detailed, high-quality lesson plan for the following:

Subject: {{subject}}
Grade: {{gradeLevel}}
Topic: {{topic}}
Duration: {{duration}}

Ensure the objectives are SMART and the procedure follows professional instructional design standards.`,
  });
  return output!;
}
