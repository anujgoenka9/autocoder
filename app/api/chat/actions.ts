'use server';

import { getCurrentOrCreateProject, getProjectMessages, createProject, updateProjectName, getProjectById, getUser } from '@/lib/db/queries';

export async function initializeChat() {
  try {
    const project = await getCurrentOrCreateProject();
    const messages = await getProjectMessages(project.id);
    
    return {
      success: true,
      project,
      messages: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        type: msg.role.toLowerCase() as 'user' | 'ai',
        timestamp: msg.createdAt,
      })),
    };
  } catch (error) {
    console.error('Failed to initialize chat:', error);
    return {
      success: false,
      error: 'Failed to initialize chat',
      project: null,
      messages: [],
    };
  }
}



export async function updateProjectNameAction(projectId: string, newName: string) {
  try {
    if (!newName.trim()) {
      return {
        success: false,
        error: 'Project name cannot be empty',
      };
    }

    const updatedProject = await updateProjectName(projectId, newName);
    
    return {
      success: true,
      project: updatedProject,
    };
  } catch (error) {
    console.error('Failed to update project name:', error);
    return {
      success: false,
      error: 'Failed to update project name',
    };
  }
}

export async function createNewProject() {
  try {
    const project = await createProject('New Project');
    
    return {
      success: true,
      projectId: project.id,
      project,
    };
  } catch (error) {
    console.error('Failed to create new project:', error);
    return {
      success: false,
      error: 'Failed to create new project',
    };
  }
}

export async function loadProjectById(projectId: string) {
  try {
    const project = await getProjectById(projectId);
    const messages = await getProjectMessages(projectId);
    
    return {
      success: true,
      project,
      messages: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        type: msg.role.toLowerCase() as 'user' | 'ai',
        timestamp: msg.createdAt,
      })),
    };
  } catch (error) {
    console.error('Failed to load project:', error);
    return {
      success: false,
      error: 'Failed to load project',
      project: null,
      messages: [],
    };
  }
}

export async function saveChatMessageToDatabase(
  projectId: string, 
  userMessage: string, 
  aiResponse: string,
  sandboxUrl?: string,
  filesCreated?: Record<string, string>
) {
  try {
    // Import the necessary functions
    const { saveMessage, createOrUpdateFragment } = await import('@/lib/db/queries');
    const { MessageRole } = await import('@/lib/db/schema');
    
    // Save user message
    const userMessageRecord = await saveMessage(projectId, userMessage, MessageRole.USER);
    
    // Save AI response
    const aiMessageRecord = await saveMessage(projectId, aiResponse, MessageRole.ASSISTANT);
    
    // Save or update fragment if we have sandbox URL and files
    if (sandboxUrl && filesCreated) {
      try {
        await createOrUpdateFragment(projectId, sandboxUrl, filesCreated);
      } catch (fragmentError) {
        console.error('Failed to save fragment:', fragmentError);
        // Don't fail the entire request if fragment saving fails
      }
    }
    
    return {
      success: true,
      userMessage: {
        id: userMessageRecord.id,
        content: userMessage,
        type: 'user' as const,
        timestamp: userMessageRecord.createdAt,
      },
      aiMessage: {
        id: aiMessageRecord.id,
        content: aiResponse,
        type: 'ai' as const,
        timestamp: aiMessageRecord.createdAt,
      },
    };
  } catch (error) {
    console.error('Failed to save chat message to database:', error);
    return {
      success: false,
      error: 'Failed to save message to database',
    };
  }
} 