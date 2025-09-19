# Dopair AI Coach Prototype - Technical Specification
## Rapid Validation Build for Claude Code

---

## 🎯 Prototype Goals

1. **Validate AI coaching capabilities** - Can it maintain therapeutic tone and CBT protocols?
2. **Test personalization accuracy** - Does it adapt to user profiles correctly?
3. **Verify emotional intelligence** - Can it detect and respond to emotional states?
4. **Confirm cross-platform viability** - Will the API structure work for both web and native?

---

## 🏗️ Architecture Overview

### Core Design Principle
**API-First Architecture**: Build a backend API that both web and native apps can consume.

```javascript
// Universal API structure that works everywhere
const dopairAPI = {
  endpoint: "https://api.dopair.com/coach",
  authentication: "Bearer token",
  responses: "JSON format",
  realtime: "WebSocket for streaming",
  platforms: ["Web App", "iOS Native", "Android Native"]
}
```

---

## 🚀 Phase 1: MVP Prototype (Week 1)

### Tech Stack for Rapid Validation

```javascript
const mvpStack = {
  // Backend (Firebase Functions)
  ai: "gpt-3.5-turbo", // Start cheap, upgrade later
  database: "Firebase Firestore",
  auth: "Firebase Auth (simple email/password)",
  hosting: "Firebase Hosting",
  
  // Frontend (Simple React)
  ui: "React + Tailwind CSS",
  deployment: "Vercel or Firebase Hosting",
  
  // Cost: ~$0.001 per message
  estimatedCost: "$0.62 per user for 12 weeks"
}
```

### Minimal Viable Features

1. **Basic Chat Interface** - Text only initially
2. **User Profile Creation** - Store DDAS results
3. **AI Coach Responses** - Personalized based on profile
4. **Conversation Memory** - Last 5 messages
5. **Simple Progress Tracking** - Week number, check-ins

---

## 💻 Implementation Code

### 1. Backend API (Firebase Functions)

```javascript
// /functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const OpenAI = require('openai');

admin.initializeApp();
const db = admin.firestore();
const openai = new OpenAI({
  apiKey: functions.config().openai.key
});

// Main coaching endpoint
exports.coachChat = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  const userId = context.auth.uid;
  const userMessage = data.message;
  const messageType = data.type || 'text'; // text, voice, screenshot
  
  try {
    // 1. Get user profile and history
    const userProfile = await getUserProfile(userId);
    const conversationHistory = await getRecentMessages(userId, 5);
    
    // 2. Construct AI prompt based on user profile
    const systemPrompt = buildSystemPrompt(userProfile);
    const messages = buildMessageHistory(conversationHistory, userMessage);
    
    // 3. Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Upgrade to gpt-4 later
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    const aiResponse = completion.choices[0].message.content;
    
    // 4. Save to conversation history
    await saveMessage(userId, userMessage, aiResponse);
    
    // 5. Update user progress
    await updateUserProgress(userId);
    
    return {
      response: aiResponse,
      metadata: {
        week: userProfile.currentWeek,
        sessionCount: userProfile.totalSessions,
        emotionalState: detectEmotionalState(userMessage)
      }
    };
    
  } catch (error) {
    console.error('Coach chat error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process message');
  }
});

// Helper function: Build personalized system prompt
function buildSystemPrompt(userProfile) {
  const { 
    addictionPathway, 
    personalityType, 
    currentWeek,
    selectedPersona 
  } = userProfile;
  
  return `
    You are ${selectedPersona || 'Dr. Chen'}, a CBT-trained digital wellness coach for Dopair.
    
    User Profile:
    - Addiction Pathway: ${addictionPathway} (${getPathwayDescription(addictionPathway)})
    - Personality Type: ${personalityType}
    - Current Week: ${currentWeek} of 12
    - Communication Style: ${getCommStyleForPersonality(personalityType)}
    
    Core Instructions:
    1. Use CBT techniques appropriate for their addiction pathway
    2. Maintain a ${getToneForPersonality(personalityType)} tone
    3. Reference their progress and current week goals
    4. If they mention suicide or self-harm, immediately provide crisis resources
    5. Keep responses concise (2-3 paragraphs max)
    
    Week ${currentWeek} Focus: ${getWeeklyFocus(currentWeek)}
  `;
}

// Helper function: Get pathway-specific guidance
function getPathwayDescription(pathway) {
  const descriptions = {
    'impulsive': 'Struggles with poor self-control and emotion regulation. Needs mindfulness and impulse management techniques.',
    'relationship': 'Uses phone for social connection. Needs offline social strategies and communication skills.',
    'extraversion': 'High stimulation seeking. Needs exciting offline alternatives and gradual exposure.',
    'neuroticism': 'Anxiety-driven usage. Needs stress management and emotional regulation tools.'
  };
  return descriptions[pathway] || 'General digital dependency';
}

// Helper function: Personality-based communication
function getCommStyleForPersonality(personality) {
  const styles = {
    'high_neuroticism': 'Extra supportive, validating, gentle',
    'low_conscientiousness': 'More structured, specific steps, accountability focused',
    'high_extraversion': 'Energetic, social, collaborative',
    'high_openness': 'Exploratory, creative solutions, philosophical'
  };
  return styles[personality] || 'Balanced and supportive';
}

// Database helpers
async function getUserProfile(userId) {
  const doc = await db.collection('users').doc(userId).get();
  return doc.data();
}

async function getRecentMessages(userId, limit) {
  const messages = await db.collection('conversations')
    .doc(userId)
    .collection('messages')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();
  
  return messages.docs.map(doc => doc.data()).reverse();
}

async function saveMessage(userId, userMessage, aiResponse) {
  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  
  await db.collection('conversations')
    .doc(userId)
    .collection('messages')
    .add({
      userMessage,
      aiResponse,
      timestamp
    });
}
```

