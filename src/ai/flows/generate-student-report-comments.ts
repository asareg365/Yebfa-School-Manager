'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MODELS } from '@/ai/models';
import { PROMPTS } from '@/ai/prompts';
import { wrapAIError } from '@/ai/errors';

/**
 * @fileOverview Qualitative Student Report Generator.
 * Interprets quantitative data into descriptive pedagogical narratives.
 */

const GenerateStudentReportCommentsInputSchema = z.object({
  studentName: z.string(),
  subject: z.string(),
  gradeLevel: z.string(),
  examScores: z.array(z.object({ name: z.string(), score: z.number() })),
  attendancePercentage: z.number().min(0).max(100),
  classPosition: z.string().optional().describe("The student's rank in class (e.g. 1st of 30)"),
  behaviorNotes: z.string().optional(),
});

const GenerateStudentReportCommentsOutputSchema = z.object({
  executiveSummary: z.string().optional().describe("Qualitative summary of overall progress."),
  academicAnalysis: z.string().optional().describe("Detailed descriptive analysis of subject mastery."),
  personalDevelopment: z.string().optional().describe("Narrative on character, soft skills, and participation."),
  keyStrengths: z.array(z.string()).optional().describe("List of qualitative strengths identified."),
  areasToImprove: z.array(z.string()).optional().describe("List of descriptive milestones for future growth."),
  actionableSteps: z.array(z.string()).optional().describe("Specific tips for teachers and parents."),
  finalGradeNarrative: z.string().optional().describe("Warm, parent-friendly closing commentary."),
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
