import { AICoach } from './coach';
import { CoachingContext } from './prompt-builder';

// Test function to validate AI coach functionality
export async function testAICoach() {
  const coach = new AICoach();

  // Mock user profile for testing
  const mockContext: CoachingContext = {
    userProfile: {
      uid: 'test-user',
      email: 'test@example.com',
      subscription: { tier: 'recovery', status: 'active' },
      createdAt: new Date(),
      lastActive: new Date(),
    },
    assessment: {
      id: 'test-assessment',
      ddasScores: {
        impulsive: 8,
        compulsive: 4,
        total: 12,
      },
      addictionPathway: 'impulsive',
      responses: {},
      timestamp: new Date(),
      completedAnonymously: false,
    },
    currentWeek: 3,
    conversationHistory: [],
    persona: 'dr-chen',
  };

  try {
    console.log('Testing AI Coach with impulsive pathway user...');

    const response = await coach.generateResponse(
      "I'm struggling with impulse control today. I keep reaching for my phone even when I don't mean to.",
      mockContext
    );

    console.log('AI Coach Response:');
    console.log('Message:', response.message);
    console.log('Emotional State:', response.emotionalState);
    console.log('Metadata:', response.metadata);
    console.log('Crisis Intervention Needed:', response.requiresCrisisIntervention);

    return response;
  } catch (error) {
    console.error('AI Coach test failed:', error);
    throw error;
  }
}

// Test crisis detection
export async function testCrisisDetection() {
  const coach = new AICoach();

  const mockContext: CoachingContext = {
    userProfile: {
      uid: 'test-user',
      email: 'test@example.com',
      subscription: { tier: 'recovery', status: 'active' },
      createdAt: new Date(),
      lastActive: new Date(),
    },
    currentWeek: 1,
    conversationHistory: [],
    persona: 'luna',
  };

  try {
    console.log('Testing crisis detection...');

    const response = await coach.generateResponse(
      "I can't take this anymore. I'm thinking about ending it all.",
      mockContext
    );

    console.log('Crisis Response:');
    console.log('Message:', response.message);
    console.log('Crisis Intervention Needed:', response.requiresCrisisIntervention);

    return response;
  } catch (error) {
    console.error('Crisis detection test failed:', error);
    throw error;
  }
}

// Test different personality types
export async function testPersonalityAdaptation() {
  const coach = new AICoach();

  const anxiousUserContext: CoachingContext = {
    userProfile: {
      uid: 'anxious-user',
      email: 'anxious@example.com',
      subscription: { tier: 'recovery', status: 'active' },
      createdAt: new Date(),
      lastActive: new Date(),
    },
    assessment: {
      id: 'anxious-assessment',
      ddasScores: {
        impulsive: 3,
        compulsive: 9,
        total: 12,
      },
      addictionPathway: 'compulsive',
      responses: {},
      timestamp: new Date(),
      completedAnonymously: false,
    },
    currentWeek: 2,
    conversationHistory: [],
    persona: 'luna',
  };

  try {
    console.log('Testing personality adaptation for anxious user...');

    const response = await coach.generateResponse(
      "I'm feeling really anxious and keep checking my phone for reassurance.",
      anxiousUserContext
    );

    console.log('Anxious User Response:');
    console.log('Message:', response.message);
    console.log('Emotional State:', response.emotionalState);
    console.log('Pathway Focus:', response.metadata.pathwayFocus);

    return response;
  } catch (error) {
    console.error('Personality adaptation test failed:', error);
    throw error;
  }
}