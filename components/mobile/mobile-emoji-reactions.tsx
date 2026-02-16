"use client";

import React, { useState } from "react";
import { MatrixEvent } from "matrix-js-sdk";
import { 
  Heart, 
  ThumbsUp, 
  ThumbsDown, 
  Laugh, 
  Angry, 
  Smile,
  X,
  Plus
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal-store";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { EmojiPicker } from "@/components/emoji-picker";

interface MobileEmojiReactionsProps {
  isOpen: boolean;
  onClose: () => void;
  event?: MatrixEvent;
  roomId: string;
  onReactionSent?: (emoji: string) => void;
}

interface QuickReaction {
  emoji: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const QUICK_REACTIONS: QuickReaction[] = [
  { emoji: "👍", label: "Like", icon: ThumbsUp, color: "bg-green-500" },
  { emoji: "❤️", label: "Love", icon: Heart, color: "bg-red-500" },
  { emoji: "😂", label: "Laugh", icon: Laugh, color: "bg-yellow-500" },
  { emoji: "😮", label: "Wow", icon: Smile, color: "bg-blue-500" },
  { emoji: "😢", label: "Sad", icon: ThumbsDown, color: "bg-gray-500" },
  { emoji: "😡", label: "Angry", icon: Angry, color: "bg-red-600" },
];

/**
 * Mobile-optimized emoji reaction picker with quick reactions
 */
export function MobileEmojiReactions({
  isOpen,
  onClose,
  event,
  roomId,
  onReactionSent
}: MobileEmojiReactionsProps) {
  const { client } = useMatrixClient();
  const { onOpen } = useModal();
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);

  const sendReaction = async (emoji: string) => {
    if (!event || !client) {
      console.error("Cannot send reaction: missing event or client");
      return;
    }

    try {
      await client.sendEvent(roomId, "m.reaction" as any, {
        "m.relates_to": {
          event_id: event.getId(),
          key: emoji,
          rel_type: "m.annotation"
        }
      });
      
      onReactionSent?.(emoji);
      onClose();
    } catch (error) {
      console.error("Failed to send reaction:", error);
      // TODO: Show error toast
    }
  };

  const handleQuickReaction = (emoji: string) => {
    sendReaction(emoji);
  };

  const handleCustomEmojiSelect = (emoji: string) => {
    setIsCustomPickerOpen(false);
    sendReaction(emoji);
  };

  // Use Sheet on mobile, Dialog on desktop
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const content = (
    <div className="space-y-6">
      {/* Quick Reactions Grid */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Quick Reactions
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_REACTIONS.map((reaction) => {
            const IconComponent = reaction.icon;
            return (
              <Button
                key={reaction.emoji}
                variant="outline"
                size="lg"
                onClick={() => handleQuickReaction(reaction.emoji)}
                className="h-16 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                style={{ touchAction: 'manipulation' }}
              >
                <span className="text-2xl">{reaction.emoji}</span>
                <span className="text-xs font-medium">{reaction.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Custom Emoji Picker Trigger */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          More Emojis
        </h3>
        <Button
          variant="outline"
          size="lg"
          onClick={() => setIsCustomPickerOpen(true)}
          className="w-full h-12 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          style={{ touchAction: 'manipulation' }}
        >
          <Plus className="h-5 w-5" />
          <span className="font-medium">Choose Emoji</span>
        </Button>
      </div>

      {/* Custom Emoji Picker */}
      {isCustomPickerOpen && (
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              All Emojis
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCustomPickerOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-center">
            <EmojiPicker
              onChange={handleCustomEmojiSelect}
            />
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Reaction</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Reaction</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for managing mobile emoji reactions
 */
export function useMobileEmojiReactions() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<MatrixEvent | undefined>();
  const [currentRoomId, setCurrentRoomId] = useState<string>("");

  const openReactionPicker = (event: MatrixEvent, roomId: string) => {
    setCurrentEvent(event);
    setCurrentRoomId(roomId);
    setIsOpen(true);
  };

  const closeReactionPicker = () => {
    setIsOpen(false);
    setCurrentEvent(undefined);
    setCurrentRoomId("");
  };

  const ReactionPickerComponent = () => (
    <MobileEmojiReactions
      isOpen={isOpen}
      onClose={closeReactionPicker}
      event={currentEvent}
      roomId={currentRoomId}
      onReactionSent={(emoji) => {
        console.log(`Reaction sent: ${emoji}`);
        // Optional: Add success feedback
      }}
    />
  );

  return {
    isOpen,
    openReactionPicker,
    closeReactionPicker,
    ReactionPickerComponent,
  };
}