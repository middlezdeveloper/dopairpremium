import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const AI_CONFIG = {
  model: 'gpt-3.5-turbo', // Start cheap, upgrade to gpt-4 later
  temperature: 0.7,
  maxTokens: 500,
  maxConversationHistory: 5, // Last 5 messages for context
};

export const COACH_PERSONAS = {
  'dr-chen': {
    name: 'Dr. Chen',
    description: 'Evidence-based CBT specialist',
    tone: 'Professional yet warm',
    expertise: 'Cognitive Behavioral Therapy, Digital Wellness',
  },
  'luna': {
    name: 'Luna',
    description: 'Mindful and gentle coach',
    tone: 'Gentle, nurturing, mindful',
    expertise: 'Mindfulness, Emotional Regulation, Anxiety Management',
  },
  'marcus': {
    name: 'Marcus',
    description: 'Direct accountability coach',
    tone: 'Direct, structured, accountability-focused',
    expertise: 'Habit Formation, Goal Setting, Behavioral Change',
  },
} as const;

export type CoachPersona = keyof typeof COACH_PERSONAS;