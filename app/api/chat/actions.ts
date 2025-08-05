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

export async function sendMessageToAgent(
  messageContent: string,
  projectId: string | null,
  userId: string,
  conversationHistory: Array<{ type: string; content: string }> = []
) {
  try {
    const agentApiUrl = process.env.AGENT_API_BASE_URL;
    
    if (!agentApiUrl) {
      throw new Error('AGENT_API_BASE_URL environment variable is not set');
    }

    // Ensure the URL has a protocol
    const baseUrl = agentApiUrl.startsWith('http') ? agentApiUrl : `https://${agentApiUrl}`;
    const apiUrl = `${baseUrl}/api/agent`;
    
    // Prepare request body - simplified structure for new API
    const requestBody = {
      user_id: userId,
      project_id: projectId || `project-${Date.now()}`,
      task: messageContent,
      conversation_history: conversationHistory.length > 0 
        ? conversationHistory.map(msg => `${msg.type}: ${msg.content}`).join('\n')
        : undefined,
      model: "google/gemini-2.5-flash" // Default model
    };
    
    console.log('Making streaming API request to:', apiUrl);
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
    
    // For now, we'll return a success response that indicates streaming
    // The actual streaming will be handled by the frontend component
    return {
      success: true,
      data: {
        success: true,
        project_id: requestBody.project_id,
        streaming: true,
        message: 'Streaming response initiated'
      },
      projectId: requestBody.project_id,
    };
  } catch (error) {
    console.error('Failed to send message to agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message to agent',
    };
  }
}

 