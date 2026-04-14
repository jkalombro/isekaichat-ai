import React from 'react';
import { Menu, Camera, RotateCcw, Link2Off } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Character } from '@/shared/types';

interface ChatHeaderProps {
  selectedChar: Character;
  setIsSidebarOpen: (open: boolean) => void;
  setIsResetting: (resetting: boolean) => void;
  setIsDeleting: (deleting: boolean) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ChatHeader = ({
  selectedChar,
  setIsSidebarOpen,
  setIsResetting,
  setIsDeleting,
  handleFileChange
}: ChatHeaderProps) => {
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
          <Menu className="w-5 h-5" />
        </Button>
        <div className="relative group w-10 h-10">
          <Avatar className="h-10 w-10 border border-border transition-transform group-hover:scale-105">
            <AvatarImage src={selectedChar.avatarUrl} />
            <AvatarFallback className="bg-muted">{selectedChar.name[0]}</AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <input 
            type="file" 
            onChange={handleFileChange} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
            accept="image/*"
            title="Update character appearance"
          />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{selectedChar.name}</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{selectedChar.source}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsResetting(true)}
          className="text-muted-foreground hover:text-destructive rounded-xl"
          title="Reset conversation"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsDeleting(true)}
          className="text-muted-foreground hover:text-destructive rounded-xl"
          title="Sever connection"
        >
          <Link2Off className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};
