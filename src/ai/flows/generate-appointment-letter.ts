'use server';
/**
 * @fileOverview A flow to generate professional staff appointment letters.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAppointmentLetterInputSchema = z.object({
  staffName: z.string(),
  role: z.string(),
  department: z.string(),
  institutionName: z.string(),
  joiningDate: z.string(),
});
export type GenerateAppointmentLetterInput = z.infer<typeof GenerateAppointmentLetterInputSchema>;

const GenerateAppointmentLetterOutputSchema = z.object({
  letterContent: z.string().describe("The full text of the appointment letter."),
});
export type GenerateAppointmentLetterOutput = z.infer<typeof GenerateAppointmentLetterOutputSchema>;

export async function generateAppointmentLetter(input: GenerateAppointmentLetterInput): Promise<GenerateAppointmentLetterOutput> {
  return generateAppointmentLetterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAppointmentLetterPrompt',
  input: {schema: GenerateAppointmentLetterInputSchema},
  output: {schema: GenerateAppointmentLetterOutputSchema},
  prompt: `You are a professional HR manager for an educational institution in Ghana.
Write a formal and supportive appointment letter for the following staff member.

Institution: {{{institutionName}}}
Staff Name: {{{staffName}}}
Position: {{{role}}}
Department: {{{department}}}
Start Date: {{{joiningDate}}}

The letter should include:
1. Formal salutation.
2. Statement of appointment.
3. Brief mention of duties in the {{{department}}} department.
4. Welcome message.
5. Placeholder for terms and conditions.

Tone: Formal, welcoming, and professional.`,
});

const generateAppointmentLetterFlow = ai.defineFlow(
  {
    name: 'generateAppointmentLetterFlow',
    inputSchema: GenerateAppointmentLetterInputSchema,
    outputSchema: GenerateAppointmentLetterOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
