import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/shared/context/AuthContext';
import { signInWithPopup, googleProvider, auth, signOut } from '@/shared/services/firebase';
import { toast } from 'sonner';
import { Layout } from './Layout';
import { LandingPage } from '@/pages/Landing/LandingPage';
import { ChatPage } from '@/pages/Chat/ChatPage';
import { DisclaimerPage } from '@/pages/Disclaimer/DisclaimerPage';
import { AnalyticsPage } from '@/pages/Analytics/AnalyticsPage';
import { AppLogo } from '@/shared/components/AppLogo';
import { ProcessingOverlay } from '@/pages/Chat/components/ProcessingOverlay';

const Splash = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-background relative overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_70%)] opacity-[0.05]" />
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        y: [0, -10, 0]
      }}
      transition={{ 
        scale: { type: "spring" },
        y: { repeat: Infinity, duration: 2, ease: "easeInOut" }
      }}
      className="relative z-10 mb-8"
    >
      <AppLogo className="w-24 h-24 drop-shadow-[0_20px_20px_rgba(var(--primary-rgb),0.3)]" />
    </motion.div>
    <div className="space-y-4 text-center relative z-10">
      <h2 className="text-2xl font-black tracking-tighter uppercase text-foreground">Stabilizing Rift</h2>
      <div className="flex gap-1 justify-center">
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-primary rounded-full" />
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-primary rounded-full" />
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-primary rounded-full" />
      </div>
    </div>
  </div>
);

export default function App() {
  const { user, loading, isAuthReady } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await signInWithPopup(auth, googleProvider);
      toast.success("Logged in successfully!");
    } catch (error) {
      toast.error("Login failed.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return <Splash />;
  }

  return (
    <Layout>
      {showDisclaimer ? (
        <DisclaimerPage onBack={() => setShowDisclaimer(false)} />
      ) : showAnalytics ? (
        <AnalyticsPage user={user} onBack={() => setShowAnalytics(false)} />
      ) : !user ? (
        <LandingPage onLogin={handleLogin} onShowDisclaimer={() => setShowDisclaimer(true)} />
      ) : (
        <ChatPage 
          user={user} 
          isAuthReady={isAuthReady} 
          onLogout={handleLogout} 
          onShowDisclaimer={() => setShowDisclaimer(true)}
          onShowAnalytics={() => setShowAnalytics(true)}
        />
      )}
      
      <ProcessingOverlay 
        isHarvesting={false}
        isResettingMemories={false}
        isUploading={false}
        isLoggingIn={isLoggingIn && !user}
      />
    </Layout>
  );
}
