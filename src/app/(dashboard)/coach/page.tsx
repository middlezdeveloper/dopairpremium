'use client';

import { ChatInterface } from '@/components/features/coach/ChatInterface';
import { useSubscription } from '@/hooks/useSubscription';
import { useAssessment } from '@/hooks/useAssessment';
import { COACH_PERSONAS } from '@/lib/ai/config';

export default function CoachPage() {
  const { subscription, loading: subLoading } = useSubscription();
  const { assessment, needsAssessment, loading: assessmentLoading, quizUrl } = useAssessment();

  if (subLoading || assessmentLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const getPersonaForUser = () => {
    if (!assessment) return 'dr-chen';

    const { ddasScores } = assessment;

    // High anxiety/neuroticism - gentle approach
    if (ddasScores.compulsive > ddasScores.impulsive + 2) return 'luna';

    // Low self-control - structured approach
    if (ddasScores.impulsive > ddasScores.compulsive + 2) return 'marcus';

    // Default to evidence-based approach
    return 'dr-chen';
  };

  const currentPersona = getPersonaForUser();
  const personaInfo = COACH_PERSONAS[currentPersona as keyof typeof COACH_PERSONAS];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              AI Coach: {personaInfo.name}
            </h1>
            <p className="text-gray-600 mb-4">{personaInfo.description}</p>

            {assessment && (
              <div className="flex items-center space-x-4 text-sm">
                <span className="bg-primary-100 text-indigo-800 px-3 py-1 rounded-full">
                  {assessment.addictionPathway} pathway
                </span>
                <span className="bg-green-100 text-recovery-800 px-3 py-1 rounded-full">
                  Week 3 of 12
                </span>
                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full">
                  {personaInfo.tone}
                </span>
              </div>
            )}

            {needsAssessment && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start space-x-3">
                  <div className="text-amber-600 text-xl">📋</div>
                  <div>
                    <h3 className="font-medium text-amber-900 mb-1">Assessment Recommended</h3>
                    <p className="text-amber-800 text-sm mb-3">
                      Take our DDAS assessment to help your AI coach provide more personalized guidance
                      based on your unique patterns and needs.
                    </p>
                    <a
                      href={quizUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Take Assessment
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Your Coach</div>
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-green-400 rounded-full flex items-center justify-center text-2xl text-white font-bold">
              {personaInfo.name.charAt(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Coach Interface */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <ChatInterface />
      </div>

      {/* Help & Tips */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Get the Most from Your AI Coach</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-600 font-semibold text-sm">1</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Be Specific</h3>
              <p className="text-gray-600 text-sm">
                Share specific situations, feelings, or challenges you're facing for more targeted guidance.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-recovery-600 font-semibold text-sm">2</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Regular Check-ins</h3>
              <p className="text-gray-600 text-sm">
                Daily or weekly conversations help build momentum and track your progress effectively.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-alumni-100 rounded-full flex items-center justify-center">
              <span className="text-alumni-600 font-semibold text-sm">3</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Practice Suggestions</h3>
              <p className="text-gray-600 text-sm">
                Try the techniques and exercises your coach suggests, then report back on how they worked.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-start space-x-3">
            <div className="text-red-600 text-xl">🚨</div>
            <div>
              <h3 className="font-medium text-red-900 mb-1">Crisis Support</h3>
              <p className="text-red-800 text-sm">
                If you're having thoughts of self-harm or suicide, please reach out immediately:
                <br />
                <strong>National Suicide Prevention Lifeline: 988</strong>
                <br />
                <strong>Crisis Text Line: Text HOME to 741741</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}