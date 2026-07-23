'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MODELS } from '@/ai/models';
import { PROMPTS } from '@/ai/prompts';
import { wrapAIError } from '@/ai/errors';
import { getAcademicLoadTool, getSubjectsRegistryTool } from '@/ai/tools/timetable.tools';

const TimetableInputSchema = z.object({
  institutionId: z.string(),
  classId: z.string(),
  gradeName: z.string(),
  termId: z.string().optional().describe("The active term for which assignments should be pulled."),
  context: z.string().optional(),
});

const TimetableSlotSchema = z.object({
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
  time: z.string(),
  subject: z.string(),
  teacher: z.string(),
  subjectId: z.string().optional(),
  teacherId: z.string().optional(),
  isDoublePeriod: z.boolean().default(false),
});

const TimetableOutputSchema = z.object({
  schedule: z.array(TimetableSlotSchema),
  optimizationReport: z.object({
    totalHours: z.number(),
    workloadBalance: z.string(),
    conflictStatus: z.string(),
  }),
});

export type TimetableInput = z.infer<typeof TimetableInputSchema>;
export type TimetableOutput = z.infer<typeof TimetableOutputSchema>;

const prompt = ai.definePrompt({
  name: 'timetablePrompt',
  model: MODELS.PLANNING,
  tools: [getAcademicLoadTool, getSubjectsRegistryTool],
  input: { schema: TimetableInputSchema },
  output: { schema: TimetableOutputSchema },
  prompt: PROMPTS.TIMETABLE_OPTIMIZE,
});

export async function optimizeTimetable(input: TimetableInput): Promise<TimetableOutput> {
  try {
    const { output } = await prompt(input);
    return output!;
  } catch (error) {
    throw wrapAIError(error);
  }
}
