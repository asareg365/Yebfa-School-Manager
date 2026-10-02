'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MODELS } from '@/ai/models';
import { PROMPTS } from '@/ai/prompts';
import { wrapAIError } from '@/ai/errors';

const GenerateFinancialForecastInputSchema = z.object({
  revenueHistory: z.array(z.object({
    date: z.string(),
    amount: z.number(),
    source: z.string().optional(),
  })),
  expenseHistory: z.array(z.object({
    date: z.string(),
    amount: z.number(),
  })),
  outstandingBalances: z.number().optional(),
  forecastPeriod: z.string().default("next 6 months"),
});

const GenerateFinancialForecastOutputSchema = z.object({
  treasurySummary: z.object({
    expectedIncome: z.number(),
    outstandingRisk: z.number(),
    netCashFlow: z.number(),
    solvencyScore: z.number(),
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
    trend: z.string(),
    impact: z.enum(["Positive", "Neutral", "Negative"]),
    description: z.string(),
  })),
  strategicPlan: z.object({
    budgetPriorities: z.array(z.string()),
    costSavingOpportunities: z.array(z.string()),
    collectionStrategies: z.array(z.string()),
  }),
});

export type GenerateFinancialForecastInput = z.infer<typeof GenerateFinancialForecastInputSchema>;
export type GenerateFinancialForecastOutput = z.infer<typeof GenerateFinancialForecastOutputSchema>;

const prompt = ai.definePrompt({
  name: 'financePrompt',
  model: MODELS.ANALYSIS,
  input: { schema: GenerateFinancialForecastInputSchema },
  output: { schema: GenerateFinancialForecastOutputSchema },
  prompt: PROMPTS.FINANCE_FORECAST,
});

export async function generateFinancialForecast(input: GenerateFinancialForecastInput): Promise<GenerateFinancialForecastOutput> {
  try {
    const { output } = await prompt(input);
    return output!;
  } catch (error) {
    throw wrapAIError(error);
  }
}
