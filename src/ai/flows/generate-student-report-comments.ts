'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating highly detailed student report comments.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GEMINI_MODEL } from '@/lib/ai-config';

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
  executiveSummary: z.string().optional().describe("A high-level summary of the student's performance."),
  academicAnalysis: z.string().optional().describe("Detailed analysis of academic strengths and weaknesses based on scores."),
  personalDevelopment: z.string().optional().describe("Analysis of behavioral and personal growth."),
  keyStrengths: z.array(z.string()).optional().describe("List of core academic or social strengths."),
  areasToImprove: z.array(z.string()).optional().describe("Specific targets for growth."),
  actionableSteps: z.array(z.string()).optional().describe("Concrete steps for the student/parent to take."),
  finalGradeNarrative: z.string().optional().describe("A concise paragraph for the final report card."),
  error: z.string().optional().describe("An error message if the generation failed."),
});
export type GenerateStudentReportCommentsOutput = z.infer<typeof GenerateStudentReportCommentsOutputSchema>;

const generateStudentReportCommentsPrompt = ai.definePrompt({
  name: 'generateStudentReportCommentsPrompt',
  model: GEMINI_MODEL,
  input: {schema: GenerateStudentReportCommentsInputSchema},
  output: {schema: GenerateStudentReportCommentsOutputSchema},
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  },
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
    try {
      const {output} = await generateStudentReportCommentsPrompt(input);
      if (!output) {
        return { error: "The AI model failed to return a structured performance narrative." };
      }
      return output;
    } catch (err: any) {
      const errMsg = err.message || "";
      if (errMsg.includes('403') || errMsg.includes('blocked') || errMsg.includes('permission')) {
        return { 
          error: "AI access is blocked by your service provider (403). Please enable the 'Generative Language API' in your Google Cloud Console." 
        };
      }
      if (errMsg.includes('404') || errMsg.includes('not found')) {
        return {
          error: "AI Model Not Found (404). This typically means the model name specified in 'src/lib/ai-config.ts' is incorrect, deprecated, or not available in your region."
        };
      }
      return { error: errMsg || "An unexpected AI error occurred during report generation." };
    }
  }
);

export async function generateStudentReportComments(input: GenerateStudentReportCommentsInput): Promise<GenerateStudentReportCommentsOutput> {
  return generateStudentReportCommentsFlow(input);
}
