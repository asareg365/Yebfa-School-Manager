'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating personalized student report comments.
 *
 * - generateStudentReportComments - A function that handles the generation of student report comments.
 * - GenerateStudentReportCommentsInput - The input type for the generateStudentReportComments function.
 * - GenerateStudentReportCommentsOutput - The return type for the generateStudentReportComments function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStudentReportCommentsInputSchema = z.object({
  studentName: z.string().describe("The student's full name."),
  subject: z.string().describe("The academic subject for which the report comment is being generated."),
  gradeLevel: z.string().describe("The student's current grade level or year."),
  examScores: z.array(
    z.object({
      name: z.string().describe("The name or title of the exam."),
      score: z.number().describe("The score obtained by the student in the exam (e.g., 85 for 85%)."),
    })
  ).describe("An array of objects, each containing an exam name and the student's score."),
  attendancePercentage: z.number().min(0).max(100).describe("The student's attendance percentage for the term or academic period."),
  behaviorNotes: z.string().optional().describe("Optional notes regarding the student's classroom behavior or participation."),
});
export type GenerateStudentReportCommentsInput = z.infer<typeof GenerateStudentReportCommentsInputSchema>;

const GenerateStudentReportCommentsOutputSchema = z.object({
  comment: z.string().describe("A personalized and insightful report comment for the student."),
});
export type GenerateStudentReportCommentsOutput = z.infer<typeof GenerateStudentReportCommentsOutputSchema>;

export async function generateStudentReportComments(input: GenerateStudentReportCommentsInput): Promise<GenerateStudentReportCommentsOutput> {
  return generateStudentReportCommentsFlow(input);
}

const generateStudentReportCommentsPrompt = ai.definePrompt({
  name: 'generateStudentReportCommentsPrompt',
  input: {schema: GenerateStudentReportCommentsInputSchema},
  output: {schema: GenerateStudentReportCommentsOutputSchema},
  prompt: `You are an experienced and empathetic teacher, skilled in crafting personalized and constructive student report comments.

Analyze the following data for the student and generate a comprehensive report comment for the {{subject}} subject. The comment should highlight strengths, identify areas for improvement, and offer constructive suggestions where appropriate. Maintain a professional, supportive, and encouraging tone.

Student Name: {{{studentName}}}
Subject: {{{subject}}}
Grade Level: {{{gradeLevel}}}

Exam Scores:
{{#each examScores}}
- {{this.name}}: {{this.score}}%
{{/each}}

Attendance Percentage: {{{attendancePercentage}}}%

{{#if behaviorNotes}}
Behavior Notes: {{{behaviorNotes}}}
{{/if}}

Based on this information, provide a personalized report comment for {{{studentName}}} in {{subject}}.`,
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
