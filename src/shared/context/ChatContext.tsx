import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, getDocs, Unsubscribe, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Character, Message, LocalStatusMap, StatusRecord, CharacterStatus, UnreadMap } from '../types';
import { useAuth } from './AuthContext';
import { getProactiveCharacterResponse } from '../services/gemini';

const STATUS_KEY = 'character_statuses';
const UNREAD_KEY = 'unread_messages';
const UPDATE_INTERVAL = 3600000; // 1 hour
const ACTIVITY_PERSISTENCE = 900000; // 15 mins
const PROACTIVE_DELAY = 30000; // 30 seconds

interface ChatContextType {
  messagesByChar: Record<string, Message[]>;
  isSyncing: Record<string, boolean>;
  statuses: LocalStatusMap;
  unreads: UnreadMap;
  ensureSync: (charId: string) => Promise<Message[]>;
  trackMessageSent: (charId: string) => void;
  incrementUnread: (charId: string) => void;
  updateStatus: (charId: string, updates: Partial<StatusRecord>) => void;
  setUnstable: (charId: string) => void;
  characters: Character[];
  setCharacters: (chars: Character[]) => void;
  selectedCharId: string | null;
  setSelectedCharId: (id: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const getTimestampMs = (timestamp: any) => {
  if (!timestamp) return Date.now();
  if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
  if (timestamp instanceof Date) return timestamp.getTime();
  if (typeof timestamp === 'number') return timestamp;
  if (typeof timestamp === 'string') return new Date(timestamp).getTime();
  return Date.now();
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthReady } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [messagesByChar, setMessagesByChar] = useState<Record<string, Message[]>>({});
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({});
  const listenersRef = useRef<Record<string, Unsubscribe>>({});
  const syncingRef = useRef<Record<string, boolean>>({});
  const selectedCharIdRef = useRef<string | null>(null);
  const proactiveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    selectedCharIdRef.current = selectedCharId;
  }, [selectedCharId]);

  // --- Status & Unread logic ---
  const [statuses, setStatuses] = useState<LocalStatusMap>(() => {
    const saved = localStorage.getItem(STATUS_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  const [unreads, setUnreads] = useState<UnreadMap>(() => {
    const saved = localStorage.getItem(UNREAD_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  const updateStatus = useCallback((charId: string, updates: Partial<StatusRecord>) => {
    setStatuses(prev => {
      const newStatuses = {
        ...prev,
        [charId]: {
          ...(prev[charId] || { status: 'online', lastUpdate: Date.now() }),
          ...updates
        }
      };
      localStorage.setItem(STATUS_KEY, JSON.stringify(newStatuses));
      return newStatuses;
    });
  }, []);

  const incrementUnread = useCallback((charId: string) => {
    if (charId === selectedCharIdRef.current) return;
    setUnreads(prev => {
      const next = { ...prev, [charId]: (prev[charId] || 0) + 1 };
      localStorage.setItem(UNREAD_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const runProactiveCheck = useCallback(async () => {
    if (!user || !user.geminiKey || characters.length === 0) return;
    
    console.log("[Proactive Check] Triggered. Analyzing online characters...");
    const now = Date.now();
    const currentStatuses = JSON.parse(localStorage.getItem(STATUS_KEY) || '{}') as LocalStatusMap;
    const dayInMs = 24 * 60 * 60 * 1000;

    for (const char of characters) {
      // Re-read statuses inside loop to ensure we have fresh data after previous iterations
      const freshStatuses = JSON.parse(localStorage.getItem(STATUS_KEY) || '{}') as LocalStatusMap;
      const record = freshStatuses[char.id];
      if (!record || record.status !== 'online') continue;
      
      // Skip if currently selected
      if (selectedCharIdRef.current === char.id) continue;

      if (!record.lastMessageSent) {
        // Initialize if null
        updateStatus(char.id, { lastMessageSent: now });
        continue;
      }

      if (now - record.lastMessageSent >= dayInMs) {
        // 20% chance
        if (Math.random() < 0.2) {
          // Must have memory
          if (!char.memories) continue;

          try {
            console.log(`[Proactive Check] Character ${char.name} evaluated for messaging.`);
            const aiResponse = await getProactiveCharacterResponse(
              char.name,
              char.source,
              char.profile,
              char.memories,
              user.geminiKey
            );

            const charMsgData = {
              sender: 'character' as const,
              text: aiResponse.text,
              timestamp: serverTimestamp(),
              tokensConsumed: aiResponse.tokensConsumed
            };

            await addDoc(collection(db, 'characters', char.id, 'messages'), charMsgData);
            updateStatus(char.id, { lastMessageSent: Date.now() });
            incrementUnread(char.id);
            
            // Intentional 1-second delay between character actions to prevent Gemini rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (error) {
            console.error(`Proactive Message Error (${char.name}):`, error);
          }
        }
      }
    }
  }, [user, characters, updateStatus, incrementUnread]);

  const randomizeStatuses = useCallback((chars: Character[]) => {
    const now = Date.now();
    const currentStatuses = JSON.parse(localStorage.getItem(STATUS_KEY) || '{}') as LocalStatusMap;
    const newStatuses = { ...currentStatuses };

    chars.forEach(char => {
      const record = currentStatuses[char.id];
      const needsUpdate = !record || (now - record.lastUpdate >= UPDATE_INTERVAL);

      if (needsUpdate) {
        const isActive = record?.lastMessageSent && (now - record.lastMessageSent < ACTIVITY_PERSISTENCE);
        if (isActive && record.status !== 'unstable') {
          newStatuses[char.id] = { ...record, status: 'online', lastUpdate: now };
        } else if (record?.messagedWhileOffline) {
          newStatuses[char.id] = { ...record, status: 'online', lastUpdate: now, messagedWhileOffline: true };
        } else {
          const rand = Math.random();
          const status: CharacterStatus = rand < 0.6 ? 'online' : 'offline';
          newStatuses[char.id] = { ...(record || {}), status, lastUpdate: now };
        }
      }
    });

    setStatuses(newStatuses);
    localStorage.setItem(STATUS_KEY, JSON.stringify(newStatuses));

    // Proactive check 30 seconds after randomization
    if (proactiveTimeoutRef.current) clearTimeout(proactiveTimeoutRef.current);
    proactiveTimeoutRef.current = setTimeout(runProactiveCheck, PROACTIVE_DELAY);
  }, [runProactiveCheck]);

  useEffect(() => {
    if (characters.length > 0) {
      const currentStatuses = JSON.parse(localStorage.getItem(STATUS_KEY) || '{}') as LocalStatusMap;
      let changed = false;
      characters.forEach(char => {
        if (!currentStatuses[char.id]) {
          currentStatuses[char.id] = { status: 'online', lastUpdate: Date.now() };
          changed = true;
        }
      });
      if (changed) {
        setStatuses(currentStatuses);
        localStorage.setItem(STATUS_KEY, JSON.stringify(currentStatuses));
      }

      randomizeStatuses(characters);
      const interval = setInterval(() => randomizeStatuses(characters), UPDATE_INTERVAL);
      return () => {
        clearInterval(interval);
        if (proactiveTimeoutRef.current) clearTimeout(proactiveTimeoutRef.current);
      }
    }
  }, [characters.length, randomizeStatuses]);

  const trackMessageSent = useCallback((charId: string) => {
    const now = Date.now();
    const currentStatuses = JSON.parse(localStorage.getItem(STATUS_KEY) || '{}') as LocalStatusMap;
    const record = currentStatuses[charId];
    if (record?.status === 'offline') {
      updateStatus(charId, { lastMessageSent: now, messagedWhileOffline: true });
    } else {
      updateStatus(charId, { lastMessageSent: now });
    }
  }, [updateStatus]);

  const setUnstable = useCallback((charId: string) => {
    updateStatus(charId, { status: 'unstable', lastUpdate: Date.now() });
  }, [updateStatus]);

  useEffect(() => {
    if (selectedCharId) {
      setUnreads(prev => {
        const next = { ...prev, [selectedCharId]: 0 };
        localStorage.setItem(UNREAD_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, [selectedCharId]);

  // --- Message Synchronization Logic ---
  
  const ensureSync = useCallback(async (charId: string): Promise<Message[]> => {
    if (listenersRef.current[charId]) {
      // Sync already active, return current messages
      return messagesByChar && messagesByChar[charId] ? messagesByChar[charId] : [];
    }
    if (syncingRef.current[charId]) {
      return [];
    }

    syncingRef.current[charId] = true;
    setIsSyncing(prev => ({ ...prev, [charId]: true }));

    try {
      // Start snapshot
      const messagesRef = collection(db, 'characters', charId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));

      // Wait for initial fetch to return current data immediately for caller
      const initialSnapshot = await getDocs(q);
      const initialMsgs = initialSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      
      setMessagesByChar(prev => ({ ...prev, [charId]: initialMsgs }));
      
      // Set up long-term listener
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        const sortedMsgs = msgs.sort((a, b) => getTimestampMs(a.timestamp) - getTimestampMs(b.timestamp));
        setMessagesByChar(prev => ({ ...prev, [charId]: sortedMsgs }));
        setIsSyncing(prev => ({ ...prev, [charId]: false }));
        syncingRef.current[charId] = false;
      }, (error) => {
        console.error("Firestore sync error:", error);
        setIsSyncing(prev => ({ ...prev, [charId]: false }));
        syncingRef.current[charId] = false;
      });

      listenersRef.current[charId] = unsubscribe;

      // Handle the case where the collection is empty immediately
      if (initialMsgs.length === 0) {
        setIsSyncing(prev => ({ ...prev, [charId]: false }));
        syncingRef.current[charId] = false;
      }

      return initialMsgs;
    } catch (error) {
      console.error("Initial fetch error:", error);
      setIsSyncing(prev => ({ ...prev, [charId]: false }));
      syncingRef.current[charId] = false;
      return [];
    }
  }, []);

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      Object.keys(listenersRef.current).forEach(key => {
        const unsub = listenersRef.current[key];
        if (typeof unsub === 'function') unsub();
      });
    };
  }, []);

  // Auto-sync when char is selected in UI
  useEffect(() => {
    if (selectedCharId && user && isAuthReady) {
      ensureSync(selectedCharId);
    }
  }, [selectedCharId, user, isAuthReady, ensureSync]);

  return (
    <ChatContext.Provider value={{ 
      messagesByChar, 
      isSyncing, 
      statuses, 
      unreads, 
      ensureSync, 
      trackMessageSent, 
      incrementUnread, 
      updateStatus, 
      setUnstable,
      characters,
      setCharacters,
      selectedCharId,
      setSelectedCharId
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatStore = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatStore must be used within a ChatProvider');
  }
  return context;
};
