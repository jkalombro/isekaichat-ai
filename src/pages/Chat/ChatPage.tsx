import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, where, limit, writeBatch, updateDoc, doc, Timestamp, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { MessageCircle, Link2Off } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '@/shared/services/firebase';
import { harvestCharacterProfile, getCharacterResponse, testGeminiConnection, summarizeConversation } from '@/shared/services/gemini';
import { Character, Message } from '@/shared/types';
import { isSmartMatch } from '@/shared/utils';
import { Button } from '@/shared/components/ui/button';
import { AppLogo } from '@/shared/components/AppLogo';
import { Sidebar } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { CreateModal } from './components/CreateModal';
import { ResetModal } from './components/ResetModal';
import { DeleteModal } from './components/DeleteModal';
import { MaintenanceModal } from './components/MaintenanceModal';
import { ManualModal } from './components/ManualModal';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { ChatHome } from './components/ChatHome';
import { useAuth } from '@/shared/context/AuthContext';

interface ChatPageProps {
  user: any;
  isAuthReady: boolean;
  isAdmin: boolean;
  onLogout: () => void;
  onShowDisclaimer: () => void;
  onShowAnalytics: () => void;
  onShowAdmin: () => void;
}

export const ChatPage = ({ 
  user, 
  isAuthReady, 
  isAdmin,
  onLogout, 
  onShowDisclaimer, 
  onShowAnalytics,
  onShowAdmin
}: ChatPageProps) => {
  const { selectedModel } = useAuth();
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isSeveringLink, setIsSeveringLink] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [resetConfirm, setResetConfirm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<'stable' | 'unstable' | 'closed'>('stable');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const prevSelectedCharRef = useRef<Character | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const calculateTokensForCharacter = async (character: Character) => {
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
          totalTokensConsumed: (character.totalTokensConsumed || 0) + newTokens,
          lastCalculationDatetime: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Token Calculation Error:", error);
    }
  };

  const handleSelectChar = (char: Character | null) => {
    if (prevSelectedCharRef.current) {
      calculateTokensForCharacter(prevSelectedCharRef.current);
    }
    setSelectedChar(char);
    prevSelectedCharRef.current = char;
  };

  const handleLogoutWithCalc = () => {
    if (selectedChar) {
      calculateTokensForCharacter(selectedChar);
    }
    onLogout();
  };

  const handleShowAnalyticsWithCalc = () => {
    if (selectedChar) {
      calculateTokensForCharacter(selectedChar);
    }
    onShowAnalytics();
  };

  const handleShowDisclaimerWithCalc = () => {
    if (selectedChar) {
      calculateTokensForCharacter(selectedChar);
    }
    onShowDisclaimer();
  };

  const handleShowAdminWithCalc = () => {
    if (selectedChar) {
      calculateTokensForCharacter(selectedChar);
    }
    onShowAdmin();
  };

  const checkAndSummarize = async (character: Character, allMsgs: Message[]) => {
    if (!user) return;
    const lastSummaryIndex = character.lastSummarizedIndex || 0;
    const messagesSinceLastSummary = allMsgs.slice(lastSummaryIndex);
    
    if (messagesSinceLastSummary.length >= 16) {
      // Summarize everything EXCEPT the last 6 messages
      const countToSummarize = messagesSinceLastSummary.length - 6;
      const msgsToSummarize = messagesSinceLastSummary.slice(0, countToSummarize);
      
      try {
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
        
        console.log(`[Summary Sync] Memory updated and ${result.tokensConsumed} tokens recorded.`);
      } catch (error) {
        console.error("Background Summarization Error:", error);
      }
    }
  };

  const checkConnection = async () => {
    if (isTestingConnection) return;
    setIsTestingConnection(true);
    const result = await testGeminiConnection(user.geminiKey, selectedModel);
    
    if (result === 'stable') {
      setGeminiStatus('stable');
    } else if (result === 'unstable') {
      setGeminiStatus('unstable');
    } else {
      setGeminiStatus('closed');
      if (isAdmin) {
        toast.error(`Gemini Connection Error: ${result}`);
      }
    }
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
          .map(doc => ({ id: doc.id, ...doc.data() } as Character))
          .sort((a, b) => (b.totalTokensConsumed || 0) - (a.totalTokensConsumed || 0));
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
      
      // Clear memories and index too
      const charRef = doc(db, 'characters', selectedChar.id);
      batch.update(charRef, {
        memories: "",
        lastSummarizedIndex: 0
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

  const handleDeleteConnection = async () => {
    if (deleteConfirm !== 'sever connection' || !selectedChar || !user) return;

    setIsSeveringLink(true);
    try {
      // 1. Delete all messages first
      const q = query(collection(db, 'characters', selectedChar.id, 'messages'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // 2. Delete the character document
      await deleteDoc(doc(db, 'characters', selectedChar.id));
      
      setDeleteConfirm('');
      setIsDeleting(false);
      setSelectedChar(null);
      toast.success("Dimensional link severed.");
    } catch (error: any) {
      toast.error("Failed to sever connection.");
    } finally {
      setIsSeveringLink(false);
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
        const charRef = doc(db, 'characters', selectedChar.id);
        await updateDoc(charRef, { avatarUrl: data.secure_url });
        
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
      // 1. Check if the CURRENT user already has this character (Smart Match)
      const existingInLocal = characters.find(c => 
        isSmartMatch(c.name, c.source, charName, charSource)
      );

      if (existingInLocal) {
        setSelectedChar(existingInLocal);
        setCharName('');
        setCharSource('');
        setIsCreating(false);
        toast.info(`You already have a link with ${existingInLocal.name}.`);
        return;
      }

      // 2. Check if ANY user has this character to reuse profile and avatar (Smart Match)
      // We fetch all characters to ensure case-insensitivity and smart matching
      const globalExistingSnapshot = await getDocs(collection(db, 'characters'));
      const globalChars = globalExistingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Character));
      
      const globalMatch = globalChars.find(c => isSmartMatch(c.name, c.source, charName, charSource));
      
      let profile: any;
      let existingAvatar: string | undefined;

      if (globalMatch) {
        profile = { text: globalMatch.profile, tokensConsumed: 0 };
        existingAvatar = globalMatch.avatarUrl;
        toast.info(`Existing dimensional frequency found for ${globalMatch.name}. Syncing data...`);
      } else {
        profile = await harvestCharacterProfile(charName, charSource, user.geminiKey, selectedModel);
      }

      const characterData: any = {
        name: globalMatch?.name || charName, // Use the existing name if matched
        source: globalMatch?.source || charSource, // Use existing source if matched
        profile: profile.text,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        totalTokensConsumed: profile.tokensConsumed,
        lastCalculationDatetime: serverTimestamp()
      };

      if (existingAvatar) {
        characterData.avatarUrl = existingAvatar;
      }

      await addDoc(collection(db, 'characters'), characterData);

      setCharName('');
      setCharSource('');
      setIsCreating(false);
      toast.success(`Connection established with ${characterData.name}!`);
    } catch (error: any) {
      console.error("Link Error:", error);
      if (error.message === "CHARACTER_NOT_FOUND") {
        toast.error(`Dimensional Rift Error: Could not find ${charName} in ${charSource}. Please verify the character exists.`);
      } else {
        toast.error("The rift is currently unstable. Maybe we try again in few minutes.");
      }
    } finally {
      setIsHarvesting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChar || !user) return;

    const userMsg = newMessage.trim();
    setNewMessage('');
    
    if (editingMessage) {
      try {
        const msgRef = doc(db, 'characters', selectedChar.id, 'messages', editingMessage.id);
        await updateDoc(msgRef, {
          text: userMsg,
          isEdited: true, // Optional: track if edited
        });
        setEditingMessage(null);
        toast.success("Message updated.");
      } catch (error) {
        console.error("Edit Error:", error);
        toast.error("Failed to update message.");
      }
      return;
    }

    try {
      await addDoc(collection(db, 'characters', selectedChar.id, 'messages'), {
        chatId: selectedChar.id,
        sender: 'user',
        text: userMsg,
        timestamp: serverTimestamp(),
        tokensConsumed: 0,
      });

      // Only show typing if we aren't currently "offline"
      if (!isOffline) {
        setIsTyping(true);
      }

      // Filter history to only include messages after lastSummarizedIndex
      const lastSummaryIndex = selectedChar.lastSummarizedIndex || 0;
      const history = messages.slice(lastSummaryIndex).map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.text }]
      }));

      // Determine context
      const lastCharMsg = [...messages].reverse().find(m => m.sender === 'character');
      const lastUserMsgBeforeThis = [...messages].reverse().find(m => m.sender === 'user');
      
      const userDidNotAnswerQuestion = lastCharMsg?.text.includes('?') && 
        (!lastUserMsgBeforeThis || !lastUserMsgBeforeThis.text.toLowerCase().includes('yes') && !lastUserMsgBeforeThis.text.toLowerCase().includes('no'));

      const context = {
        lastConversationTime: lastCharMsg?.timestamp?.toDate?.()?.toISOString() || lastCharMsg?.timestamp?.toString(),
        wasOffline: isOffline,
        userDidNotAnswerQuestion: userDidNotAnswerQuestion,
        memories: selectedChar.memories
      };

      const aiResponse = await getCharacterResponse(
        selectedChar.name,
        selectedChar.source,
        selectedChar.profile,
        history,
        userMsg,
        context,
        user.geminiKey,
        selectedModel
      ) as { text: string; tokensConsumed: number };

      const charMsgData = {
        chatId: selectedChar.id,
        sender: 'character' as const,
        text: aiResponse.text,
        timestamp: serverTimestamp(),
        tokensConsumed: aiResponse.tokensConsumed
      };

      await addDoc(collection(db, 'characters', selectedChar.id, 'messages'), charMsgData);

      setIsOffline(false);

      // Trigger background summarization check
      // We pass the current messages + the new user message and the AI response
      const updatedMessages: Message[] = [
        ...messages, 
        { id: 'temp-user', text: userMsg, sender: 'user', timestamp: new Date() },
        { id: 'temp-ai', text: aiResponse.text, sender: 'character', timestamp: new Date() }
      ];
      checkAndSummarize(selectedChar, updatedMessages);
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
        onSelectChar={handleSelectChar}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        setIsCreating={setIsCreating}
        user={user}
        isAdmin={isAdmin}
        onLogout={handleLogoutWithCalc}
        onShowDisclaimer={handleShowDisclaimerWithCalc}
        onShowAnalytics={handleShowAnalyticsWithCalc}
        onShowAdmin={handleShowAdminWithCalc}
        onShowMaintenance={() => setIsMaintenanceModalOpen(true)}
      />

      <main className="flex-1 flex flex-col relative bg-background overflow-hidden">
        {selectedChar ? (
          <>
            <ChatHeader 
              selectedChar={selectedChar}
              setIsSidebarOpen={setIsSidebarOpen}
              setIsResetting={setIsResetting}
              setIsDeleting={setIsDeleting}
              handleFileChange={handleFileChange}
            />
            <MessageList 
              messages={messages}
              selectedChar={selectedChar}
              user={user}
              isTyping={isTyping}
              isOffline={isOffline}
              scrollRef={scrollRef}
              onEditMessage={(msg) => {
                setEditingMessage(msg);
                setNewMessage(msg.text);
              }}
            />
            <MessageInput 
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              handleSendMessage={handleSendMessage}
              selectedChar={selectedChar}
              isTyping={isTyping}
              isEditing={!!editingMessage}
              onCancelEdit={() => {
                setEditingMessage(null);
                setNewMessage('');
              }}
            />
          </>
        ) : (
          <ChatHome 
            geminiStatus={geminiStatus}
            isTestingConnection={isTestingConnection}
            checkConnection={checkConnection}
            setIsCreating={setIsCreating}
            setIsSidebarOpen={setIsSidebarOpen}
            onOpenManual={() => setIsManualModalOpen(true)}
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

      <DeleteModal 
        isDeleting={isDeleting}
        setIsDeleting={setIsDeleting}
        selectedChar={selectedChar}
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        handleDeleteConnection={handleDeleteConnection}
      />

      <MaintenanceModal 
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
      />

      <ManualModal 
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />

      <ProcessingOverlay 
        isHarvesting={isHarvesting}
        isResettingMemories={isResettingMemories}
        isUploading={isUploading}
        isLoggingIn={false}
        isSeveringLink={isSeveringLink}
      />
    </div>
  );
};
