import React, { useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Character } from '@/shared/types';

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (msg: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  selectedChar: Character;
  isTyping: boolean;
  isEditing?: boolean;
  onCancelEdit?: () => void;
}

export const MessageInput = ({
  newMessage,
  setNewMessage,
  handleSendMessage,
  selectedChar,
  isTyping,
  isEditing,
  onCancelEdit
}: MessageInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Calculate new height (min 48px, max 200px)
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 48), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [newMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim() && !isTyping) {
        handleSendMessage(e as any);
      }
    }
  };

  return (
    <footer className="p-6 border-t border-border bg-background">
      <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex flex-col gap-2">
        {isEditing && (
          <div className="flex items-center justify-between px-4 py-2 bg-primary/10 rounded-xl border border-primary/20">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Editing Dimensional Message</span>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={onCancelEdit}
              className="h-6 w-6 rounded-full hover:bg-primary/20"
            >
              <X className="w-3 h-3 text-primary" />
            </Button>
          </div>
        )}
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isEditing ? "Edit your message..." : `Send a message to ${selectedChar.name}...`}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            rows={1}
            className={`flex-1 bg-muted/50 border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[48px] max-h-[200px] rounded-2xl p-3 resize-none text-sm leading-relaxed scrollbar-hide transition-all ${
              isEditing ? 'border-primary/50 ring-1 ring-primary/20' : ''
            }`}
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || (isTyping && !isEditing)}
            className="bg-primary hover:bg-primary/90 h-12 w-12 rounded-2xl p-0 shadow-lg shadow-primary/20 shrink-0"
          >
            <Send className="w-5 h-5 text-primary-foreground" />
          </Button>
        </div>
      </form>
    </footer>
  );
};
