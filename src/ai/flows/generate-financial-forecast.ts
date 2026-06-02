'use server';
/**
 * @fileOverview A financial forecasting AI agent for Yebfa School Manager.
 *
 * - generateFinancialForecast - A function that handles the financial forecasting process.
 * - GenerateFinancialForecastInput - The input type for the generateFinancialForecast function.
 * - GenerateFinancialForecastOutput - The return type for the generateFinancialForecast function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFinancialForecastInputSchema = z.object({
  revenueHistory: z
    .array(
      z.object({
        date: z
          .string()
          .describe('Date of revenue entry in YYYY-MM-DD format.'),
        amount: z.number().describe('Revenue amount for the given date.'),
      })
    )
    .describe('Historical revenue data.'),
  expenseHistory: z
    .array(
      z.object({
        date: z
          .string()
          .describe('Date of expense entry in YYYY-MM-DD format.'),
        amount: z.number().describe('Expense amount for the given date.'),
      })
    )
    .describe('Historical expense data.'),
  forecastPeriod: z
    .string()
    .describe(
      'The period for which to generate the forecast, e.g., "next quarter", "next year", "next 6 months".'
    ),
});
export type GenerateFinancialForecastInput = z.infer<
  typeof GenerateFinancialForecastInputSchema
>;

const GenerateFinancialForecastOutputSchema = z.object({
  overallAnalysis: z
    .string()
    .describe(
      "A general summary of the school's financial situation and trends based on the provided data."
    ),
  revenueProjection: z
    .object({
      period: z
        .string()
        .describe('The forecasted period, e.g., "next quarter" or "next year".'),
      projectedTotal: z
        .number()
        .describe('Projected total revenue for the entire forecast period.'),
      breakdown: z
        .array(
          z.object({
            month: z
              .string()
              .describe('Month in the forecasted period, e.g., "2024-07".'),
            projectedAmount: z
              .number()
              .describe('Projected revenue for that specific month.'),
          })
        )
        .describe('Detailed monthly revenue projections within the period.'),
    })
    .describe('Detailed revenue projections.'),
  expenseProjection: z
    .object({
      period: z
        .string()
        .describe('The forecasted period, e.g., "next quarter" or "next year".'),
      projectedTotal: z
        .number()
        .describe('Projected total expenses for the entire forecast period.'),
      breakdown: z
        .array(
          z.object({
            month: z
              .string()
              .describe('Month in the forecasted period, e.g., "2024-07".'),
            projectedAmount: z
              .number()
              .describe('Projected expense for that specific month.'),
          })
        )
        .describe('Detailed monthly expense projections within the period.'),
    })
    .describe('Detailed expense projections.'),
  budgetRecommendations: z
    .array(z.string())
    .describe('Actionable recommendations for school budgeting based on the forecast.'),
  riskFactors: z
    .array(z.string())
    .describe('Identified potential financial risks and challenges.'),
});
export type GenerateFinancialForecastOutput = z.infer<
  typeof GenerateFinancialForecastOutputSchema
>;

export async function generateFinancialForecast(
  input: GenerateFinancialForecastInput
): Promise<GenerateFinancialForecastOutput> {
  return generateFinancialForecastFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFinancialForecastPrompt',
  input: {schema: GenerateFinancialForecastInputSchema},
  output: {schema: GenerateFinancialForecastOutputSchema},
  prompt: `You are an expert financial analyst specializing in educational institutions.
Your task is to analyze the provided historical revenue and expense data for Yebfa School Manager and provide a detailed financial forecast and actionable budgeting recommendations for the {{{forecastPeriod}}}.

Here is the historical revenue data:
{{#if revenueHistory}}
{{#each revenueHistory}}
- Date: {{{date}}}, Amount: {{{amount}}}
{{/each}}
{{else}}
No revenue history provided.
{{/if}}

Here is the historical expense data:
{{#if expenseHistory}}
{{#each expenseHistory}}
- Date: {{{date}}}, Amount: {{{amount}}}
{{/each}}
{{else}}
No expense history provided.
{{/if}}

Based on this data, provide:
1.  An overall analysis of the school's financial trends and health.
2.  Projected revenue for the {{{forecastPeriod}}}, including a total and a monthly breakdown.
3.  Projected expenses for the {{{forecastPeriod}}}, including a total and a monthly breakdown.
4.  Actionable budgeting recommendations.
5.  Any identified potential financial risks.

Ensure your output strictly adheres to the JSON schema provided, including all specified fields and their expected data types and formats. For monthly breakdowns, use 'YYYY-MM' format for months.
`,
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
