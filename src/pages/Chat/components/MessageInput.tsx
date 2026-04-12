import React from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Character } from '@/shared/types';

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (msg: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  selectedChar: Character;
  isTyping: boolean;
}

export const MessageInput = ({
  newMessage,
  setNewMessage,
  handleSendMessage,
  selectedChar,
  isTyping
}: MessageInputProps) => {
  return (
    <footer className="p-6 border-t border-border bg-background">
      <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-3">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Send a message to ${selectedChar.name}...`}
          className="flex-1 bg-muted/50 border-border focus:ring-primary h-12 rounded-2xl"
        />
        <Button 
          type="submit" 
          disabled={!newMessage.trim() || isTyping}
          className="bg-primary hover:bg-primary/90 h-12 w-12 rounded-2xl p-0 shadow-lg shadow-primary/20"
        >
          <Send className="w-5 h-5 text-primary-foreground" />
        </Button>
      </form>
    </footer>
  );
};
