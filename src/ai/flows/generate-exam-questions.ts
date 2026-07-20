'use server';
/**
 * @fileOverview AI Exam Question Generator.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'genkit';

const GenerateExamInputSchema = z.object({
  subject: z.string(),
  gradeLevel: z.string(),
  topic: z.string(),
  count: z.number().default(5),
  type: z.enum(["Multiple Choice", "Theory", "Mixed"]),
});
export type GenerateExamInput = z.infer<typeof GenerateExamInputSchema>;

const GenerateExamOutputSchema = z.object({
  questions: z.array(z.object({
    id: z.number(),
    question: z.string(),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string(),
    explanation: z.string(),
  })),
  markingSchemeInstructions: z.string(),
});
export type GenerateExamOutput = z.infer<typeof GenerateExamOutputSchema>;

export async function generateExamQuestions(input: GenerateExamInput): Promise<GenerateExamOutput> {
  const { output } = await ai.generate({
    model: googleAI.model('gemini-2.0-flash'),
    input: input,
    output: { schema: GenerateExamOutputSchema },
    prompt: `You are an expert examiner. Generate {{count}} {{type}} questions for:
Subject: {{subject}}
Topic: {{topic}}
Grade: {{gradeLevel}}

Provide clear questions and a detailed marking scheme.`,
  });
  return output!;
}
