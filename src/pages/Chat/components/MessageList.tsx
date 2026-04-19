import React from 'react';
import { motion } from 'motion/react';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Character, Message } from '@/shared/types';
import { formatTimestamp, capitalize } from '@/shared/utils';

interface MessageListProps {
  messages: Message[];
  selectedChar: Character;
  user: any;
  isTyping: boolean;
  isOffline: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  onEditMessage: (msg: Message) => void;
}

export const MessageList = ({
  messages,
  selectedChar,
  user,
  isTyping,
  isOffline,
  scrollRef,
  onEditMessage
}: MessageListProps) => {
  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout | null>(null);

  const handleTouchStart = (msg: Message) => {
    if (msg.sender !== 'user') return;
    const timer = setTimeout(() => {
      onEditMessage(msg);
    }, 1000); // 1s for long press
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  return (
    <ScrollArea className="flex-1 h-full min-h-0 p-6" viewportRef={scrollRef}>
      <div className="max-w-3xl mx-auto space-y-6 pb-4">
        <div className="text-center py-8">
          <Badge variant="outline" className="text-[10px] tracking-tighter border-border text-muted-foreground px-3 py-1 rounded-full">
            Dimensional link established with {capitalize(selectedChar.name)}
          </Badge>
        </div>

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            onMouseDown={() => handleTouchStart(msg)}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            onTouchStart={() => handleTouchStart(msg)}
            onTouchEnd={handleTouchEnd}
          >
            <Avatar className="h-8 w-8 shrink-0 border border-border mb-1">
              <AvatarImage src={msg.sender === 'user' ? user.photoURL || '' : selectedChar.avatarUrl} />
              <AvatarFallback className="text-[10px] bg-muted">
                {msg.sender === 'user' ? (user.displayName?.[0] || 'U') : capitalize(selectedChar.name)[0]}
              </AvatarFallback>
            </Avatar>
            <div className={`max-w-[75%] space-y-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-none' 
                  : 'bg-card text-card-foreground border border-border rounded-tl-none'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
              <span className="text-[9px] text-muted-foreground/60 font-medium px-1">
                {formatTimestamp(msg.timestamp)}
              </span>
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-2">
            <Avatar className="h-8 w-8 shrink-0 border border-border mb-1">
              <AvatarImage src={selectedChar.avatarUrl} />
              <AvatarFallback className="text-[10px] bg-muted">{capitalize(selectedChar.name)[0]}</AvatarFallback>
            </Avatar>
            <div className="bg-card border border-border rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 shadow-sm">
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
            </div>
          </div>
        )}

        {isOffline && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center py-2"
          >
            <span className="text-[10px] font-black tracking-[0.2em] text-destructive/60 animate-pulse">
              {capitalize(selectedChar.name)} went offline
            </span>
          </motion.div>
        )}
      </div>
    </ScrollArea>
  );
};
