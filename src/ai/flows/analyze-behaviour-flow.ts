'use server';
/**
 * @fileOverview AI Student Behaviour Analysis Flow.
 * 
 * - analyzeBehaviour - Predicts behavioural risks and suggests pedagogical interventions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GEMINI_MODEL } from '@/lib/ai-config';

const BehaviourInputSchema = z.object({
  studentName: z.string(),
  gradeLevel: z.string(),
  attendancePercentage: z.number(),
  recentScores: z.array(z.number()),
  disciplineIncidents: z.array(z.object({
    date: z.string(),
    category: z.string().describe("e.g. 'Classroom Disruption', 'Lateness', 'Conflict'"),
    severity: z.enum(["Minor", "Moderate", "Major"]),
    description: z.string(),
  })),
  teacherContext: z.string().optional().describe("Qualitative notes from the form master."),
});

const BehaviourOutputSchema = z.object({
  behaviouralAnalysis: z.object({
    status: z.enum(["Exemplary", "Stable", "Concerning", "At-Risk", "Critical"]),
    score: z.number().describe("1-100 overall conduct score"),
    narrative: z.string().describe("A professional analysis of the student's behavioural trends."),
  }),
  interventionMap: z.object({
    urgency: z.enum(["Routine", "Elevated", "Immediate"]),
    recommendedActions: z.array(z.string()),
    counselingGoals: z.array(z.string()),
  }),
  impactAssessment: z.string().describe("How behaviour is specifically affecting academic output."),
  earlyWarningSigns: z.array(z.string()).describe("Potential future issues identified by trends."),
});

export type BehaviourInput = z.infer<typeof BehaviourInputSchema>;
export type BehaviourOutput = z.infer<typeof BehaviourOutputSchema>;

const behaviourPrompt = ai.definePrompt({
  name: 'behaviourPrompt',
  model: GEMINI_MODEL,
  input: { schema: BehaviourInputSchema },
  output: { schema: BehaviourOutputSchema },
  prompt: `You are a Senior Guidance Counselor and Educational Psychologist in Ghana.
Analyze the following student behavioural data and predict if intervention is required.

Student: {{{studentName}}}
Grade: {{{gradeLevel}}}
Attendance: {{{attendancePercentage}}}%
Recent Academic Scores: {{#each recentScores}}{{{this}}}% {{/each}}

Discipline Incident Log:
{{#each disciplineIncidents}}
- [{{{date}}}] {{{category}}} ({{{severity}}}): {{{description}}}
{{/each}}

Additional Context: {{{teacherContext}}}

INSTRUCTIONS:
1. CORRELATION: Identify if academic decline correlates with increased disciplinary incidents.
2. ATTENDANCE LINK: Determine if attendance patterns suggest disengagement.
3. PREDICTION: Forecast potential major incidents if current trends continue.
4. STRATEGY: Provide 3-5 professional, culturally sensitive interventions for a school in Ghana.
5. URGENCY: Set the urgency level based on the frequency and severity of major incidents.

Tone: Professional, clinical yet supportive.`,
});

export async function analyzeBehaviour(input: BehaviourInput): Promise<BehaviourOutput> {
  const { output } = await behaviourPrompt(input);
  return output!;
}
