'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Edit3, Check, X } from 'lucide-react';
import { initializeChat, sendChatMessage, updateProjectNameAction, loadProjectById } from '@/app/api/chat/actions';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
}

interface ChatInterfaceProps {
  projectId?: string;
}

const ChatInterface = ({ projectId }: ChatInterfaceProps) => {
  const messageIdCounter = useRef(0);
  const currentProjectId = useRef<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const generateMessageId = () => {
    messageIdCounter.current += 1;
    return `message-${messageIdCounter.current}-${Date.now()}`;
  };

  // Load existing messages on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!projectId) {
        // No project ID provided, let the main projects page handle the redirect
        setIsLoading(false);
        return;
      }

      try {
        // Load specific project
        const result = await loadProjectById(projectId);
        currentProjectId.current = projectId;
        
        if (result.success && result.messages) {
          setMessages(result.messages);
          setProjectName(result.project?.name || 'New Project');
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChatHistory();
  }, [projectId, router]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (isEditingName && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditingName]);

  const startEditingName = () => {
    setEditingName(projectName);
    setIsEditingName(true);
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
    setEditingName('');
  };

  const saveProjectName = async () => {
    if (!editingName.trim() || !currentProjectId.current) {
      cancelEditingName();
      return;
    }

    setIsUpdatingName(true);
    try {
      const result = await updateProjectNameAction(currentProjectId.current, editingName.trim());
      
      if (result.success) {
        setProjectName(editingName.trim());
        setIsEditingName(false);
        setEditingName('');
      } else {
        console.error('Failed to update project name:', result.error);
      }
    } catch (error) {
      console.error('Error updating project name:', error);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveProjectName();
    } else if (e.key === 'Escape') {
      cancelEditingName();
    }
  };

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isTyping) return;

    // Add user message immediately to UI
    const tempUserMessage: Message = {
      id: generateMessageId(),
      content: messageContent,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, tempUserMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const result = await sendChatMessage(messageContent, currentProjectId.current || undefined);
      
      if (result.success) {
        // Update project ID if this was the first message
        if (!currentProjectId.current && result.projectId) {
          currentProjectId.current = result.projectId;
          // Redirect to the new project's route
          router.replace(`/projects/${result.projectId}`);
          // Update project name if this was the first message
          if (messages.length === 0) {
            const newName = messageContent.length > 50 ? messageContent.substring(0, 47) + '...' : messageContent;
            setProjectName(newName);
          }
        }

        // Replace temp user message with real one and add AI response
        setMessages(prev => {
          const withoutTemp = prev.filter(msg => msg.id !== tempUserMessage.id);
          return [
            ...withoutTemp,
            result.userMessage!,
            result.aiMessage!
          ];
        });

        // If we have a sandbox URL, we could show it in a special way
        if (result.sandboxUrl) {
          console.log('🎉 Project created with sandbox URL:', result.sandboxUrl);
          console.log('📁 Files created:', result.filesCreated);
        }
      } else {
        // Remove temp message and show error
        setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
        console.error('Failed to send message:', result.error);
      }
    } catch (error) {
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
      console.error('Error sending message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    sendMessage(input);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-gradient-chat">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading chat history...</div>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex flex-col h-full bg-gradient-chat">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading project...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-chat">
      {/* Header */}
      <div className="p-4 border-b border-chat-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    ref={editInputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={handleNameKeyPress}
                    onBlur={saveProjectName}
                    className="font-semibold text-foreground bg-transparent border-none h-6 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={isUpdatingName}
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={saveProjectName}
                      disabled={isUpdatingName}
                    >
                      <Check className="w-3 h-3 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={cancelEditingName}
                      disabled={isUpdatingName}
                    >
                      <X className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-2 cursor-pointer group flex-1"
                  onClick={startEditingName}
                >
                  <h2 className="font-semibold text-foreground">{projectName}</h2>
                  <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
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
                  <div className="whitespace-pre-wrap">
                    {message.content.split('\n').map((line, index) => {
                      // Check if line contains a sandbox URL
                      const sandboxUrlMatch = line.match(/🔗 \*\*Sandbox URL\*\*: (https?:\/\/[^\s]+)/);
                      if (sandboxUrlMatch) {
                        const url = sandboxUrlMatch[1];
                        return (
                          <div key={index} className="mb-2">
                            <span>🔗 <strong>Sandbox URL</strong>: </span>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline break-all"
                            >
                              {url}
                            </a>
                          </div>
                        );
                      }
                      return <div key={index}>{line}</div>;
                    })}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
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
            disabled={isTyping}
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