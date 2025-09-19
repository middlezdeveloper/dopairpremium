import { NextRequest, NextResponse } from 'next/server';
import { AICoach } from '@/lib/ai/coach';
import { CoachingContext } from '@/lib/ai/prompt-builder';
import { ConversationManager } from '@/lib/firebase-shared/conversations';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-shared/config';
import { COLLECTIONS, UserProfile, Assessment } from '@/lib/firebase-shared/collections';

export async function POST(request: NextRequest) {
  try {
    const { message, userId } = await request.json();

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: message, userId' },
        { status: 400 }
      );
    }

    // TODO: Verify Firebase ID token for authentication
    // For now, we'll trust the userId (implement proper auth later)

    // Get user profile and subscription
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userProfile = userDoc.data() as UserProfile;

    // Check subscription access
    const conversationManager = new ConversationManager();
    const limitCheck = await conversationManager.checkMessageLimits(
      userId,
      userProfile.subscription?.tier || 'free'
    );

    if (!limitCheck.canSendMessage) {
      return NextResponse.json(
        {
          error: limitCheck.reason,
          usage: limitCheck.usage,
          upgradeRequired: true
        },
        { status: 403 }
      );
    }

    // Get user's assessment data
    let assessment: Assessment | undefined;
    if (userProfile.assessmentId) {
      const assessmentDoc = await getDoc(doc(db, COLLECTIONS.ASSESSMENTS, userProfile.assessmentId));
      if (assessmentDoc.exists()) {
        assessment = { id: assessmentDoc.id, ...assessmentDoc.data() } as Assessment;
      }
    }

    // Get recent conversation history
    const conversationHistory = await conversationManager.getRecentMessages(userId, 5);

    // Calculate current week
    const coach = new AICoach();
    const currentWeek = userProfile.createdAt
      ? coach.calculateCurrentWeek(userProfile.createdAt.toDate())
      : 1;

    // Select best persona for user
    const persona = coach.selectPersonaForUser(assessment) as any;

    // Build coaching context
    const context: CoachingContext = {
      userProfile,
      assessment,
      currentWeek,
      conversationHistory,
      persona,
    };

    // Generate AI response
    const response = await coach.generateResponse(message, context, conversationHistory);

    // Save conversation to Firebase
    await conversationManager.saveMessage(
      userId,
      message,
      response.message,
      {
        emotionalState: response.emotionalState,
        tokens: response.metadata.tokensUsed,
        persona: response.metadata.persona,
        week: currentWeek,
      }
    );

    // Return response
    return NextResponse.json({
      message: response.message,
      metadata: {
        ...response.metadata,
        emotionalState: response.emotionalState,
        requiresCrisisIntervention: response.requiresCrisisIntervention,
        usage: limitCheck.usage,
      }
    });

  } catch (error) {
    console.error('Coach chat API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process message',
        fallbackMessage: "I'm having trouble processing your message right now. Please try again in a moment. If you're in crisis, please call 988 for immediate support."
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve conversation history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // TODO: Verify user authentication

    const conversationManager = new ConversationManager();
    const messages = await conversationManager.getRecentMessages(userId, limit);
    const metadata = await conversationManager.getConversationMetadata(userId);

    return NextResponse.json({
      messages,
      metadata,
    });

  } catch (error) {
    console.error('Error retrieving conversation:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve conversation' },
      { status: 500 }
    );
  }
}