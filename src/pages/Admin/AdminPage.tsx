import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Shield, TrendingUp, Users, Zap, X, BarChart3, Loader2 } from 'lucide-react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/shared/services/firebase';
import { Character } from '@/shared/types';
import { capitalize } from '@/shared/utils';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  totalTokens?: number;
  characters?: Character[];
}

interface AdminPageProps {
  onBack: () => void;
}

export const AdminPage = ({ onBack }: AdminPageProps) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserForBreakdown, setSelectedUserForBreakdown] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // 1. Fetch all users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => doc.data() as UserProfile);

        // 2. Fetch all characters to aggregate tokens
        const charsSnapshot = await getDocs(collection(db, 'characters'));
        const allChars = charsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Character));

        // 3. Aggregate
        const usersWithStats = usersData.map(user => {
          const userChars = allChars.filter(char => char.ownerId === user.uid);
          const totalTokens = userChars.reduce((acc, char) => acc + (char.totalTokensConsumed || 0), 0);
          return {
            ...user,
            totalTokens,
            characters: userChars.sort((a, b) => (b.totalTokensConsumed || 0) - (a.totalTokensConsumed || 0))
          };
        });

        // 4. Sort users by total tokens desc
        usersWithStats.sort((a, b) => (b.totalTokens || 0) - (a.totalTokens || 0));
        setUsers(usersWithStats);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const totalGlobalTokens = users.reduce((acc, user) => acc + (user.totalTokens || 0), 0);
  const globalPhpCost = totalGlobalTokens * 0.00000855;

  return (
    <div className="h-full bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <header className="p-6 border-b border-border flex items-center gap-4 bg-card/50 backdrop-blur-md shrink-0 z-20">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-black tracking-tighter uppercase flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Dimensional Overseer
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
              <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-1">Global Consumption</p>
              <h2 className="text-3xl font-black text-primary">
                {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : totalGlobalTokens.toLocaleString()}
              </h2>
              <p className="text-[10px] text-muted-foreground mt-2">TOTAL_RIFT_ENERGY</p>
            </Card>

            <Card className="p-6 bg-card border-border relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users className="w-12 h-12 text-foreground" />
              </div>
              <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-1">Total Travelers</p>
              <h2 className="text-3xl font-black">
                {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : users.length}
              </h2>
              <p className="text-[10px] text-muted-foreground mt-2">ACTIVE_CONSCIOUSNESS</p>
            </Card>

            <Card className="p-6 bg-card border-border relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp className="w-12 h-12 text-foreground" />
              </div>
              <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-1">Token Cost Calc</p>
              <h2 className="text-3xl font-black">
                {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : `₱${globalPhpCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </h2>
              <p className="text-[10px] text-muted-foreground mt-2">GLOBAL_PHP_COST</p>
            </Card>
          </div>

          {/* User List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold tracking-widest uppercase text-muted-foreground px-2">Traveler Directory</h3>
            <div className="grid gap-3">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground animate-pulse">Scanning dimensional identities...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-3xl border border-dashed border-border">
                  No travelers found in the rift.
                </div>
              ) : (
                users.map((user, index) => (
                  <motion.div
                    key={user.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-4 flex lg:flex-row justify-between hover:border-orange-500/30 transition-colors group bg-card/50 backdrop-blur-sm">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative shrink-0">
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarImage src={user.photoURL} />
                            <AvatarFallback>{user.displayName?.[0] || user.email[0]}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -top-1 -left-1 w-4 h-4 bg-background border border-border rounded-full flex items-center justify-center text-[8px] font-bold">
                            {index + 1}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold truncate text-sm">{user.displayName || 'Anonymous Traveler'}</h4>
                          <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 shrink-0 justify-between md:space-x-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-black text-foreground">{(user.totalTokens || 0).toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-tighter font-bold">Tokens</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setSelectedUserForBreakdown(user);
                            setIsModalOpen(true);
                          }}
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
      </div>

      {/* Breakdown Modal */}
      <AnimatePresence>
        {isModalOpen && selectedUserForBreakdown && (
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
              className="relative w-full max-w-2xl bg-card border border-border rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={selectedUserForBreakdown.photoURL} />
                    <AvatarFallback>{selectedUserForBreakdown.displayName?.[0] || selectedUserForBreakdown.email[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-black uppercase tracking-tight">{selectedUserForBreakdown.displayName || 'Traveler'}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Character Breakdown</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                  {selectedUserForBreakdown.characters && selectedUserForBreakdown.characters.length > 0 ? (
                    selectedUserForBreakdown.characters.map((char, idx) => (
                      <Card key={char.id} className="p-4 flex flex-col md:flex-row justify-between bg-muted/20 border-border/50">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarImage src={char.avatarUrl} />
                            <AvatarFallback>{capitalize(char.name)[0]}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-bold truncate">{capitalize(char.name)}</p>
                            <p className="text-[10px] text-muted-foreground tracking-widest truncate">{capitalize(char.source)}</p>
                          </div>
                        </div>
                        <div className="flex flex-row items-end gap-1.5 min-w-[100px] text-left md:text-right">
                          <p className="text-sm font-black">{(char.totalTokensConsumed || 0).toLocaleString()}</p>
                          <p className="text-[8px] text-muted-foreground uppercase font-bold">Tokens</p>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No dimensional links established by this traveler.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 border-t border-border bg-muted/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Total Consumption</p>
                    <p className="text-2xl font-black text-primary">{(selectedUserForBreakdown.totalTokens || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Traveler ID</p>
                    <p className="text-[10px] font-mono text-foreground opacity-50">{selectedUserForBreakdown.uid}</p>
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
