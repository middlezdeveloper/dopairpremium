import { Assessment, UserProfile } from '@/lib/firebase-shared/collections';
import { COACH_PERSONAS, CoachPersona } from './config';

export interface CoachingContext {
  userProfile: UserProfile;
  assessment?: Assessment;
  currentWeek: number;
  conversationHistory: any[];
  persona: CoachPersona;
}

export function buildSystemPrompt(context: CoachingContext): string {
  const { userProfile, assessment, currentWeek, persona } = context;
  const selectedPersona = COACH_PERSONAS[persona];

  const addictionPathway = assessment?.addictionPathway || 'general';
  const personalityType = determinePersonalityType(assessment);

  return `
You are ${selectedPersona.name}, a ${selectedPersona.description} working with users in the Dopair digital wellness program.

## Your Role & Expertise
- Specialty: ${selectedPersona.expertise}
- Communication Style: ${selectedPersona.tone}
- Approach: Evidence-based CBT techniques for digital addiction recovery

## User Profile
- Addiction Pathway: ${addictionPathway} (${getPathwayDescription(addictionPathway)})
- Personality Type: ${personalityType}
- Current Week: ${currentWeek} of 12
- Subscription: ${userProfile.subscription?.tier || 'free'}
- Assessment Completed: ${assessment ? 'Yes' : 'No'}

## Core Instructions
1. **Therapeutic Approach**: Use CBT techniques appropriate for their ${addictionPathway} pathway
2. **Communication**: Maintain a ${getToneForPersonality(personalityType)} tone
3. **Progress Awareness**: Reference their current week (${currentWeek}) and program goals
4. **Safety Protocol**: If user mentions suicide, self-harm, or severe mental health crisis, immediately provide crisis resources and recommend professional help
5. **Conciseness**: Keep responses to 2-3 paragraphs maximum
6. **Personalization**: Adapt your language and suggestions to their specific pathway and personality

## Week ${currentWeek} Focus
${getWeeklyFocus(currentWeek)}

## Key Pathway Strategies for ${addictionPathway}
${getPathwayStrategies(addictionPathway)}

## Crisis Resources (Use immediately if needed)
- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741
- Emergency Services: 911

Remember: You are a digital wellness coach, not a replacement for professional therapy. Always encourage users to seek additional professional support when appropriate.
  `.trim();
}

function determinePersonalityType(assessment?: Assessment): string {
  if (!assessment) return 'balanced';

  // Analyze DDAS scores to determine personality traits
  const { ddasScores } = assessment;

  if (ddasScores.compulsive > ddasScores.impulsive + 2) {
    return 'high_neuroticism'; // Anxiety-driven, needs gentle approach
  }

  if (ddasScores.impulsive > ddasScores.compulsive + 2) {
    return 'low_conscientiousness'; // Impulse control issues, needs structure
  }

  if (ddasScores.total > 15) {
    return 'high_openness'; // Willing to explore new solutions
  }

  return 'balanced';
}

function getPathwayDescription(pathway: string): string {
  const descriptions = {
    'impulsive': 'Struggles with poor self-control and emotion regulation. Benefits from mindfulness and impulse management techniques.',
    'compulsive': 'Anxiety-driven usage patterns. Needs stress management and emotional regulation tools.',
    'relationship': 'Uses technology for social connection. Benefits from offline social strategies and communication skills.',
    'extraversion': 'High stimulation seeking behavior. Needs exciting offline alternatives and gradual exposure reduction.',
    'mixed': 'Combination of multiple pathways. Requires comprehensive, adaptive approach.',
    'general': 'General digital dependency patterns.'
  };

  return descriptions[pathway] || descriptions.general;
}

function getToneForPersonality(personality: string): string {
  const tones = {
    'high_neuroticism': 'extra supportive, validating, and gentle',
    'low_conscientiousness': 'more structured with specific steps and accountability-focused',
    'high_extraversion': 'energetic, social, and collaborative',
    'high_openness': 'exploratory with creative solutions and philosophical insights',
    'balanced': 'balanced, supportive, and adaptive'
  };

  return tones[personality] || tones.balanced;
}

