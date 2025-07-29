'use server';

import { getFragmentByProjectId as getFragmentByProjectIdQuery } from '@/lib/db/queries';

export async function getFragmentByProjectId(projectId: string) {
  try {
    const fragment = await getFragmentByProjectIdQuery(projectId);
    
    if (!fragment) {
      return {
        success: false,
        fragment: null,
      };
    }

    return {
      success: true,
      fragment: {
        id: fragment.id,
        projectId: fragment.projectId,
        sandboxUrl: fragment.sandboxUrl,
        files: fragment.files as Record<string, string>,
        createdAt: fragment.createdAt,
        updatedAt: fragment.updatedAt,
      },
    };
  } catch (error) {
    console.error('Failed to get fragment:', error);
    return {
      success: false,
      error: 'Failed to get fragment',
      fragment: null,
    };
  }
} 