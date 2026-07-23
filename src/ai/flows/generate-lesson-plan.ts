'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MODELS } from '@/ai/models';
import { PROMPTS } from '@/ai/prompts';
import { wrapAIError } from '@/ai/errors';

const GenerateLessonPackInputSchema = z.object({
  subject: z.string(),
  gradeLevel: z.string(),
  topic: z.string(),
  duration: z.string().default("60 minutes"),
  focusArea: z.string().optional(),
});

const GenerateLessonPackOutputSchema = z.object({
  objectives: z.array(z.string()),
  schemeContext: z.string(),
  materials: z.array(z.string()),
  lessonNotes: z.string(),
  procedure: z.array(z.object({
    step: z.string(),
    duration: z.string(),
    activity: z.string(),
  })),
  classActivities: z.array(z.object({
    name: z.string(),
    description: z.string(),
    interactionType: z.enum(["Individual", "Group", "Whole Class"]),
  })),
  assessment: z.string(),
  homework: z.string(),
});

export type GenerateLessonPackInput = z.infer<typeof GenerateLessonPackInputSchema>;
export type GenerateLessonPackOutput = z.infer<typeof GenerateLessonPackOutputSchema>;

const prompt = ai.definePrompt({
  name: 'lessonPrompt',
  model: MODELS.PLANNING,
  input: { schema: GenerateLessonPackInputSchema },
  output: { schema: GenerateLessonPackOutputSchema },
  prompt: PROMPTS.LESSON_PLAN,
});

export async function generateLessonPlan(input: GenerateLessonPackInput): Promise<GenerateLessonPackOutput> {
  try {
    const { output } = await prompt(input);
    return output!;
  } catch (error) {
    throw wrapAIError(error);
  }
}
