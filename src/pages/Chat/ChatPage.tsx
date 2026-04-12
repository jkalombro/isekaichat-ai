import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, where, limit, writeBatch } from 'firebase/firestore';
import { toast } from 'sonner';
import { MessageCircle } from 'lucide-react';
import { db } from '@/shared/services/firebase';
import { harvestCharacterProfile, getCharacterResponse } from '@/shared/services/gemini';
import { Character, Message } from '@/shared/types';
import { Button } from '@/shared/components/ui/button';
import { Sidebar } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { MessageList } from './components/MessageList';
import { MessageInput } from './components/MessageInput';
import { CreateModal } from './components/CreateModal';
import { ResetModal } from './components/ResetModal';
import { ProcessingOverlay } from './components/ProcessingOverlay';

interface ChatPageProps {
  user: any;
  isAuthReady: boolean;
  onLogout: () => void;
}

export const ChatPage = ({ user, isAuthReady, onLogout }: ChatPageProps) => {
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
  
  const scrollRef = useRef<HTMLDivElement>(null);

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
      const existingQuery = query(
        collection(db, 'characters'),
        where('name', '==', charName),
        where('source', '==', charSource),
        limit(1)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      let profile: string;
      if (!existingSnapshot.empty) {
        profile = existingSnapshot.docs[0].data().profile;
        toast.info("Existing dimensional frequency found. Connecting...");
      } else {
        profile = await harvestCharacterProfile(charName, charSource);
      }

      await addDoc(collection(db, 'characters'), {
        name: charName,
        source: charSource,
        profile: profile,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      setCharName('');
      setCharSource('');
      setIsCreating(false);
      toast.success(`Connection established with ${charName}!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to establish connection.");
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

      setIsTyping(true);

      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.text }]
      }));

      const aiResponse = await getCharacterResponse(
        selectedChar.name,
        selectedChar.source,
        selectedChar.profile,
        history,
        userMsg
      );

      await addDoc(collection(db, 'characters', selectedChar.id, 'messages'), {
        chatId: selectedChar.id,
        sender: 'character',
        text: aiResponse,
        timestamp: serverTimestamp(),
      });

    } catch (error: any) {
      console.error("Gemini Error:", error);
      const lastMsg = messages[messages.length - 1];
      const errorResponse = "I'm not feeling well right now. Can we chat some other time?";
      
      if (!lastMsg || lastMsg.text !== errorResponse) {
        try {
          await addDoc(collection(db, 'characters', selectedChar.id, 'messages'), {
            chatId: selectedChar.id,
            sender: 'character',
            text: errorResponse,
            timestamp: serverTimestamp(),
          });
        } catch (dbError) {
          console.error("Failed to save error message to DB:", dbError);
        }
      }
      toast.error("The dimensional link is flickering. The character seems unwell.");
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_70%)] opacity-[0.03]" />
            <div className="w-24 h-24 bg-muted rounded-[2.5rem] flex items-center justify-center border border-border relative z-10">
              <MessageCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="space-y-2 relative z-10">
              <h3 className="text-3xl font-bold tracking-tight">Select a Connection</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                The bridge is ready. Choose a character or establish a new dimensional link.
              </p>
            </div>
            <div className="flex flex-col gap-3 relative z-10 w-full max-w-xs mx-auto">
              <Button 
                onClick={() => setIsCreating(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl px-8 h-12 shadow-lg shadow-primary/20"
              >
                Establish New Link
              </Button>
              <Button 
                variant="outline"
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden border-border hover:bg-muted rounded-2xl px-8 h-12"
              >
                Select from Connections
              </Button>
            </div>
          </div>
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
