'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, X } from 'lucide-react';
import { getFragmentByProjectId } from '@/app/api/fragments/actions';

interface ShareDialogProps {
  projectId: string;
  onClose: () => void;
}

export default function ShareDialog({ projectId, onClose }: ShareDialogProps) {
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Load the fragment data when component mounts
  useEffect(() => {
    const loadFragment = async () => {
      try {
        const result = await getFragmentByProjectId(projectId);
        if (result.success && result.fragment) {
          setSandboxUrl(result.fragment.sandboxUrl);
        } else {
          setError('No preview available for this project');
        }
      } catch (err) {
        setError('Failed to load preview link');
      } finally {
        setIsLoading(false);
      }
    };

    loadFragment();
  }, [projectId]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleCopy = async () => {
    if (sandboxUrl) {
      try {
        await navigator.clipboard.writeText(sandboxUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
  };

  if (isLoading) {
    return (
      <div ref={cardRef} className="absolute top-full right-0 mt-2 w-80 bg-background border border-border rounded-lg shadow-lg z-50">
        <div className="p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ai-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading preview link...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={cardRef} className="absolute top-full right-0 mt-2 w-80 bg-background border border-border rounded-lg shadow-lg z-50">
      {/* Arrow pointing up */}
      <div className="absolute -top-1 right-4 w-2 h-2 bg-background border-l border-t border-border transform rotate-45"></div>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Share Website Link</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-accent"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        
        {error ? (
          <div className="text-center text-muted-foreground py-2 text-sm">
            {error}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Preview Link
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 p-2 bg-muted rounded-md text-xs font-mono truncate">
                  {sandboxUrl}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="bg-muted border border-border rounded-md p-3">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> This link will only be active for 1 hour.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 