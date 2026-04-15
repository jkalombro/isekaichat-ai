import React from 'react';
import { motion } from 'motion/react';
import { Button } from '@/shared/components/ui/button';
import { AppLogo } from '@/shared/components/AppLogo';
import { APP_VERSION } from '@/shared/constants';
import { useAuth, GeminiModel } from '@/shared/context/AuthContext';
import { Zap, ZapOff } from 'lucide-react';

interface ChatHomeProps {
  geminiStatus: 'stable' | 'unstable' | 'closed';
  isTestingConnection: boolean;
  checkConnection: () => void;
  setIsCreating: (creating: boolean) => void;
  setIsSidebarOpen: (open: boolean) => void;
}

export const ChatHome = ({
  geminiStatus,
  isTestingConnection,
  checkConnection,
  setIsCreating,
  setIsSidebarOpen
}: ChatHomeProps) => {
  const { selectedModel, setSelectedModel } = useAuth();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8 relative overflow-hidden">
      {/* Portal Background Animation */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 360],
            opacity: [0.05, 0.1, 0.05]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,var(--color-primary),transparent)]"
        />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_70%)] opacity-[0.1]" />
      </div>

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10"
      >
        <div className="relative group">
          <motion.div 
            animate={{ 
              rotate: 360,
              scale: isTestingConnection ? [1, 1.1, 1] : [1, 1.05, 1]
            }}
            transition={{ 
              rotate: { duration: 10, repeat: Infinity, ease: "linear" },
              scale: { duration: isTestingConnection ? 1 : 4, repeat: Infinity, ease: "easeInOut" }
            }}
            className={`absolute inset-[-20px] rounded-full border-2 border-dashed ${
              geminiStatus === 'stable' ? 'border-cyan-400/30' : 
              geminiStatus === 'unstable' ? 'border-orange-400/30' : 'border-red-500/30'
            }`}
          />
          <button 
            onClick={checkConnection}
            disabled={isTestingConnection}
            className={`w-32 h-32 bg-card rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
              geminiStatus === 'stable' ? 'border-cyan-400/20 shadow-[0_0_50px_rgba(34,211,238,0.2)]' : 
              geminiStatus === 'unstable' ? 'border-orange-400/20 shadow-[0_0_50px_rgba(251,146,60,0.2)]' : 
              'border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.2)]'
            } relative overflow-hidden group active:scale-95 disabled:cursor-not-allowed`}
          >
            <motion.div
              animate={isTestingConnection ? { 
                rotate: [0, 360, 1440, 1800],
                scale: [1, 1.1, 1]
              } : { 
                y: [0, -5, 0],
                rotate: 0,
                scale: 1
              }}
              transition={{ 
                rotate: isTestingConnection ? { 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "linear",
                  times: [0, 0.3, 0.7, 1]
                } : { duration: 0.8, ease: "easeOut" },
                scale: isTestingConnection ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.5 },
                y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <AppLogo className={`w-16 h-16 transition-all duration-500 ${
                geminiStatus === 'stable' ? 'drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 
                geminiStatus === 'unstable' ? 'drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]' : 
                'drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]'
              }`} />
            </motion.div>
            <div className={`absolute inset-0 bg-gradient-to-t transition-colors duration-500 ${
              geminiStatus === 'stable' ? 'from-cyan-400/10' : 
              geminiStatus === 'unstable' ? 'from-orange-400/10' : 'from-red-500/10'
            } to-transparent`} />
          </button>
        </div>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 relative z-10"
      >
        <div className="space-y-2">
          <h3 className="text-4xl font-black tracking-tighter uppercase text-foreground">
            Bridge {
              geminiStatus === 'stable' ? <span className="text-cyan-400">Stabilized</span> : 
              geminiStatus === 'unstable' ? <span className="text-orange-400">Unstable</span> : 
              <span className="text-red-500">Closed</span>
            }
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto text-lg font-medium leading-tight">
            {
              geminiStatus === 'stable' ? "The dimensional rift is open. Choose a consciousness to link with or establish a new connection." : 
              geminiStatus === 'unstable' ? "The dimensional rift is fluctuating. Establishing a new connection has a big chance of failing." : 
              "The dimensional rift is currently closed. Try again some other time."
            }
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Button 
            size="lg"
            onClick={() => setIsCreating(true)}
            className="h-12 px-8 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 group"
          >
            Establish New Link
            <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="ml-2">
              +
            </motion.span>
          </Button>
          <Button 
            variant="outline"
            size="lg"
            onClick={() => setIsSidebarOpen(true)}
            className="h-12 px-8 rounded-2xl font-bold border-primary/20 hover:bg-primary/5 md:hidden"
          >
            View Connections
          </Button>
        </div>

        <div className="opacity-20 pt-4">
          <p className="text-[10px] font-black tracking-[0.3em] uppercase text-foreground">DIMENSIONAL_LINK_{APP_VERSION}</p>
        </div>
      </motion.div>

      {/* Footer Section */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-6 z-10">
        {/* Model Toggle */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Dimensional Engine</p>
          <div className="flex p-1 bg-muted/30 rounded-2xl border border-border/50 backdrop-blur-sm">
            <button
              onClick={() => setSelectedModel('gemini-3.1-flash-lite-preview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedModel === 'gemini-3.1-flash-lite-preview'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ZapOff className="w-3 h-3" />
              3.1 Lite
            </button>
            <button
              onClick={() => setSelectedModel('gemini-3-flash-preview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedModel === 'gemini-3-flash-preview'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Zap className="w-3 h-3" />
              3 Flash
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ 
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 3 + i, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: i * 0.5
          }}
          className="absolute w-1 h-1 bg-primary rounded-full blur-[1px]"
          style={{
            top: `${20 + Math.random() * 60}%`,
            left: `${20 + Math.random() * 60}%`,
          }}
        />
      ))}
    </div>
  );
};
