'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MODELS } from '@/ai/models';
import { PROMPTS } from '@/ai/prompts';
import { wrapAIError } from '@/ai/errors';
import { getStudentPerformanceTool, getFinancialDefaultsTool, getStaffRegistryTool } from '@/ai/tools/admin.tools';

const AdminQueryInputSchema = z.object({
  institutionId: z.string(),
  question: z.string().describe("The administrator's natural language question about the school."),
  context: z.string().optional().describe("Additional context like current date or term."),
});

const AdminQueryOutputSchema = z.object({
  answer: z.string().describe("The AI's direct answer to the question."),
  dataHighlights: z.array(z.object({
    label: z.string(),
    value: z.string(),
    type: z.enum(["Student", "Staff", "Finance", "General"]),
  })).optional(),
  recommendations: z.array(z.string()),
  visualHint: z.string().optional(),
});

export type AdminQueryInput = z.infer<typeof AdminQueryInputSchema>;
export type AdminQueryOutput = z.infer<typeof AdminQueryOutputSchema>;

const prompt = ai.definePrompt({
  name: 'administratorPrompt',
  model: MODELS.ADMIN,
  tools: [getStudentPerformanceTool, getFinancialDefaultsTool, getStaffRegistryTool],
  input: { schema: AdminQueryInputSchema },
  output: { schema: AdminQueryOutputSchema },
  prompt: PROMPTS.ADMIN_STRATEGIC,
});

export async function administratorChat(input: AdminQueryInput): Promise<AdminQueryOutput> {
  try {
    const { output } = await prompt(input);
    return output!;
  } catch (error) {
    console.error("AI Admin Flow Error:", error);
    throw wrapAIError(error);
  }
}
