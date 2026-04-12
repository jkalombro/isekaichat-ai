import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Character } from '@/shared/types';

interface ResetModalProps {
  isResetting: boolean;
  setIsResetting: (resetting: boolean) => void;
  selectedChar: Character | null;
  resetConfirm: string;
  setResetConfirm: (confirm: string) => void;
  handleResetConversation: () => void;
}

export const ResetModal = ({
  isResetting,
  setIsResetting,
  selectedChar,
  resetConfirm,
  setResetConfirm,
  handleResetConversation
}: ResetModalProps) => {
  return (
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
                <CardTitle className="flex items-center gap-3 text-3xl text-destructive font-black tracking-tighter uppercase">
                  <RotateCcw className="w-8 h-8" />
                  Reset Link
                </CardTitle>
                <CardDescription className="text-muted-foreground text-base font-medium">
                  This will permanently erase all shared memories with {selectedChar?.name}.
                </CardDescription>
              </CardHeader>
              <div className="px-6 pb-10 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">
                    Type "forget about me" to confirm
                  </label>
                  <Input 
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    className="bg-muted/30 border-border/50 h-14 rounded-xl text-lg px-6 placeholder:opacity-30 font-bold"
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
                    className="flex-1 rounded-xl h-14 text-sm font-black uppercase tracking-widest"
                  >
                    Cancel
                  </Button>
                  <Button 
                    disabled={resetConfirm !== 'forget about me'}
                    onClick={handleResetConversation}
                    className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl h-14 text-sm font-black uppercase tracking-widest shadow-xl shadow-destructive/20"
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
  );
};
