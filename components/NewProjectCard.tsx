'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { createNewProject } from '@/app/api/chat/actions';

const NewProjectCard = () => {
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleCreateProject = async () => {
    setIsCreating(true);
    try {
      const result = await createNewProject();
      if (result.success && result.projectId) {
        router.push(`/projects/${result.projectId}`);
      } else {
        console.error('Failed to create new project:', result.error);
      }
    } catch (error) {
      console.error('Error creating new project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card 
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-primary/5 to-primary/10 border-dashed border-2 border-primary/30 hover:border-primary/50"
      onClick={handleCreateProject}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg group-hover:text-ai-primary transition-colors text-card-foreground">
              {isCreating ? 'Creating...' : 'Start New Project'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isCreating ? 'Setting up your workspace' : 'Create a new application'}
            </p>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

export default NewProjectCard; 