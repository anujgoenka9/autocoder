'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createNewProject } from '@/app/api/chat/actions';

const PostLoginHandler = () => {
  const router = useRouter();

  useEffect(() => {
    const handlePostLoginAction = async () => {
      const postLoginAction = localStorage.getItem('postLoginAction');
      
      if (postLoginAction === 'createProject') {
        // Get the stored prompt if any
        const storedPrompt = localStorage.getItem('postLoginPrompt');
        
        // Clear the stored actions
        localStorage.removeItem('postLoginAction');
        localStorage.removeItem('postLoginPrompt');
        
        // Create new project
        try {
          const result = await createNewProject();
          if (result.success && result.projectId) {
            // If there was a stored prompt, store it to prefill the chat input
            if (storedPrompt) {
              localStorage.setItem('prefillMessage', storedPrompt);
            }
            
            router.replace(`/projects/${result.projectId}`);
          } else {
            console.error('Failed to create new project:', result.error);
            // Fallback to home page
            router.replace('/');
          }
        } catch (error) {
          console.error('Error creating new project:', error);
          // Fallback to home page
          router.replace('/');
        }
      }
    };

    // Small delay to ensure the user is fully authenticated
    const timeoutId = setTimeout(handlePostLoginAction, 500);
    
    return () => clearTimeout(timeoutId);
  }, [router]);

  return null; // This component doesn't render anything
};

export default PostLoginHandler; 