function getWeeklyFocus(week: number): string {
  const weeklyFocus = {
    1: 'Foundation building - Understanding your digital habits and setting initial goals',
    2: 'Awareness development - Tracking triggers and identifying patterns',
    3: 'Basic blocking strategies - Implementing your first protective measures',
    4: 'Mindfulness introduction - Learning to pause before digital engagement',
    5: 'Alternative activities - Building healthy offline habits and interests',
    6: 'Social support - Strengthening real-world relationships and connections',
    7: 'Stress management - Developing healthy coping mechanisms beyond screens',
    8: 'Routine optimization - Creating structured daily rhythms that support wellness',
    9: 'Challenge navigation - Handling setbacks and difficult situations',
    10: 'Identity exploration - Rediscovering who you are beyond digital consumption',
    11: 'Integration and planning - Preparing for long-term sustainable change',
    12: 'Graduation and maintenance - Transitioning to independent wellness management'
  };

  return weeklyFocus[week] || 'Continued growth and sustainable digital wellness practices';
}

function getPathwayStrategies(pathway: string): string {
  const strategies = {
    'impulsive': `
- Practice the 5-4-3-2-1 grounding technique when feeling urges
- Use immediate blocking for high-risk situations
- Develop mindfulness skills to create space between trigger and action
- Focus on emotional regulation and distress tolerance`,

    'compulsive': `
- Address underlying anxiety and stress through relaxation techniques
- Establish structured daily routines to reduce uncertainty
- Practice cognitive restructuring to challenge anxious thoughts
- Use scheduled "worry time" instead of constant digital checking`,

    'relationship': `
- Build offline social connections and communication skills
- Practice direct, in-person social interactions
- Develop self-soothing techniques for loneliness
- Create meaningful rituals for social connection that don't involve screens`,

    'extraversion': `
- Find exciting offline activities that provide stimulation
- Use gradual exposure to reduce digital stimulation needs
- Engage in physical activities and novel experiences
- Build tolerance for lower-stimulation environments`,

    'mixed': `
- Use a combination of strategies from multiple pathways
- Focus on the most prominent patterns first
- Adapt techniques based on current emotional state and triggers
- Maintain flexibility in approach while building core skills`,

    'general': `
- Build awareness of digital habits and triggers
- Develop healthy boundaries with technology
- Create meaningful offline activities and relationships
- Practice mindful technology use`
  };

  return strategies[pathway] || strategies.general;
}

export function detectEmotionalState(message: string): string {
  const lowerMessage = message.toLowerCase();

  // Crisis indicators
  if (lowerMessage.includes('suicide') || lowerMessage.includes('kill myself') ||
      lowerMessage.includes('end it all') || lowerMessage.includes('self-harm')) {
    return 'crisis';
  }

  // High distress
  if (lowerMessage.includes('overwhelming') || lowerMessage.includes('can\'t cope') ||
      lowerMessage.includes('breaking down') || lowerMessage.includes('panic')) {
    return 'high_distress';
  }

  // Anxiety/worry
  if (lowerMessage.includes('anxious') || lowerMessage.includes('worried') ||
      lowerMessage.includes('nervous') || lowerMessage.includes('stressed')) {
    return 'anxious';
  }

  // Sadness/depression
  if (lowerMessage.includes('depressed') || lowerMessage.includes('sad') ||
      lowerMessage.includes('hopeless') || lowerMessage.includes('empty')) {
    return 'sad';
  }

  // Frustration/anger
  if (lowerMessage.includes('frustrated') || lowerMessage.includes('angry') ||
      lowerMessage.includes('pissed') || lowerMessage.includes('annoyed')) {
    return 'frustrated';
  }

  // Positive emotions
  if (lowerMessage.includes('good') || lowerMessage.includes('better') ||
      lowerMessage.includes('happy') || lowerMessage.includes('proud')) {
    return 'positive';
  }

  // Neutral/questioning
  if (lowerMessage.includes('?') || lowerMessage.includes('how') ||
      lowerMessage.includes('what') || lowerMessage.includes('why')) {
    return 'curious';
  }

  return 'neutral';
}