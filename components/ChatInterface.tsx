'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Send, Bot, User, Edit3, Check, X } from 'lucide-react';
import { updateProjectNameAction, loadProjectById, saveChatMessageToDatabase } from '@/app/api/chat/actions';
import { useUser } from '@/hooks/useUser';

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

  // Handle prefill message from suggestion chat
  useEffect(() => {
    if (!isLoading && !isLoadingUser && user && messages.length === 0) {
      const prefillMessage = localStorage.getItem('prefillMessage');
      if (prefillMessage) {
        // Clear the stored message
        localStorage.removeItem('prefillMessage');
        // Prefill the input and send automatically after a short delay
        setInput(prefillMessage);
        // Send after everything is loaded
        const timer = setTimeout(() => {
          sendMessage(prefillMessage);
        }, 500); // Small delay to ensure everything is ready
        
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, isLoadingUser, user, messages.length]);

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
      
      // Use direct API calls - Next.js rewrites are causing proxy issues in development
      // Use relative paths - Next.js rewrites will handle the routing
      const apiUrl = `${process.env.AGENT_API_BASE_URL}/api/agent/${isNewProject ? 'new' : 'continue'}`;
      
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

      // Prepare request body
      const requestBody = isNewProject ? {
        task: messageContent,
        project_id: currentProjectId.current || `project-${Date.now()}`,
        user_id: user.id.toString(),
      } : {
        task: messageContent,
        project_id: currentProjectId.current!,
        user_id: user.id.toString(),
        conversation_history: messages.map(msg => `${msg.type}: ${msg.content}`).join('\n'),
      };
      
      console.log('Making API request to:', apiUrl);
      console.log('Request body:', requestBody);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const result = await response.json();
        
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
            const aiMessage: Message = {
              id: generateMessageId(),
              content: result.task_summary || 'Project created successfully!',
              type: 'ai',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
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
            // Keep the temp user message and add the AI response with real database ID
            const aiMessage: Message = {
              id: dbResult.aiMessage!.id,
              content: result.task_summary || 'Project created successfully!',
              type: 'ai',
              timestamp: dbResult.aiMessage!.timestamp,
            };
            setMessages(prev => [...prev, aiMessage]);
          } else {
            // If database save failed, keep the temp messages but log the error
            console.error('Failed to save to database:', dbResult.error);
            const aiMessage: Message = {
              id: generateMessageId(),
              content: result.task_summary || 'Project created successfully!',
              type: 'ai',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
          }

          // If we have a sandbox URL, we could show it in a special way
          if (result.sandbox_url) {
            console.log('Project created with sandbox URL:', result.sandbox_url);
            console.log('Files created:', result.files_created);
          }
        } else {
          // Remove temp message and show error
          setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
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
      } else {
        // Remove temp message and show error
        setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
        const errorText = await response.text();
        console.error('API error:', errorText);
        
        // Show error message to user
        const errorMessage: Message = {
          id: generateMessageId(),
          content: `❌ API Error: ${response.status} ${response.statusText}. Please try again.`,
          type: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
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
              <div className="max-w-[80%]">
                <div className={`rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-chat-user text-white'
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
          {/* Scroll end marker for auto-scroll */}
          <div ref={messagesEndRef} />
        </div>
      </div>

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