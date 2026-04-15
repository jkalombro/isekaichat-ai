import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, BarChart3, TrendingUp, Users, Zap, X, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/shared/services/firebase';
import { Character, Message } from '@/shared/types';
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
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const fetchCharMessages = async (char: Character) => {
    try {
      const q = query(
        collection(db, 'characters', char.id, 'messages'),
        orderBy('timestamp', 'asc')
      );
      const snapshot = await getDocs(q);
      const msgs = snapshot.docs.map(doc => doc.data() as Message);
      
      // Map each message with tokens to a data point
      const chartData = msgs
        .filter(msg => msg.tokensConsumed && msg.tokensConsumed > 0)
        .map(msg => {
          const date = msg.timestamp?.toDate() || new Date();
          return {
            label: date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            tokens: msg.tokensConsumed,
            fullDate: date.toLocaleString()
          };
        })
        .slice(-20); // Show last 20 messages for readability

      setCharMessages(chartData);
      setSelectedCharForGraph(char);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching char messages:", error);
    }
  };

  const totalTokens = characters.reduce((acc, char) => acc + (char.totalTokensConsumed || 0), 0);
  const phpCost = totalTokens * 0.00000855;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-border flex items-center gap-4 bg-card/50 backdrop-blur-md sticky top-0 z-20">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-black tracking-tighter uppercase flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Dimensional Analytics
        </h1>
      </header>

      <ScrollArea className="flex-1">
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
                            <AvatarFallback>{char.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -top-1 -left-1 w-4 h-4 bg-background border border-border rounded-full flex items-center justify-center text-[8px] font-bold">
                            {index + 1}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold truncate text-sm">{char.name}</h4>
                          <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">{char.source}</p>
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
                          onClick={() => fetchCharMessages(char)}
                          className="h-8 w-8 rounded-lg hover:bg-orange-500/10 hover:text-orange-500 transition-all"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Graph Modal */}
      <AnimatePresence>
        {isModalOpen && selectedCharForGraph && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                    <AvatarFallback>{selectedCharForGraph.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-black uppercase tracking-tight">{selectedCharForGraph.name}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Consumption History</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-8">
                <div className="h-[300px] w-full">
                  {charMessages.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charMessages}>
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
                          formatter={(value: number) => [`${value.toLocaleString()} Tokens`, 'Consumption']}
                        />
                        <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
                          {charMessages.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="#f97316" fillOpacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                      <BarChart3 className="w-12 h-12 opacity-10" />
                      <p className="text-sm font-medium">Insufficient temporal data for visualization.</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Total for Character</p>
                    <p className="text-2xl font-black text-primary">{(selectedCharForGraph.totalTokensConsumed || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
                    <p className="text-sm font-bold text-foreground">LINK_ACTIVE</p>
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
