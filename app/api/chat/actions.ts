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
    const { saveMessage, upsertFragment } = await import('@/lib/db/queries');
    const { MessageRole } = await import('@/lib/db/schema');
    
    // Save user message
    const userMessageRecord = await saveMessage(projectId, userMessage, MessageRole.USER);
    
    // Save AI response
    const aiMessageRecord = await saveMessage(projectId, aiResponse, MessageRole.ASSISTANT);
    
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
    };
  } catch (error) {
    console.error('Failed to save chat message to database:', error);
    return {
      success: false,
      error: 'Failed to save message to database',
    };
  }
}

export async function sendMessageToAgent(
  messageContent: string,
  projectId: string | null,
  userId: string,
  conversationHistory: Array<{ type: string; content: string }> = []
) {
  try {
    const isNewProject = !projectId || conversationHistory.length === 0;
    const agentApiUrl = process.env.AGENT_API_BASE_URL;
    
    if (!agentApiUrl) {
      throw new Error('AGENT_API_BASE_URL environment variable is not set');
    }

    // Ensure the URL has a protocol
    const baseUrl = agentApiUrl.startsWith('http') ? agentApiUrl : `https://${agentApiUrl}`;
    const apiUrl = `${baseUrl}/api/agent/${isNewProject ? 'new' : 'continue'}`;
    
    // Prepare request body
    const requestBody = isNewProject ? {
      task: messageContent,
      project_id: projectId || `project-${Date.now()}`,
      user_id: userId,
    } : {
      task: messageContent,
      project_id: projectId!,
      user_id: userId,
      conversation_history: conversationHistory.map(msg => `${msg.type}: ${msg.content}`).join('\n'),
    };
    
    console.log('Making API request to:', apiUrl);
    console.log('Request body:', requestBody);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Agent API responded with status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Agent API returned error: ${result.error || 'Unknown error'}`);
    }
    
    return {
      success: true,
      data: result,
      projectId: result.project_id || projectId,
    };
  } catch (error) {
    console.error('Failed to send message to agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message to agent',
    };
  }
} 