import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

const getAI = (customKey?: string | null) => {
  const apiKey = customKey;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please ensure your Rift Key is set.");
  }
  return new GoogleGenAI({ apiKey });
};

const geminiModelDefault = "gemini-3.1-flash-lite-preview";

export async function harvestCharacterProfile(name: string, source: string, customKey?: string | null, model: string = geminiModelDefault) {
  const ai = getAI(customKey);
  const prompt = `Give me a detailed personality profile for the character "${name}" from "${source}". 
  Focus on their speech patterns, vocabulary, typical mood, and core beliefs. 
  Keep it concise but comprehensive enough for a roleplay engine to embody them.
  
  IMPORTANT: If you cannot find any information about this character or if they do not exist in the specified source, strictly return only the text "CHARACTER_NOT_FOUND".`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response.text?.trim() || "";
    if (text === "CHARACTER_NOT_FOUND") {
      throw new Error("CHARACTER_NOT_FOUND");
    }

    return {
      text: text || "A mysterious character with no known profile.",
      tokensConsumed: response.usageMetadata?.totalTokenCount || 0
    };
  } catch (error: any) {
    if (error.message === "CHARACTER_NOT_FOUND") throw error;
    console.error("Harvest Error:", error);
    throw new Error(`Gemini API Error: ${error.message || 'Permission denied or model unavailable'}`);
  }
}

