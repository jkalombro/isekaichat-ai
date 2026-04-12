import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './lib/AuthContext';
import { signInWithPopup, googleProvider, auth, db, signOut } from './lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, setDoc, where, getDocs, limit, deleteDoc, writeBatch } from 'firebase/firestore';
import { harvestCharacterProfile, getCharacterResponse } from './lib/gemini';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { MessageCircle, Plus, Send, LogOut, User as UserIcon, Loader2, ChevronLeft, Trash2, RotateCcw, Camera, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const APP_LOGO_URL = "https://res.cloudinary.com/dydhpzure/image/upload/v1776006876/properties/jmRnKy9MOjMlknf859PoSGcSBzY2/xgdrmtz20cefd5i87z1c.png";

const AppLogo = ({ className }: { className?: string }) => (
  <img 
    src={APP_LOGO_URL} 
    alt="IsekaiChat Logo" 
    className={className} 
    referrerPolicy="no-referrer"
  />
);

interface Character {
  id: string;
  name: string;
  source: string;
  profile: string;
  ownerId: string;
  avatarUrl?: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'character';
  timestamp: any;
}

export default function App() {
  const { user, loading, isAuthReady } = useAuth();
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
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch characters
  useEffect(() => {
    if (user && isAuthReady) {
      setIsLoggingIn(false);
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

  // Sync selected character with updated data from characters list
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

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await signInWithPopup(auth, googleProvider);
      toast.success("Logged in successfully!");
    } catch (error) {
      setIsLoggingIn(false);
      toast.error("Login failed.");
    }
  };

  const handleLogout = () => signOut(auth);

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

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
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
    
    // Use environment variables with fallback for demo purposes
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
        // If the public cloud fails, we'll try a fallback or explain the issue
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
      // Fallback: If upload fails, we could offer to use a URL directly
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!charName || !charSource || !user) return;

    setIsHarvesting(true);
    try {
      // Check if character already exists in database (any owner)
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
      // Add user message
      await addDoc(collection(db, 'characters', selectedChar.id, 'messages'), {
        chatId: selectedChar.id,
        sender: 'user',
        text: userMsg,
        timestamp: serverTimestamp(),
      });

      setIsTyping(true);

      // Prepare history for Gemini
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

      // Add AI message
      await addDoc(collection(db, 'characters', selectedChar.id, 'messages'), {
        chatId: selectedChar.id,
        sender: 'character',
        text: aiResponse,
        timestamp: serverTimestamp(),
      });

    } catch (error: any) {
      console.error("Gemini Error:", error);
      
      // Check if we already sent the "not feeling well" message recently
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

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 overflow-hidden relative">
        {/* Background decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-400/10 blur-[120px] rounded-full animate-pulse delay-700" />
        
        {/* Floating Visuals */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[10%] left-[5%] w-40 h-40 md:w-64 md:h-64 opacity-10 md:opacity-20"
          >
            <img 
              src="https://picsum.photos/seed/anime-girl-1/600/600" 
              alt="Anime Character" 
              className="w-full h-full object-cover rounded-[3rem] border-4 border-primary/20 shadow-2xl rotate-12"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <motion.div 
            animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[10%] right-[5%] w-40 h-40 md:w-72 md:h-72 opacity-10 md:opacity-20"
          >
            <img 
              src="https://picsum.photos/seed/anime-boy-1/600/600" 
              alt="Anime Character" 
              className="w-full h-full object-cover rounded-[3rem] border-4 border-primary/20 shadow-2xl -rotate-12"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl w-full flex flex-col lg:flex-row items-center gap-12 relative z-10"
        >
          <div className="flex-1 text-center lg:text-left space-y-8">
            <div className="space-y-6 flex flex-col items-center">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="mb-[-1.5rem] relative z-20"
              >
                <AppLogo className="w-20 h-20 drop-shadow-2xl" />
              </motion.div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground leading-none relative z-10">
                Isekai<span className="text-primary">Chat</span>
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
                A mysterious rift has opened, allowing our world to connect to the worlds of fiction. Connect your consciousness now and seize the chance to talk with your favorite character.
              </p>
            </div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                onClick={handleLogin}
                className="h-16 px-10 text-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl transition-all shadow-2xl shadow-primary/40 group"
              >
                Initiate Connection
                <motion.span 
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="ml-2"
                >
                  →
                </motion.span>
              </Button>
            </motion.div>

            <div className="pt-4 flex flex-col items-center lg:items-start gap-4">
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 opacity-60">
                {['KONOHA', 'SOUL SOCIETY', 'GRAND LINE', 'UA HIGH'].map((world) => (
                  <Badge key={world} variant="secondary" className="px-3 py-1 text-[10px] font-bold tracking-widest bg-white/50 backdrop-blur-sm border-primary/10 text-primary">
                    {world}
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground/40 uppercase">
                Dimensional Link v1.0.0
              </p>
            </div>
          </div>

          {/* Animated Sample Chatbox */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="w-full max-w-sm aspect-[3/4] bg-card border-4 border-primary/20 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative"
          >
            <div className="h-12 border-b border-border bg-muted/30 flex items-center px-4 gap-3">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <div className="flex-1 text-center text-[10px] font-bold text-muted-foreground tracking-widest">DIMENSIONAL_LINK_v2.0</div>
            </div>
            
            <div className="flex-1 p-4 space-y-4 overflow-hidden flex flex-col justify-end">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.5 }}
                className="flex justify-start"
              >
                <div className="bg-muted rounded-2xl rounded-tl-none px-3 py-2 text-xs max-w-[85%] border border-border">
                  Wait... who is this? How are you speaking into my mind?
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 3 }}
                className="flex justify-end"
              >
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-none px-3 py-2 text-xs max-w-[85%] shadow-sm">
                  I'm from another world. The rift connected us!
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 4.5 }}
                className="flex justify-start"
              >
                <div className="bg-muted rounded-2xl rounded-tl-none px-3 py-2 text-xs max-w-[85%] border border-border">
                  Another world? *sheathes sword* Interesting... Tell me more, stranger.
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ delay: 6, duration: 2, repeat: Infinity }}
                className="flex justify-start"
              >
                <div className="bg-muted rounded-xl px-3 py-1 flex gap-1">
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-100" />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-200" />
                </div>
              </motion.div>
            </div>

            <div className="p-4 border-t border-border bg-muted/10">
              <div className="h-8 bg-muted/50 rounded-full border border-border flex items-center px-3">
                <div className="text-[10px] text-muted-foreground">Type a message...</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      <Toaster position="top-center" richColors />
      
      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[60] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`w-80 border-r border-border flex flex-col bg-sidebar fixed md:relative inset-y-0 left-0 z-[70] transition-transform duration-300 md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:flex`}>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AppLogo className="w-6 h-6" />
            Connections
          </h2>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsCreating(true)}
              className="hover:bg-sidebar-accent rounded-xl"
            >
              <Plus className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden hover:bg-sidebar-accent rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-4">
          <div className="space-y-2 py-4">
            {characters.map((char) => (
              <button
                key={char.id}
                onClick={() => {
                  setSelectedChar(char);
                  setIsSidebarOpen(false);
                }}
                className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-3 group border ${
                  selectedChar?.id === char.id 
                    ? 'bg-primary/10 border-primary/30 shadow-sm' 
                    : 'hover:bg-sidebar-accent border-transparent'
                }`}
              >
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={char.avatarUrl} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {char.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className={`font-medium truncate ${selectedChar?.id === char.id ? 'text-primary' : 'text-foreground'}`}>
                    {char.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{char.source}</p>
                </div>
              </button>
            ))}
            {characters.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <div className="p-4 bg-muted/50 rounded-3xl inline-block">
                  <MessageCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No active rifts.<br/>Establish your first connection!</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-muted/30 border border-border/50">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoURL || ''} />
              <AvatarFallback><UserIcon className="w-4 h-4" /></AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive rounded-lg">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-background overflow-hidden">
        {selectedChar ? (
          <>
            {/* Chat Header */}
            <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
                  <Menu className="w-5 h-5" />
                </Button>
                <div className="relative group w-10 h-10">
                  <Avatar className="h-10 w-10 border border-border transition-transform group-hover:scale-105">
                    <AvatarImage src={selectedChar.avatarUrl} />
                    <AvatarFallback className="bg-muted">{selectedChar.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  <input 
                    type="file" 
                    onChange={handleFileChange} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                    accept="image/*"
                    title="Update character appearance"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{selectedChar.name}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{selectedChar.source}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsResetting(true)}
                className="text-muted-foreground hover:text-destructive rounded-xl"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </header>

            {/* Messages */}
            <ScrollArea className="flex-1 h-full min-h-0 p-6" viewportRef={scrollRef}>
              <div className="max-w-3xl mx-auto space-y-6 pb-4">
                <div className="text-center py-8">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-tighter border-border text-muted-foreground px-3 py-1 rounded-full">
                    Dimensional link established with {selectedChar.name}
                  </Badge>
                </div>

                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <Avatar className="h-8 w-8 shrink-0 border border-border mb-1">
                      <AvatarImage src={msg.sender === 'user' ? user.photoURL || '' : selectedChar.avatarUrl} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {msg.sender === 'user' ? (user.displayName?.[0] || 'U') : selectedChar.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                      msg.sender === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-card text-card-foreground border border-border rounded-tl-none'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <div className="flex items-end gap-2">
                    <Avatar className="h-8 w-8 shrink-0 border border-border mb-1">
                      <AvatarImage src={selectedChar.avatarUrl} />
                      <AvatarFallback className="text-[10px] bg-muted">{selectedChar.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="bg-card border border-border rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 shadow-sm">
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <footer className="p-6 border-t border-border bg-background">
              <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Send a message to ${selectedChar.name}...`}
                  className="flex-1 bg-muted/50 border-border focus:ring-primary h-12 rounded-2xl"
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || isTyping}
                  className="bg-primary hover:bg-primary/90 h-12 w-12 rounded-2xl p-0 shadow-lg shadow-primary/20"
                >
                  <Send className="w-5 h-5 text-primary-foreground" />
                </Button>
              </form>
            </footer>
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
            <Button 
              onClick={() => setIsCreating(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl px-8 h-12 shadow-lg shadow-primary/20 relative z-10"
            >
              Establish New Link
            </Button>
          </div>
        )}
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md"
            >
              <Card className="bg-card border-border text-foreground shadow-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-3xl">
                    <AppLogo className="w-8 h-8" />
                    Establish Link
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-base">
                    Enter the character's origin to tune the dimensional frequency.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleCreateCharacter}>
                  <CardContent className="space-y-6 pb-10">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Character Name</label>
                      <Input 
                        placeholder="e.g. Harry Potter" 
                        value={charName}
                        onChange={(e) => setCharName(e.target.value)}
                        className="bg-muted/50 border-border h-14 rounded-2xl text-lg px-6"
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Source Universe</label>
                      <Input 
                        placeholder="e.g. Hogwarts" 
                        value={charSource}
                        onChange={(e) => setCharSource(e.target.value)}
                        className="bg-muted/50 border-border h-14 rounded-2xl text-lg px-6"
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-4 pt-2 pb-8">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setIsCreating(false)}
                      className="flex-1 hover:bg-muted rounded-2xl h-14 text-lg font-semibold"
                    >
                      Sever
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isHarvesting}
                      className="flex-1 bg-primary hover:bg-primary/90 h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20"
                    >
                      Connect
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {isResetting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md"
            >
              <Card className="bg-card border-border text-foreground shadow-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-3xl text-destructive">
                    <RotateCcw className="w-8 h-8" />
                    Reset Link
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-base">
                    This will permanently erase all shared memories with {selectedChar?.name}.
                  </CardDescription>
                </CardHeader>
                <div className="px-6 pb-10 space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">
                      Type "forget about me" to confirm
                    </label>
                    <Input 
                      value={resetConfirm}
                      onChange={(e) => setResetConfirm(e.target.value)}
                      className="bg-muted/50 border-border h-14 rounded-2xl text-lg px-6"
                      placeholder="forget about me"
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setIsResetting(false);
                        setResetConfirm('');
                      }}
                      className="flex-1 rounded-2xl h-14 text-lg font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button 
                      disabled={resetConfirm !== 'forget about me'}
                      onClick={handleResetConversation}
                      className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-2xl h-14 text-lg font-bold shadow-xl shadow-destructive/20"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Processing Overlays */}
      <AnimatePresence>
        {(isHarvesting || isResettingMemories || isUploading || isLoggingIn) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <div className="relative bg-card border-2 border-primary/20 p-12 rounded-[3rem] shadow-2xl flex flex-col items-center gap-8 min-w-[320px]">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                  <AppLogo className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 opacity-50" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {isHarvesting ? "Tuning Frequency..." : 
                     isResettingMemories ? "Wiping Memories..." : 
                     isLoggingIn ? "Authenticating Consciousness..." :
                     "Updating Appearance..."}
                  </h3>
                  <p className="text-muted-foreground font-medium">Please wait while the rift stabilizes.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
