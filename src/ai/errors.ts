/**
 * @fileOverview Standardized AI Error Handling.
 */

export interface AISystemError {
  code: string;
  message: string;
  type: 'QUOTA' | 'SAFETY' | 'AUTH' | 'NETWORK' | 'UNKNOWN';
}

export function wrapAIError(error: any): AISystemError {
  const msg = error?.message || 'An unexpected AI error occurred.';
  
  if (msg.includes('429') || msg.includes('quota')) {
    return { code: 'AI_429', message: 'Quota exceeded. Please try again in a moment.', type: 'QUOTA' };
  }
  
  if (msg.includes('SAFETY') || msg.includes('blocked')) {
    return { code: 'AI_SAFETY', message: 'The request was blocked by safety filters.', type: 'SAFETY' };
  }
  
  if (msg.includes('403') || msg.includes('permission')) {
    return { code: 'AI_403', message: 'Authentication failure. Check API configuration.', type: 'AUTH' };
  }

  if (msg.includes('404')) {
    return { code: 'AI_404', message: 'AI model or resource not found.', type: 'UNKNOWN' };
  }

  return { code: 'AI_500', message: msg, type: 'UNKNOWN' };
}
