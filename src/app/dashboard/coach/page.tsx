'use client';

import { useState, useRef, useEffect } from 'react';
import { SubscriptionGuard } from '@/components/guards/SubscriptionGuard';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/lib/firebase-shared/config';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface UsageInfo {
  currentUsage: number;
  dailyLimit: number;
  remainingMessages: number;
  resetAt: any; // Firebase Timestamp
  userStatus: string;
}

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm Dr. Chen, your AI coach. I'm here to support you on your digital wellness journey. How are you feeling today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch usage information on component mount
  useEffect(() => {
    fetchUsageInfo();
  }, []);

  const fetchUsageInfo = async () => {
    try {
      const idToken = await auth.currentUser?.getIdToken();

      // Call Cloud Function directly
      const cloudFunctionUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTION_URL?.replace('chatWithCoach', 'getUserUsageData') ||
        `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/getUserUsageData`;

      const response = await fetch(cloudFunctionUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsageInfo(data.usage);
        setLimitReached(data.usage.remainingMessages <= 0);
      }
    } catch (error) {
      console.error('Error fetching usage info:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || limitReached) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Get Firebase auth token
      const idToken = await auth.currentUser?.getIdToken();

      // Call Cloud Function directly
      const cloudFunctionUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTION_URL ||
        `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/chatWithCoach`;

      const response = await fetch(cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.filter(m => !m.isTyping).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      // Handle usage limit errors
      if (response.status === 429) {
        setMessages(prev => prev.filter(m => m.id !== 'typing'));
        setUsageInfo(data.usage);
        setLimitReached(true);
        setShowUpgradePrompt(data.upgradeRequired);

        const limitMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.error || "You've reached your daily message limit. Your limit will reset tomorrow.",
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, limitMessage]);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Remove typing indicator and add actual response
      setMessages(prev => prev.filter(m => m.id !== 'typing'));

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update usage information
      if (data.usage) {
        setUsageInfo(data.usage);
        setLimitReached(data.usage.remainingMessages <= 0);
      }

      // Show upgrade prompt if user is approaching limit
      if (data.usage && data.usage.remainingMessages <= 5 && data.usage.remainingMessages > 0) {
        setShowUpgradePrompt(true);
      }

    } catch (error) {
      console.error('Chat error:', error);
      // Remove typing indicator and show error
      setMessages(prev => prev.filter(m => m.id !== 'typing'));

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  return (
    <SubscriptionGuard requiredTier="free">
      <div className="flex flex-col h-screen bg-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">DC</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Dr. Chen</h1>
              <p className="text-sm text-gray-500">Your AI Recovery Coach</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Usage Counter */}
            {usageInfo && (
              <div className="flex items-center space-x-2 text-sm">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  usageInfo.remainingMessages <= 5
                    ? 'bg-red-100 text-red-800'
                    : usageInfo.remainingMessages <= 10
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {usageInfo.remainingMessages} messages left today
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm text-gray-500">Online</span>
            </div>
          </div>
        </div>

        {/* Upgrade Prompt Banner */}
        {showUpgradePrompt && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-white text-sm font-medium">
                  {limitReached
                    ? "You've reached your daily message limit"
                    : `Only ${usageInfo?.remainingMessages || 0} messages remaining today`
                  }
                </div>
                {!limitReached && (
                  <div className="text-indigo-200 text-xs">
                    Upgrade for unlimited daily messages
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowUpgradePrompt(false)}
                  className="text-indigo-200 hover:text-white text-sm"
                >
                  Dismiss
                </button>
                <button className="bg-white text-indigo-600 px-4 py-1 rounded-full text-sm font-medium hover:bg-indigo-50 transition-colors">
                  Upgrade to Premium
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 bg-gray-50">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  } rounded-2xl px-4 py-3 shadow-sm`}
                >
                  {message.isTyping ? (
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500 ml-2">Dr. Chen is typing...</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={limitReached ? "Daily message limit reached" : "Type your message..."}
                  className="w-full resize-none rounded-2xl border border-gray-300 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent max-h-[200px] min-h-[44px] disabled:bg-gray-100 disabled:text-gray-500"
                  style={{ height: 'auto' }}
                  disabled={isLoading || limitReached}
                />
                <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                  {inputValue.length > 0 && (
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      {inputValue.length}/1000
                    </span>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading || limitReached}
                className={`p-3 rounded-full transition-colors ${
                  inputValue.trim() && !isLoading && !limitReached
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </form>
            <div className="mt-2 text-center">
              {limitReached ? (
                <p className="text-xs text-red-600">
                  Daily message limit reached. Your limit will reset tomorrow at midnight.
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Dr. Chen can make mistakes. Consider checking important information.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </SubscriptionGuard>
  );
}