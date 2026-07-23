'use server';
/**
 * @fileOverview AI Timetable Optimization Flow.
 * 
 * - optimizeTimetable - An agentic flow that constructs a conflict-free school timetable.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { GEMINI_MODEL } from '@/lib/ai-config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';

const TimetableInputSchema = z.object({
  institutionId: z.string(),
  classId: z.string(),
  gradeName: z.string(),
  context: z.string().optional().describe("Additional constraints like 'No math after 2pm'"),
});

const TimetableSlotSchema = z.object({
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
  time: z.string().describe("e.g. 08:00 AM - 09:00 AM"),
  subject: z.string(),
  teacher: z.string(),
  isDoublePeriod: z.boolean().default(false),
});

const TimetableOutputSchema = z.object({
  schedule: z.array(TimetableSlotSchema),
  optimizationReport: z.object({
    totalHours: z.number(),
    workloadBalance: z.string().describe("Narrative on teacher workload distribution."),
    conflictStatus: z.string().describe("Confirmation of zero overlaps."),
  }),
});

export type TimetableInput = z.infer<typeof TimetableInputSchema>;
export type TimetableOutput = z.infer<typeof TimetableOutputSchema>;

// Tools for the Scheduler Agent
const getAcademicLoadTool = ai.defineTool(
  {
    name: 'getAcademicLoad',
    description: 'Fetch all teacher assignments and subject requirements for this class.',
    inputSchema: z.object({ institutionId: z.string(), classId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const q = query(collection(db, "teacher_assignments"), where("tenantId", "==", input.institutionId), where("classId", "==", input.classId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  }
);

const getSubjectsRegistryTool = ai.defineTool(
  {
    name: 'getSubjectsRegistry',
    description: 'Fetch subject metadata including recommended periods per week.',
    inputSchema: z.object({ institutionId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const q = query(collection(db, "subjects"), where("tenantId", "==", input.institutionId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  }
);

const timetablePrompt = ai.definePrompt({
  name: 'timetablePrompt',
  model: GEMINI_MODEL,
  tools: [getAcademicLoadTool, getSubjectsRegistryTool],
  input: { schema: TimetableInputSchema },
  output: { schema: TimetableOutputSchema },
  prompt: `You are the AI Timetable Architect for a school in Ghana.
Your goal is to generate a professional, optimized weekly timetable for the class: {{{gradeName}}}.

INSTITUTION ID: {{{institutionId}}}
CLASS ID: {{{classId}}}
USER CONTEXT: {{{context}}}

OPTIMIZATION CONSTRAINTS:
1. PERIODS: Each school day starts at 08:00 AM and ends at 03:00 PM. 
2. DURATION: Periods are 60 minutes. 
3. BREAK: Schedule a 'Morning Break' at 10:00 AM and 'Lunch' at 12:00 PM.
4. SUBJECTS: Use the assignments tool to see which subjects and teachers are linked.
5. WORKLOAD: Do not assign more than 3 consecutive periods to a single teacher across the week if possible.
6. DOUBLE PERIODS: For Core subjects (Math, Science), try to schedule one double period (2 hours) per week.
7. TONE: Professional and pedagogical.

Ensure the final JSON output contains a complete 'schedule' for Monday through Friday.`,
});

export async function optimizeTimetable(input: TimetableInput): Promise<TimetableOutput> {
  const { output } = await timetablePrompt(input);
  return output!;
}
