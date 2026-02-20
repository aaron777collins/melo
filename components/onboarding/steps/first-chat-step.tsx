"use client";

/**
 * First Chat Step Component
 * 
 * Interactive tutorial that teaches users the basics of chatting in Melo.
 * Shows chat features like sending messages, reactions, and basic formatting.
 */

import React, { useState } from "react";
import { MessageSquare, Send, Smile, Hash, ArrowDown, CheckCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// =============================================================================
// Types
// =============================================================================

interface FirstChatStepProps {
  selectedServer?: {
    id: string;
    name: string;
    description?: string;
  };
  onComplete: () => void;
  onBack: () => void;
  onSkip?: () => void;
  className?: string;
}

// =============================================================================
// Mock Chat Data
// =============================================================================

interface ChatMessage {
  id: string;
  sender: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isOwnMessage?: boolean;
  reactions?: Array<{ emoji: string; count: number; hasReacted?: boolean }>;
}

const TUTORIAL_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    sender: "Melo Bot",
    content: "Welcome to your first chat! 👋 This is where conversations happen.",
    timestamp: "2:30 PM",
  },
  {
    id: "2", 
    sender: "Melo Bot",
    content: "Messages appear in chronological order, with the newest at the bottom.",
    timestamp: "2:30 PM",
  },
  {
    id: "3",
    sender: "Melo Bot", 
    content: "Try typing a message in the text box below! You can use basic formatting like **bold** and *italic*.",
    timestamp: "2:31 PM",
  },
];

// =============================================================================
// Component
// =============================================================================

