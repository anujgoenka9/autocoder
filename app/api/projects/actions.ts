'use server';

import { getUserProjects } from '@/lib/db/queries';

export async function getRecentProjects(limit: number = 3) {
  try {
    const allProjects = await getUserProjects();
    const recentProjects = allProjects.slice(0, limit);
    
    return {
      success: true,
      projects: recentProjects.map(project => ({
        id: project.id,
        name: project.name,
        lastModified: formatDate(project.updatedAt),
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }))
    };
  } catch (error) {
    console.error('Failed to fetch recent projects:', error);
    return {
      success: false,
      error: 'Failed to fetch projects',
      projects: []
    };
  }
}

export async function getAllProjects() {
  try {
    const allProjects = await getUserProjects();
    
    return {
      success: true,
      projects: allProjects.map(project => ({
        id: project.id,
        name: project.name,
        lastModified: formatDate(project.updatedAt),
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }))
    };
  } catch (error) {
    console.error('Failed to fetch all projects:', error);
    return {
      success: false,
      error: 'Failed to fetch projects',
      projects: []
    };
  }
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`;
  }
  
  return date.toLocaleDateString();
} 