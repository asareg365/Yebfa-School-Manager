
'use server';
/**
 * @fileOverview AI Academic Risk Predictor.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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

export async function analyzeAcademicRisk(input: AnalyzeRiskInput): Promise<AnalyzeRiskOutput> {
  const { output } = await ai.generate({
    model: 'googleai/gemini-1.5-flash',
    input: input,
    output: { schema: AnalyzeRiskOutputSchema },
    prompt: `Analyze the following student metrics and predict academic risk:
Student: {{studentName}}
Recent Scores: {{recentScores}}
Attendance: {{attendancePercentage}}%
Notes: {{behavioralNotes}}

Identify if the student is likely to fail or drop out and provide professional interventions.`,
  });
  return output!;
}