export function FirstChatStep({
  selectedServer,
  onComplete,
  onBack,
  onSkip,
  className,
}: FirstChatStepProps) {
  // Tutorial state
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [demoMessage, setDemoMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(TUTORIAL_MESSAGES);

  // Tutorial steps
  const tutorialSteps = [
    {
      id: 0,
      title: "Reading Messages",
      description: "Messages appear chronologically with sender names and timestamps",
      action: "Click Next when you&apos;re ready to continue",
      highlight: "messages",
    },
    {
      id: 1,
      title: "Typing a Message", 
      description: "Type anything in the message box to see how it works",
      action: "Type a message below",
      highlight: "input",
    },
    {
      id: 2,
      title: "Sending Your Message",
      description: "Press Enter or click the send button to share your message",
      action: "Send your message",
      highlight: "send",
    },
    {
      id: 3,
      title: "Message Reactions",
      description: "You can react to messages with emojis by clicking on them",
      action: "Click the 👍 button below a message",
      highlight: "reactions",
    },
  ];

  const isStepCompleted = (stepIndex: number) => completedSteps.has(stepIndex);
  const allStepsCompleted = tutorialSteps.every((_, index) => isStepCompleted(index));
  const currentTutorialStep = tutorialSteps[currentStep];

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleNextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeStep = (stepIndex: number) => {
    setCompletedSteps(prev => new Set(Array.from(prev).concat(stepIndex)));
  };

  const handleMessageType = (value: string) => {
    setDemoMessage(value);
    if (!isStepCompleted(1) && value.trim().length > 0) {
      completeStep(1);
    }
  };

  const handleSendMessage = () => {
    if (demoMessage.trim()) {
      const newMessage: ChatMessage = {
        id: `user-${messages.length}`,
        sender: "You",
        content: demoMessage.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwnMessage: true,
      };
      
      setMessages(prev => [...prev, newMessage]);
      setDemoMessage("");
      completeStep(2);
      
      // Auto-advance to reactions step
      setTimeout(() => {
        if (currentStep === 2) {
          setCurrentStep(3);
        }
      }, 500);
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        const existingReaction = reactions.find(r => r.emoji === emoji);
        
        if (existingReaction) {
          return {
            ...msg,
            reactions: reactions.map(r => 
              r.emoji === emoji 
                ? { ...r, count: r.count + 1, hasReacted: true }
                : r
            ),
          };
        } else {
          return {
            ...msg,
            reactions: [...reactions, { emoji, count: 1, hasReacted: true }],
          };
        }
      }
      return msg;
    }));
    
    completeStep(3);
  };

  const handleComplete = () => {
    onComplete();
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className={`space-y-6 max-w-4xl mx-auto ${className || ""}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold">Learn to Chat</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Let&apos;s learn the basics of sending messages and interacting in Melo
          {selectedServer && ` in ${selectedServer.name}`}
        </p>
      </div>

      {/* Tutorial Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Chat Tutorial Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {tutorialSteps.map((step, index) => (
              <div
                key={step.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  currentStep === index
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                    : isStepCompleted(index)
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                    : "border-muted bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isStepCompleted(index)
                        ? "bg-green-500 text-white"
                        : currentStep === index
                        ? "bg-blue-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isStepCompleted(index) ? <CheckCircle className="w-3 h-3" /> : index + 1}
                  </div>
                  <h3 className="font-medium text-sm">{step.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Instructions */}
      <Alert className={currentTutorialStep ? "border-blue-500" : ""}>
        <ArrowDown className="w-4 h-4" />
        <AlertDescription>
          <strong>Step {currentStep + 1}:</strong> {currentTutorialStep?.action}
        </AlertDescription>
      </Alert>

      {/* Interactive Chat Demo */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Hash className="w-5 h-5" />
            {selectedServer?.name || "Practice Chat"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Chat Messages */}
          <div className="max-h-96 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="group">
                <div className={`flex gap-3 ${message.isOwnMessage ? "justify-end" : ""}`}>
                  {!message.isOwnMessage && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      {message.senderAvatar ? (
                        <AvatarImage src={message.senderAvatar} />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                          {message.sender.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  )}
                  
                  <div className={`flex-1 ${message.isOwnMessage ? "text-right" : ""}`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-medium">{message.sender}</span>
                      <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                    </div>
                    
                    <div
                      className={`inline-block p-2 rounded-lg max-w-xs ${
                        message.isOwnMessage
                          ? "bg-blue-500 text-white"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                    
                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {message.reactions.map((reaction) => (
                          <Badge
                            key={reaction.emoji}
                            variant={reaction.hasReacted ? "default" : "outline"}
                            className="text-xs cursor-pointer hover:bg-muted"
                            onClick={() => handleReaction(message.id, reaction.emoji)}
                          >
                            {reaction.emoji} {reaction.count}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Tutorial Reaction Button */}
                    {currentStep === 3 && message.id === "3" && !message.reactions?.some(r => r.emoji === "👍") && (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReaction(message.id, "👍")}
                          className="animate-pulse border-blue-500 text-blue-500 hover:bg-blue-50"
                        >
                          👍 React to this message
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {message.isOwnMessage && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white text-xs">
                        You
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your message here..."
                value={demoMessage}
                onChange={(e) => handleMessageType(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                className={`flex-1 px-3 py-2 rounded-lg border bg-background ${
                  currentStep === 1 ? "border-blue-500 ring-1 ring-blue-500" : "border-input"
                }`}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!demoMessage.trim()}
                className={currentStep === 2 ? "ring-2 ring-blue-500 ring-offset-2" : ""}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send • Use **bold** and *italic* formatting
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Completion Status */}
      {allStepsCompleted && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Great job!</strong> You&apos;ve mastered the basics of chatting in Melo. 
            You&apos;re ready to start real conversations!
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onBack} className="order-2 sm:order-1">
          Back
        </Button>
        
        <div className="flex gap-2 order-1 sm:order-2 flex-1">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePreviousStep}>
              Previous Step
            </Button>
          )}
          
          {currentStep < tutorialSteps.length - 1 && isStepCompleted(currentStep) && (
            <Button onClick={handleNextStep} className="flex-1">
              Next Step
            </Button>
          )}
          
          {allStepsCompleted && (
            <Button onClick={handleComplete} className="flex-1">
              Complete Tutorial! 🎉
            </Button>
          )}
        </div>
        
        {onSkip && (
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onSkip}
            className="order-3 text-muted-foreground"
          >
            Skip Chat Tutorial
          </Button>
        )}
      </div>

      {/* Help Text */}
      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground">
          This is just practice - your real messages will appear in actual chat rooms
        </p>
      </div>
    </div>
  );
}