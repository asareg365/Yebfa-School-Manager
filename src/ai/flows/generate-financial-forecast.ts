'use server';
/**
 * @fileOverview Strategic Financial Forecasting and Fee Prediction AI Agent.
 *
 * This flow analyzes institutional ledger data to predict income, defaults, and cash flow trends.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GEMINI_MODEL } from '@/lib/ai-config';

const GenerateFinancialForecastInputSchema = z.object({
  revenueHistory: z.array(z.object({
    date: z.string(),
    amount: z.number(),
    source: z.string().optional().describe("e.g. 'Tuition', 'Canteen', 'Bus'"),
  })),
  expenseHistory: z.array(z.object({
    date: z.string(),
    amount: z.number(),
  })),
  outstandingBalances: z.number().optional().describe("Total unpaid fees currently in the ledger."),
  forecastPeriod: z.string().default("next 6 months"),
});
export type GenerateFinancialForecastInput = z.infer<typeof GenerateFinancialForecastInputSchema>;

const GenerateFinancialForecastOutputSchema = z.object({
  treasurySummary: z.object({
    expectedIncome: z.number().describe("Predicted total revenue for the period."),
    outstandingRisk: z.number().describe("Predicted unpaid fees based on historical behavior."),
    netCashFlow: z.number().describe("Projected surplus or deficit."),
    solvencyScore: z.number().describe("1-100 scale of institutional financial health."),
  }),
  projections: z.object({
    revenue: z.object({
      breakdown: z.array(z.object({ month: z.string(), amount: z.number(), confidence: z.number() })),
    }),
    expenses: z.object({
      primaryCostDrivers: z.array(z.string()),
      breakdown: z.array(z.object({ month: z.string(), amount: z.number() })),
    }),
  }),
  paymentTrends: z.array(z.object({
    trend: z.string().describe("e.g. 'Early payments increasing'"),
    impact: z.enum(["Positive", "Neutral", "Negative"]),
    description: z.string(),
  })),
  strategicPlan: z.object({
    budgetPriorities: z.array(z.string()),
    costSavingOpportunities: z.array(z.string()),
    collectionStrategies: z.array(z.string()).describe("Specific steps to reduce outstanding balances."),
  }),
});
export type GenerateFinancialForecastOutput = z.infer<typeof GenerateFinancialForecastOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateFinancialForecastPrompt',
  model: GEMINI_MODEL,
  input: {schema: GenerateFinancialForecastInputSchema},
  output: {schema: GenerateFinancialForecastOutputSchema},
  prompt: `You are a specialized Strategic CFO for educational institutions in Ghana.
Analyze the school's ledger and provide a deep strategic forecast for GH₵ (Ghana Cedis).

DATA CONTEXT:
Revenue History: {{{revenueHistory}}}
Expense History: {{{expenseHistory}}}
Current Outstanding Balances: GH₵{{{outstandingBalances}}}
Period: {{{forecastPeriod}}}

INSTRUCTIONS:
1. FEE PREDICTION: Estimate the 'expectedIncome' based on historical payment regularity.
2. OUTSTANDING RISK: Analyze how much of the current GH₵{{{outstandingBalances}}} is likely to remain unpaid based on trends.
3. CASH FLOW: Project the monthly 'netCashFlow' (Revenue - Expenses).
4. TRENDS: Identify 'paymentBehaviorTrends' (e.g., "Parents pay 40% in first month").
5. STRATEGY: Provide 'collectionStrategies' to minimize the 'outstandingRisk'.

Deliver a professional, data-driven financial blueprint.`,
});

const generateFinancialForecastFlow = ai.defineFlow(
  {
    name: 'generateFinancialForecastFlow',
    inputSchema: GenerateFinancialForecastInputSchema,
    outputSchema: GenerateFinancialForecastOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);

export async function generateFinancialForecast(input: GenerateFinancialForecastInput): Promise<GenerateFinancialForecastOutput> {
  return generateFinancialForecastFlow(input);
}
