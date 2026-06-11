'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating highly detailed student report comments.
 *
 * - generateStudentReportComments - A function that handles the generation of structured student reports.
 * - GenerateStudentReportCommentsInput - The input type for the function.
 * - GenerateStudentReportCommentsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStudentReportCommentsInputSchema = z.object({
  studentName: z.string().describe("The student's full name."),
  subject: z.string().describe("The academic subject."),
  gradeLevel: z.string().describe("The student's current grade level."),
  examScores: z.array(
    z.object({
      name: z.string().describe("Exam name."),
      score: z.number().describe("Score percentage."),
    })
  ).describe("Array of exam results."),
  attendancePercentage: z.number().min(0).max(100).describe("Attendance percentage."),
  behaviorNotes: z.string().optional().describe("Notes on behavior and participation."),
});
export type GenerateStudentReportCommentsInput = z.infer<typeof GenerateStudentReportCommentsInputSchema>;

const GenerateStudentReportCommentsOutputSchema = z.object({
  executiveSummary: z.string().describe("A high-level summary of the student's performance."),
  academicAnalysis: z.string().describe("Detailed analysis of academic strengths and weaknesses based on scores."),
  personalDevelopment: z.string().describe("Analysis of behavioral and personal growth."),
  keyStrengths: z.array(z.string()).describe("List of core academic or social strengths."),
  areasToImprove: z.array(z.string()).describe("Specific targets for growth."),
  actionableSteps: z.array(z.string()).describe("Concrete steps for the student/parent to take."),
  finalGradeNarrative: z.string().describe("A concise paragraph for the final report card."),
});
export type GenerateStudentReportCommentsOutput = z.infer<typeof GenerateStudentReportCommentsOutputSchema>;

export async function generateStudentReportComments(input: GenerateStudentReportCommentsInput): Promise<GenerateStudentReportCommentsOutput> {
  return generateStudentReportCommentsFlow(input);
}

const generateStudentReportCommentsPrompt = ai.definePrompt({
  name: 'generateStudentReportCommentsPrompt',
  input: {schema: GenerateStudentReportCommentsInputSchema},
  output: {schema: GenerateStudentReportCommentsOutputSchema},
  prompt: `You are an expert educator crafting professional, detailed academic reports.
Analyze the student's data and provide a comprehensive, well-organized report.

Student: {{{studentName}}}
Subject: {{{subject}}}
Grade: {{{gradeLevel}}}
Attendance: {{{attendancePercentage}}}%
Exam Scores:
{{#each examScores}}
- {{this.name}}: {{this.score}}%
{{/each}}
Notes: {{{behaviorNotes}}}

Instructions:
1. Provide a professional 'executiveSummary'.
2. Deep dive into 'academicAnalysis'.
3. Reflect on 'personalDevelopment'.
4. List 'keyStrengths' and 'areasToImprove' as specific bullet points.
5. Provide 'actionableSteps' for future improvement.
6. End with a 'finalGradeNarrative' suitable for a standard transcript.

Tone: Professional, supportive, and data-driven.`,
});

const generateStudentReportCommentsFlow = ai.defineFlow(
  {
    name: 'generateStudentReportCommentsFlow',
    inputSchema: GenerateStudentReportCommentsInputSchema,
    outputSchema: GenerateStudentReportCommentsOutputSchema,
  },
  async (input) => {
    const {output} = await generateStudentReportCommentsPrompt(input);
    return output!;
  }
);
