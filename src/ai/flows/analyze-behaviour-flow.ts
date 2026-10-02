'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MODELS } from '@/ai/models';
import { PROMPTS } from '@/ai/prompts';
import { wrapAIError } from '@/ai/errors';

const BehaviourInputSchema = z.object({
  studentName: z.string(),
  gradeLevel: z.string(),
  attendancePercentage: z.number(),
  recentScores: z.array(z.number()),
  disciplineIncidents: z.array(z.object({
    date: z.string(),
    category: z.string(),
    severity: z.enum(["Minor", "Moderate", "Major"]),
    description: z.string(),
  })),
  teacherContext: z.string().optional(),
});

const BehaviourOutputSchema = z.object({
  behaviouralAnalysis: z.object({
    status: z.enum(["Exemplary", "Stable", "Concerning", "At-Risk", "Critical"]),
    score: z.number(),
    narrative: z.string(),
  }),
  interventionMap: z.object({
    urgency: z.enum(["Routine", "Elevated", "Immediate"]),
    recommendedActions: z.array(z.string()),
    counselingGoals: z.array(z.string()),
  }),
  impactAssessment: z.string(),
  earlyWarningSigns: z.array(z.string()),
});

export type BehaviourInput = z.infer<typeof BehaviourInputSchema>;
export type BehaviourOutput = z.infer<typeof BehaviourOutputSchema>;

const prompt = ai.definePrompt({
  name: 'behaviourPrompt',
  model: MODELS.ANALYSIS,
  input: { schema: BehaviourInputSchema },
  output: { schema: BehaviourOutputSchema },
  prompt: PROMPTS.BEHAVIOUR_ANALYSIS,
});

export async function analyzeBehaviour(input: BehaviourInput): Promise<BehaviourOutput> {
  try {
    const { output } = await prompt(input);
    return output!;
  } catch (error) {
    throw wrapAIError(error);
  }
}
