'use server';
/**
 * @fileOverview AI Examination Assistant using Vertex AI.
 * 
 * - generateExamQuestions - Generates structured assessment papers with Bloom's Taxonomy and difficulty balancing.
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
    difficulty: z.enum(["Easy", "Medium", "Hard"]),
    taxonomyLevel: z.enum(["Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"]),
    marks: z.number(),
  })),
  markingScheme: z.string().describe("A detailed, points-based marking scheme for each question."),
  assessmentAnalysis: z.object({
    bloomSummary: z.string().describe("Analysis of the cognitive levels covered based on Bloom's Taxonomy."),
    difficultyBalance: z.string().describe("Rationale for the distribution of difficulty levels across the paper."),
  }),
});
export type GenerateExamOutput = z.infer<typeof GenerateExamOutputSchema>;

const generateExamPrompt = ai.definePrompt({
  name: 'generateExamPrompt',
  model: GEMINI_MODEL,
  input: { schema: GenerateExamInputSchema },
  output: { schema: GenerateExamOutputSchema },
  prompt: `You are an expert curriculum examiner specialized in the Ghanaian educational system.
Generate a structured examination paper for:
Subject: {{{subject}}}
Topic: {{{topic}}}
Grade: {{{gradeLevel}}}
Quantity: {{{count}}} questions
Type: {{{type}}}

CRITICAL INSTRUCTIONS:
1. DIFFICULTY BALANCING: Ensure a balanced mix of questions (roughly 30% Easy, 50% Medium, 20% Hard).
2. BLOOM'S TAXONOMY: Map every question to a specific cognitive level from Bloom's Taxonomy. Ensure the paper tests more than just 'Remembering'.
3. MARKING SCHEME: Provide a detailed marking scheme that specifies exactly how marks are awarded.
4. TONE: Professional, academic, and clear.`,
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
