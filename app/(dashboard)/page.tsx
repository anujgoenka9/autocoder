'use client'

import { Plus, FolderOpen, Zap, Code, Palette, Smartphone, ChevronUp, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SuggestionChat from '@/components/SuggestionChat';
import ProjectCard from '@/components/ProjectCard';
import NewProjectCard from '@/components/NewProjectCard';
import { getRecentProjects, getAllProjects } from '@/app/api/projects/actions';
import { createNewProject } from '@/app/api/chat/actions';
import useSWR from 'swr';
import { User } from '@/lib/db/schema';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Project {
  id: string;
  name: string;
  lastModified: string;
  createdAt: Date;
  updatedAt: Date;
}

function HomePageContent() {
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const projectsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check if user is authenticated
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const isAuthenticated = !!user;

  useEffect(() => {
    // Check for payment success parameter
    const paymentSuccess = searchParams.get('payment');
    if (paymentSuccess === 'success') {
      setShowPaymentSuccess(true);
      // Remove the parameter from URL without page reload
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.toString());
      
      // Hide success message after 5 seconds
      setTimeout(() => setShowPaymentSuccess(false), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadRecentProjects = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }
      
      try {
        const result = await getRecentProjects(3);
        if (result.success) {
          setRecentProjects(result.projects);
        }
      } catch (error) {
        console.error('Failed to load recent projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user !== undefined) { // Wait for auth check to complete
      loadRecentProjects();
    }
  }, [isAuthenticated, user]);

  const handleViewAllProjects = async () => {
    if (showAllProjects) {
      setShowAllProjects(false);
      return;
    }

    setIsLoadingAll(true);
    try {
      const result = await getAllProjects();
      if (result.success) {
        setAllProjects(result.projects);
        setShowAllProjects(true);
        
        // Scroll to projects section
        setTimeout(() => {
          projectsRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 100);
      }
    } catch (error) {
      console.error('Failed to load all projects:', error);
    } finally {
      setIsLoadingAll(false);
    }
  };

  // Function to be called from navigation
  const scrollToAndExpandProjects = async () => {
    if (!showAllProjects) {
      await handleViewAllProjects();
    } else {
      projectsRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  // Handle Get Started button click
  const handleGetStarted = async () => {
    if (!isAuthenticated) {
      // Store intent to create project after login
      localStorage.setItem('postLoginAction', 'createProject');
      router.push('/sign-in');
      return;
    }

    // User is authenticated, create project directly
    setIsCreatingProject(true);
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
      setIsCreatingProject(false);
    }
  };

  // Expose function globally for navigation
  useEffect(() => {
    (window as any).scrollToProjects = scrollToAndExpandProjects;
    return () => {
      delete (window as any).scrollToProjects;
    };
  }, [showAllProjects]);

  const handleProjectDelete = (deletedProjectId: string) => {
    // Remove the deleted project from both recent and all projects lists
    setRecentProjects(prev => prev.filter(project => project.id !== deletedProjectId));
    setAllProjects(prev => prev.filter(project => project.id !== deletedProjectId));
  };

  const displayProjects = showAllProjects ? allProjects : recentProjects;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Payment Success Banner */}
        {showPaymentSuccess && (
          <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-full p-2 mr-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">Payment Successful!</h3>
                <p className="text-green-700">
                  Your subscription has been upgraded successfully. Welcome to the Plus plan!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-ai-primary">
            Build Amazing Web Apps
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transform your ideas into beautiful, functional web applications using the power of AI. 
            No coding experience required.
          </p>
          <Button 
            size="lg" 
            className="bg-gradient-primary hover:opacity-90 text-white cursor-pointer"
            onClick={handleGetStarted}
            disabled={isCreatingProject}
          >
            <Zap className="w-5 h-5 mr-2" />
            {isCreatingProject ? 'Creating Project...' : isAuthenticated ? 'Get Started' : 'Sign in to get started'}
          </Button>
        </div>

        {/* AI Suggestion Chat */}
        <div className="mb-12">
          <SuggestionChat />
        </div>

        {/* Recent/All Projects - Only show if authenticated */}
        {isAuthenticated && (
          <div className="mb-8" ref={projectsRef}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-foreground">
                {showAllProjects ? 'All Projects' : 'Recent Projects'}
                {showAllProjects && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({allProjects.length} total)
                  </span>
                )}
              </h2>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-border hover:bg-accent cursor-pointer"
                onClick={handleViewAllProjects}
                disabled={isLoadingAll}
              >
                {showAllProjects ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Show Less
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    {isLoadingAll ? 'Loading...' : 'View All'}
                  </>
                )}
              </Button>
            </div>
            
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse bg-card border-border">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg" />
                        <div className="flex-1">
                          <div className="h-4 bg-muted rounded mb-2" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : isLoadingAll ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Card key={i} className="animate-pulse bg-card border-border">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg" />
                        <div className="flex-1">
                          <div className="h-4 bg-muted rounded mb-2" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : displayProjects.length > 0 ? (
              <div className={`grid md:grid-cols-2 lg:grid-cols-3 ${showAllProjects ? 'xl:grid-cols-4' : ''} gap-6`}>
                {/* New Project Card - Show when viewing all projects */}
                {showAllProjects && <NewProjectCard />}
                
                {/* Projects */}
                {displayProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    id={project.id}
                    name={project.name}
                    lastModified={project.lastModified}
                    showDelete={showAllProjects}
                    onDelete={handleProjectDelete}
                  />
                ))}
              </div>
            ) : (
              <Card className="text-center py-12 bg-card border-border">
                <CardContent>
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <CardTitle className="mb-2 text-card-foreground">No projects yet</CardTitle>
                  <p className="text-muted-foreground mb-4">
                    Create your first project to get started
                  </p>
                  <div className="max-w-sm mx-auto">
                    <NewProjectCard />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ai-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </main>
    }>
      <HomePageContent />
    </Suspense>
  );
}
