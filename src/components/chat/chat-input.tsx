import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSlowmode } from '@/hooks/use-slowmode';
import { SlowmodeSettings } from '@/src/types/channel';

interface ChatInputProps {
  slowmodeSettings?: SlowmodeSettings;
  onSendMessage: (message: string) => Promise<void>;
}

export function ChatInput({ 
  slowmodeSettings, 
  onSendMessage 
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const { sendMessage, remainingCooldown } = useSlowmode(slowmodeSettings);

  const handleSendMessage = async () => {
    if (message.trim()) {
      sendMessage(async () => {
        await onSendMessage(message.trim());
        setMessage('');
      });
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      {remainingCooldown > 0 && (
        <div className="text-destructive text-sm">
          Slowmode active: Wait {remainingCooldown} seconds before sending
        </div>
      )}
      <div className="flex items-center space-x-2">
        <Textarea
          placeholder="Send a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={remainingCooldown > 0}
          className={remainingCooldown > 0 ? 'cursor-not-allowed opacity-50' : ''}
        />
        <Button 
          onClick={handleSendMessage} 
          disabled={!message.trim() || remainingCooldown > 0}
        >
          Send
        </Button>
      </div>
    </div>
  );
}