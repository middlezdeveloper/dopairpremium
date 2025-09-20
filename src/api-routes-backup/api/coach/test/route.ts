import { NextRequest, NextResponse } from 'next/server';
import { AICoach } from '@/lib/ai/coach';
import { CoachingContext } from '@/lib/ai/prompt-builder';

export async function POST(request: NextRequest) {
  try {
    const { message, userType = 'impulsive' } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Missing message field' },
        { status: 400 }
      );
    }

    // Mock user profiles for testing (no Firebase needed)
    const mockProfiles = {
      impulsive: {
        userProfile: {
          uid: 'test-user-impulsive',
          email: 'test@example.com',
          subscription: { tier: 'recovery', status: 'active' },
          createdAt: new Date(),
          lastActive: new Date(),
        },
        assessment: {
          id: 'test-assessment-impulsive',
          ddasScores: { impulsive: 8, compulsive: 4, total: 12 },
          addictionPathway: 'impulsive',
          responses: {},
          timestamp: new Date(),
          completedAnonymously: false,
        },
        currentWeek: 3,
        conversationHistory: [],
        persona: 'marcus' as const,
      },
      anxious: {
        userProfile: {
          uid: 'test-user-anxious',
          email: 'test@example.com',
          subscription: { tier: 'recovery', status: 'active' },
          createdAt: new Date(),
          lastActive: new Date(),
        },
        assessment: {
          id: 'test-assessment-anxious',
          ddasScores: { impulsive: 3, compulsive: 9, total: 12 },
          addictionPathway: 'compulsive',
          responses: {},
          timestamp: new Date(),
          completedAnonymously: false,
        },
        currentWeek: 2,
        conversationHistory: [],
        persona: 'luna' as const,
      },
      balanced: {
        userProfile: {
          uid: 'test-user-balanced',
          email: 'test@example.com',
          subscription: { tier: 'recovery', status: 'active' },
          createdAt: new Date(),
          lastActive: new Date(),
        },
        assessment: {
          id: 'test-assessment-balanced',
          ddasScores: { impulsive: 6, compulsive: 6, total: 12 },
          addictionPathway: 'mixed',
          responses: {},
          timestamp: new Date(),
          completedAnonymously: false,
        },
        currentWeek: 4,
        conversationHistory: [],
        persona: 'dr-chen' as const,
      },
    };

    // Get the test profile
    const context = mockProfiles[userType as keyof typeof mockProfiles] || mockProfiles.impulsive;

    // Generate AI response
    const coach = new AICoach();
    const response = await coach.generateResponse(message, context as CoachingContext, []);

    return NextResponse.json({
      message: response.message,
      metadata: {
        ...response.metadata,
        emotionalState: response.emotionalState,
        requiresCrisisIntervention: response.requiresCrisisIntervention,
        testProfile: userType,
        expectedPersona: context.persona,
      },
      testInfo: {
        userType,
        pathway: context.assessment.addictionPathway,
        persona: context.persona,
        week: context.currentWeek,
      }
    });

  } catch (error) {
    console.error('AI Coach test error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallbackMessage: "I'm having trouble processing your message right now. Please try again in a moment."
      },
      { status: 500 }
    );
  }
}