### 2. Frontend React Component

```jsx
// CoachChat.jsx
import React, { useState, useEffect } from 'react';
import { auth, functions } from './firebase-config';
import { httpsCallable } from 'firebase/functions';

const CoachChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  const coachChat = httpsCallable(functions, 'coachChat');
  
  useEffect(() => {
    // Load user profile and conversation history
    loadUserData();
  }, []);
  
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput('');
    
    // Add user message to UI immediately
    setMessages(prev => [...prev, { 
      type: 'user', 
      content: userMessage,
      timestamp: new Date()
    }]);
    
    setLoading(true);
    
    try {
      // Call Firebase Function
      const result = await coachChat({ 
        message: userMessage,
        type: 'text'
      });
      
      // Add AI response to UI
      setMessages(prev => [...prev, { 
        type: 'coach', 
        content: result.data.response,
        metadata: result.data.metadata,
        timestamp: new Date()
      }]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        type: 'error', 
        content: 'Sorry, I had trouble processing that. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg">
        <h1 className="text-xl font-bold">
          Your Dopair Coach: {userProfile?.selectedPersona || 'Dr. Chen'}
        </h1>
        <p className="text-sm opacity-90">
          Week {userProfile?.currentWeek || 1} of 12 • {userProfile?.addictionPathway} pathway
        </p>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.type === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white border border-gray-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.metadata && (
                <p className="text-xs opacity-70 mt-2">
                  Emotional state: {msg.metadata.emotionalState}
                </p>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 px-4 py-2 rounded-lg">
              <span className="typing-animation">Coach is typing...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Input */}
      <div className="bg-white p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoachChat;
```

### 3. User Profile Setup (After DDAS Assessment)

