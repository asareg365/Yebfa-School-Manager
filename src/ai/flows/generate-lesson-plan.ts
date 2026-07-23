'use server';
/**
 * @fileOverview AI Teacher Assistant Flow using Vertex AI.
 * 
 * - generateLessonPlan - Creates a comprehensive "Instructional Pack" including notes, plans, and activities.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GEMINI_MODEL } from '@/lib/ai-config';

const GenerateLessonPackInputSchema = z.object({
  subject: z.string(),
  gradeLevel: z.string(),
  topic: z.string(),
  duration: z.string().default("60 minutes"),
  focusArea: z.string().optional().describe("Specific sub-topic or skill focus."),
});
export type GenerateLessonPackInput = z.infer<typeof GenerateLessonPackInputSchema>;

const GenerateLessonPackOutputSchema = z.object({
  objectives: z.array(z.string()).describe("SMART learning objectives."),
  schemeContext: z.string().describe("How this fits into the term's Scheme of Learning."),
  materials: z.array(z.string()),
  lessonNotes: z.string().describe("Comprehensive content for students to copy or study."),
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
export type GenerateLessonPackOutput = z.infer<typeof GenerateLessonPackOutputSchema>;

const assistantPrompt = ai.definePrompt({
  name: 'generateLessonPackPrompt',
  model: GEMINI_MODEL,
  input: { schema: GenerateLessonPackInputSchema },
  output: { schema: GenerateLessonPackOutputSchema },
  prompt: `You are an expert Teacher Assistant for schools in Ghana.
Create a comprehensive, high-quality "Instructional Pack" for the following:

Subject: {{{subject}}}
Grade: {{{gradeLevel}}}
Topic: {{{topic}}}
Duration: {{{duration}}}
{{#if focusArea}}Focus: {{{focusArea}}}{{/if}}

Please deliver:
1. SMART Objectives.
2. Scheme of Learning Context (Strategic alignment).
3. Detailed 'lessonNotes' suitable for students to use as their primary source of information.
4. Professional pedagogical procedure steps.
5. Interactive 'classActivities' that engage students.
6. A clear assessment strategy and homework.

Tone: Professional, pedagogical, and highly structured.`,
});

const generateLessonPackFlow = ai.defineFlow(
  {
    name: 'generateLessonPackFlow',
    inputSchema: GenerateLessonPackInputSchema,
    outputSchema: GenerateLessonPackOutputSchema,
  },
  async (input) => {
    const { output } = await assistantPrompt(input);
    return output!;
  }
);

export async function generateLessonPlan(input: GenerateLessonPackInput): Promise<GenerateLessonPackOutput> {
  return generateLessonPackFlow(input);
}
