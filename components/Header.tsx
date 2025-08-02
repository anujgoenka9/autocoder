'use client';

import { Button } from '@/components/ui/button';
import { SquareCodeIcon, Share2, Settings, Plus } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { createNewProject } from '@/app/api/chat/actions';
import ShareDialog from './ShareDialog';

const Header = () => {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string | undefined;
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

  const handleLogoClick = () => {
    router.push('/');
  };

  const handleNewProject = async () => {
    setIsCreatingProject(true);
    try {
      const result = await createNewProject();
      if (result.success && result.projectId) {
        // Navigate to the new project
        router.push(`/projects/${result.projectId}`);
      } else {
        console.error('Failed to create new project:', result.error);
      }
    } catch (error) {
      console.error('Error creating new project:', error);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleShare = () => {
    if (projectId) {
      setShowShareCard(true);
    }
  };

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-4 h-full">
        {/* Logo & Project */}
        <div className="flex items-center gap-4">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleLogoClick}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
              <SquareCodeIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-primary bg-clip-text text-transparent">
              AutoCoder
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            className="cursor-pointer"
            variant="ghost" 
            size="sm" 
            onClick={handleNewProject}
            disabled={isCreatingProject}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isCreatingProject ? 'Creating...' : 'New Project'}
          </Button>
          <Button 
            className="cursor-pointer" 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/account-settings')}
          >
            <Settings className="w-4 h-4" />
          </Button>
          <div className="relative">
            <Button 
              size="sm" 
              className="bg-gradient-primary hover:opacity-90 cursor-pointer"
              onClick={handleShare}
              disabled={!projectId}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            
            {showShareCard && projectId && (
              <ShareDialog 
                projectId={projectId} 
                onClose={() => setShowShareCard(false)} 
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;