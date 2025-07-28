'use client';

import { ReactNode, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import ChatInterface from '@/components/ChatInterface';
import PreviewPanel from '@/components/PreviewPanel';
import ResizeHandle from '@/components/ResizeHandle';
import Header from '@/components/Header';

export default function ProjectsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [chatWidth, setChatWidth] = useState(400);
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <div 
          className="border-r border-border"
          style={{ width: chatWidth }}
        >
          <ChatInterface projectId={projectId} />
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