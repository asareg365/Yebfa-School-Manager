'use server';
/**
 * @fileOverview AI Exam Question Generator.
 * 
 * - generateExamQuestions - Generates structured exam papers.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GEMINI_MODEL } from '@/lib/ai-config';

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

const generateExamPrompt = ai.definePrompt({
  name: 'generateExamPrompt',
  model: GEMINI_MODEL,
  input: { schema: GenerateExamInputSchema },
  output: { schema: GenerateExamOutputSchema },
  prompt: `You are an expert examiner. Generate {{{count}}} {{{type}}} questions for:
Subject: {{{subject}}}
Topic: {{{topic}}}
Grade: {{{gradeLevel}}}

Provide clear questions and a detailed marking scheme. Ensure the content is relevant to the curriculum standard.`,
});

const generateExamQuestionsFlow = ai.defineFlow(
  {
    name: 'generateExamQuestionsFlow',
    inputSchema: GenerateExamInputSchema,
    outputSchema: GenerateExamOutputSchema,
  },
  async (input) => {
    const { output } = await generateExamPrompt(input);
    return output!;
  }
);

export async function generateExamQuestions(input: GenerateExamInput): Promise<GenerateExamOutput> {
  return generateExamQuestionsFlow(input);
}
