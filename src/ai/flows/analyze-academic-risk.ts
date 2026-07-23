'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MODELS } from '@/ai/models';
import { PROMPTS } from '@/ai/prompts';
import { wrapAIError } from '@/ai/errors';

const AnalyzeRiskInputSchema = z.object({
  studentName: z.string(),
  gradeLevel: z.string(),
  recentScores: z.array(z.number()),
  attendancePercentage: z.number(),
  feeBalance: z.number(),
  paymentFrequency: z.string(),
  behavioralNotes: z.string().optional(),
});

const RiskMetricSchema = z.object({
  level: z.enum(["Low", "Moderate", "High", "Critical"]),
  narrative: z.string(),
});

const AnalyzeRiskOutputSchema = z.object({
  dropoutRisk: RiskMetricSchema,
  academicDecline: z.object({
    status: z.enum(["Stable", "Improving", "Declining", "Critical"]),
    narrative: z.string(),
  }),
  attendanceIssues: RiskMetricSchema,
  feeDefaultRisk: RiskMetricSchema,
  executiveSummary: z.string(),
  strategicInterventions: z.array(z.string()),
});

export type AnalyzeRiskInput = z.infer<typeof AnalyzeRiskInputSchema>;
export type AnalyzeRiskOutput = z.infer<typeof AnalyzeRiskOutputSchema>;

const prompt = ai.definePrompt({
  name: 'riskPrompt',
  model: MODELS.ANALYSIS,
  input: { schema: AnalyzeRiskInputSchema },
  output: { schema: AnalyzeRiskOutputSchema },
  prompt: PROMPTS.RISK_ANALYSIS,
});

export async function analyzeAcademicRisk(input: AnalyzeRiskInput): Promise<AnalyzeRiskOutput> {
  try {
    const { output } = await prompt(input);
    return output!;
  } catch (error) {
    throw wrapAIError(error);
  }
}
