import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, Info, Zap, Activity } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualModal: React.FC<ManualModalProps> = ({ isOpen, onClose }) => {
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
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl max-h-[85vh] bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">APP MANUAL</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-8 space-y-8 text-left">
                {/* Introduction Section */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Activity className="w-5 h-5" />
                    <h4 className="font-bold uppercase tracking-widest text-xs">The Rift & Bridge Status</h4>
                  </div>
                  <div className="space-y-3 text-muted-foreground leading-relaxed">
                    <p>
                      The "Rift" or "Bridge" refers to the AI API connection that powers the characters. The Home page displays three distinct statuses that help you predict if characters will respond or go "offline" during your conversation.
                    </p>
                    <p>
                      When the central app icon is spinning, the system is actively pinging the API to check the connection. You can manually refresh this status at any time by tapping the central app icon.
                    </p>
                    <ul className="space-y-4 mt-4">
                      <li className="flex gap-4 p-4 rounded-2xl bg-cyan-400/5 border border-cyan-400/10">
                        <div className="w-3 h-3 rounded-full bg-cyan-400 mt-1 shrink-0 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                        <div>
                          <p className="font-bold text-foreground">Bridge Stabilized (Blue)</p>
                          <p className="text-sm">The API is stable. Characters will reply normally and new connections can be established without issue.</p>
                        </div>
                      </li>
                      <li className="flex gap-4 p-4 rounded-2xl bg-orange-400/5 border border-orange-400/10">
                        <div className="w-3 h-3 rounded-full bg-orange-400 mt-1 shrink-0 shadow-[0_0_10px_rgba(251,146,60,0.5)]" />
                        <div>
                          <p className="font-bold text-foreground">Bridge Unstable (Orange)</p>
                          <p className="text-sm">The AI API is currently experiencing a high volume of requests worldwide. Since we use free-tier keys, your requests have lower priority, which often results in characters going offline. You can try switching to the "3 Flash" engine at the bottom of the page and pinging again to stabilize the link.</p>
                        </div>
                      </li>
                      <li className="flex gap-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                        <div className="w-3 h-3 rounded-full bg-red-500 mt-1 shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        <div>
                          <p className="font-bold text-foreground">Bridge Closed (Red)</p>
                          <p className="text-sm">Characters will 100% be offline. This usually means you have exhausted your free AI quota for the day. You will need to wait several hours for it to reset. While it can occasionally signify a temporary code error, quota exhaustion is the most common cause.</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </section>

                <hr className="border-border/50" />

                {/* Dimensional Engines Section */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Zap className="w-5 h-5" />
                    <h4 className="font-bold uppercase tracking-widest text-xs">Dimensional Engines (AI Models)</h4>
                  </div>
                  <div className="space-y-3 text-muted-foreground leading-relaxed">
                    <p>
                      These are the specific AI models used to generate responses. The app defaults to "3.1 Lite" upon entry.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                        <p className="font-bold text-foreground mb-1">3.1 Lite</p>
                        <p className="text-sm">Consumes fewer tokens per message but is in extremely high demand, leading to more frequent instability.</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                        <p className="font-bold text-foreground mb-1">3 Flash</p>
                        <p className="text-sm">Slightly more intelligent and stable but consumes tokens more rapidly. Ideal for when 3.1 Lite is unstable.</p>
                      </div>
                    </div>
                  </div>
                </section>

                <hr className="border-border/50" />

                {/* AI Tokens Section */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Info className="w-5 h-5" />
                    <h4 className="font-bold uppercase tracking-widest text-xs">AI Tokens & Rift Keys</h4>
                  </div>
                  <div className="space-y-3 text-muted-foreground leading-relaxed">
                    <p>
                      All modern AI services consume "tokens" with every use. The "Rift Key" you provided is your personal Gemini API key. Most users follow the developer's instructions to obtain a <strong>Free Plan</strong> key.
                    </p>
                    <p>
                      Free plans have strict consumption limits. This application cannot see your remaining balance; it only tracks how many tokens you have consumed locally. You can view your usage by clicking the Graph icon next to your avatar in the sidebar.
                    </p>
                    <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
                      <p className="text-sm font-semibold text-destructive mb-2 uppercase tracking-tight">Important Security Warning</p>
                      <p className="text-sm text-foreground/80 italic">
                        While you can technically upgrade your API key via Google, it is strongly discouraged. Google operates on a "Pay-per-usage" model. If your key is ever leaked or stolen, an unauthorized user could generate thousands of dollars in bills in a very short time. Stick to free-tier keys for maximum safety.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </ScrollArea>

            <div className="p-6 bg-muted/30 border-t border-border flex justify-end">
              <Button onClick={onClose} className="rounded-xl px-8 font-bold">
                Understood
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
