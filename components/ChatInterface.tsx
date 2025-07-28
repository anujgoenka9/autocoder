'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
}

interface ChatInterfaceProps {
  initialPrompt?: string;
}

const ChatInterface = ({ initialPrompt }: ChatInterfaceProps) => {
  const messageIdCounter = useRef(0);
  const hasProcessedInitialPrompt = useRef(false);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial-ai-message',
      content: 'Hello! I\'m your AI development assistant. I can help you build and modify web applications. What would you like to create today?',
      type: 'ai',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const mockAiResponses = [
    "I'll create that component for you right away! Let me update the code...",
    "Great idea! I'll implement that feature with a modern design.",
    "Perfect! I'll add those styles and make it responsive.",
    "Absolutely! Let me build that interface with beautiful animations."
  ];

  const generateMessageId = () => {
    messageIdCounter.current += 1;
    return `message-${messageIdCounter.current}-${Date.now()}`;
  };

  // Handle initial prompt
  useEffect(() => {
    if (initialPrompt && !hasProcessedInitialPrompt.current) {
      hasProcessedInitialPrompt.current = true;
      setInput(initialPrompt);
      
      // Auto-send the initial prompt
      setTimeout(() => {
        sendMessage(initialPrompt);
      }, 500);
    }
  }, [initialPrompt]);

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: generateMessageId(),
      content: messageContent,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: generateMessageId(),
        content: mockAiResponses[Math.floor(Math.random() * mockAiResponses.length)],
        type: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSendMessage = async () => {
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-chat">
      {/* Header */}
      <div className="p-4 border-b border-chat-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">AI Assistant</h2>
            <p className="text-sm text-muted-foreground">Ready to help you build</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.type === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                message.type === 'user' 
                  ? 'bg-chat-user' 
                  : 'bg-gradient-primary'
              }`}>
                {message.type === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="max-w-[80%]">
                <div className={`rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-chat-user text-white'
                    : 'bg-chat-ai border border-chat-border text-foreground'
                }`}>
                  {message.content}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-chat-ai border border-chat-border rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-ai-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-ai-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-ai-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-chat-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Describe what you want to build..."
            className="flex-1 bg-chat-ai border-chat-border"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!input.trim() || isTyping}
            className="bg-gradient-primary hover:opacity-90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;