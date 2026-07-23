'use server';
/**
 * @fileOverview AI Strategic Student Insights Flow using Vertex AI.
 * 
 * - analyzeStudentRisk - Comprehensive risk assessment including dropout, academic, attendance, and fee defaults.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GEMINI_MODEL } from '@/lib/ai-config';

const AnalyzeRiskInputSchema = z.object({
  studentName: z.string(),
  gradeLevel: z.string(),
  recentScores: z.array(z.number()),
  attendancePercentage: z.number(),
  feeBalance: z.number(),
  paymentFrequency: z.string().describe("Summary of how often payments are made, e.g., 'Regular', 'Irregular', 'None'"),
  behavioralNotes: z.string().optional(),
});
export type AnalyzeRiskInput = z.infer<typeof AnalyzeRiskInputSchema>;

const RiskMetricSchema = z.object({
  level: z.enum(["Low", "Moderate", "High", "Critical"]),
  narrative: z.string().describe("A professional explanation of why this risk level was assigned."),
});

const AnalyzeRiskOutputSchema = z.object({
  dropoutRisk: RiskMetricSchema,
  academicDecline: z.object({
    status: z.enum(["Stable", "Improving", "Declining", "Critical"]),
    narrative: z.string(),
  }),
  attendanceIssues: RiskMetricSchema,
  feeDefaultRisk: RiskMetricSchema,
  executiveSummary: z.string().describe("A high-level overview of the student's institutional standing."),
  strategicInterventions: z.array(z.string()).describe("A list of 3-5 professional actions for the school to take."),
});
export type AnalyzeRiskOutput = z.infer<typeof AnalyzeRiskOutputSchema>;

const analyzeRiskPrompt = ai.definePrompt({
  name: 'analyzeRiskPrompt',
  model: GEMINI_MODEL,
  input: { schema: AnalyzeRiskInputSchema },
  output: { schema: AnalyzeRiskOutputSchema },
  prompt: `You are a strategic educational analyst for schools in Ghana.
Perform a deep-dive risk analysis for the following student:

Name: {{{studentName}}}
Grade: {{{gradeLevel}}}
Recent Scores: {{#each recentScores}}{{{this}}}% {{/each}}
Attendance: {{{attendancePercentage}}}%
Fee Balance: GH₵{{{feeBalance}}}
Payment History: {{{paymentFrequency}}}
Notes: {{{behavioralNotes}}}

CRITICAL ANALYSIS GUIDELINES:
1. DROPOUT RISK: Consider the correlation between attendance, academic performance, and financial standing.
2. ACADEMIC DECLINE: Analyze the trend of the 'Recent Scores'.
3. ATTENDANCE ISSUES: Identify if the current percentage is below institutional thresholds (usually 85%).
4. FEE DEFAULT: Evaluate the balance relative to payment regularity.

Provide structured, professional insights and ACTIONABLE interventions.`,
});

const analyzeStudentRiskFlow = ai.defineFlow(
  {
    name: 'analyzeStudentRiskFlow',
    inputSchema: AnalyzeRiskInputSchema,
    outputSchema: AnalyzeRiskOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeRiskPrompt(input);
    return output!;
  }
);

export async function analyzeAcademicRisk(input: AnalyzeRiskInput): Promise<AnalyzeRiskOutput> {
  return analyzeStudentRiskFlow(input);
}
