import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { academicService } from '@/ai/services/academic.service';

export const getAcademicLoadTool = ai.defineTool(
  {
    name: 'getAcademicLoad',
    description: 'Fetch all teacher assignments and subject requirements for this class and term.',
    inputSchema: z.object({ 
      institutionId: z.string(), 
      classId: z.string(),
      termId: z.string().optional()
    }),
    outputSchema: z.any(),
  },
  async (input) => academicService.getAssignments(input.institutionId, input.classId, input.termId)
);

export const getSubjectsRegistryTool = ai.defineTool(
  {
    name: 'getSubjectsRegistry',
    description: 'Fetch subject metadata including recommended periods per week.',
    inputSchema: z.object({ institutionId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => academicService.getSubjectRegistry(input.institutionId)
);
