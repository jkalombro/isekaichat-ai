import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Handshake, Eye, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Card, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Character } from '@/shared/types';
import { formatTimestamp, capitalize } from '@/shared/utils';

interface ConnectionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedChar: Character | null;
  onOpenReset: () => void;
  onOpenSever: () => void;
}

export const ConnectionStatusModal = ({
  isOpen,
  onClose,
  selectedChar,
  onOpenReset,
  onOpenSever
}: ConnectionStatusModalProps) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'memory'>('profile');
  const [showSpoiler, setShowSpoiler] = useState(false);

  // Reset states when character or modal visibility changes
  useEffect(() => {
    if (!isOpen) {
      setShowSpoiler(false);
      setActiveTab('profile');
    }
  }, [isOpen]);

  if (!selectedChar) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col"
          >
            <Card className="bg-card border-border text-foreground shadow-2xl overflow-hidden flex flex-col relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-4 top-4 rounded-full h-8 w-8 text-muted-foreground hover:bg-muted z-20"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
              <CardHeader className="pb-4 shrink-0">
                <CardTitle className="flex items-center gap-3 text-2xl text-primary font-black tracking-tighter uppercase mb-6">
                  <Handshake className="w-8 h-8" />
                  Connection Status
                </CardTitle>
                
                <div className="flex gap-6 items-start bg-muted/20 p-4 rounded-xl border border-border/50">
                   <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border shadow-sm bg-muted flex items-center justify-center">
                    {selectedChar.avatarUrl ? (
                      <img 
                        src={selectedChar.avatarUrl} 
                        alt={capitalize(selectedChar.name)} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-3xl font-black text-muted-foreground">{capitalize(selectedChar.name)[0]}</span>
                    )}
                   </div>
                   <div className="flex-1 min-w-0 py-1">
                      <h2 className="text-xl font-black tracking-tight leading-tight break-words">{capitalize(selectedChar.name)}</h2>
                      <p className="text-xs font-bold text-primary tracking-widest opacity-80 break-words mt-0.5">{capitalize(selectedChar.source)}</p>
                      <div className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.1em] sm:tracking-[0.2em] mt-3 flex flex-col sm:flex-row sm:gap-1.5 leading-relaxed sm:leading-normal">
                        <span>Link established:</span>
                        <span className="text-foreground/80">{selectedChar.createdAt ? formatTimestamp(selectedChar.createdAt) : 'Unknown'}</span>
                      </div>
                   </div>
                </div>
              </CardHeader>

              {/* Tabs */}
              <div className="px-6 flex border-b border-border/50 shrink-0">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] relative transition-colors ${
                    activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Profile
                  {activeTab === 'profile' && (
                    <motion.div 
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('memory')}
                  className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] relative transition-colors ${
                    activeTab === 'memory' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Memory with you
                  {activeTab === 'memory' && (
                    <motion.div 
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
              </div>

              <div className="px-6 pb-6 pt-4 space-y-4 overflow-y-auto min-h-0 flex-1 flex flex-col">
                <div className="flex-1 min-h-0 flex flex-col">
                  {activeTab === 'profile' ? (
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="relative flex-1 rounded-2xl border border-border/50 bg-muted/10 overflow-hidden flex flex-col">
                        <div className="p-5 flex-1 custom-scrollbar overflow-y-auto">
                          <div className="markdown-body">
                            <ReactMarkdown>
                              {selectedChar.profile}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="relative flex-1 rounded-2xl border border-border/50 bg-muted/10 overflow-hidden flex flex-col">
                        {selectedChar.memories ? (
                          <div className={`p-5 relative flex-1 custom-scrollbar ${showSpoiler ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                            <p className={`text-sm leading-relaxed transition-all duration-500 pb-2 ${!showSpoiler ? 'blur-md select-none' : ''} whitespace-pre-wrap`}>
                              {selectedChar.memories}
                            </p>
                            {!showSpoiler && (
                              <div className="absolute inset-0 flex items-center justify-center p-6 bg-background/5 backdrop-blur-sm z-10">
                                <Button 
                                  variant="secondary" 
                                  size="sm"
                                  onClick={() => setShowSpoiler(true)}
                                  className="rounded-full gap-2 border border-border/50 shadow-lg font-black uppercase text-[10px] tracking-widest px-6 h-10"
                                >
                                   <Eye className="w-3.5 h-3.5" />
                                   Show Memory
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-center p-8">
                            <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] leading-relaxed">
                              Interact with the character more to create memory
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/50 shrink-0">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      onOpenReset();
                      onClose();
                    }}
                    className="flex-1 rounded-xl h-12 !min-h-12 text-[10px] font-black uppercase tracking-widest hover:bg-destructive/5 hover:text-destructive border-border/50 hover:border-destructive/30 shrink-0"
                  >
                    Reset Link
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      onOpenSever();
                      onClose();
                    }}
                    className="flex-1 rounded-xl h-12 !min-h-12 text-[10px] font-black uppercase tracking-widest bg-destructive text-white hover:bg-destructive/90 shadow-lg shadow-destructive/20 shrink-0"
                  >
                    Sever Link
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
