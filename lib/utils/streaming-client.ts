// Client-side streaming function for Agent API
export async function streamMessageToAgent(
  messageContent: string,
  projectId: string | null,
  userId: string,
  conversationHistory: Array<{ type: string; content: string }> = [],
  onMessage?: (type: string, data: any) => void,
  model: string = "google/gemini-2.5-flash"
) {
  try {
    const agentApiUrl = process.env.NEXT_PUBLIC_AGENT_API_BASE_URL;
    
    if (!agentApiUrl) {
      throw new Error('Agent API URL is not configured');
    }

    // Ensure the URL has a protocol
    const baseUrl = agentApiUrl.startsWith('http') ? agentApiUrl : `https://${agentApiUrl}`;
    const apiUrl = `${baseUrl}/api/agent`;
    
    // Determine if this is a new project or continuing an existing one
    const isNewProject = !projectId || conversationHistory.length === 0;
    const finalProjectId = projectId || `project-${Date.now()}`;
    
    // Prepare request body
    const requestBody = {
      user_id: userId,
      project_id: finalProjectId,
      task: messageContent,
      conversation_history: conversationHistory.length > 0 
        ? conversationHistory.map(msg => `${msg.type}: ${msg.content}`).join('\n')
        : undefined,
      model: model
    };
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      throw new Error(`Agent API responded with status: ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available for streaming');
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: any = null;
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (onMessage) {
              onMessage(data.type, data.data);
            }
            
            // Store final result for completion
            if (data.type === 'complete') {
              finalResult = {
                success: true,
                project_id: requestBody.project_id,
                sandbox_url: data.data.sandbox_url,
                files_created: data.data.files_created,
                task_summary: data.data.task_summary
              };
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', line, parseError);
          }
        }
      }
    }
    
    return {
      success: true,
      data: finalResult || {
        success: true,
        project_id: requestBody.project_id,
        message: 'Streaming completed'
      },
      projectId: requestBody.project_id,
    };
  } catch (error) {
    console.error('Failed to stream message to agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stream message to agent',
    };
  }
} 