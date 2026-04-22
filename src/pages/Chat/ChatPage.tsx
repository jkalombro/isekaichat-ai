import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, where, limit, updateDoc, doc, Timestamp, limitToLast } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '@/shared/services/firebase';
import { getCharacterResponse, testGeminiConnection } from '@/shared/services/gemini';
import { Character, Message, CharacterStatus, StatusRecord } from '@/shared/types';
import { capitalize } from '@/shared/utils';
import { Sidebar } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { ModalManager } from './components/ModalManager';
import { ChatHome } from './components/ChatHome';
import { useAuth } from '@/shared/context/AuthContext';
import { useChatStore } from '@/shared/context/ChatContext';
import { calculateTokensForCharacter, checkAndSummarize } from './utils/chatUtils';

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
  const { 
    characters, setCharacters,
    selectedCharId, setSelectedCharId,
    messagesByChar, isSyncing,
    statuses, unreads,
    ensureSync, trackMessageSent,
    incrementUnread, updateStatus,
    setUnstable
  } = useChatStore();

  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [typingCharId, setTypingCharId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messageLimit, setMessageLimit] = useState(20);
  const [geminiStatus, setGeminiStatus] = useState<'stable' | 'unstable' | 'closed'>('stable');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [modalControls, setModalControls] = useState<any>({});
  const prevSelectedCharRef = useRef<Character | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentCharIdRef = useRef<string | null>(selectedCharId);

  useEffect(() => {
    currentCharIdRef.current = selectedCharId;
  }, [selectedCharId]);

  const messages = selectedCharId ? messagesByChar[selectedCharId] || [] : [];
  const isLoadingMessages = selectedCharId ? isSyncing[selectedCharId] : false;
  const hasMoreMessages = messages.length > messageLimit;

  const handleSelectChar = (char: Character | null) => {
    if (prevSelectedCharRef.current) {
      calculateTokensForCharacter(prevSelectedCharRef.current, user);
    }
    if (char && char.id !== selectedCharId) {
      setTypingCharId(null);
      setMessageLimit(20);
    }
    setSelectedCharId(char?.id || null);
    setSelectedChar(char);
    prevSelectedCharRef.current = char;
  };

  const handleLogoutWithCalc = () => {
    if (selectedChar) {
      calculateTokensForCharacter(selectedChar, user);
    }
    onLogout();
  };

  const handleShowAnalyticsWithCalc = () => {
    if (selectedChar) {
      calculateTokensForCharacter(selectedChar, user);
    }
    onShowAnalytics();
  };

  const handleShowDisclaimerWithCalc = () => {
    if (selectedChar) {
      calculateTokensForCharacter(selectedChar, user);
    }
    onShowDisclaimer();
  };

  const handleShowAdminWithCalc = () => {
    if (selectedChar) {
      calculateTokensForCharacter(selectedChar, user);
    }
    onShowAdmin();
  };

  const triggerDelayedReply = async (char: Character) => {
    if (!user) return;

    try {
      setTypingCharId(char.id);
      
      // Use Store to get/fetch messages
      const fetchedMessages = await ensureSync(char.id);
      
      if (fetchedMessages.length === 0) return;

      const lastMsg = fetchedMessages[fetchedMessages.length - 1];
      if (lastMsg.sender !== 'user') return; 

      const lastSummaryIndex = char.lastSummarizedIndex || 0;
      const history = fetchedMessages.slice(lastSummaryIndex, -1).map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.text }]
      }));

      const context = {
        lastConversationTime: lastMsg.timestamp?.toDate?.()?.toISOString() || lastMsg.timestamp?.toString(),
        wasOffline: true,
        userDidNotAnswerQuestion: false,
        memories: char.memories
      };

      const aiResponse = await getCharacterResponse(
        char.name,
        char.source,
        char.profile,
        history,
        lastMsg.text,
        context,
        user.geminiKey,
        selectedModel
      ) as { text: string; tokensConsumed: number };

      const charMsgData = {
        chatId: char.id,
        sender: 'character' as const,
        text: aiResponse.text,
        timestamp: serverTimestamp(),
        tokensConsumed: aiResponse.tokensConsumed
      };

      await addDoc(collection(db, 'characters', char.id, 'messages'), charMsgData);
      setTypingCharId(null);

      // Reset to online if they were unstable/returning
      const currentStatus = statuses[char.id]?.status;
      if (currentStatus === 'unstable') {
        updateStatus(char.id, { status: 'online', lastUpdate: Date.now() });
      }

      handleIncomingReply(char.id, aiResponse.text, aiResponse.tokensConsumed);
      
      // Check for summarization after delayed reply
      // Note: triggerDelayedReply might happen in background, messages state might be stale
      // but onSnapshot will update it. For safety we can pass current messages from closure
      // or just trust the next turn. 
      // User said they want to pass messages to checkAndSummarize.
      checkAndSummarize(char, [...fetchedMessages, charMsgData as any], user);
      
    } catch (error) {
      console.error("Delayed Reply Error:", error);
    } finally {
      setTypingCharId(null);
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

  // Fetch messages
  // This is now handled by the ChatContext auto-syncing when selectedCharId changes
  // We just sync local selectedChar state with the characters list from store
  useEffect(() => {
    if (selectedCharId) {
      const updatedChar = characters.find(c => c.id === selectedCharId);
      if (updatedChar && JSON.stringify(updatedChar) !== JSON.stringify(selectedChar)) {
        setSelectedChar(updatedChar);
      }
    } else {
      setSelectedChar(null);
    }
  }, [characters, selectedCharId, selectedChar]);

  const handleLoadMore = () => {
    if (hasMoreMessages && !isLoadingMessages) {
      setMessageLimit(prev => prev + 20);
    }
  };

  const lastMessageIdRef = useRef<string | null>(null);

  // Reset message ref when character changes
  useEffect(() => {
    lastMessageIdRef.current = null;
  }, [selectedChar?.id]);

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
          isEdited: true,
        });
        setEditingMessage(null);
        toast.success("Message updated.");
      } catch (error) {
        console.error("Edit Error:", error);
        toast.error("Failed to update message.");
      }
      return;
    }

    const charStatus = statuses[selectedChar.id]?.status;

    try {
      await addDoc(collection(db, 'characters', selectedChar.id, 'messages'), {
        chatId: selectedChar.id,
        sender: 'user',
        text: userMsg,
        timestamp: serverTimestamp(),
        tokensConsumed: 0,
      });

      trackMessageSent(selectedChar.id);

      // Only 'online' or 'unstable' characters reply
      if (charStatus !== 'online' && charStatus !== 'unstable') {
        return;
      }

      setTypingCharId(selectedChar.id);

      const lastSummaryIndex = selectedChar.lastSummarizedIndex || 0;
      const history = messages.slice(lastSummaryIndex).map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.text }]
      }));

      const lastCharMsg = [...messages].reverse().find(m => m.sender === 'character');
      const lastUserMsgBeforeThis = [...messages].reverse().find(m => m.sender === 'user');
      
      const userDidNotAnswerQuestion = lastCharMsg?.text.includes('?') && 
        (!lastUserMsgBeforeThis || !lastUserMsgBeforeThis.text.toLowerCase().includes('yes') && !lastUserMsgBeforeThis.text.toLowerCase().includes('no'));

      const context = {
        lastConversationTime: lastCharMsg?.timestamp?.toDate?.()?.toISOString() || lastCharMsg?.timestamp?.toString(),
        wasOffline: charStatus === 'offline',
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

      const docRef = await addDoc(collection(db, 'characters', selectedChar.id, 'messages'), charMsgData);
      setTypingCharId(null);

      // If they were unstable and successfully replied, reset to online
      if (charStatus === 'unstable') {
        updateStatus(selectedChar.id, { status: 'online', lastUpdate: Date.now() });
      }
      
      // Notify about incoming reply (handles unread if user switched away)
      handleIncomingReply(selectedChar.id, aiResponse.text, aiResponse.tokensConsumed);

      checkAndSummarize(selectedChar, [...messages, charMsgData as any], user);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      if (error.message?.includes('503') || error.message?.includes('overloaded') || error.message?.includes('Service Unavailable')) {
        setUnstable(selectedChar.id);
      } else {
        updateStatus(selectedChar.id, { status: 'offline', lastUpdate: Date.now() });
      }
    } finally {
      setTypingCharId(null);
    }
  };

  const handleIncomingReply = (charId: string, text: string, tokens: number) => {
    // If user switched away during the async call, increment unread for that character
    if (currentCharIdRef.current !== charId) {
      incrementUnread(charId);
      toast.info(`New message from ${capitalize(characters.find(c => c.id === charId)?.name || 'character')}`);
    }
  };

  // Trigger delayed replies when characters return to online
  useEffect(() => {
    const checkDelayedReplies = async () => {
      if (!user) return;
      
      const pendingChars = (Object.entries(statuses) as [string, StatusRecord][]).filter(
        ([_, record]) => record.status === 'online' && record.messagedWhileOffline
      );

      for (const [charId, _] of pendingChars) {
        const char = characters.find(c => c.id === charId);
        if (char) {
          // Immediately clear the flag to prevent duplicate triggers
          updateStatus(charId, { messagedWhileOffline: false });
          
          // Small delay before reply to feel natural
          setTimeout(() => triggerDelayedReply(char), 3000);
        }
      }
    };
    checkDelayedReplies();
  }, [statuses, characters, user]);

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <Sidebar 
        characters={characters}
        selectedChar={selectedChar}
        onSelectChar={handleSelectChar}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        setIsCreating={modalControls.setIsCreating}
        user={user}
        isAdmin={isAdmin}
        onLogout={handleLogoutWithCalc}
        onShowDisclaimer={handleShowDisclaimerWithCalc}
        onShowAnalytics={handleShowAnalyticsWithCalc}
        onShowAdmin={handleShowAdminWithCalc}
        onShowMaintenance={() => modalControls.setIsMaintenanceModalOpen?.(true)}
      />

      <main className="flex-1 flex flex-col relative bg-background overflow-hidden">
        {selectedChar ? (
          <>
            <ChatHeader 
              selectedChar={selectedChar}
              setIsSidebarOpen={setIsSidebarOpen}
              setIsConnectionStatusOpen={modalControls.setIsConnectionStatusOpen}
              handleFileChange={handleFileChange}
              status={statuses[selectedChar.id]?.status || 'online'}
            />
            {isLoadingMessages ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                  <Loader2 className="w-12 h-12 text-primary animate-spin relative z-10" />
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Synchronizing Rift</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Retrieving Dimensional Logs...</p>
                </div>
              </div>
            ) : (
              <>
                <MessageList 
                  messages={messages.slice(-messageLimit)}
                  selectedChar={selectedChar}
                  user={user}
                  isTyping={typingCharId === selectedChar.id}
                  status={statuses[selectedChar.id]?.status || 'online'}
                  scrollRef={scrollRef}
                  bottomRef={bottomRef}
                  onLoadMore={handleLoadMore}
                  hasMore={hasMoreMessages}
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
                  isTyping={typingCharId === selectedChar.id}
                  isEditing={!!editingMessage}
                  onCancelEdit={() => {
                    setEditingMessage(null);
                    setNewMessage('');
                  }}
                />
              </>
            )}
          </>
        ) : (
          <ChatHome 
            geminiStatus={geminiStatus}
            isTestingConnection={isTestingConnection}
            checkConnection={checkConnection}
            setIsCreating={modalControls.setIsCreating}
            setIsSidebarOpen={setIsSidebarOpen}
            onOpenManual={() => modalControls.setIsManualModalOpen?.(true)}
          />
        )}
      </main>

      <ModalManager 
        user={user}
        characters={characters}
        selectedChar={selectedChar}
        setSelectedChar={setSelectedChar}
        selectedModel={selectedModel}
        isAdmin={isAdmin}
        isUploading={isUploading}
        onModalStateChange={setModalControls}
      />
    </div>
  );
};
