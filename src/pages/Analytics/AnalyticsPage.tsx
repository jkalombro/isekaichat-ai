import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, BarChart3, TrendingUp, Users, Zap, X, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/shared/services/firebase';
import { Character, Message, SummaryTokens } from '@/shared/types';
import { capitalize } from '@/shared/utils';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AnalyticsPageProps {
  user: any;
  onBack: () => void;
}

export const AnalyticsPage = ({ user, onBack }: AnalyticsPageProps) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharForGraph, setSelectedCharForGraph] = useState<Character | null>(null);
  const [charMessages, setCharMessages] = useState<any[]>([]);
  const [charSummaryData, setCharSummaryData] = useState<any[]>([]);
  const [activeGraphType, setActiveGraphType] = useState<'conversation' | 'summarization'>('conversation');
  const [modalTotals, setModalTotals] = useState({ overall: 0, conversation: 0, summary: 0, messages: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'characters'), where('ownerId', '==', user.uid));
        const snapshot = await getDocs(q);
        const chars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Character));
        // Sort by token consumption desc
        chars.sort((a, b) => (b.totalTokensConsumed || 0) - (a.totalTokensConsumed || 0));
        setCharacters(chars);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const fetchCharData = async (char: Character) => {
    setSelectedCharForGraph(char);
    setIsModalOpen(true);
    setIsFetchingData(true);
    // Reset data for new character
    setCharMessages([]);
    setCharSummaryData([]);
    setModalTotals({ overall: 0, conversation: 0, summary: 0, messages: 0 });
    
    try {
      // Fetch Messages
      const msgQ = query(collection(db, 'characters', char.id, 'messages'));
      const msgSnapshot = await getDocs(msgQ);
      let totalConversation = 0;
      const totalMessagesCount = msgSnapshot.size;
      const conversationData = msgSnapshot.docs.map(doc => {
        const data = doc.data() as Message;
        const tokens = data.tokensConsumed || 0;
        totalConversation += tokens;
        const date = data.timestamp?.toDate() || new Date();
        return {
          label: date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          tokens: tokens,
          timestamp: date.getTime()
        };
      })
      .filter(d => d.tokens > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-20);

      // Fetch Summaries
      const sumQ = query(collection(db, 'characters', char.id, 'summarytokens'));
      const sumSnapshot = await getDocs(sumQ);
      let totalSummary = 0;
      const summarizationData = sumSnapshot.docs.map(doc => {
        const data = doc.data() as SummaryTokens;
        const tokens = data.tokensConsumed || 0;
        totalSummary += tokens;
        const date = data.dateTimeSummarized?.toDate() || new Date();
        return {
          label: date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          tokens: tokens,
          timestamp: date.getTime()
        };
      })
      .filter(d => d.tokens > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-20);

      setCharMessages(conversationData);
      setCharSummaryData(summarizationData);
      setModalTotals({
        overall: totalConversation + totalSummary,
        conversation: totalConversation,
        summary: totalSummary,
        messages: totalMessagesCount
      });
      setActiveGraphType('conversation');
    } catch (error) {
      console.error("Error fetching char data:", error);
    } finally {
      setIsFetchingData(false);
    }
  };

  const totalTokens = characters.reduce((acc, char) => acc + (char.totalTokensConsumed || 0), 0);
  const phpCost = totalTokens * 0.00000855;

  return (
    <div className="h-full bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <header className="p-6 border-b border-border flex items-center gap-4 bg-card/50 backdrop-blur-md shrink-0 z-20">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-black tracking-tighter uppercase flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Dimensional Analytics
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-primary/5 border-primary/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="w-12 h-12 text-primary" />
              </div>
              <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-1">Total Consumption</p>
              <h2 className="text-3xl font-black text-primary">
                {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : totalTokens.toLocaleString()}
              </h2>
              <p className="text-[10px] text-muted-foreground mt-2">TOKENS_EXCHANGED</p>
            </Card>

            <Card className="p-6 bg-card border-border relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users className="w-12 h-12 text-foreground" />
              </div>
              <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-1">Active Links</p>
              <h2 className="text-3xl font-black">
                {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : characters.length}
              </h2>
              <p className="text-[10px] text-muted-foreground mt-2">DIMENSIONAL_ENTITIES</p>
            </Card>

            <Card className="p-6 bg-card border-border relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp className="w-12 h-12 text-foreground" />
              </div>
              <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-1">Token Cost Calc</p>
              <h2 className="text-3xl font-black">
                {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : `₱${phpCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </h2>
              <p className="text-[10px] text-muted-foreground mt-2">ESTIMATED_PHP_COST</p>
            </Card>
          </div>

          {/* Character List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold tracking-widest uppercase text-muted-foreground px-2">Character Breakdown</h3>
            <div className="grid gap-3">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground animate-pulse">Scanning dimensional frequencies...</div>
              ) : characters.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-3xl border border-dashed border-border">
                  No data available. Establish a link first.
                </div>
              ) : (
                characters.map((char, index) => (
                  <motion.div
                    key={char.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-4 flex lg:flex-row justify-between hover:border-orange-500/30 transition-colors group bg-card/50 backdrop-blur-sm">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative shrink-0">
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarImage src={char.avatarUrl} />
                            <AvatarFallback>{capitalize(char.name)[0]}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -top-1 -left-1 w-4 h-4 bg-background border border-border rounded-full flex items-center justify-center text-[8px] font-bold">
                            {index + 1}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold truncate text-sm">{capitalize(char.name)}</h4>
                          <p className="text-[10px] text-muted-foreground truncate tracking-widest">{capitalize(char.source)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 shrink-0 justify-between md:space-x-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-black text-foreground">{(char.totalTokensConsumed || 0).toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-tighter font-bold">Tokens</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => fetchCharData(char)}
                          disabled={isFetchingData}
                          className="h-8 w-8 rounded-lg hover:bg-orange-500/10 hover:text-orange-500 transition-all"
                        >
                          {isFetchingData && selectedCharForGraph?.id === char.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <BarChart3 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Graph Modal */}
      <AnimatePresence>
        {isModalOpen && selectedCharForGraph && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-card border border-border rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={selectedCharForGraph.avatarUrl} />
                    <AvatarFallback>{capitalize(selectedCharForGraph.name)[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-black tracking-tight">{capitalize(selectedCharForGraph.name)}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Consumption History</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-4 sm:p-8">
                {/* Graph Toggle */}
                <div className="flex bg-muted/50 p-1 rounded-xl mb-6 w-fit mx-auto border border-border">
                  <button
                    onClick={() => setActiveGraphType('conversation')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      activeGraphType === 'conversation' 
                        ? 'bg-primary text-primary-foreground shadow-lg' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    CONVERSATION
                  </button>
                  <button
                    onClick={() => setActiveGraphType('summarization')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      activeGraphType === 'summarization' 
                        ? 'bg-primary text-primary-foreground shadow-lg' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    SUMMARIZATION
                  </button>
                </div>

                <div className="h-[300px] w-full">
                  {isFetchingData ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                      <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Dimensional History</p>
                    </div>
                  ) : (activeGraphType === 'conversation' ? charMessages : charSummaryData).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeGraphType === 'conversation' ? charMessages : charSummaryData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--border), 0.1)" />
                        <XAxis 
                          dataKey="label" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }}
                        />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          labelStyle={{ color: 'hsl(var(--primary))', marginBottom: '4px' }}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '1rem',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                          formatter={(value: number) => [`${value.toLocaleString()} Tokens`, activeGraphType === 'conversation' ? 'Conversation' : 'Summarization']}
                        />
                        <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
                          {(activeGraphType === 'conversation' ? charMessages : charSummaryData).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={activeGraphType === 'conversation' ? "#f97316" : "#8b5cf6"} fillOpacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                      <BarChart3 className="w-12 h-12 opacity-10" />
                      <p className="text-sm font-medium text-center">
                        Insufficient {activeGraphType} data<br />
                        <span className="text-[10px] opacity-50 uppercase tracking-widest">FOR_VISUALIZATION</span>
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 sm:mt-8 p-4 sm:p-6 bg-primary/5 rounded-3xl border border-primary/10 grid grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Total Tokens</p>
                    <p className="text-lg font-black text-primary truncate leading-none">{modalTotals.overall.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Messages</p>
                    <p className="text-lg font-black truncate leading-none">{modalTotals.messages.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1 pt-4 border-t border-primary/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conversation</p>
                    <p className="text-lg font-black truncate leading-none">{modalTotals.conversation.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1 pt-4 border-t border-primary/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Summary</p>
                    <p className="text-lg font-black truncate leading-none">{modalTotals.summary.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
