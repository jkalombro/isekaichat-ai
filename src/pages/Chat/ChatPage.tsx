import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, where, limit, writeBatch } from 'firebase/firestore';
import { toast } from 'sonner';
import { MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '@/shared/services/firebase';
import { harvestCharacterProfile, getCharacterResponse, testGeminiConnection } from '@/shared/services/gemini';
import { Character, Message } from '@/shared/types';
import { Button } from '@/shared/components/ui/button';
import { AppLogo } from '@/shared/components/AppLogo';
import { Sidebar } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { CreateModal } from './components/CreateModal';
import { ResetModal } from './components/ResetModal';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { ChatHome } from './components/ChatHome';

interface ChatPageProps {
  user: any;
  isAuthReady: boolean;
  onLogout: () => void;
  onShowDisclaimer: () => void;
}

export const ChatPage = ({ user, isAuthReady, onLogout, onShowDisclaimer }: ChatPageProps) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [charName, setCharName] = useState('');
  const [charSource, setCharSource] = useState('');
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResettingMemories, setIsResettingMemories] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<'stable' | 'unstable' | 'closed'>('stable');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkConnection = async () => {
    if (isTestingConnection) return;
    setIsTestingConnection(true);
    const status = await testGeminiConnection();
    setGeminiStatus(status);
    setIsTestingConnection(false);
  };

  useEffect(() => {
    if (user && isAuthReady) {
      checkConnection();
    }
  }, [user, isAuthReady]);

  // Fetch characters
  useEffect(() => {
    if (user && isAuthReady) {
      const q = query(
        collection(db, 'characters'),
        where('ownerId', '==', user.uid)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const chars = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Character));
        setCharacters(chars);
      }, (error) => {
        console.error("Characters Fetch Error:", error);
      });
      return () => unsubscribe();
    }
  }, [user, isAuthReady]);

  // Sync selected character
  useEffect(() => {
    if (selectedChar) {
      const updatedChar = characters.find(c => c.id === selectedChar.id);
      if (updatedChar && JSON.stringify(updatedChar) !== JSON.stringify(selectedChar)) {
        setSelectedChar(updatedChar);
      }
    }
  }, [characters, selectedChar]);

  // Fetch messages
  useEffect(() => {
    if (selectedChar && user) {
      const q = query(
        collection(db, 'characters', selectedChar.id, 'messages'),
        orderBy('timestamp', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(msgs);
      });
      return () => unsubscribe();
    } else {
      setMessages([]);
    }
  }, [selectedChar, user]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleResetConversation = async () => {
    if (resetConfirm !== 'forget about me' || !selectedChar || !user) return;

    setIsResettingMemories(true);
    try {
      const q = query(collection(db, 'characters', selectedChar.id, 'messages'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      setResetConfirm('');
      setIsResetting(false);
      toast.success("Dimensional memory wiped.");
    } catch (error: any) {
      toast.error("Failed to reset conversation.");
    } finally {
      setIsResettingMemories(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedChar) {
      toast.error("No character selected for connection.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'cloudinary-training';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'unsigned_preset';
    
    formData.append('upload_preset', uploadPreset); 

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Dimensional sync failed. The rift is unstable.");
      }

      const data = await response.json();
      
      if (data.secure_url) {
        const q = query(
          collection(db, 'characters'),
          where('name', '==', selectedChar.name),
          where('source', '==', selectedChar.source)
        );
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((charDoc) => {
          batch.update(charDoc.ref, { avatarUrl: data.secure_url });
        });
        await batch.commit();
        
        setSelectedChar(prev => prev ? { ...prev, avatarUrl: data.secure_url } : null);
        toast.success("Character appearance updated across dimensions.");
      }
    } catch (error: any) {
      console.error("Upload Error:", error);
      toast.error(`Rift Error: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!charName || !charSource || !user) return;

    setIsHarvesting(true);
    try {
      // 1. Check if the CURRENT user already has this character
      const userExistingQuery = query(
        collection(db, 'characters'),
        where('ownerId', '==', user.uid),
        where('name', '==', charName),
        where('source', '==', charSource),
        limit(1)
      );
      const userExistingSnapshot = await getDocs(userExistingQuery);

      if (!userExistingSnapshot.empty) {
        const existingChar = { id: userExistingSnapshot.docs[0].id, ...userExistingSnapshot.docs[0].data() } as Character;
        setSelectedChar(existingChar);
        setCharName('');
        setCharSource('');
        setIsCreating(false);
        toast.info(`You already have a link with ${charName}.`);
        return;
      }

      // 2. Check if ANY user has this character to reuse profile and avatar
      const globalExistingQuery = query(
        collection(db, 'characters'),
        where('name', '==', charName),
        where('source', '==', charSource),
        limit(1)
      );
      const globalExistingSnapshot = await getDocs(globalExistingQuery);
      
      let profile: string;
      let existingAvatar: string | undefined;

      if (!globalExistingSnapshot.empty) {
        const data = globalExistingSnapshot.docs[0].data();
        profile = data.profile;
        existingAvatar = data.avatarUrl;
        toast.info("Existing dimensional frequency found. Syncing data...");
      } else {
        profile = await harvestCharacterProfile(charName, charSource);
      }

      const characterData: any = {
        name: charName,
        source: charSource,
        profile: profile,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      };

      if (existingAvatar) {
        characterData.avatarUrl = existingAvatar;
      }

      const newDoc = await addDoc(collection(db, 'characters'), characterData);

      setCharName('');
      setCharSource('');
      setIsCreating(false);
      toast.success(`Connection established with ${charName}!`);
    } catch (error: any) {
      console.error("Link Error:", error);
      toast.error("The rift is currently unstable. Maybe we try again in few minutes.");
    } finally {
      setIsHarvesting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChar || !user) return;

    const userMsg = newMessage.trim();
    setNewMessage('');
    
    try {
      await addDoc(collection(db, 'characters', selectedChar.id, 'messages'), {
        chatId: selectedChar.id,
        sender: 'user',
        text: userMsg,
        timestamp: serverTimestamp(),
      });

      // Only show typing if we aren't currently "offline"
      if (!isOffline) {
        setIsTyping(true);
      }

      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.text }]
      }));

      // Determine context
      const lastCharMsg = [...messages].reverse().find(m => m.sender === 'character');
      const lastUserMsgBeforeThis = [...messages].reverse().find(m => m.sender === 'user');
      
      const userDidNotAnswerQuestion = lastCharMsg?.text.includes('?') && 
        (!lastUserMsgBeforeThis || !lastUserMsgBeforeThis.text.toLowerCase().includes('yes') && !lastUserMsgBeforeThis.text.toLowerCase().includes('no'));
        // This is a very simple heuristic for "did not answer question"

      const context = {
        lastConversationTime: lastCharMsg?.timestamp?.toDate?.()?.toISOString() || lastCharMsg?.timestamp?.toString(),
        wasOffline: isOffline,
        userDidNotAnswerQuestion: userDidNotAnswerQuestion
      };

      const aiResponse = await getCharacterResponse(
        selectedChar.name,
        selectedChar.source,
        selectedChar.profile,
        history,
        userMsg,
        context
      );

      await addDoc(collection(db, 'characters', selectedChar.id, 'messages'), {
        chatId: selectedChar.id,
        sender: 'character',
        text: aiResponse,
        timestamp: serverTimestamp(),
      });

      setIsOffline(false);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      setIsOffline(true);
      // No toast or character reply on Gemini error as per request
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <Sidebar 
        characters={characters}
        selectedChar={selectedChar}
        onSelectChar={setSelectedChar}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        setIsCreating={setIsCreating}
        user={user}
        onLogout={onLogout}
        onShowDisclaimer={onShowDisclaimer}
      />

      <main className="flex-1 flex flex-col relative bg-background overflow-hidden">
        {selectedChar ? (
          <>
            <ChatHeader 
              selectedChar={selectedChar}
              setIsSidebarOpen={setIsSidebarOpen}
              setIsResetting={setIsResetting}
              handleFileChange={handleFileChange}
            />
            <MessageList 
              messages={messages}
              selectedChar={selectedChar}
              user={user}
              isTyping={isTyping}
              isOffline={isOffline}
              scrollRef={scrollRef}
            />
            <MessageInput 
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              handleSendMessage={handleSendMessage}
              selectedChar={selectedChar}
              isTyping={isTyping}
            />
          </>
        ) : (
          <ChatHome 
            geminiStatus={geminiStatus}
            isTestingConnection={isTestingConnection}
            checkConnection={checkConnection}
            setIsCreating={setIsCreating}
            setIsSidebarOpen={setIsSidebarOpen}
          />
        )}
      </main>

      <CreateModal 
        isCreating={isCreating}
        setIsCreating={setIsCreating}
        charName={charName}
        setCharName={setCharName}
        charSource={charSource}
        setCharSource={setCharSource}
        handleCreateCharacter={handleCreateCharacter}
        isHarvesting={isHarvesting}
      />

      <ResetModal 
        isResetting={isResetting}
        setIsResetting={setIsResetting}
        selectedChar={selectedChar}
        resetConfirm={resetConfirm}
        setResetConfirm={setResetConfirm}
        handleResetConversation={handleResetConversation}
      />

      <ProcessingOverlay 
        isHarvesting={isHarvesting}
        isResettingMemories={isResettingMemories}
        isUploading={isUploading}
        isLoggingIn={false}
      />
    </div>
  );
};
