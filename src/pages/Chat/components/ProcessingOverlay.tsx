import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { AppLogo } from '@/shared/components/AppLogo';

interface ProcessingOverlayProps {
  isHarvesting: boolean;
  isResettingMemories: boolean;
  isUploading: boolean;
  isLoggingIn: boolean;
  isSeveringLink?: boolean;
}

export const ProcessingOverlay = ({
  isHarvesting,
  isResettingMemories,
  isUploading,
  isLoggingIn,
  isSeveringLink = false
}: ProcessingOverlayProps) => {
  return (
    <AnimatePresence>
      {(isHarvesting || isResettingMemories || isUploading || isLoggingIn || isSeveringLink) && (
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
                   isSeveringLink ? "Severing Connection..." :
                   "Updating Appearance..."}
                </h3>
                <p className="text-muted-foreground font-medium">Please wait while the rift stabilizes.</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
