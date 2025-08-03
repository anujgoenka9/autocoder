'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, Lightbulb, Sparkles } from 'lucide-react';
import { createNewProject } from '@/app/api/chat/actions';
import { useUser } from '@/hooks/useUser';

const SuggestionChat = () => {
  const [input, setInput] = useState('');
  const [isStartingProject, setIsStartingProject] = useState(false);
  const router = useRouter();
  
  // Get current user
  const { user } = useUser();
  const isAuthenticated = !!user;

  const suggestions = [
    "Create a modern e-commerce website with product catalog",
    "Build a task management app with drag-and-drop functionality", 
    "Design a portfolio website for a photographer",
    "Make a weather dashboard with interactive charts",
    "Build a social media feed with real-time updates",
    "Create a restaurant website with online ordering",
    "Design a fitness tracking app with workout plans",
    "Build a blog platform with markdown support"
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleStartBuilding = async () => {
    if (!input.trim()) return;
    
    if (!isAuthenticated) {
      // Store the prompt and intent to create project after login
      localStorage.setItem('postLoginAction', 'createProject');
      localStorage.setItem('postLoginPrompt', input.trim());
      router.push('/sign-in');
      return;
    }
    
    setIsStartingProject(true);
    try {
      // Create a new project
      const projectResult = await createNewProject();
      
      if (projectResult.success && projectResult.projectId) {
        // Store the user's input to prefill the chat input
        localStorage.setItem('prefillMessage', input.trim());
        
        // Navigate to the new project - ChatInterface will handle the first message
        router.push(`/projects/${projectResult.projectId}`);
      } else {
        console.error('Failed to create project:', projectResult.error);
      }
    } catch (error) {
      console.error('Error starting project:', error);
    } finally {
      setIsStartingProject(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto bg-gradient-chat border-chat-border">
      <CardContent className="p-6">

        {/* Input */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStartBuilding()}
              placeholder="Describe an app idea or click on one of the suggestions below..."
              className="flex-1 bg-chat-ai border-chat-border"
              disabled={isStartingProject}
            />
            <Button 
              onClick={handleStartBuilding}
              disabled={!input.trim() || isStartingProject}
              className="bg-gradient-primary hover:opacity-90"
            >
              <Send className="w-4 h-4 mr-2" />
              {isStartingProject ? 'Starting...' : 'Start Building'}
            </Button>
          </div>
        </div>

                {/* Suggestions */}
        <div className="mb-6 mt-5">
          <ScrollArea className="h-48">
            <div className="grid gap-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start text-left h-auto p-3 border-chat-border bg-chat-ai hover:bg-chat-user/10 transition-colors"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isStartingProject}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="text-sm">{suggestion}</span>
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default SuggestionChat;