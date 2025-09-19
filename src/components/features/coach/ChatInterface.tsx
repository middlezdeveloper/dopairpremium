'use client';

import { useState, useEffect, useRef } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAssessment } from '@/hooks/useAssessment';
import { COACH_PERSONAS } from '@/lib/ai/config';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotionalState?: string;
  persona?: string;
  week?: number;
  requiresCrisisIntervention?: boolean;
}

interface ChatInterfaceProps {
  userId?: string; // For testing, will come from auth later
}

export function ChatInterface({ userId = 'test-user' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { subscription, currentTier, user } = useSubscription();
  const { assessment, needsAssessment } = useAssessment();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation history on mount
  useEffect(() => {
    loadConversationHistory();
  }, [userId]);

  // Add welcome message if first time
  useEffect(() => {
    if (messages.length === 0 && !loading) {
      addWelcomeMessage();
    }
  }, [assessment, messages.length, loading]);

  const loadConversationHistory = async () => {
    try {
      const response = await fetch(`/api/coach/chat?userId=${userId}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        const formattedMessages = data.messages.map((msg: any) => ({
          ...msg,
          id: msg.id || Date.now().toString(),
          timestamp: new Date(msg.timestamp?.seconds * 1000 || Date.now()),
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const addWelcomeMessage = () => {
    const persona = assessment ? getPersonaForAssessment(assessment) : 'dr-chen';
    const personaInfo = COACH_PERSONAS[persona as keyof typeof COACH_PERSONAS];

    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm ${personaInfo.name}, your ${personaInfo.description}. ${getPersonalizedWelcome()}`,
      timestamp: new Date(),
      persona,
    };

    setMessages([welcomeMessage]);
  };

  const getPersonalizedWelcome = () => {
    if (needsAssessment) {
      return "I'd love to help you on your digital wellness journey. To give you the best support, I recommend taking our DDAS assessment first. This helps me understand your unique patterns and provide personalized guidance. Would you like to start with some general questions about what brought you here today?";
    }

    if (assessment) {
      const { addictionPathway } = assessment;
      const pathwayMessages = {
        'impulsive': "I see from your assessment that you struggle with impulse control around technology. That's very common, and there are proven strategies we can work on together.",
        'compulsive': "Your assessment shows anxiety-driven usage patterns. I specialize in helping people develop healthier coping mechanisms and break those checking cycles.",
        'relationship': "I understand you use technology primarily for social connection. We can work on building stronger offline relationships while managing your digital boundaries.",
        'extraversion': "Your assessment indicates you seek stimulation through digital means. I can help you find equally exciting offline alternatives.",
      };

      return pathwayMessages[addictionPathway as keyof typeof pathwayMessages] ||
        "I've reviewed your assessment and I'm here to provide personalized support for your digital wellness journey.";
    }

    return "I'm here to help you build a healthier relationship with technology. What's on your mind today?";
  };

  const getPersonaForAssessment = (assessment: any) => {
    const { ddasScores } = assessment;

    // High anxiety/neuroticism - gentle approach
    if (ddasScores.compulsive > ddasScores.impulsive + 2) return 'luna';

    // Low self-control - structured approach
    if (ddasScores.impulsive > ddasScores.compulsive + 2) return 'marcus';

    // Default to evidence-based approach
    return 'dr-chen';
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    // Check subscription access
    if (!subscription || subscription.tier === 'free') {
      setError('AI Coach requires a Recovery subscription or higher. Please upgrade to continue.');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setError(data.error);
          return;
        }
        throw new Error(data.error || 'Failed to send message');
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        emotionalState: data.metadata?.emotionalState,
        persona: data.metadata?.persona,
        week: data.metadata?.week,
        requiresCrisisIntervention: data.metadata?.requiresCrisisIntervention,
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      setError('Sorry, I had trouble processing that. Please try again.');

      // Add fallback message
      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. This sometimes happens, and it's not your fault. Please try again in a moment. If you're in crisis, please call 988 for immediate support.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Show upgrade message for free users
  if (!subscription || subscription.tier === 'free') {
    return (
      <div className="flex flex-col h-[600px] max-w-4xl mx-auto bg-white rounded-lg shadow-sm border">
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              AI Coach Available with Recovery Plan
            </h3>
            <p className="text-gray-600 mb-6">
              Get unlimited access to your personalized AI coach with evidence-based CBT techniques
              and 24/7 support for your digital wellness journey.
            </p>
            <button className="btn-recovery">
              Upgrade to Recovery
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPersona = messages.length > 0
    ? messages.find(m => m.persona)?.persona || 'dr-chen'
    : 'dr-chen';
  const personaInfo = COACH_PERSONAS[currentPersona as keyof typeof COACH_PERSONAS];

  return (
    <div className="flex flex-col h-[600px] max-w-4xl mx-auto bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-recovery-500 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{personaInfo.name}</h2>
            <p className="text-primary-100 text-sm">{personaInfo.description}</p>
          </div>
          <div className="text-right text-sm opacity-90">
            <div>Week {assessment ? '3' : '1'} of 12</div>
            <div className="text-xs">{assessment?.addictionPathway || 'general'} pathway</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary-500 text-white'
                  : message.requiresCrisisIntervention
                  ? 'bg-red-50 border-2 border-red-200 text-red-900'
                  : 'bg-white border border-gray-200 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

              {message.emotionalState && message.role === 'assistant' && (
                <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                  Detected: {message.emotionalState}
                  {message.requiresCrisisIntervention && (
                    <span className="ml-2 text-red-600 font-medium">Crisis Support Activated</span>
                  )}
                </div>
              )}

              <div className="mt-1 text-xs opacity-70">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg max-w-xs">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500">{personaInfo.name} is typing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-white rounded-b-lg">
        <div className="flex space-x-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${personaInfo.name}...`}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Send
          </button>
        </div>

        <div className="mt-2 text-xs text-gray-500 flex justify-between">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>{currentTier?.name} Plan • Unlimited messages</span>
        </div>
      </div>
    </div>
  );
}