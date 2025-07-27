import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Eye, Smartphone, Monitor, Tablet } from 'lucide-react';

const PreviewPanel = () => {
  const [activeView, setActiveView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const sampleCode = `import React from 'react';
import { Button } from '@/components/ui/button';

const App = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to Your App
        </h1>
        <p className="text-xl mb-8">
          Built with AI assistance
        </p>
        <Button className="bg-white text-purple-600 hover:bg-gray-100">
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default App;`;

  const getFrameClass = () => {
    switch (activeView) {
      case 'mobile':
        return 'w-[375px] h-[667px]';
      case 'tablet':
        return 'w-[768px] h-[1024px]';
      default:
        return 'w-full h-full';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-preview">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-foreground">Live Preview</h2>
            <div className="flex items-center gap-1">
              <Button
                variant={activeView === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('desktop')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                variant={activeView === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('tablet')}
              >
                <Tablet className="w-4 h-4" />
              </Button>
              <Button
                variant={activeView === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('mobile')}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm text-muted-foreground">Live</span>
          </div>
        </div>
      </div>

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
              <div className={`${getFrameClass()} bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300`}>
                <div className="h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                  <div className="text-center text-white p-8">
                    <h1 className="text-4xl font-bold mb-4">
                      Welcome to Your App
                    </h1>
                    <p className="text-xl mb-8">
                      Built with AI assistance
                    </p>
                    <Button className="bg-white text-purple-600 hover:bg-gray-100">
                      Get Started
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="code" className="flex-1 p-4">
            <div className="h-full bg-secondary rounded-lg p-4 overflow-auto">
              <pre className="text-sm text-foreground font-mono">
                <code>{sampleCode}</code>
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PreviewPanel;