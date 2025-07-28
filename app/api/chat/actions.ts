'use server';

import { getCurrentOrCreateProject, saveMessage, getProjectMessages, createProject, updateProjectName } from '@/lib/db/queries';
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
    // Get or create project
    let project;
    if (projectId) {
      // If we have a project ID, we'll use it (though we should validate ownership)
      project = { id: projectId };
    } else {
      // Create a new project for the first message
      const projectName = content.length > 50 ? content.substring(0, 47) + '...' : content;
      project = await createProject(projectName);
    }

    // Save user message
    await saveMessage(project.id, content, MessageRole.USER);

    // Generate AI response (mock for now)
    const mockResponses = [
      "I'll create that component for you right away! Let me update the code...",
      "Great idea! I'll implement that feature with a modern design.",
      "Perfect! I'll add those styles and make it responsive.",
      "Absolutely! Let me build that interface with beautiful animations."
    ];
    
    const aiResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    
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