'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, query, where, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-shared/config';
import { COLLECTIONS, Assessment, UserProfile } from '@/lib/firebase-shared/collections';

export function useAssessment() {
  const [user] = useAuthState(auth);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAssessment, setNeedsAssessment] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setNeedsAssessment(true);
      return;
    }

    loadUserAssessment();
  }, [user]);

  const loadUserAssessment = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // First, check if user has linked assessment ID in profile
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;

        if (userData.assessmentId) {
          // Load assessment by ID
          const assessmentDoc = await getDoc(doc(db, COLLECTIONS.ASSESSMENTS, userData.assessmentId));

          if (assessmentDoc.exists()) {
            setAssessment({ id: assessmentDoc.id, ...assessmentDoc.data() } as Assessment);
            setNeedsAssessment(false);
            setLoading(false);
            return;
          }
        }
      }

      // If no linked assessment, try to find assessment by user ID
      const assessmentQuery = query(
        collection(db, COLLECTIONS.ASSESSMENTS),
        where('userId', '==', user.uid)
      );

      const assessmentSnapshot = await getDocs(assessmentQuery);

      if (!assessmentSnapshot.empty) {
        // Take the most recent assessment
        const assessmentDocs = assessmentSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Assessment[];

        // Sort by timestamp and take the latest
        const latestAssessment = assessmentDocs.sort((a, b) =>
          b.timestamp.getTime() - a.timestamp.getTime()
        )[0];

        setAssessment(latestAssessment);
        setNeedsAssessment(false);
      } else {
        // No assessment found
        setAssessment(null);
        setNeedsAssessment(true);
      }
    } catch (err) {
      console.error('Error loading assessment:', err);
      setError('Failed to load assessment data');
      setNeedsAssessment(true);
    }

    setLoading(false);
  };

  const getPersonalizedRecommendations = () => {
    if (!assessment) return [];

    const { addictionPathway, ddasScores } = assessment;
    const recommendations = [];

    if (addictionPathway === 'impulsive') {
      recommendations.push(
        'Focus on mindfulness and impulse control techniques',
        'Use immediate blocking for high-risk situations',
        'Practice the 5-4-3-2-1 grounding technique'
      );
    } else if (addictionPathway === 'compulsive') {
      recommendations.push(
        'Work on underlying anxiety and stress management',
        'Establish structured daily routines',
        'Consider cognitive behavioral therapy approaches'
      );
    } else {
      recommendations.push(
        'Address both impulsive triggers and underlying compulsions',
        'Use a combination of immediate and scheduled blocking',
        'Focus on comprehensive lifestyle changes'
      );
    }

    // Add severity-based recommendations
    if (ddasScores.total > 20) {
      recommendations.push('Consider professional support alongside the AI coach');
    }

    return recommendations;
  };

  const assessmentSummary = assessment ? {
    pathway: assessment.addictionPathway,
    severity: assessment.ddasScores.total > 20 ? 'high' :
             assessment.ddasScores.total > 10 ? 'moderate' : 'low',
    completedDate: assessment.timestamp,
    impulsiveScore: assessment.ddasScores.impulsive,
    compulsiveScore: assessment.ddasScores.compulsive,
    totalScore: assessment.ddasScores.total,
  } : null;

  const quizUrl = process.env.NEXT_PUBLIC_QUIZ_URL || 'https://quiz.dopair.com';

  return {
    assessment,
    assessmentSummary,
    loading,
    error,
    needsAssessment,
    recommendations: getPersonalizedRecommendations(),
    quizUrl,
    refreshAssessment: loadUserAssessment,
  };
}