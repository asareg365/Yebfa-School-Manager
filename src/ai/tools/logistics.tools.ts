import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { logisticsService } from '@/ai/services/logistics.service';

/**
 * @fileOverview Reusable Tools for Library, Transport, and Hostel AI modules.
 */

export const getLibraryCatalogTool = ai.defineTool(
  {
    name: 'getLibraryCatalog',
    description: 'Fetch book titles, availability, and shelf locations.',
    inputSchema: z.object({ institutionId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => logisticsService.getLibraryCatalog(input.institutionId)
);

export const getTransportFleetTool = ai.defineTool(
  {
    name: 'getTransportFleet',
    description: 'Fetch vehicle registry, routes, and capacity details.',
    inputSchema: z.object({ institutionId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => logisticsService.getTransportFleet(input.institutionId)
);
