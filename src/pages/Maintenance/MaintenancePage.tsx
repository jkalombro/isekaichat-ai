import React from 'react';
import { motion } from 'motion/react';
import { Hammer, LogOut } from 'lucide-react';
import { AppStatus } from '@/shared/types';
import { Button } from '@/shared/components/ui/button';

interface MaintenancePageProps {
  status: AppStatus | null;
  onLogout: () => void;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({ status, onLogout }) => {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background relative overflow-hidden p-6 text-center">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_70%)] opacity-[0.05]" />
      
      <motion.div
        animate={{ 
          y: [0, -20, 0],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="relative z-10 mb-8"
      >
        <div className="p-8 bg-primary/10 rounded-full border border-primary/20 shadow-[0_0_50px_rgba(var(--primary-rgb),0.2)]">
          <Hammer className="w-20 h-20 text-primary" />
        </div>
      </motion.div>

      <div className="max-w-md space-y-6 relative z-10">
        <h1 className="text-3xl font-black tracking-tighter uppercase text-foreground">
          Rift Under Maintenance
        </h1>
        
        <p className="text-muted-foreground text-lg leading-relaxed">
          The rift is currently closed for maintenance. All consciousness has been temporarily disconnected. Please come back again in a few minutes or an hour.
        </p>

        {status?.maintenanceStartDateTime && (
          <div className="pt-8 border-t border-border/50 space-y-6">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
              Maintenance started on {formatDate(status.maintenanceStartDateTime)}
            </p>
            
            <Button 
              variant="outline" 
              onClick={onLogout}
              className="rounded-2xl px-8 py-6 font-bold border-primary/20 hover:bg-primary/5 group"
            >
              <LogOut className="w-4 h-4 mr-2 group-hover:text-destructive transition-colors" />
              Exit the Rift
            </Button>
          </div>
        )}
      </div>

      {/* Decorative Particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ 
            y: [-20, 20, -20],
            opacity: [0.1, 0.3, 0.1],
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
