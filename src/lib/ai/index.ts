// Main AI module exports
export { AICoach } from './coach';
export { buildSystemPrompt, detectEmotionalState } from './prompt-builder';
export { openai, AI_CONFIG, COACH_PERSONAS } from './config';
export type { CoachMessage, CoachResponse } from './coach';
export type { CoachingContext } from './prompt-builder';
export type { CoachPersona } from './config';