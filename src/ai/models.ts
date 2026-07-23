/**
 * @fileOverview Centralized AI Model Registry.
 *
 * Update these constants to switch models across the entire application.
 */

export const MODELS = {
  // Primary general-purpose models
  FAST: 'googleai/gemini-2.5-flash',
  SMART: 'googleai/gemini-2.0-pro-exp-02-05',
  
  // Task-specific aliases
  ADMIN: 'googleai/gemini-2.0-flash-exp',
  REPORTS: 'googleai/gemini-2.5-flash',
  PLANNING: 'googleai/gemini-2.5-flash',
  ANALYSIS: 'googleai/gemini-2.0-pro-exp-02-05',
  
  // Media models
  VIDEO: 'vertexai/veo-2.0-generate-001',
  IMAGE: 'googleai/imagen-4.0-fast-generate-001',
} as const;

export type ModelType = typeof MODELS[keyof typeof MODELS];
