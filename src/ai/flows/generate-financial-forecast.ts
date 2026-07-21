'use server';
/**
 * @fileOverview A highly detailed financial forecasting AI agent.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { GEMINI_MODEL } from '@/lib/ai-config';

const GenerateFinancialForecastInputSchema = z.object({
  revenueHistory: z.array(z.object({
    date: z.string(),
    amount: z.number(),
  })),
  expenseHistory: z.array(z.object({
    date: z.string(),
    amount: z.number(),
  })),
  forecastPeriod: z.string(),
});
export type GenerateFinancialForecastInput = z.infer<typeof GenerateFinancialForecastInputSchema>;

const GenerateFinancialForecastOutputSchema = z.object({
  analysis: z.object({
    historicalSummary: z.string(),
    growthTrends: z.array(z.string()),
    liquidityScore: z.number().describe("Scale 1-100"),
  }),
  projections: z.object({
    revenue: z.object({
      total: z.number(),
      confidenceInterval: z.string(),
      breakdown: z.array(z.object({ month: z.string(), amount: z.number() })),
    }),
    expenses: z.object({
      total: z.number(),
      primaryCostDrivers: z.array(z.string()),
      breakdown: z.array(z.object({ month: z.string(), amount: z.number() })),
    }),
  }),
  strategicPlan: z.object({
    budgetPriorities: z.array(z.string()),
    costSavingOpportunities: z.array(z.string()),
    riskMitigation: z.array(z.string()),
  }),
});
export type GenerateFinancialForecastOutput = z.infer<typeof GenerateFinancialForecastOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateFinancialForecastPrompt',
  model: GEMINI_MODEL,
  input: {schema: GenerateFinancialForecastInputSchema},
  output: {schema: GenerateFinancialForecastOutputSchema},
  prompt: `You are a specialized CFO for educational institutions in Ghana.
Analyze the school's ledger and provide a deep strategic forecast for GH₵ (Ghana Cedis).

Period: {{{forecastPeriod}}}

1. Evaluate historical performance and growth trends.
2. Project precise monthly revenue and expenses.
3. Identify 'primaryCostDrivers'.
4. Calculate a 'liquidityScore' (1-100).
5. Provide actionable 'budgetPriorities' and 'riskMitigation' strategies.

Deliver a highly professional and structured financial blueprint.`,
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
