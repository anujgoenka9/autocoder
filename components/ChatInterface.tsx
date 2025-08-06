'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Send, Bot, User, Edit3, Check, X } from 'lucide-react';
import { updateProjectNameAction, loadProjectById, saveChatMessageToDatabase } from '@/app/api/chat/actions';
import { streamMessageToAgent } from '@/lib/utils/streaming-client';
import { useUser } from '@/hooks/useUser';
import { fetchUserCredits } from '@/lib/utils/credits-client';
import { ModelSelector } from '@/components/ModelSelector';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatInterfaceProps {
  projectId?: string;
}

const ChatInterface = ({ projectId }: ChatInterfaceProps) => {
  const messageIdCounter = useRef(0);
  const currentProjectId = useRef<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [credits, setCredits] = useState<number>(0);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [selectedModel, setSelectedModel] = useState<string>('google/gemini-2.5-flash');
  
  // Get current user
  const { user, isLoading: isLoadingUser } = useUser();

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

  // Load user credits independently
  useEffect(() => {
    const loadCredits = async () => {
      if (user && !isLoadingUser) {
        try {
          const userCredits = await fetchUserCredits();
          setCredits(userCredits);
        } catch (error) {
          console.error('Failed to load credits:', error);
        }
      }
    };

    loadCredits();
  }, [user, isLoadingUser]);

  // Handle prefill message from suggestion chat
  useEffect(() => {
    if (!isLoading && !isLoadingUser && user && messages.length === 0 && currentProjectId.current) {
      const prefillMessage = localStorage.getItem('prefillMessage');
      if (prefillMessage) {
        console.log('Found prefill message, will send after delay:', prefillMessage);
        // Clear the stored message
        localStorage.removeItem('prefillMessage');
        // Prefill the input and send automatically after a short delay
        setInput(prefillMessage);
        // Send after everything is loaded and project is ready
        const timer = setTimeout(() => {
          console.log('Sending prefill message:', prefillMessage);
          sendMessage(prefillMessage);
        }, 1000); // Increased delay to ensure project is fully ready
        
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, isLoadingUser, user, messages.length, currentProjectId.current]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (isEditingName && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditingName]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };
    
    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages, isTyping]);

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
    if (!messageContent.trim() || isTyping) {
      return;
    }

    // Check if user has enough credits
    if (credits <= 0) {
      const errorMessage: Message = {
        id: generateMessageId(),
        content: '❌ You have no credits remaining. Please upgrade your plan or purchase more credits to continue.',
        type: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Check if this is a new project BEFORE adding the temporary message
    const isNewProject = !currentProjectId.current || messages.length === 0;

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
      // Check if user is authenticated
      if (!user) {
        console.error('User not authenticated');
        setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
        // Show error message to user
        const errorMessage: Message = {
          id: generateMessageId(),
          content: '❌ You need to be signed in to send messages. Please refresh the page and try again.',
          type: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      // Create a streaming message ID for real-time updates
      const streamingId = generateMessageId();
      setStreamingMessageId(streamingId);
      setLastUpdateTime(Date.now()); // Reset timing for new streaming session

      // Add initial empty streaming message
      const streamingMessage: Message = {
        id: streamingId,
        content: '',
        type: 'ai',
        timestamp: new Date(),
        isStreaming: true
      };
      setMessages(prev => [...prev, streamingMessage]);

      // Get conversation history from database only
      let conversationHistory: Array<{ type: string; content: string }> = [];
      
      if (currentProjectId.current) {
        try {
          const { loadProjectById } = await import('@/app/api/chat/actions');
          const projectData = await loadProjectById(currentProjectId.current);
          
          if (projectData.success && projectData.messages) {
            conversationHistory = projectData.messages
              .filter(msg => msg.type === 'user' || msg.type === 'ai')
              .map(msg => ({ type: msg.type, content: msg.content }));
          }
        } catch (error) {
          console.error('Failed to load conversation history from database:', error);
        }
      }
      // Stream message to agent
      const agentResult = await streamMessageToAgent(
        messageContent,
        currentProjectId.current,
        user.id.toString(),
        conversationHistory,
        (type: string, data: any) => {
          // Handle real-time streaming updates with timing controls
          const now = Date.now();
          
          // Minimum display time for each message (200ms)
          if (type === 'status' || type === 'output') {
            if (now - lastUpdateTime < 200) {
              return; // Skip update if too soon
            }
            setLastUpdateTime(now);
          }
          
          // Brief pause before showing completion (500ms)
          if (type === 'complete') {
            setTimeout(() => {
              setMessages(prev => prev.map(msg => {
                if (msg.id === streamingId) {
                  return {
                    ...msg,
                    content: data.task_summary || 'Project completed successfully!',
                    type: 'ai' as const,
                    isStreaming: false,
                    timestamp: new Date()
                  };
                }
                return msg;
              }));
            }, 1000);
            return;
          }
          
          // Handle status, output, and error messages
          setMessages(prev => prev.map(msg => {
            if (msg.id === streamingId) {
              switch (type) {
                case 'status':
                  return {
                    ...msg,
                    content: msg.content + '\n' + (data.message || ''),
                    timestamp: new Date()
                  };
                case 'output':
                  return {
                    ...msg,
                    content: msg.content + '\n' + (data.message || ''),
                    timestamp: new Date()
                  };
                case 'error':
                  return {
                    ...msg,
                    content: msg.content + '\n\n❌ ' + (data.message || 'An error occurred'),
                    type: 'ai' as const,
                    isStreaming: false,
                    timestamp: new Date()
                  };
                default:
                  return msg;
              }
            }
            return msg;
          }));
        },
        selectedModel
      );

      if (!agentResult.success) {
        throw new Error(agentResult.error);
      }

      const result = agentResult.data;
      
      if (result.success) {
        // Update project ID if this was the first message
        if (!currentProjectId.current && result.project_id) {
          currentProjectId.current = result.project_id;
          // Redirect to the new project's route
          router.replace(`/projects/${result.project_id}`);
          // Update project name if this was the first message
          const currentMessages = messages.filter(msg => msg.id !== tempUserMessage.id);
          if (currentMessages.length === 0) {
            const newName = messageContent.length > 50 ? messageContent.substring(0, 47) + '...' : messageContent;
            setProjectName(newName);
          }
        }

        // Ensure we have a project ID for database operations
        const projectIdForDb = currentProjectId.current || result.project_id;
        if (!projectIdForDb) {
          console.error('No project ID available for database operations');
          return;
        }

        // Save messages to database and get proper message IDs
        const dbResult = await saveChatMessageToDatabase(
          projectIdForDb,
          messageContent,
          result.task_summary || 'Project created successfully!',
          result.sandbox_url,
          result.files_created
        );

        if (dbResult.success) {
          // Update the streaming message with the real database ID
          setMessages(prev => prev.map(msg => {
            if (msg.id === streamingMessageId) {
              return {
                ...msg,
                id: dbResult.aiMessage!.id,
                isStreaming: false
              };
            }
            return msg;
          }));
          
          // Update credits in real-time if deduction was successful
          if (dbResult.creditDeduction?.success && typeof dbResult.creditDeduction.remainingCredits === 'number') {
            setCredits(dbResult.creditDeduction.remainingCredits);
          } else {
            // If deduction failed or wasn't returned, refresh credits from server
            const updatedCredits = await fetchUserCredits();
            setCredits(updatedCredits);
          }
        } else {
          // If database save failed, keep the temp messages but log the error
          console.error('Failed to save to database:', dbResult.error);
        }

        // If we have a sandbox URL, we could show it in a special way
        if (result.sandbox_url) {
          console.log('Project created with sandbox URL:', result.sandbox_url);
          console.log('Files created:', result.files_created);
        }
      } else {
        // Remove temp message and show error
        setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id && msg.id !== streamingMessageId));
        console.error('Failed to send message:', result.error);
        
        // Show error message to user
        const errorMessage: Message = {
          id: generateMessageId(),
          content: `❌ ${result.error || 'Failed to process your request. Please try again.'}`,
          type: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id && msg.id !== streamingMessageId));
      console.error('Error sending message:', error);
      
      // Show error message to user
      const errorMessage: Message = {
        id: generateMessageId(),
        content: `❌ Network Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        type: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setStreamingMessageId(null);
    }
  };

  const handleSendMessage = async () => {
    sendMessage(input);
  };

  if (isLoading || isLoadingUser) {
    return (
      <div className="flex flex-col h-full bg-gradient-chat">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
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

  if (!user) {
    return (
      <div className="flex flex-col h-full bg-gradient-chat">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Please sign in to continue.</div>
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
              <ModelSelector 
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 scroll-smooth" ref={scrollAreaRef}>
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
              {message.isStreaming && (
                <div className="w-4 h-4 border border-foreground/30 border-t-foreground rounded-full animate-spin shrink-0" />
              )}
              <div className="max-w-[80%]">
                <div className={`rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-chat-user text-white'
                    : message.isStreaming
                    ? 'bg-chat-ai/50 border border-chat-border text-foreground/70'
                    : 'bg-chat-ai border border-chat-border text-foreground'
                }`}>
                  <div className="whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && !streamingMessageId && (
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
          {/* Scroll end marker for auto-scroll */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-chat-border">
        {credits <= 3 && (
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground">
              Credits remaining: <span className={`font-semibold ${credits <= 0 ? 'text-red-500' : 'text-yellow-500'}`}>
                {credits}
              </span>
              {credits <= 0 && (
                <span className="text-red-600 ml-2">❌ No credits</span>
              )}
            </div>
            <Button
              onClick={() => router.push('/pricing')}
              size="sm"
              className="bg-gradient-primary hover:opacity-90 text-white text-xs px-3 py-1 h-6"
            >
              Upgrade
            </Button>
          </div>
        )}
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
            disabled={!input.trim() || isTyping || credits <= 0}
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