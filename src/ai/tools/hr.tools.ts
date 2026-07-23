import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { hrService } from '@/ai/services/hr.service';

/**
 * @fileOverview Reusable Tools for HR and Payroll AI modules.
 */

export const getStaffRegistryTool = ai.defineTool(
  {
    name: 'getStaffRegistry',
    description: 'Fetch complete staff database including roles and employment dates.',
    inputSchema: z.object({ institutionId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => hrService.getStaffRegistry(input.institutionId)
);

export const getPayrollSummaryTool = ai.defineTool(
  {
    name: 'getPayrollSummary',
    description: 'Fetch historical payroll disbursements and salary scales.',
    inputSchema: z.object({ institutionId: z.string(), staffId: z.string().optional() }),
    outputSchema: z.any(),
  },
  async (input) => hrService.getPayrollHistory(input.institutionId, input.staffId)
);