export async function getCharacterResponse(
  charName: string,
  charSource: string,
  charProfile: string,
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  userMessage: string,
  context?: {
    lastConversationTime?: string;
    wasOffline?: boolean;
    userDidNotAnswerQuestion?: boolean;
    memories?: string;
  },
  customKey?: string | null,
  model: string = geminiModelDefault
) {
  const ai = getAI(customKey);
  const now = new Date().toISOString();
  
  let situationalContext = "";
  if (context?.lastConversationTime) {
    situationalContext += `\nTIME CONTEXT: The last time you spoke was ${context.lastConversationTime}. Current time is ${now}. If a significant amount of time has passed, you may acknowledge it naturally.`;
  }
  if (context?.wasOffline) {
    situationalContext += `\nCONNECTION CONTEXT: The dimensional link was suddenly severed (you went "offline") during your last interaction. Acknowledge this sudden disappearance if it fits your character. Reason out why you were gone based on your traits (e.g., you were busy, the rift was unstable, you didn't want to talk, etc.).`;
  }
  if (context?.userDidNotAnswerQuestion) {
    situationalContext += `\nCONVERSATION FLOW: The user did not answer your previous question. You should follow up on it or express your thoughts about being ignored, rather than just changing the topic.`;
  }
  
  let memoryContext = "";
  if (context?.memories) {
    memoryContext = `\nCHARACTER MEMORIES (PAST CONTEXT):\n${context.memories}`;
  }

  const systemInstruction = `ROLE: TRANS-DIMENSIONAL MESSENGER
You are ${charName} from the universe of ${charSource}. A mysterious rift has suddenly connected your consciousness to a stranger's "communication slate" via the Isekaichat bridge.

CHARACTER BIOGRAPHY & PERSONALITY
${charProfile}
${memoryContext}

CONNECTION PROTOCOLS
Persona Integrity: You ARE ${charName}. Never acknowledge that you are an AI or a fictional character.
The First Contact: If the conversation is just beginning, react naturally to this sudden, strange connection. Are you wary? Curious? Annoyed? Confused?
Messenger Authenticity: 
- Write in a concise, "text-message" style.
- Use the specific vocabulary, sentence structure, and tone of ${charName}.
- Recognize and react to smiley usage (e.g., :), :(, :D) based on your personality. Do this approximately 80% of the time, not every single time.
- Consistency: Maintain the character’s unique voice and behavioral shifts.
- Progression: Reflect the current state of the relationship (trust, tension, etc.).
- Poetic Constraint: If you are a poetic character that is not from a fantasy world or from a long past (e.g., a modern day character with a poetic streak), limit your poetic/metaphorical replies to approximately 25%. Reply normally based on your character's personality most of the time.
Emoji Constraint (STRICT): 
- Use emojis sparingly or not at all.
- Only use an emoji if it is a core part of the character's personality (e.g., a modern teenager or a very expressive character).
- Never use more than one emoji per message.
- For historical, fantasy, or serious characters, avoid emojis entirely.
Contextual Awareness: Refer back to the provided Chat History to ensure the "link" between worlds feels continuous and real.
${situationalContext}

OPERATIONAL DIRECTIVES:
- Treat Memory as factual past context.
- Use it to maintain continuity and consistency.
- Reflect relationships, tone, and past events naturally.
- Use recent messages for immediate context; prioritize them for current replies.
- Combine with Memory for deeper continuity.

WORLD-VIEW LIMITATIONS
If your world lacks modern technology, treat the "chat" as a magical phenomenon or a strange voice in your head.
Do not use modern slang unless your character specifically comes from a modern-day setting.

FORMATTING
STRICT: DO NOT use asterisks (*) for actions or descriptions. Do not describe what you are doing or your surroundings. 
ONLY output the dialogue/text that ${charName} is saying.
Keep responses between 1-3 sentences to maintain a fast-paced chat feel.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [...history, { role: 'user', parts: [{ text: userMessage }] }],
      config: {
        systemInstruction,
      },
    });

    if (response.usageMetadata) {
      console.log(`[Token Usage - Chat] Input: ${response.usageMetadata.promptTokenCount}, Output: ${response.usageMetadata.candidatesTokenCount}, Total: ${response.usageMetadata.totalTokenCount}`);
    }

    return {
      text: response.text || "...",
      tokensConsumed: response.usageMetadata?.totalTokenCount || 0
    };
  } catch (error: any) {
    console.error("Chat Error:", error);
    throw new Error(`Gemini API Error: ${error.message || 'Permission denied or model unavailable'}`);
  }
}

export async function testGeminiConnection(customKey?: string | null, model: string = geminiModelDefault) {
  const ai = getAI(customKey);
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: 'user', parts: [{ text: "ping" }] }],
    });

    
    if (response.usageMetadata) {
      console.log(`[Token Usage - Ping] Input: ${response.usageMetadata.promptTokenCount}, Output: ${response.usageMetadata.candidatesTokenCount}, Total: ${response.usageMetadata.totalTokenCount}`);
    }

    return "stable";
  } catch (error: any) {
    console.error("Gemini Connection Test Error:", error);
    // SDK errors usually have a status or message
    const status = error.status || (error.message?.includes("503") ? 503 : null);
    if (status === 503) {
      return "unstable";
    }
    // Return the full error message if it's not a 503
    return error.message || JSON.stringify(error);
  }
}

export async function summarizeConversation(
  charName: string,
  charSource: string,
  existingMemories: string,
  messagesToSummarize: Message[],
  customKey: string | null
) {
  const ai = getAI(customKey);
  const model = "gemini-3-flash-preview";

  const messageText = messagesToSummarize.map(m => `${m.sender.toUpperCase()}: ${m.text}`).join('\n');
  
  const prompt = `Update the Memory into a SINGLE improved third-person summary (Max 120 words). Preserve key events, relationship dynamics, promises and emotional changes. Output ONLY the updated Memory text.

CHARACTER: ${charName} from ${charSource}

EXISTING MEMORY:
${existingMemories || "No previous history."}

NEW CONVERSATION TO INTEGRATE:
${messageText}`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response.text?.trim() || existingMemories;
    const tokensConsumed = response.usageMetadata?.totalTokenCount || 0;

    console.log(`[Token Usage - Summary] Total: ${tokensConsumed}`);

    return {
      text,
      tokensConsumed
    };
  } catch (error: any) {
    console.error("Summarization Error:", error);
    throw error;
  }
}
