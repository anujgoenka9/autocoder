import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen, Trash2 } from 'lucide-react';
import { deleteProjectAction } from '@/app/api/projects/actions';

interface ProjectCardProps {
  id: string;
  name: string;
  lastModified: string;
  showDelete?: boolean;
  onDelete?: (projectId: string) => void;
}

const ProjectCard = ({ id, name, lastModified, showDelete = false, onDelete }: ProjectCardProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent the Link navigation
    e.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"?\n\nThis action cannot be undone and will permanently delete the project and all its messages.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const result = await deleteProjectAction(id);
      if (result.success) {
        onDelete?.(id);
      } else {
        console.error('Failed to delete project:', result.error);
        alert('Failed to delete project. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="group relative cursor-pointer hover:shadow-lg transition-all duration-300 bg-card border-border hover:border-primary/20">
      <Link href={`/projects/${id}`} className="block">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg group-hover:text-ai-primary transition-colors text-card-foreground line-clamp-1">
                {name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {lastModified}
              </p>
            </div>
            {showDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      </Link>
    </Card>
  );
};

export default ProjectCard; 