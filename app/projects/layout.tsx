'use client';

import { ReactNode, useState } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import ChatInterface from '@/components/ChatInterface';
import PreviewPanel from '@/components/PreviewPanel';
import ResizeHandle from '@/components/ResizeHandle';

export default function ProjectsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [chatWidth, setChatWidth] = useState(400);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* <DashboardLayout>{children}</DashboardLayout> */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <div 
          className="border-r border-border"
          style={{ width: chatWidth }}
        >
          <ChatInterface />
        </div>
        
        {/* Resize Handle */}
        <ResizeHandle 
          onResize={setChatWidth}
          initialWidth={chatWidth}
        />
        
        {/* Preview Panel */}
        <div className="flex-1">
          <PreviewPanel />
        </div>
      </div>
    </div>
  );
} 