'use client';

import { useState, useCallback } from 'react';

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

interface UseChatOptions {
  userId: string;
  onError?: (error: string) => void;
  onMessage?: (message: ChatMessage) => void;
}

export function useCoachChat({ userId, onError, onMessage }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
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
      onMessage?.(aiMessage);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      onError?.(errorMessage);

      // Add fallback message
      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment. If you're in crisis, please call 988 for immediate support.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setLoading(false);
    }
  }, [userId, loading, onError, onMessage]);

  const loadHistory = useCallback(async (limit: number = 20) => {
    try {
      const response = await fetch(`/api/coach/chat?userId=${userId}&limit=${limit}`);
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
  }, [userId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const addSystemMessage = useCallback((content: string) => {
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, systemMessage]);
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    loadHistory,
    clearMessages,
    addSystemMessage,
  };
}