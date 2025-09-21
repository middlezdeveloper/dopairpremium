'use client';

import { useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '@/lib/firebase-shared/collections';

interface SupportSectionProps {
  user: User;
  userProfile: UserProfile;
}

export default function SupportSection({ user, userProfile }: SupportSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [message, setMessage] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // TODO: Implement support ticket creation
    console.log('Support request:', { category: selectedCategory, message, user: user.email });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSubmitting(false);
    setShowContactForm(false);
    setSelectedCategory('');
    setMessage('');
  };

  const faqItems = [
    {
      question: "How does the AI coach work?",
      answer: "Our AI coach uses advanced language models trained on evidence-based recovery methods to provide personalized guidance for digital wellness and addiction recovery."
    },
    {
      question: "Can I pause my subscription?",
      answer: "Yes! You can pause your subscription for up to 1 month from the Subscription tab in your account settings. This keeps your progress saved while temporarily stopping billing."
    },
    {
      question: "How do I cancel my subscription?",
      answer: "You can cancel anytime from the Subscription tab. Your access will continue until the end of your current billing period, and you can reactivate anytime."
    },
    {
      question: "Is my conversation data private?",
      answer: "Absolutely. All conversations are encrypted and stored securely. We never share your personal data with third parties and you can download or delete your data anytime."
    },
    {
      question: "What if I need help with my recovery?",
      answer: "While our AI coach provides support, it's not a replacement for professional help. If you're in crisis, please contact a mental health professional or crisis hotline immediately."
    },
    {
      question: "How do I update my payment method?",
      answer: "You can update your payment method by clicking 'Manage Billing' in the Subscription tab, which will take you to our secure billing portal."
    }
  ];

  const supportCategories = [
    { value: 'technical', label: 'Technical Issues' },
    { value: 'billing', label: 'Billing & Payments' },
    { value: 'account', label: 'Account Management' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'feedback', label: 'General Feedback' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Contact Support */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Support</h2>

          {!showContactForm ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">📧 Email Support</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Get help with any questions or issues. We typically respond within 24 hours.
                </p>
                <button
                  onClick={() => setShowContactForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Send Message
                </button>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">💬 Live Chat</h3>
                <p className="text-sm text-green-700 mb-3">
                  Chat with our support team during business hours (9 AM - 5 PM PST).
                </p>
                <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                  Start Chat
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitSupport} className="bg-gray-50 p-6 rounded-lg">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select a category...</option>
                    {supportCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Describe your issue or question..."
                    required
                  />
                </div>

                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Your account info:</strong> {user.email} | Status: {userProfile.status}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submitting ? 'Sending...' : 'Send Message'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowContactForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Frequently Asked Questions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <details key={index} className="bg-gray-50 p-4 rounded-lg">
                <summary className="font-medium text-gray-900 cursor-pointer hover:text-indigo-600">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Helpful Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="#"
              className="bg-white border border-gray-200 p-4 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <h3 className="font-medium text-gray-900 mb-2">📚 User Guide</h3>
              <p className="text-sm text-gray-600">
                Complete guide to using Dopair Premium features
              </p>
            </a>

            <a
              href="#"
              className="bg-white border border-gray-200 p-4 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <h3 className="font-medium text-gray-900 mb-2">🎥 Video Tutorials</h3>
              <p className="text-sm text-gray-600">
                Step-by-step video guides for key features
              </p>
            </a>

            <a
              href="#"
              className="bg-white border border-gray-200 p-4 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <h3 className="font-medium text-gray-900 mb-2">📱 Mobile App</h3>
              <p className="text-sm text-gray-600">
                Download our mobile app for iOS and Android
              </p>
            </a>

            <a
              href="#"
              className="bg-white border border-gray-200 p-4 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <h3 className="font-medium text-gray-900 mb-2">🌐 Community Forum</h3>
              <p className="text-sm text-gray-600">
                Connect with other users and share experiences
              </p>
            </a>
          </div>
        </div>

        {/* Crisis Resources */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-4">🚨 Crisis Resources</h2>
          <p className="text-sm text-red-800 mb-4">
            If you're experiencing a mental health crisis, please reach out for immediate help:
          </p>
          <div className="space-y-2 text-sm">
            <div className="text-red-800">
              <strong>National Suicide Prevention Lifeline:</strong> 988
            </div>
            <div className="text-red-800">
              <strong>Crisis Text Line:</strong> Text HOME to 741741
            </div>
            <div className="text-red-800">
              <strong>SAMHSA National Helpline:</strong> 1-800-662-4357
            </div>
          </div>
        </div>

        {/* Status Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">System Status</h3>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}