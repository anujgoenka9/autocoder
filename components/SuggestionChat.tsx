'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, Lightbulb, Sparkles } from 'lucide-react';
import { createNewProject, sendChatMessage } from '@/app/api/chat/actions';

const SuggestionChat = () => {
  const [input, setInput] = useState('');
  const [isStartingProject, setIsStartingProject] = useState(false);
  const router = useRouter();

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
    
    setIsStartingProject(true);
    try {
      // Create a new project
      const projectResult = await createNewProject();
      
      if (projectResult.success && projectResult.projectId) {
        // Send the initial message to the new project
        await sendChatMessage(input.trim(), projectResult.projectId);
        
        // Navigate to the new project
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
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">AI Assistant</h3>
            <p className="text-sm text-muted-foreground">Ready to help you build amazing apps</p>
          </div>
          <div className="ml-auto">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-chat-ai rounded-lg p-4 mb-6 border border-chat-border">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-foreground mb-2">
                👋 Welcome! I'm here to help you build amazing web applications. 
                Try one of these suggestions or describe your own idea:
              </p>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-foreground">Popular Ideas</h4>
          </div>
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

        {/* Input */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStartBuilding()}
              placeholder="Or describe your own app idea..."
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
          <p className="text-xs text-muted-foreground text-center">
            Click a suggestion above or type your own idea to get started
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SuggestionChat;