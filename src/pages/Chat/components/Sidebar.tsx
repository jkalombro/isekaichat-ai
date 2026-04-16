import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, X, MessageCircle, LogOut, User as UserIcon, BarChart3, Shield, Hammer } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { AppLogo } from '@/shared/components/AppLogo';
import { Character } from '@/shared/types';
import { capitalize } from '@/shared/utils';

interface SidebarProps {
  characters: Character[];
  selectedChar: Character | null;
  onSelectChar: (char: Character | null) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  setIsCreating: (creating: boolean) => void;
  user: any;
  isAdmin: boolean;
  onLogout: () => void;
  onShowDisclaimer: () => void;
  onShowAnalytics: () => void;
  onShowAdmin: () => void;
  onShowMaintenance: () => void;
}

export const Sidebar = ({
  characters,
  selectedChar,
  onSelectChar,
  isSidebarOpen,
  setIsSidebarOpen,
  setIsCreating,
  user,
  isAdmin,
  onLogout,
  onShowDisclaimer,
  onShowAnalytics,
  onShowAdmin,
  onShowMaintenance
}: SidebarProps) => {
  return (
    <>
      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[60] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`w-80 border-r border-border flex flex-col bg-sidebar fixed md:relative inset-y-0 left-0 z-[70] transition-transform duration-300 md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:flex`}>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AppLogo className="w-6 h-6" />
            Connections
          </h2>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                onSelectChar(null);
                setIsSidebarOpen(false);
              }}
              className="hover:bg-sidebar-accent rounded-xl"
            >
              <Home className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden hover:bg-sidebar-accent rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-4">
          <div className="space-y-2 py-4">
            {characters.map((char) => (
              <button
                key={char.id}
                onClick={() => {
                  onSelectChar(char);
                  setIsSidebarOpen(false);
                }}
                className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-3 group border ${
                  selectedChar?.id === char.id 
                    ? 'bg-primary/10 border-primary/30 shadow-sm' 
                    : 'hover:bg-sidebar-accent border-transparent'
                }`}
              >
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={char.avatarUrl} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {char.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className={`font-medium truncate ${selectedChar?.id === char.id ? 'text-primary' : 'text-foreground'}`}>
                    {char.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate tracking-wider">{capitalize(char.source)}</p>
                </div>
              </button>
            ))}
            {characters.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <div className="p-4 bg-muted/50 rounded-3xl inline-block">
                  <MessageCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No active rifts.<br/>Establish your first connection!</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border space-y-4">
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-muted/30 border border-border/50">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoURL || ''} />
              <AvatarFallback><UserIcon className="w-4 h-4" /></AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
            </div>
            <div className="flex items-center gap-1">
              {isAdmin && (
                <>
                  <Button variant="ghost" size="icon" onClick={onShowMaintenance} className="text-muted-foreground hover:text-primary rounded-lg">
                    <Hammer className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={onShowAdmin} className="text-muted-foreground hover:text-primary rounded-lg">
                    <Shield className="w-4 h-4" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" onClick={onShowAnalytics} className="text-muted-foreground hover:text-primary rounded-lg">
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onLogout} className="text-muted-foreground hover:text-destructive rounded-lg">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <button 
            onClick={onShowDisclaimer}
            className="w-full text-[10px] font-bold tracking-[0.2em] text-muted-foreground/40 hover:text-primary/60 transition-colors uppercase text-center"
          >
            Disclaimer & Policy
          </button>
        </div>
      </aside>
    </>
  );
};
