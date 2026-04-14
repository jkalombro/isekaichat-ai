import React from 'react';
import { motion } from 'motion/react';
import { Button } from '@/shared/components/ui/button';
import { AppLogo } from '@/shared/components/AppLogo';
import { APP_VERSION } from '@/shared/constants';

interface LandingPageProps {
  onLogin: () => void;
  onShowDisclaimer: () => void;
}

export const LandingPage = ({ onLogin, onShowDisclaimer }: LandingPageProps) => {
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
              animate={{ 
                scale: 1, 
                opacity: 1,
                y: [0, -15, 0]
              }}
              transition={{ 
                scale: { delay: 0.3, type: "spring" },
                opacity: { delay: 0.3 },
                y: { repeat: Infinity, duration: 3, ease: "easeInOut" }
              }}
              className="mb-[-1.5rem] relative z-20"
            >
              <AppLogo className="w-20 h-20 drop-shadow-[0_20px_20px_rgba(var(--primary-rgb),0.3)]" />
            </motion.div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground leading-none relative z-10">
              Isek<span className="text-cyan-400">AI</span><span className="text-primary">Chat</span>
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
              onClick={onLogin}
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
            <button 
              onClick={onShowDisclaimer}
              className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground/40 hover:text-primary/60 transition-colors uppercase"
            >
              Disclaimer & Policy
            </button>
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
            <div className="flex-1 text-center text-[10px] font-bold text-muted-foreground tracking-widest">DIMENSIONAL_LINK_{APP_VERSION}</div>
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
};
