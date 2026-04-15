import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Key, Lock, Unlock, ArrowRight } from 'lucide-react';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/shared/services/firebase';
import { testGeminiConnection } from '@/shared/services/gemini';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { toast } from 'sonner';

interface RiftKeyPageProps {
  user: any;
  onLogout: () => void;
}

export const RiftKeyPage = ({ user, onLogout }: RiftKeyPageProps) => {
  const [key, setKey] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      toast.error("Please enter a valid Rift Key.");
      return;
    }

    setIsUnlocking(true);
    try {
      const trimmedKey = key.trim();
      const status = await testGeminiConnection(trimmedKey);
      
      if (status === 'closed') {
        toast.error("The Rift Key provided is invalid or inactive.");
        setIsUnlocking(false);
        return;
      }

      // Final security check: Ensure key uniqueness
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('geminiKey', '==', trimmedKey));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        toast.error("This Rift Key is already linked to another traveler's consciousness.");
        setIsUnlocking(false);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        geminiKey: trimmedKey
      });
      
      toast.success("Dimensional connection stabilized!");
      window.location.reload();
    } catch (error) {
      console.error("Error saving Rift Key:", error);
      toast.error("Failed to stabilize the Rift Key.");
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background relative overflow-hidden p-6">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_70%)] opacity-[0.05]" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[100px] animate-pulse delay-700" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-primary/10 rounded-3xl mb-6 relative">
            <Key className="w-8 h-8 text-primary" />
            <motion.div 
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl"
            />
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">Enter your Rift Key</h1>
          <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
            Provide your key to stabilize the dimensional connection.
          </p>
        </div>

        <Card className="p-8 border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem]">
          <form onSubmit={handleUnlock} className="space-y-6">
            <div className="space-y-2">
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Enter your key here"
                  className="w-full bg-muted/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl py-4 pl-12 pr-4 outline-none transition-all font-mono text-sm"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                type="submit" 
                disabled={isUnlocking || !key.trim()}
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest shadow-lg shadow-primary/20 group"
              >
                {isUnlocking ? (
                  <div className="flex items-center gap-2">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Unlock className="w-5 h-5" />
                    </motion.div>
                    Stabilizing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Unlock
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>

              <Button 
                type="button"
                variant="ghost"
                onClick={onLogout}
                className="w-full h-12 rounded-2xl text-muted-foreground hover:text-foreground font-bold uppercase tracking-widest text-[10px]"
              >
                EXIT THE RIFT
              </Button>
            </div>
          </form>
        </Card>

        <p className="mt-8 text-center text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
          Dimensional Security Protocol Active
        </p>
      </motion.div>
    </div>
  );
};
