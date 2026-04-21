import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  addDoc,
  orderBy,
  increment 
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase';
import { Character, Message } from '@/shared/types';
import { summarizeConversation } from '@/shared/services/gemini';

/**
 * Calculates and updates the total tokens consumed by a character.
 * It checks messages and summary tokens since the last calculation.
 */
export const calculateTokensForCharacter = async (character: Character, user: any) => {
  if (!user) return;
  
  try {
    const lastCalc = character.lastCalculationDatetime;
    
    // Query messages tokens
    let msgQ;
    if (lastCalc) {
      msgQ = query(
        collection(db, 'characters', character.id, 'messages'),
        where('timestamp', '>', lastCalc)
      );
    } else {
      msgQ = query(collection(db, 'characters', character.id, 'messages'));
    }

    const msgSnapshot = await getDocs(msgQ);
    let newTokens = 0;
    msgSnapshot.docs.forEach(doc => {
      const data = doc.data() as Message;
      newTokens += (data.tokensConsumed || 0);
    });

    // Query summary tokens
    let sumQ;
    if (lastCalc) {
      sumQ = query(
        collection(db, 'characters', character.id, 'summarytokens'),
        where('dateTimeSummarized', '>', lastCalc)
      );
    } else {
      sumQ = query(collection(db, 'characters', character.id, 'summarytokens'));
    }

    const sumSnapshot = await getDocs(sumQ);
    sumSnapshot.docs.forEach(doc => {
      const data = doc.data() as { tokensConsumed: number };
      newTokens += (data.tokensConsumed || 0);
    });

    if (newTokens > 0 || !lastCalc) {
      const charRef = doc(db, 'characters', character.id);
      await updateDoc(charRef, {
        totalTokensConsumed: increment(newTokens),
        lastCalculationDatetime: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Token Calculation Error:", error);
  }
};

/**
 * Checks if a conversation needs to be summarized based on the number of new messages.
 * If so, it invokes the summarization service and updates the character's memory.
 */
export const checkAndSummarize = async (character: Character, fullMsgs: Message[], user: any) => {
  if (!user) return;
  
  try {
    const lastSummaryIndex = character.lastSummarizedIndex || 0;
    const messagesSinceLastSummary = fullMsgs.slice(lastSummaryIndex);
    
    if (messagesSinceLastSummary.length >= 16) {
      // Summarize everything EXCEPT the last 6 messages
      const countToSummarize = messagesSinceLastSummary.length - 6;
      const msgsToSummarize = messagesSinceLastSummary.slice(0, countToSummarize);
      
      const result = await summarizeConversation(
        character.name,
        character.source,
        character.memories || "",
        msgsToSummarize,
        user.geminiKey
      );
      
      // Update character with new memories and new index
      const charRef = doc(db, 'characters', character.id);
      const newIndex = lastSummaryIndex + countToSummarize;
      
      await updateDoc(charRef, {
        memories: result.text,
        lastSummarizedIndex: newIndex
      });
      
      // Record tokens consumed
      await addDoc(collection(db, 'characters', character.id, 'summarytokens'), {
        tokensConsumed: result.tokensConsumed,
        dateTimeSummarized: serverTimestamp()
      });
      
      console.log(`[Summary Sync] Memory updated and ${result.tokensConsumed} tokens recorded at index ${newIndex}.`);
    }
  } catch (error) {
    console.error("Background Summarization Error:", error);
  }
};
