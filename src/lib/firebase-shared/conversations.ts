import {
  collection,
  doc,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from './config';
import { COLLECTIONS, SUBCOLLECTIONS } from './collections';

export interface ConversationMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: any; // Firestore timestamp
  emotionalState?: string;
  tokens?: number;
  persona?: string;
  week?: number;
}

export interface ConversationMetadata {
  userId: string;
  totalMessages: number;
  totalTokens: number;
  lastMessageAt: any;
  currentWeek: number;
  selectedPersona: string;
  averageEmotionalState: string;
}

export class ConversationManager {
  async saveMessage(
    userId: string,
    userMessage: string,
    aiResponse: string,
    metadata: {
      emotionalState?: string;
      tokens?: number;
      persona?: string;
      week?: number;
    }
  ): Promise<void> {
    try {
      const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, userId);
      const messagesRef = collection(conversationRef, SUBCOLLECTIONS.MESSAGES);

      // Save user message
      await addDoc(messagesRef, {
        role: 'user',
        content: userMessage,
        timestamp: serverTimestamp(),
        emotionalState: metadata.emotionalState,
        week: metadata.week,
      });

      // Save AI response
      await addDoc(messagesRef, {
        role: 'assistant',
        content: aiResponse,
        timestamp: serverTimestamp(),
        tokens: metadata.tokens,
        persona: metadata.persona,
        week: metadata.week,
      });

      // Update conversation metadata
      await this.updateConversationMetadata(userId, metadata);

    } catch (error) {
      console.error('Error saving message:', error);
      throw new Error('Failed to save conversation');
    }
  }

  async getRecentMessages(userId: string, messageLimit: number = 10): Promise<ConversationMessage[]> {
    try {
      const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, userId);
      const messagesRef = collection(conversationRef, SUBCOLLECTIONS.MESSAGES);

      const q = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(messageLimit)
      );

      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ConversationMessage));

      // Return in chronological order (oldest first)
      return messages.reverse();

    } catch (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
  }

  async getConversationMetadata(userId: string): Promise<ConversationMetadata | null> {
    try {
      const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, userId);
      const docSnap = await getDoc(conversationRef);

      if (docSnap.exists()) {
        return docSnap.data() as ConversationMetadata;
      }

      return null;
    } catch (error) {
      console.error('Error getting conversation metadata:', error);
      return null;
    }
  }

  private async updateConversationMetadata(
    userId: string,
    metadata: {
      tokens?: number;
      persona?: string;
      week?: number;
    }
  ): Promise<void> {
    try {
      const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, userId);

      // Get current metadata or create new
      const currentDoc = await getDoc(conversationRef);
      const current = currentDoc.exists() ? currentDoc.data() as ConversationMetadata : null;

      const updatedMetadata: Partial<ConversationMetadata> = {
        userId,
        totalMessages: (current?.totalMessages || 0) + 2, // user + assistant message
        totalTokens: (current?.totalTokens || 0) + (metadata.tokens || 0),
        lastMessageAt: serverTimestamp(),
        currentWeek: metadata.week || current?.currentWeek || 1,
        selectedPersona: metadata.persona || current?.selectedPersona || 'dr-chen',
      };

      await updateDoc(conversationRef, updatedMetadata);

    } catch (error) {
      // If document doesn't exist, create it
      const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, userId);
      await updateDoc(conversationRef, {
        userId,
        totalMessages: 2,
        totalTokens: metadata.tokens || 0,
        lastMessageAt: serverTimestamp(),
        currentWeek: metadata.week || 1,
        selectedPersona: metadata.persona || 'dr-chen',
        averageEmotionalState: 'neutral',
      });
    }
  }

  async getUserTokenUsage(userId: string): Promise<{ totalTokens: number; messagesThisWeek: number }> {
    try {
      const metadata = await this.getConversationMetadata(userId);

      // For now, return total usage
      // Later, we can add time-based filtering for weekly usage
      return {
        totalTokens: metadata?.totalTokens || 0,
        messagesThisWeek: 0, // TODO: Implement weekly counting
      };

    } catch (error) {
      console.error('Error getting token usage:', error);
      return { totalTokens: 0, messagesThisWeek: 0 };
    }
  }

  async checkMessageLimits(userId: string, userTier: string): Promise<{
    canSendMessage: boolean;
    reason?: string;
    usage: { totalTokens: number; messagesThisWeek: number }
  }> {
    try {
      const usage = await this.getUserTokenUsage(userId);

      // Check tier-based limits
      switch (userTier) {
        case 'free':
          return {
            canSendMessage: false,
            reason: 'AI Coach requires Recovery subscription or higher',
            usage,
          };

        case 'alumni':
          // Alumni tier has 100 messages/month limit
          const monthlyLimit = 100;
          if (usage.messagesThisWeek * 4 > monthlyLimit) { // Rough weekly estimate
            return {
              canSendMessage: false,
              reason: 'Monthly message limit reached. Upgrade to Recovery for unlimited messages.',
              usage,
            };
          }
          break;

        case 'recovery':
        case 'family':
          // Unlimited for these tiers
          break;

        default:
          return {
            canSendMessage: false,
            reason: 'Invalid subscription tier',
            usage,
          };
      }

      return {
        canSendMessage: true,
        usage,
      };

    } catch (error) {
      console.error('Error checking message limits:', error);
      return {
        canSendMessage: false,
        reason: 'Error checking usage limits',
        usage: { totalTokens: 0, messagesThisWeek: 0 },
      };
    }
  }
}