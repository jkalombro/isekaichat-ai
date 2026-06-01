import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, X, MessageCircle, LogOut, User as UserIcon, BarChart3, Shield, Hammer, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { AppLogo } from '@/shared/components/AppLogo';
import { Character } from '@/shared/types';
import { capitalize } from '@/shared/utils';
import { useChatStore } from '@/shared/context/ChatContext';
import { toast } from 'sonner';
import { useAuth } from '@/shared/context/AuthContext';

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
  onShowMaintenance,
}: SidebarProps) => {
  const { statuses, unreads } = useChatStore();
  const { updateUserPhoto } = useAuth();
  const [isUploadingUser, setIsUploadingUser] = React.useState(false);

  const handleUserFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingUser(true);
    const formData = new FormData();
    formData.append('file', file);
    
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'cloudinary-training';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'unsigned_preset';
    
    formData.append('upload_preset', uploadPreset); 

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Dimensional sync failed. The rift is unstable.");
      }

      const data = await response.json();
      
      if (data.secure_url) {
        await updateUserPhoto(data.secure_url);
        toast.success("Your resonance appearance updated across dimensions.");
      }
    } catch (error: any) {
      console.error("User Upload Error:", error);
      toast.error(`Rift Error: ${error.message}`);
    } finally {
      setIsUploadingUser(false);
      if (e.target) e.target.value = '';
    }
  };

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
            {characters.map((char) => {
              const status = statuses[char.id]?.status || 'online';
              const unreadCount = unreads[char.id] || 0;
              
              return (
                <button
                  key={char.id}
                  onClick={() => {
                    onSelectChar(char);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-3 group border relative ${
                    selectedChar?.id === char.id 
                      ? 'bg-primary/10 border-primary/30 shadow-sm' 
                      : 'hover:bg-sidebar-accent border-transparent'
                  }`}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={char.avatarUrl} />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {capitalize(char.name)[0]}
                      </AvatarFallback>
                    </Avatar>
                    {/* Status Dot */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-sidebar rounded-full shadow-sm z-10 ${
                      status === 'online' ? 'bg-green-500' : 
                      status === 'offline' ? 'bg-red-500' : 
                      'bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                    }`} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className={`font-medium truncate ${selectedChar?.id === char.id ? 'text-primary' : 'text-foreground'}`}>
                      {capitalize(char.name)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate tracking-wider">{capitalize(char.source)}</p>
                  </div>
                  {/* Unread Badge */}
                  {unreadCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
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
            <div className="relative group w-8 h-8 shrink-0">
              <Avatar className="h-8 w-8 border border-border transition-transform group-hover:scale-105">
                <AvatarImage src={user.photoURL || ''} />
                <AvatarFallback>
                  {isUploadingUser ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                {isUploadingUser ? (
                  <Loader2 className="w-3 h-3 text-white animate-spin" />
                ) : (
                  <Camera className="w-3 h-3 text-white" />
                )}
              </div>
              <input 
                type="file" 
                onChange={handleUserFileChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                accept="image/*"
                title="Update your appearance"
                disabled={isUploadingUser}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              {isUploadingUser ? (
                <p className="text-xs font-semibold text-primary animate-pulse truncate">Syncing appearance...</p>
              ) : (
                <p className="text-sm font-medium truncate">{user.displayName}</p>
              )}
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
