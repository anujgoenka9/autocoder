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
    // Check if user is authenticated first
    const { getUser } = await import('@/lib/db/queries');
    const user = await getUser();
    
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }
    
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
      error: error instanceof Error ? error.message : 'Failed to create new project',
    };
  }
}

export async function loadProjectById(projectId: string) {
  try {
    const project = await getProjectById(projectId);
    const messages = await getProjectMessages(projectId);
    
    const mappedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      type: (msg.role === 'ASSISTANT' ? 'ai' : 'user') as 'user' | 'ai',
      timestamp: msg.createdAt,
    }));
    
    return {
      success: true,
      project,
      messages: mappedMessages,
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
    const { saveMessage, upsertFragment } = await import('@/lib/db/queries');
    const { MessageRole } = await import('@/lib/db/schema');
    const { deductCredits, getCredits } = await import('@/lib/utils/credits');
    const { getUser } = await import('@/lib/db/queries');
    
    // Save user message
    const userMessageRecord = await saveMessage(projectId, userMessage, MessageRole.USER);
    
    // Save AI response
    const aiMessageRecord = await saveMessage(projectId, aiResponse, MessageRole.ASSISTANT);
    
    // Deduct credits for AI response directly
    let creditDeductionResult = null;
    try {
      const user = await getUser();
      if (user) {
        const success = await deductCredits(user.id, 1);
        
        if (success) {
          const remainingCredits = await getCredits(user.id);
          creditDeductionResult = {
            success: true,
            remainingCredits,
            deducted: 1
          };
        } else {
          creditDeductionResult = {
            success: false,
            error: 'Insufficient credits'
          };
        }
      } else {
        creditDeductionResult = {
          success: false,
          error: 'User not found'
        };
      }
    } catch (creditError) {
      console.error('Error deducting credits:', creditError);
      creditDeductionResult = { success: false, error: 'Credit deduction error' };
    }
    
    // Save or update fragment if we have sandbox URL and files
    if (sandboxUrl && filesCreated) {
      try {
        await upsertFragment(projectId, sandboxUrl, filesCreated);
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
      creditDeduction: creditDeductionResult,
    };
  } catch (error) {
    console.error('Failed to save chat message to database:', error);
    return {
      success: false,
      error: 'Failed to save message to database',
    };
  }
}

 