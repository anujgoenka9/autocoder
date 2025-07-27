import { useState, useCallback } from 'react';
import { GripVertical } from 'lucide-react';

interface ResizeHandleProps {
  onResize: (newWidth: number) => void;
  initialWidth: number;
}

const ResizeHandle = ({ onResize, initialWidth }: ResizeHandleProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startWidth = initialWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.min(Math.max(300, startWidth + deltaX), window.innerWidth - 300);
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [initialWidth, onResize]);

  return (
    <div
      className={`w-1 bg-border hover:bg-ai-primary transition-colors cursor-col-resize flex items-center justify-center group ${
        isDragging ? 'bg-ai-primary' : ''
      }`}
      onMouseDown={handleMouseDown}
    >
      <GripVertical className="w-3 h-3 text-muted-foreground group-hover:text-ai-primary opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

export default ResizeHandle;