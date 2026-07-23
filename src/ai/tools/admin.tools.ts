import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { academicService } from '@/ai/services/academic.service';
import { financeService } from '@/ai/services/finance.service';
import { BaseAIService } from '@/ai/services/base.service';
import { db } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const getStudentPerformanceTool = ai.defineTool(
  {
    name: 'getStudentPerformance',
    description: 'Fetch student academic records and scores for analysis.',
    inputSchema: z.object({ institutionId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => academicService.getStudentPerformance(input.institutionId)
);

export const getFinancialDefaultsTool = ai.defineTool(
  {
    name: 'getFinancialDefaults',
    description: 'Fetch outstanding balances and invoice statuses.',
    inputSchema: z.object({ institutionId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => financeService.getUnpaidInvoices(input.institutionId)
);

export const getStaffRegistryTool = ai.defineTool(
  {
    name: 'getStaffRegistry',
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
