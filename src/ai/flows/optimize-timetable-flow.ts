'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MODELS } from '@/ai/models';
import { PROMPTS } from '@/ai/prompts';
import { wrapAIError } from '@/ai/errors';
import { getAcademicLoadTool, getSubjectsRegistryTool } from '@/ai/tools/timetable.tools';
import { db } from '@/firebase/core';
import { doc, getDoc } from 'firebase/firestore';

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
  input: { schema: TimetableInputSchema.extend({
    slots: z.string(),
    breaks: z.string()
  }) },
  output: { schema: TimetableOutputSchema },
  prompt: PROMPTS.TIMETABLE_OPTIMIZE,
});

export async function optimizeTimetable(input: TimetableInput): Promise<TimetableOutput> {
  try {
    // Fetch Dynamic Configuration
    const instRef = doc(db, "institutions", input.institutionId);
    const instSnap = await getDoc(instRef);
    const instData = instSnap.data();
    
    const config = instData?.timetableConfig || {
      slots: ["08:00 AM", "09:00 AM", "10:00 AM", "10:30 AM", "11:30 AM", "12:30 PM", "01:30 PM", "02:30 PM"],
      breaks: {
        "10:00 AM": { label: "Short Break" },
        "12:30 PM": { label: "Lunch Break" }
      }
    };

    const slotsStr = config.slots.join(", ");
    const breaksStr = Object.entries(config.breaks || {})
      .map(([time, b]: any) => `${time}: ${b.label}`)
      .join("; ");

    const { output } = await prompt({
      ...input,
      slots: slotsStr,
      breaks: breaksStr
    });
    
    return output!;
  } catch (error) {
    console.error("Timetable Optimization Error:", error);
    throw wrapAIError(error);
  }
}
