import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Hammer } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/shared/context/AuthContext';
import { db } from '@/shared/services/firebase';
import { collection, getDocs, updateDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose }) => {
  const { appStatus } = useAuth();
  const isMaintenanceMode = appStatus?.isMaintenanceMode || false;

  const handleToggle = async (targetMode: boolean) => {
    try {
      const q = collection(db, 'appstatus');
      const snapshot = await getDocs(q);
      
      let statusDoc;
      if (snapshot.empty) {
        // Create if doesn't exist
        statusDoc = doc(db, 'appstatus', 'global');
        await setDoc(statusDoc, {
          isMaintenanceMode: targetMode,
          maintenanceStartDateTime: targetMode ? serverTimestamp() : null,
          maintenanceEndDateTime: targetMode ? null : serverTimestamp()
        });
      } else {
        statusDoc = snapshot.docs[0].ref;
        await updateDoc(statusDoc, {
          isMaintenanceMode: targetMode,
          maintenanceStartDateTime: targetMode ? serverTimestamp() : (appStatus?.maintenanceStartDateTime || null),
          maintenanceEndDateTime: targetMode ? null : serverTimestamp()
        });
      }
      
      toast.success(`Maintenance mode turned ${targetMode ? 'ON' : 'OFF'}`);
    } catch (error) {
      console.error("Maintenance Toggle Error:", error);
      toast.error("Failed to update maintenance status.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Hammer className="w-5 h-5 text-primary" />
                Rift Maintenance
              </h3>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-8 space-y-6 text-center">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Toggle global maintenance mode. This will disconnect all non-admin users from the rift.
                </p>
              </div>

              <div className="flex flex-col items-center gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Status Control</p>
                <div className="flex p-1 bg-muted/30 rounded-2xl border border-border/50 backdrop-blur-sm">
                  <button
                    onClick={() => handleToggle(false)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all ${
                      !isMaintenanceMode
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    OFF
                  </button>
                  <button
                    onClick={() => handleToggle(true)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all ${
                      isMaintenanceMode
                        ? 'bg-destructive text-destructive-foreground shadow-lg'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    ON
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-muted/30 border-t border-border flex justify-end">
              <Button onClick={onClose} className="rounded-xl px-6">
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
