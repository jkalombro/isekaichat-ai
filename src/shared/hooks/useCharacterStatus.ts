import { useState, useEffect, useCallback, useRef } from 'react';
import { Character, LocalStatusMap, StatusRecord, CharacterStatus, UnreadMap } from '../types';

const STATUS_KEY = 'character_statuses';
const UNREAD_KEY = 'unread_messages';
const LAST_VIEWED_KEY = 'last_viewed_chats';
const UPDATE_INTERVAL = 3600000; // 1 hour
const ACTIVITY_PERSISTENCE = 900000; // 15 mins

export const useCharacterStatus = (characters: Character[], selectedCharId: string | null) => {
  const selectedCharIdRef = useRef(selectedCharId);
  
  useEffect(() => {
    selectedCharIdRef.current = selectedCharId;
  }, [selectedCharId]);

  const [statuses, setStatuses] = useState<LocalStatusMap>(() => {
    const saved = localStorage.getItem(STATUS_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  const [unreads, setUnreads] = useState<UnreadMap>(() => {
    const saved = localStorage.getItem(UNREAD_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  const saveStatuses = useCallback((newStatuses: LocalStatusMap) => {
    setStatuses(newStatuses);
    localStorage.setItem(STATUS_KEY, JSON.stringify(newStatuses));
  }, []);

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

  const randomizeStatuses = useCallback((chars: Character[]) => {
    const now = Date.now();
    const currentStatuses = JSON.parse(localStorage.getItem(STATUS_KEY) || '{}') as LocalStatusMap;
    const newStatuses = { ...currentStatuses };

    chars.forEach(char => {
      const record = currentStatuses[char.id];
      const needsUpdate = !record || (now - record.lastUpdate >= UPDATE_INTERVAL);

      if (needsUpdate) {
        // Persistence check: 15 mins since last message
        const isActive = record?.lastMessageSent && (now - record.lastMessageSent < ACTIVITY_PERSISTENCE);
        
        if (isActive && record.status !== 'unstable') {
            // Keep online if active
            newStatuses[char.id] = {
                ...record,
                status: 'online',
                lastUpdate: now
            };
        } else if (record?.messagedWhileOffline) {
            // Force online if messaged while offline, but KEEP the flag so ChatPage can trigger the reply
            newStatuses[char.id] = {
                ...record,
                status: 'online',
                lastUpdate: now,
                messagedWhileOffline: true 
            };
        } else {
            // Randomize
            const rand = Math.random();
            const status: CharacterStatus = rand < 0.6 ? 'online' : 'offline';
            newStatuses[char.id] = {
                ...(record || {}),
                status,
                lastUpdate: now
            };
        }
      }
    });

    saveStatuses(newStatuses);
  }, [saveStatuses]);

  // Initialize and Interval
  useEffect(() => {
    if (characters.length > 0) {
      // Set new characters to online
      const currentStatuses = JSON.parse(localStorage.getItem(STATUS_KEY) || '{}') as LocalStatusMap;
      let changed = false;
      characters.forEach(char => {
        if (!currentStatuses[char.id]) {
          currentStatuses[char.id] = {
            status: 'online',
            lastUpdate: Date.now()
          };
          changed = true;
        }
      });
      if (changed) saveStatuses(currentStatuses);

      randomizeStatuses(characters);
      
      const interval = setInterval(() => {
        randomizeStatuses(characters);
      }, UPDATE_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [characters.length, randomizeStatuses, saveStatuses]);

  const trackMessageSent = useCallback((charId: string) => {
    const now = Date.now();
    // We fetch freshest status for the check
    const currentStatuses = JSON.parse(localStorage.getItem(STATUS_KEY) || '{}') as LocalStatusMap;
    const record = currentStatuses[charId];
    
    if (record?.status === 'offline') {
        updateStatus(charId, { 
            lastMessageSent: now,
            messagedWhileOffline: true
        });
    } else {
        updateStatus(charId, { lastMessageSent: now });
    }
  }, [updateStatus]);

  const setUnstable = useCallback((charId: string) => {
    updateStatus(charId, { status: 'unstable', lastUpdate: Date.now() });
  }, [updateStatus]);

  // Unread logic - clearing
  useEffect(() => {
    if (selectedCharId) {
        setUnreads(prev => {
            const next = { ...prev, [selectedCharId]: 0 };
            localStorage.setItem(UNREAD_KEY, JSON.stringify(next));
            return next;
        });
    }
  }, [selectedCharId]);

  const incrementUnread = useCallback((charId: string) => {
    // Crucial: Use the ref to check the MOST RECENTLY selected character
    if (charId === selectedCharIdRef.current) return;
    
    setUnreads(prev => {
        const next = { ...prev, [charId]: (prev[charId] || 0) + 1 };
        localStorage.setItem(UNREAD_KEY, JSON.stringify(next));
        return next;
    });
  }, []);

  return {
    statuses,
    unreads,
    trackMessageSent,
    setUnstable,
    incrementUnread,
    updateStatus
  };
};
