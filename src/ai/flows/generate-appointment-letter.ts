'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MODELS } from '@/ai/models';
import { wrapAIError } from '@/ai/errors';

const GenerateAppointmentLetterInputSchema = z.object({
  staffName: z.string(),
  role: z.string(),
  department: z.string(),
  institutionName: z.string(),
  joiningDate: z.string(),
});

const GenerateAppointmentLetterOutputSchema = z.object({
  letterContent: z.string(),
});

export type GenerateAppointmentLetterInput = z.infer<typeof GenerateAppointmentLetterInputSchema>;
export type GenerateAppointmentLetterOutput = z.infer<typeof GenerateAppointmentLetterOutputSchema>;

const prompt = ai.definePrompt({
  name: 'appointmentLetterPrompt',
  model: MODELS.REPORTS,
  input: { schema: GenerateAppointmentLetterInputSchema },
  output: { schema: GenerateAppointmentLetterOutputSchema },
  prompt: `Write a formal appointment letter for {{{staffName}}} as {{{role}}} in the {{{department}}} department at {{{institutionName}}}, starting {{{joiningDate}}}. Tone: Formal and welcoming.`,
});

export async function generateAppointmentLetter(input: GenerateAppointmentLetterInput): Promise<GenerateAppointmentLetterOutput> {
  try {
    const { output } = await prompt(input);
    return output!;
  } catch (error) {
    throw wrapAIError(error);
  }
}
