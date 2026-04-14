import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link2Off } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Character } from '@/shared/types';

interface DeleteModalProps {
  isDeleting: boolean;
  setIsDeleting: (deleting: boolean) => void;
  selectedChar: Character | null;
  deleteConfirm: string;
  setDeleteConfirm: (confirm: string) => void;
  handleDeleteConnection: () => void;
}

export const DeleteModal = ({
  isDeleting,
  setIsDeleting,
  selectedChar,
  deleteConfirm,
  setDeleteConfirm,
  handleDeleteConnection
}: DeleteModalProps) => {
  return (
    <AnimatePresence>
      {isDeleting && (
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
                  <Link2Off className="w-8 h-8" />
                  Sever Link
                </CardTitle>
                <CardDescription className="text-muted-foreground text-base font-medium">
                  This will permanently sever the dimensional connection with {selectedChar?.name}. All data will be lost.
                </CardDescription>
              </CardHeader>
              <div className="px-6 pb-10 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">
                    Type "sever connection" to confirm
                  </label>
                  <Input 
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    className="bg-muted/30 border-border/50 h-14 rounded-xl text-lg px-6 placeholder:opacity-30 font-bold"
                    placeholder="sever connection"
                    autoComplete="off"
                  />
                </div>
                <div className="flex gap-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setIsDeleting(false);
                      setDeleteConfirm('');
                    }}
                    className="flex-1 rounded-xl h-14 text-sm font-black uppercase tracking-widest"
                  >
                    Cancel
                  </Button>
                  <Button 
                    disabled={deleteConfirm !== 'sever connection'}
                    onClick={handleDeleteConnection}
                    className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl h-14 text-sm font-black uppercase tracking-widest shadow-xl shadow-destructive/20"
                  >
                    Sever
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
