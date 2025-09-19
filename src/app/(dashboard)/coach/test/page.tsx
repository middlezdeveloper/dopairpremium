'use client';

import { useState } from 'react';
import { ChatInterface } from '@/components/features/coach/ChatInterface';

export default function CoachTestPage() {
  const [testUser, setTestUser] = useState('test-user-impulsive');

  const testUsers = {
    'test-user-impulsive': {
      name: 'Impulsive User',
      description: 'High impulsive scores, needs Marcus (structured coach)',
      assessment: {
        addictionPathway: 'impulsive',
        ddasScores: { impulsive: 8, compulsive: 4, total: 12 }
      }
    },
    'test-user-anxious': {
      name: 'Anxious User',
      description: 'High compulsive scores, needs Luna (gentle coach)',
      assessment: {
        addictionPathway: 'compulsive',
        ddasScores: { impulsive: 3, compulsive: 9, total: 12 }
      }
    },
    'test-user-balanced': {
      name: 'Balanced User',
      description: 'Moderate scores, gets Dr. Chen (evidence-based)',
      assessment: {
        addictionPathway: 'mixed',
        ddasScores: { impulsive: 6, compulsive: 6, total: 12 }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Controls */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-yellow-800 mb-3">🧪 AI Coach Testing Interface</h2>
        <p className="text-yellow-700 text-sm mb-4">
          This is a test interface for the AI coach. Select different user profiles to see how the AI adapts its responses.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(testUsers).map(([userId, user]) => (
            <button
              key={userId}
              onClick={() => setTestUser(userId)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                testUser === userId
                  ? 'bg-yellow-200 border-yellow-400 text-yellow-900'
                  : 'bg-white border-yellow-300 text-yellow-800 hover:bg-yellow-100'
              }`}
            >
              <div className="font-medium">{user.name}</div>
              <div className="text-sm opacity-80">{user.description}</div>
              <div className="text-xs mt-1 font-mono">
                {user.assessment.addictionPathway} • {user.assessment.ddasScores.total}/20
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 p-3 bg-white rounded border border-yellow-300">
          <div className="text-sm">
            <strong>Current Test User:</strong> {testUsers[testUser as keyof typeof testUsers].name}
            <br />
            <strong>Profile:</strong> {testUsers[testUser as keyof typeof testUsers].description}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Test Scenarios to Try:</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• <strong>Basic interaction:</strong> "I'm struggling with my phone usage today"</li>
          <li>• <strong>Emotional state:</strong> "I'm feeling really anxious about my screen time"</li>
          <li>• <strong>Crisis test:</strong> "I can't take this anymore" (will trigger safety protocols)</li>
          <li>• <strong>Pathway-specific:</strong> "I keep reaching for my phone without thinking" (impulsive)</li>
          <li>• <strong>Progress check:</strong> "How am I doing with my recovery?"</li>
        </ul>
      </div>

      {/* Chat Interface */}
      <ChatInterface userId={testUser} />

      {/* Debug Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Debug Information:</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <div><strong>User ID:</strong> {testUser}</div>
          <div><strong>Expected Persona:</strong> {
            testUser.includes('impulsive') ? 'Marcus (Structured)' :
            testUser.includes('anxious') ? 'Luna (Gentle)' :
            'Dr. Chen (Evidence-based)'
          }</div>
          <div><strong>API Endpoint:</strong> /api/coach/chat</div>
          <div><strong>Model:</strong> GPT-3.5-turbo</div>
        </div>
      </div>
    </div>
  );
}