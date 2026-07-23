'use server';
/**
 * @fileOverview AI School Administrator flow.
 * 
 * - administratorChat - An agentic flow that can query institutional data to provide strategic answers.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GEMINI_MODEL } from '@/lib/ai-config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';

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
  })).optional().describe("Specific records or metrics identified in the data."),
  recommendations: z.array(z.string()).describe("Strategic steps for the administrator to take."),
  visualHint: z.string().optional().describe("A hint for what kind of chart might be useful (e.g., 'bar chart of scores')."),
});

export type AdminQueryInput = z.infer<typeof AdminQueryInputSchema>;
export type AdminQueryOutput = z.infer<typeof AdminQueryOutputSchema>;

// Tools for the Administrator Agent
const getStudentPerformanceTool = ai.defineTool(
  {
    name: 'getStudentPerformance',
    description: 'Fetch student academic records and scores for analysis.',
    inputSchema: z.object({ institutionId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const q = query(collection(db, "exam_records"), where("tenantId", "==", input.institutionId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  }
);

const getFinancialDefaultsTool = ai.defineTool(
  {
    name: 'getFinancialDefaults',
    description: 'Fetch outstanding balances and invoice statuses.',
    inputSchema: z.object({ institutionId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const q = query(collection(db, "invoices"), where("tenantId", "==", input.institutionId), where("status", "!=", "Paid"));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  }
);

const getStaffAttendanceTool = ai.defineTool(
  {
    name: 'getStaffAttendance',
    description: 'Fetch staff details and presence logs.',
    inputSchema: z.object({ institutionId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const q = query(collection(db, "staff"), where("tenantId", "==", input.institutionId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  }
);

const administratorPrompt = ai.definePrompt({
  name: 'administratorPrompt',
  model: GEMINI_MODEL,
  tools: [getStudentPerformanceTool, getFinancialDefaultsTool, getStaffAttendanceTool],
  input: { schema: AdminQueryInputSchema },
  output: { schema: AdminQueryOutputSchema },
  prompt: `You are the AI Strategic Administrator for a school management system in Ghana.
Your goal is to answer the user's question by analyzing the institutional data you can access through your tools.

User Question: {{{question}}}
Institution ID: {{{institutionId}}}
Current Context: {{{context}}}

INSTRUCTIONS:
1. If the question is about failing students, check academic records and identify those with low average scores.
2. If the question is about finances, check the defaults and identify high balances.
3. If the question is about staff, check the staff registry.
4. Provide a professional, data-driven answer.
5. List specific students, parents, or staff members as 'dataHighlights' where applicable.
6. Provide 3-5 strategic 'recommendations'.

Be concise but thorough.`,
});

export async function administratorChat(input: AdminQueryInput): Promise<AdminQueryOutput> {
  const { output } = await administratorPrompt(input);
  return output!;
}
