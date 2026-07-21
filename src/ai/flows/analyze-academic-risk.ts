'use server';
/**
 * @fileOverview AI Academic Risk Predictor.
 * 
 * - analyzeAcademicRisk - Main function to predict student risk levels.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GEMINI_MODEL } from '@/lib/ai-config';

const AnalyzeRiskInputSchema = z.object({
  studentName: z.string(),
  recentScores: z.array(z.number()),
  attendancePercentage: z.number(),
  behavioralNotes: z.string().optional(),
});
export type AnalyzeRiskInput = z.infer<typeof AnalyzeRiskInputSchema>;

const AnalyzeRiskOutputSchema = z.object({
  riskLevel: z.enum(["Low", "Moderate", "High", "Critical"]),
  prediction: z.string(),
  contributingFactors: z.array(z.string()),
  recommendedInterventions: z.array(z.string()),
});
export type AnalyzeRiskOutput = z.infer<typeof AnalyzeRiskOutputSchema>;

const analyzeRiskPrompt = ai.definePrompt({
  name: 'analyzeRiskPrompt',
  model: GEMINI_MODEL,
  input: { schema: AnalyzeRiskInputSchema },
  output: { schema: AnalyzeRiskOutputSchema },
  prompt: `Analyze the following student metrics and predict academic risk for a student in a Ghanaian educational context:
Student: {{{studentName}}}
Recent Scores: {{#each recentScores}}{{{this}}}% {{/each}}
Attendance: {{{attendancePercentage}}}%
Notes: {{{behavioralNotes}}}

Identify if the student is likely to fail or drop out and provide professional interventions.`,
});

const analyzeAcademicRiskFlow = ai.defineFlow(
  {
    name: 'analyzeAcademicRiskFlow',
    inputSchema: AnalyzeRiskInputSchema,
    outputSchema: AnalyzeRiskOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeRiskPrompt(input);
    return output!;
  }
);

export async function analyzeAcademicRisk(input: AnalyzeRiskInput): Promise<AnalyzeRiskOutput> {
  return analyzeAcademicRiskFlow(input);
}
