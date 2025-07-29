import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Eye, MessageSquare, Copy, Check } from 'lucide-react';
import { getFragmentByProjectId } from '@/app/api/fragments/actions';

interface PreviewPanelProps {
  projectId?: string;
}

const PreviewPanel = ({ projectId }: PreviewPanelProps) => {
  
  const [fragment, setFragment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFragment, setHasFragment] = useState(false);
  const [activeFile, setActiveFile] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Simple scrollbar styles
  const scrollbarStyles = `
    .scrollable {
      scrollbar-width: thin;
      scrollbar-color: #9ca3af transparent;
    }
  `;

  // Fetch fragment data when projectId changes
  useEffect(() => {
    const loadFragment = async () => {
      if (!projectId) {
        setIsLoading(false);
        setHasFragment(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await getFragmentByProjectId(projectId);
        
        if (result.success && result.fragment) {
          setFragment(result.fragment);
          setHasFragment(true);
          // Set the first file as active
          const files = result.fragment.files;
          if (files && Object.keys(files).length > 0) {
            setActiveFile(Object.keys(files)[0]);
          }
        } else {
          setFragment(null);
          setHasFragment(false);
          setActiveFile('');
        }
      } catch (error) {
        console.error('Failed to load fragment:', error);
        setFragment(null);
        setHasFragment(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadFragment();
  }, [projectId]);

  // Set up real-time updates via Server-Sent Events
  useEffect(() => {
    if (!projectId) {
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const eventSource = new EventSource(`/api/events/fragments/${projectId}`);
    eventSourceRef.current = eventSource;
    
    eventSource.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'fragment_updated') {
          // Reload fragment data
          const result = await getFragmentByProjectId(projectId);
          if (result.success && result.fragment) {
            setFragment(result.fragment);
            setHasFragment(true);
            // Keep the current active file if it still exists
            const files = result.fragment.files;
            if (files && Object.keys(files).length > 0) {
              if (!activeFile || !files[activeFile]) {
                setActiveFile(Object.keys(files)[0]);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
    };

    // Cleanup on unmount or projectId change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [projectId]);

  const copyToClipboard = async () => {
    if (!activeFile || !fragment?.files?.[activeFile]) return;
    
    try {
      await navigator.clipboard.writeText(fragment.files[activeFile]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = fragment.files[activeFile];
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      <div className="flex flex-col h-full bg-gradient-preview">


      {/* Content */}
      <div className="flex-1">
        <Tabs defaultValue="preview" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Code
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="preview" className="flex-1 p-4">
            <div className="h-full flex items-center justify-center">
              {isLoading ? (
                <div className="text-center text-muted-foreground">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  Loading preview...
                </div>
              ) : hasFragment && fragment?.sandboxUrl ? (
                <div className="w-full h-full bg-white rounded-lg shadow-2xl overflow-hidden">
                  <iframe
                    src={fragment.sandboxUrl}
                    className="w-full h-full border-0"
                    title="Project Preview"
                  />
                </div>
              ) : (
                <div className="text-center text-muted-foreground max-w-md">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Preview Available</h3>
                  <p className="text-sm leading-relaxed">
                    Start a conversation with the AI assistant to create your application and see the live preview here.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="code" className="flex-1 p-4">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
                Loading code...
              </div>
            ) : hasFragment && fragment?.files ? (
              <div className="h-full border rounded-lg bg-background flex flex-col">
                {/* File tabs with copy button */}
                <div className="h-12 border-b bg-muted/20 rounded-t-lg flex items-center justify-between px-2">
                  <div className="flex gap-1">
                    {Object.keys(fragment.files).map((fileName) => (
                      <button
                        key={fileName}
                        onClick={() => setActiveFile(fileName)}
                        className={`px-3 py-1 text-sm whitespace-nowrap rounded transition-colors ${
                          activeFile === fileName 
                            ? 'bg-background text-foreground shadow-sm' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }`}
                      >
                        {fileName}
                      </button>
                    ))}
                  </div>
                  
                  {/* Copy button */}
                  {activeFile && fragment.files[activeFile] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyToClipboard}
                      className="h-8 w-8 p-0 hover:bg-background/80 cursor-pointer"
                      title="Copy code to clipboard"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  )}
                </div>
                
                {/* Code viewer - Simple approach */}
                <div className="flex-1 relative">
                  {activeFile && fragment.files[activeFile] ? (
                    <div className="absolute inset-0 flex">
                      {/* Line numbers */}
                      <div className="w-12 bg-muted/10 border-r text-xs text-muted-foreground font-mono text-right px-2 py-3 overflow-y-auto">
                        {fragment.files[activeFile].split('\n').map((_: string, index: number) => (
                          <div key={index} className="h-5 leading-5">
                            {index + 1}
                          </div>
                        ))}
                      </div>
                      
                      {/* Code */}
                      <div className="flex-1 overflow-auto">
                        <pre className="text-sm font-mono p-3 m-0 whitespace-pre">
                          {fragment.files[activeFile]}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-muted-foreground">Select a file to view its contents</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center max-w-md">
                  <Code className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Code Available</h3>
                  <p className="text-sm leading-relaxed">
                    Create your first application to see the generated code here.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
};

export default PreviewPanel;