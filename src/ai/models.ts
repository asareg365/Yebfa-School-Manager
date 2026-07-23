/**
 * @fileOverview Centralized AI Model Registry.
 * Every AI feature should reference models from here.
 * No hardcoded 'googleai/' or 'vertexai/' strings should exist outside this file.
 */

export const MODELS = {
  // Fast everyday model
  FAST: "vertexai/gemini-1.5-flash",

  // Highest reasoning model
  SMART: "vertexai/gemini-1.5-pro",

  // Administrator Assistant
  ADMIN: "vertexai/gemini-1.5-flash",

  // Student Reports
  REPORTS: "vertexai/gemini-1.5-flash",

  // Lesson Planning
  PLANNING: "vertexai/gemini-1.5-flash",

  // Analytics
  ANALYSIS: "vertexai/gemini-1.5-pro",

  // Image generation
  IMAGE: "vertexai/imagen-3.0-generate-001",

  // Video generation
  VIDEO: "vertexai/veo-2.0-generate-001",
} as const;

export type ModelType = typeof MODELS[keyof typeof MODELS];
