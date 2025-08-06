'use client';

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Model {
  id: string;
  name: string;
  provider: string;
  fullName: string;
}

const models: Model[] = [
  // Google models
  { id: 'google/gemini-2.5-flash-lite', name: 'gemini-2.5-flash-lite', provider: 'Google', fullName: 'google/gemini-2.5-flash-lite' },
  { id: 'google/gemini-2.5-flash', name: 'gemini-2.5-flash', provider: 'Google', fullName: 'google/gemini-2.5-flash' },
  { id: 'google/gemini-2.5-pro', name: 'gemini-2.5-pro', provider: 'Google', fullName: 'google/gemini-2.5-pro' },
  
  // Anthropic models
  { id: 'anthropic/claude-sonnet-4', name: 'claude-sonnet-4', provider: 'Anthropic', fullName: 'anthropic/claude-sonnet-4' },
  { id: 'anthropic/claude-3.7-sonnet', name: 'claude-3.7-sonnet', provider: 'Anthropic', fullName: 'anthropic/claude-3.7-sonnet' },
  { id: 'anthropic/claude-3.5-haiku', name: 'claude-3.5-haiku', provider: 'Anthropic', fullName: 'anthropic/claude-3.5-haiku' },
  
  // OpenAI models
  { id: 'openai/gpt-4.1-nano', name: 'gpt-4.1-nano', provider: 'OpenAI', fullName: 'openai/gpt-4.1-nano' },
  { id: 'openai/gpt-4.1-mini', name: 'gpt-4.1-mini', provider: 'OpenAI', fullName: 'openai/gpt-4.1-mini' },
  { id: 'openai/gpt-4.1', name: 'gpt-4.1', provider: 'OpenAI', fullName: 'openai/gpt-4.1' },
  { id: 'openai/o3', name: 'o3', provider: 'OpenAI', fullName: 'openai/o3' },
  
  // MoonshotAI models
  { id: 'moonshotai/kimi-k2', name: 'kimi-k2', provider: 'MoonshotAI', fullName: 'moonshotai/kimi-k2' },
  
  // Qwen models
  { id: 'qwen/qwen3-coder', name: 'qwen3-coder', provider: 'Qwen', fullName: 'qwen/qwen3-coder' },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedModelData = models.find(m => m.id === selectedModel) || models[1]; // Default to gemini-2.5-flash
  
  // Group models by provider
  const modelsByProvider = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, Model[]>);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 px-3 text-xs border-border hover:bg-accent bg-background/50"
        >
          <span className="text-muted-foreground text-xs mr-1 font-medium">{selectedModelData.provider.toLowerCase()}</span>
          <span className="font-medium text-foreground">{selectedModelData.name}</span>
          <ChevronDown className="w-3 h-3 ml-1 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {Object.entries(modelsByProvider).map(([provider, providerModels], index) => (
          <div key={provider}>
            {index > 0 && <DropdownMenuSeparator />}
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {provider}
            </div>
            {providerModels.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
                className="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-accent"
              >
                <span className="text-sm">{model.name}</span>
                {selectedModel === model.id && (
                  <Check className="w-3 h-3 text-foreground" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 