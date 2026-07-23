'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MODELS } from '@/ai/models';
import { PROMPTS } from '@/ai/prompts';
import { wrapAIError } from '@/ai/errors';

const GenerateStudentReportCommentsInputSchema = z.object({
  studentName: z.string(),
  subject: z.string(),
  gradeLevel: z.string(),
  examScores: z.array(z.object({ name: z.string(), score: z.number() })),
  attendancePercentage: z.number().min(0).max(100),
  behaviorNotes: z.string().optional(),
});

const GenerateStudentReportCommentsOutputSchema = z.object({
  executiveSummary: z.string().optional(),
  academicAnalysis: z.string().optional(),
  personalDevelopment: z.string().optional(),
  keyStrengths: z.array(z.string()).optional(),
  areasToImprove: z.array(z.string()).optional(),
  actionableSteps: z.array(z.string()).optional(),
  finalGradeNarrative: z.string().optional(),
  error: z.string().optional(),
});

export type GenerateStudentReportCommentsInput = z.infer<typeof GenerateStudentReportCommentsInputSchema>;
export type GenerateStudentReportCommentsOutput = z.infer<typeof GenerateStudentReportCommentsOutputSchema>;

const prompt = ai.definePrompt({
  name: 'reportPrompt',
  model: MODELS.REPORTS,
  input: { schema: GenerateStudentReportCommentsInputSchema },
  output: { schema: GenerateStudentReportCommentsOutputSchema },
  prompt: PROMPTS.REPORT_NARRATIVE,
});

export async function generateStudentReportComments(input: GenerateStudentReportCommentsInput): Promise<GenerateStudentReportCommentsOutput> {
  try {
    const { output } = await prompt(input);
    return output!;
  } catch (error) {
    return { error: wrapAIError(error).message };
  }
}
