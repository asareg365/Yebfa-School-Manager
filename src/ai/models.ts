/**
 * @fileOverview Centralized AI Model Registry.
 * Every AI feature should reference models from here.
 */

export const MODELS = {
  // Fast everyday model
  FAST: "googleai/gemini-1.5-flash",

  // Highest reasoning model
  SMART: "googleai/gemini-1.5-pro",

  // Administrator Assistant
  ADMIN: "googleai/gemini-1.5-flash",

  // Student Reports
  REPORTS: "googleai/gemini-1.5-flash",

  // Lesson Planning
  PLANNING: "googleai/gemini-1.5-flash",

  // Analytics
  ANALYSIS: "googleai/gemini-1.5-pro",

  // Image generation
  IMAGE: "googleai/imagen-3.0-generate-001",

  // Video generation
  VIDEO: "googleai/veo-2.0-generate-001",
} as const;

export type ModelType = typeof MODELS[keyof typeof MODELS];