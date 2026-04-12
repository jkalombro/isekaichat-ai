import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './lib/AuthContext';
import { signInWithPopup, googleProvider, auth, db, signOut } from './lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, setDoc, where, getDocs, limit } from 'firebase/firestore';
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
import { MessageCircle, Plus, Send, LogOut, User as UserIcon, Sparkles, Loader2, ChevronLeft, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Character {
  id: string;
  name: string;
  source: string;
  profile: string;
  ownerId: string;
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
      await signInWithPopup(auth, googleProvider);
      toast.success("Logged in successfully!");
    } catch (error) {
      toast.error("Login failed.");
    }
  };

  const handleLogout = () => signOut(auth);

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
      toast.error(error.message || "Failed to send message.");
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
            <div className="space-y-6">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="inline-block p-4 bg-primary/10 rounded-3xl border-2 border-primary/20 shadow-inner"
              >
                <Sparkles className="w-12 h-12 text-primary" />
              </motion.div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground leading-none">
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

            <div className="pt-4 flex flex-wrap justify-center lg:justify-start gap-2 opacity-60">
              {['KONOHA', 'SOUL SOCIETY', 'GRAND LINE', 'UA HIGH'].map((world) => (
                <Badge key={world} variant="secondary" className="px-3 py-1 text-[10px] font-bold tracking-widest bg-white/50 backdrop-blur-sm border-primary/10 text-primary">
                  {world}
                </Badge>
              ))}
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
      
      {/* Sidebar */}
      <aside className="w-80 border-r border-border flex flex-col bg-sidebar hidden md:flex">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Connections
          </h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsCreating(true)}
            className="hover:bg-sidebar-accent rounded-xl"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-4">
          <div className="space-y-2 py-4">
            {characters.map((char) => (
              <button
                key={char.id}
                onClick={() => setSelectedChar(char)}
                className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-3 group border ${
                  selectedChar?.id === char.id 
                    ? 'bg-primary/10 border-primary/30 shadow-sm' 
                    : 'hover:bg-sidebar-accent border-transparent'
                }`}
              >
                <Avatar className="h-10 w-10 border border-border">
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
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedChar(null)}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-muted">{selectedChar.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm">{selectedChar.name}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{selectedChar.source}</p>
                </div>
              </div>
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
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                      msg.sender === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-card text-card-foreground border border-border rounded-tl-none'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
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
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Sparkles className="w-6 h-6 text-primary" />
                    Establish Link
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Enter the character's origin to tune the dimensional frequency.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleCreateCharacter}>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest ml-1">Character Name</label>
                      <Input 
                        placeholder="e.g. Harry Potter" 
                        value={charName}
                        onChange={(e) => setCharName(e.target.value)}
                        className="bg-muted/50 border-border h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest ml-1">Source Universe</label>
                      <Input 
                        placeholder="e.g. Hogwarts" 
                        value={charSource}
                        onChange={(e) => setCharSource(e.target.value)}
                        className="bg-muted/50 border-border h-12 rounded-xl"
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-3 pt-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setIsCreating(false)}
                      className="flex-1 hover:bg-muted rounded-xl h-12"
                    >
                      Sever
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isHarvesting}
                      className="flex-1 bg-primary hover:bg-primary/90 h-12 rounded-xl shadow-lg shadow-primary/20"
                    >
                      {isHarvesting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Tuning...
                        </>
                      ) : (
                        'Connect'
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
