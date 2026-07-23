'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MODELS } from '@/ai/models';
import { PROMPTS } from '@/ai/prompts';
import { wrapAIError } from '@/ai/errors';

const GenerateExamInputSchema = z.object({
  subject: z.string(),
  gradeLevel: z.string(),
  topic: z.string(),
  count: z.number().default(5),
  type: z.enum(["Multiple Choice", "Theory", "Mixed"]),
});

const GenerateExamOutputSchema = z.object({
  questions: z.array(z.object({
    id: z.number(),
    question: z.string(),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string(),
    explanation: z.string(),
    difficulty: z.enum(["Easy", "Medium", "Hard"]),
    taxonomyLevel: z.enum(["Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"]),
    marks: z.number(),
  })),
  markingScheme: z.string(),
  assessmentAnalysis: z.object({
    bloomSummary: z.string(),
    difficultyBalance: z.string(),
  }),
});

export type GenerateExamInput = z.infer<typeof GenerateExamInputSchema>;
export type GenerateExamOutput = z.infer<typeof GenerateExamOutputSchema>;

const prompt = ai.definePrompt({
  name: 'examPrompt',
  model: MODELS.SMART,
  input: { schema: GenerateExamInputSchema },
  output: { schema: GenerateExamOutputSchema },
  prompt: PROMPTS.EXAM_GEN,
});

export async function generateExamQuestions(input: GenerateExamInput): Promise<GenerateExamOutput> {
  try {
    const { output } = await prompt(input);
    return output!;
  } catch (error) {
    throw wrapAIError(error);
  }
}
