import { openai, AI_CONFIG } from './config';
import { buildSystemPrompt, detectEmotionalState, CoachingContext } from './prompt-builder';

export interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotionalState?: string;
  tokens?: number;
}

export interface CoachResponse {
  message: string;
  emotionalState: string;
  metadata: {
    week: number;
    sessionCount: number;
    persona: string;
    pathwayFocus: string;
    tokensUsed: number;
  };
  requiresCrisisIntervention: boolean;
}

export class AICoach {
  async generateResponse(
    userMessage: string,
    context: CoachingContext,
    conversationHistory: CoachMessage[] = []
  ): Promise<CoachResponse> {
    try {
      // Detect emotional state and check for crisis
      const emotionalState = detectEmotionalState(userMessage);
      const requiresCrisisIntervention = emotionalState === 'crisis';

      // If crisis detected, return immediate crisis resources
      if (requiresCrisisIntervention) {
        return this.generateCrisisResponse(context, emotionalState);
      }

      // Build system prompt with full context
      const systemPrompt = buildSystemPrompt(context);

      // Prepare conversation history for OpenAI
      const messages = this.prepareMessages(systemPrompt, conversationHistory, userMessage);

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages,
        temperature: AI_CONFIG.temperature,
        max_tokens: AI_CONFIG.maxTokens,
      });

      const aiResponse = completion.choices[0].message.content;
      const tokensUsed = completion.usage?.total_tokens || 0;

      if (!aiResponse) {
        throw new Error('No response from AI model');
      }

      return {
        message: aiResponse,
        emotionalState,
        metadata: {
          week: context.currentWeek,
          sessionCount: conversationHistory.length,
          persona: context.persona,
          pathwayFocus: context.assessment?.addictionPathway || 'general',
          tokensUsed,
        },
        requiresCrisisIntervention: false,
      };

    } catch (error) {
      console.error('AI Coach error:', error);

      // Fallback response for errors
      return {
        message: "I'm having trouble processing your message right now. This sometimes happens, and it's not your fault. Please try again in a moment, or if you're in crisis, please reach out to a crisis helpline immediately (988 for suicide prevention).",
        emotionalState: 'neutral',
        metadata: {
          week: context.currentWeek,
          sessionCount: 0,
          persona: context.persona,
          pathwayFocus: 'general',
          tokensUsed: 0,
        },
        requiresCrisisIntervention: false,
      };
    }
  }

  private prepareMessages(
    systemPrompt: string,
    conversationHistory: CoachMessage[],
    currentMessage: string
  ) {
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add recent conversation history (limit to prevent token overflow)
    const recentHistory = conversationHistory.slice(-AI_CONFIG.maxConversationHistory);

    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: currentMessage
    });

    return messages;
  }

  private generateCrisisResponse(context: CoachingContext, emotionalState: string): CoachResponse {
    const crisisMessage = `
I'm very concerned about what you've shared. Your safety is the most important thing right now.

Please reach out for immediate support:
• **National Suicide Prevention Lifeline: 988** (available 24/7)
• **Crisis Text Line: Text HOME to 741741**
• **Emergency Services: 911**

You don't have to go through this alone. There are people trained to help you right now.

If you're not in immediate danger but need support, please consider reaching out to a mental health professional. I'm here to support your digital wellness journey, but for mental health crises, you need human professional support.

Would you like to talk about some grounding techniques to help you feel safer right now?
    `.trim();

    return {
      message: crisisMessage,
      emotionalState,
      metadata: {
        week: context.currentWeek,
        sessionCount: 0,
        persona: context.persona,
        pathwayFocus: 'crisis_intervention',
        tokensUsed: 0,
      },
      requiresCrisisIntervention: true,
    };
  }

  // Method to determine best persona for user
  selectPersonaForUser(assessment?: any): string {
    if (!assessment) return 'dr-chen';

    const { ddasScores } = assessment;

    // High anxiety/neuroticism - gentle approach
    if (ddasScores.compulsive > ddasScores.impulsive + 2) {
      return 'luna';
    }

    // Low self-control - structured approach
    if (ddasScores.impulsive > ddasScores.compulsive + 2) {
      return 'marcus';
    }

    // Default to evidence-based approach
    return 'dr-chen';
  }

  // Method to calculate current week based on start date
  calculateCurrentWeek(startDate: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return Math.min(diffWeeks, 12); // Cap at 12 weeks
  }
}