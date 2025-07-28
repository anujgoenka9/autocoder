'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { initializeChat, createNewProject } from '@/app/api/chat/actions';

export default function ProjectsPage() {
  const router = useRouter();

  useEffect(() => {
    const redirectToProject = async () => {
      try {
        // Try to get the latest project
        const result = await initializeChat();
        
        if (result.success && result.project) {
          // Redirect to the latest project
          router.replace(`/projects/${result.project.id}`);
        } else {
          // No projects exist, create a new one
          const newProjectResult = await createNewProject();
          if (newProjectResult.success && newProjectResult.projectId) {
            router.replace(`/projects/${newProjectResult.projectId}`);
          } else {
            console.error('Failed to create new project');
          }
        }
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    };

    redirectToProject();
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-muted-foreground">Loading projects...</div>
    </div>
  );
} 