```javascript
// createUserProfile.js
async function createUserProfile(userId, ddasResults) {
  const profile = {
    // Core addiction profile
    addictionPathway: determinePathway(ddasResults),
    personalityType: determinePersonality(ddasResults),
    
    // Program tracking
    currentWeek: 1,
    startDate: new Date(),
    totalSessions: 0,
    lastCheckIn: null,
    
    // Personalization
    selectedPersona: selectBestPersona(ddasResults),
    communicationStyle: determineCommunicationStyle(ddasResults),
    
    // DDAS scores for reference
    dimensions: {
      salience: ddasResults.salienceScore,
      lossOfControl: ddasResults.lossOfControlScore,
      tolerance: ddasResults.toleranceScore,
      functionalImpairment: ddasResults.functionalImpairmentScore
    }
  };
  
  // Save to Firestore
  await db.collection('users').doc(userId).set(profile);
  return profile;
}

function determinePathway(ddasResults) {
  // Analyze DDAS results to determine primary addiction pathway
  const { dimensions, individualResponses } = ddasResults;
  
  if (dimensions.lossOfControl > 7) return 'impulsive';
  if (dimensions.salience > 7 && individualResponses.socialMediaUsage === 'high') return 'relationship';
  if (dimensions.tolerance > 7) return 'extraversion';
  if (individualResponses.anxietyDriven === true) return 'neuroticism';
  
  return 'general';
}

function selectBestPersona(ddasResults) {
  // Match user to best coach persona
  const { personalityType } = ddasResults;
  
  const personaMap = {
    'high_neuroticism': 'Luna', // Gentle, mindful
    'low_conscientiousness': 'Marcus', // Direct, accountability
    'high_openness': 'Dr. Chen', // Evidence-based
    'default': 'Dr. Chen'
  };
  
  return personaMap[personalityType] || personaMap.default;
}
```

---

## 🔄 Phase 2: Enhanced Features (Week 2)

### Add Voice & Screenshot Support

```javascript
// Enhanced API endpoint
exports.coachChatEnhanced = functions.https.onCall(async (data, context) => {
  const { message, type, mediaUrl } = data;
  
  let processedInput;
  let emotionalContext = {};
  
  switch(type) {
    case 'voice':
      // Transcribe audio using Whisper API
      const transcription = await transcribeAudio(mediaUrl);
      processedInput = transcription.text;
      emotionalContext = analyzeVocalTone(mediaUrl);
      break;
      
    case 'screenshot':
      // Use GPT-4 Vision for direct analysis
      const analysis = await analyzeScreenshot(mediaUrl);
      processedInput = `User shared screen time data: ${analysis.summary}`;
      emotionalContext = { concern: analysis.concernLevel };
      break;
      
    default:
      processedInput = message;
      emotionalContext = analyzeTextEmotion(message);
  }
  
  // Rest of the coaching logic...
});

// Screenshot analysis with GPT-4 Vision
async function analyzeScreenshot(imageUrl) {
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: "Analyze this screen time screenshot. Extract usage hours and identify concerning patterns."
        },
        {
          type: "image_url",
          image_url: { url: imageUrl }
        }
      ]
    }]
  });
  
  return {
    summary: response.choices[0].message.content,
    concernLevel: determineConcernLevel(response)
  };
}
```

---

## 🌐 Cross-Platform API Design

### Universal API Structure

```javascript
// api-client.js - Works in both web and native
class DopairAPIClient {
  constructor(platform) {
    this.platform = platform; // 'web' | 'ios' | 'android'
    this.baseURL = 'https://api.dopair.com';
  }
  
  async sendMessage(message, type = 'text', mediaData = null) {
    const endpoint = `${this.baseURL}/coach/chat`;
    
    const payload = {
      message,
      type,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      platform: this.platform,
      timestamp: Date.now()
    };
    
    if (mediaData) {
      payload.media = await this.uploadMedia(mediaData);
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    return response.json();
  }
  
  // Streaming support for real-time responses
  streamMessage(message, onChunk) {
    const ws = new WebSocket(`wss://api.dopair.com/coach/stream`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ 
        message, 
        userId: this.getUserId() 
      }));
    };
    
    ws.onmessage = (event) => {
      const chunk = JSON.parse(event.data);
      onChunk(chunk);
    };
    
    return ws;
  }
}

// Usage in React Native
const client = new DopairAPIClient('ios');
const response = await client.sendMessage('I\'m struggling today', 'text');

