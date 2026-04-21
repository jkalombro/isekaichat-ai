import React from 'react';
import { Menu, Camera, Handshake } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Character, CharacterStatus } from '@/shared/types';
import { capitalize } from '@/shared/utils';

interface ChatHeaderProps {
  selectedChar: Character;
  setIsSidebarOpen: (open: boolean) => void;
  setIsConnectionStatusOpen: (open: boolean) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  status: CharacterStatus;
}

export const ChatHeader = ({
  selectedChar,
  setIsSidebarOpen,
  setIsConnectionStatusOpen,
  handleFileChange,
  status
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
            <AvatarFallback className="bg-muted">{capitalize(selectedChar.name)[0]}</AvatarFallback>
          </Avatar>
          {/* Status Dot */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-background rounded-full shadow-sm z-10 ${
            status === 'online' ? 'bg-green-500' : 
            status === 'offline' ? 'bg-red-500' : 
            'bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]'
          }`} />
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
          <h3 className="font-semibold text-sm flex items-center gap-2">
            {capitalize(selectedChar.name)}
            {status === 'unstable' && (
              <span className="text-[8px] font-black uppercase text-orange-500 tracking-widest animate-pulse">Unstable</span>
            )}
          </h3>
          <p className="text-[10px] text-muted-foreground tracking-widest">{capitalize(selectedChar.source)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsConnectionStatusOpen(true)}
          className="text-primary hover:bg-primary/10 rounded-xl"
          title="Connection Status"
        >
          <Handshake className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};
