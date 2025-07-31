'use server';

import { getCurrentOrCreateProject, saveMessage, getProjectMessages, createProject, updateProjectName, getProjectById, getUser, createOrUpdateFragment } from '@/lib/db/queries';
import { MessageRole, MessageType } from '@/lib/db/schema';

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

export async function sendChatMessage(content: string, projectId?: string) {
  try {
    // Get current authenticated user
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Get or create project
    let project;
    
    if (projectId) {
      // If we have a project ID, we'll use it (though we should validate ownership)
      project = { id: projectId };
    } else {
      // Create a new project for the first message
      const projectName = 'New Project';
      project = await createProject(projectName);
    }

    // Check if this is the first message in the project (empty messages means it's a new project)
    const existingMessages = await getProjectMessages(project.id);
    const isNewProject = existingMessages.length === 0;

    // Save user message
    await saveMessage(project.id, content, MessageRole.USER);

    let aiResponse: string;
    let sandboxUrl: string | undefined;
    let filesCreated: string[] | undefined;

    if (isNewProject) {
      // For new projects, call the agent API
      try {
        // In server actions, we need to provide the full URL
        const baseUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000' 
          : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        const agentResponse = await fetch(`${baseUrl}/api/agent/new`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            task: content,
            project_id: project.id,
            user_id: currentUser.id.toString(), // Use the real user ID from database
          }),
        });

        if (agentResponse.ok) {
          const agentResult = await agentResponse.json();
          
          if (agentResult.success) {
            // Agent successfully created the project
            const taskSummary = agentResult.task_summary || 'Project created successfully with the requested features.';
            
            aiResponse = taskSummary;
            
            sandboxUrl = agentResult.sandbox_url;
            filesCreated = agentResult.files_created;
            
            // Save or update fragment with file contents
            try {
              await createOrUpdateFragment(
                project.id,
                agentResult.sandbox_url,
                agentResult.files_created || {}
              );
            } catch (fragmentError) {
              console.error('Failed to save fragment:', fragmentError);
              // Don't fail the entire request if fragment saving fails
            }
          } else {
            // Agent failed but we have an error message
            aiResponse = `❌ I encountered an issue while creating your project: ${agentResult.error || 'Unknown error'}

Please try again with a different description or let me know if you need help troubleshooting.`;
          }
        } else {
          // HTTP error from agent API
          const errorText = await agentResponse.text();
          console.error('Agent API error:', errorText);
          aiResponse = `❌ I'm having trouble connecting to my development environment right now. Please try again in a moment, or contact support if the issue persists.

Error: ${agentResponse.status} ${agentResponse.statusText}`;
        }
      } catch (agentError) {
        console.error('Error calling agent API:', agentError);
        aiResponse = `❌ I'm experiencing technical difficulties right now. Please try again in a moment.

Error: ${agentError instanceof Error ? agentError.message : 'Unknown error'}`;
      }
    } else {
      // For existing projects, call the continue project API
      try {
        // Get conversation history for context
        const conversationHistory = existingMessages
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');
        
        // In server actions, we need to provide the full URL
        const baseUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000' 
          : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        const agentResponse = await fetch(`${baseUrl}/api/agent/continue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            task: content,
            project_id: project.id,
            user_id: currentUser.id.toString(),
            conversation_history: conversationHistory,
          }),
        });

        if (agentResponse.ok) {
          const agentResult = await agentResponse.json();
          
          if (agentResult.success) {
            // Agent successfully updated the project
            const taskSummary = agentResult.task_summary || 'Project updated successfully with the requested changes.';
            
            aiResponse = taskSummary;
            
            sandboxUrl = agentResult.sandbox_url;
            filesCreated = agentResult.files_created;
            
            // Save or update fragment with file contents
            try {
              await createOrUpdateFragment(
                project.id,
                agentResult.sandbox_url,
                agentResult.files_created || {}
              );
            } catch (fragmentError) {
              console.error('Failed to save fragment:', fragmentError);
              // Don't fail the entire request if fragment saving fails
            }
          } else {
            // Agent failed but we have an error message
            aiResponse = `❌ I encountered an issue while updating your project: ${agentResult.error || 'Unknown error'}

Please try again with a different description or let me know if you need help troubleshooting.`;
          }
        } else {
          // HTTP error from agent API
          const errorText = await agentResponse.text();
          console.error('Agent API error:', errorText);
          aiResponse = `❌ I'm having trouble connecting to my development environment right now. Please try again in a moment, or contact support if the issue persists.

Error: ${agentResponse.status} ${agentResponse.statusText}`;
        }
      } catch (agentError) {
        console.error('Error calling agent API:', agentError);
        aiResponse = `❌ I'm experiencing technical difficulties right now. Please try again in a moment.

Error: ${agentError instanceof Error ? agentError.message : 'Unknown error'}`;
      }
    }
    
    // Save AI response
    const aiMessage = await saveMessage(project.id, aiResponse, MessageRole.ASSISTANT);

    return {
      success: true,
      projectId: project.id,
      userMessage: {
        id: `user-${Date.now()}`,
        content,
        type: 'user' as const,
        timestamp: new Date(),
      },
      aiMessage: {
        id: aiMessage.id,
        content: aiResponse,
        type: 'ai' as const,
        timestamp: aiMessage.createdAt,
      },
      sandboxUrl,
      filesCreated,
    };
  } catch (error) {
    console.error('Failed to send message:', error);
    return {
      success: false,
      error: 'Failed to send message',
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