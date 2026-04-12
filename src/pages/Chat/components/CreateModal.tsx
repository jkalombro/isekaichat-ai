import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { AppLogo } from '@/shared/components/AppLogo';

interface CreateModalProps {
  isCreating: boolean;
  setIsCreating: (creating: boolean) => void;
  charName: string;
  setCharName: (name: string) => void;
  charSource: string;
  setCharSource: (source: string) => void;
  handleCreateCharacter: (e: React.FormEvent) => void;
  isHarvesting: boolean;
}

export const CreateModal = ({
  isCreating,
  setIsCreating,
  charName,
  setCharName,
  charSource,
  setCharSource,
  handleCreateCharacter,
  isHarvesting
}: CreateModalProps) => {
  return (
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
                <CardTitle className="flex items-center gap-3 text-3xl font-black tracking-tighter uppercase">
                  <AppLogo className="w-8 h-8" />
                  Establish Link
                </CardTitle>
                <CardDescription className="text-muted-foreground text-base font-medium">
                  Enter the character's origin to tune the dimensional frequency.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateCharacter}>
                <CardContent className="space-y-6 pb-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">Character Name</label>
                    <Input 
                      placeholder="e.g. Eren Jaeger" 
                      value={charName}
                      onChange={(e) => setCharName(e.target.value)}
                      className="bg-muted/30 border-border/50 h-14 rounded-xl text-lg px-6 placeholder:opacity-30 font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">Source Universe</label>
                    <Input 
                      placeholder="e.g. Attack on Titan" 
                      value={charSource}
                      onChange={(e) => setCharSource(e.target.value)}
                      className="bg-muted/30 border-border/50 h-14 rounded-xl text-lg px-6 placeholder:opacity-30 font-bold"
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex gap-4 pt-2 pb-8">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setIsCreating(false)}
                    className="flex-1 hover:bg-muted rounded-xl h-14 text-sm font-black uppercase tracking-widest"
                  >
                    Sever
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isHarvesting}
                    className="flex-1 bg-primary hover:bg-primary/90 h-14 rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20"
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
  );
};