// Usage in Web App
const client = new DopairAPIClient('web');
const response = await client.sendMessage('Check my progress', 'text');
```

---

## 📊 Testing & Validation Checklist

### Core Functionality Tests

```javascript
const validationTests = {
  // 1. Personalization Accuracy
  pathwayResponse: {
    test: "Send same message from different pathway profiles",
    expected: "Different, pathway-specific responses",
    validate: (responses) => responses.areUnique && responses.matchPathway
  },
  
  // 2. Emotional Intelligence
  emotionalDetection: {
    test: "Send messages with different emotional tones",
    expected: "Appropriate emotional calibration",
    validate: (response) => response.tone.matches(inputEmotion)
  },
  
  // 3. CBT Protocol Adherence
  therapeuticAccuracy: {
    test: "Present common addiction scenarios",
    expected: "Evidence-based CBT interventions",
    validate: (response) => response.includesCBTechniques
  },
  
  // 4. Crisis Handling
  safetyProtocol: {
    test: "Mention self-harm or suicide",
    expected: "Immediate crisis resources, no coaching",
    validate: (response) => response.includesCrisisResources
  },
  
  // 5. Memory & Context
  conversationContinuity: {
    test: "Reference previous conversations",
    expected: "Acknowledges and builds on history",
    validate: (response) => response.referencesContext
  }
};
```

---

## 💰 Cost Optimization Strategy

### Progressive Upgrade Path

```javascript
const costStrategy = {
  // Phase 1: Validation (Weeks 1-2)
  validation: {
    model: "gpt-3.5-turbo",
    costPerUser: "$0.62",
    features: ["Text chat", "Basic personalization"],
    maxUsers: 100
  },
  
  // Phase 2: Beta (Weeks 3-4)
  beta: {
    model: "gpt-3.5-turbo + GPT-4 Vision for screenshots",
    costPerUser: "$2.50",
    features: ["+ Voice input", "+ Screenshot analysis"],
    maxUsers: 500
  },
  
  // Phase 3: Production (Week 5+)
  production: {
    model: "gpt-4-turbo",
    costPerUser: "$12.80",
    features: ["Full emotional intelligence", "Premium experience"],
    pricing: "$97/user",
    margin: "87%"
  }
};
```

---

## 🚢 Deployment Steps

### Week 1: Core Validation
1. Deploy Firebase Functions backend
2. Create simple React chat interface
3. Test with 10 internal users
4. Validate personalization accuracy

### Week 2: Enhancement
1. Add voice transcription
2. Implement screenshot analysis
3. Test with 50 beta users
4. Measure engagement metrics

### Week 3: Platform Testing
1. Create React Native wrapper
2. Test API from native app
3. Ensure consistent experience
4. Performance optimization

### Week 4: Production Prep
1. Upgrade to GPT-4 for better quality
2. Implement full safety protocols
3. Add analytics tracking
4. Prepare for scale

---

## 🎯 Success Metrics

```javascript
const successCriteria = {
  technical: {
    responseTime: "<2 seconds",
    uptime: ">99.9%",
    errorRate: "<0.1%"
  },
  
  userExperience: {
    engagementRate: ">80% daily active",
    satisfactionScore: ">4.5 stars",
    completionRate: ">50% reach week 6"
  },
  
  therapeutic: {
    personalizationAccuracy: ">90% match user profile",
    cbtAdherence: "100% follow protocols",
    crisisHandling: "100% appropriate escalation"
  }
};
```

---

## 🔑 Key Decisions Made

1. **Start with GPT-3.5-turbo** - Validate cheaply, upgrade later
2. **Firebase for everything** - Simple, scalable, cross-platform
3. **API-first architecture** - One backend, multiple frontends
4. **Progressive enhancement** - Text → Voice → Screenshots
5. **Safety first** - Crisis protocols from day one

---

## 📝 Next Immediate Actions

1. **Today**: Set up Firebase project and OpenAI API key
2. **Tomorrow**: Deploy basic chat function and test
3. **Day 3**: Build React chat UI and connect
4. **Day 4**: Add user profiles and personalization
5. **Day 5**: Test with real DDAS assessment data
6. **Week 2**: Add voice and screenshot capabilities

This prototype will validate your core AI functionality while maintaining flexibility for both web and native deployment. The API-first approach ensures you build once and deploy everywhere.