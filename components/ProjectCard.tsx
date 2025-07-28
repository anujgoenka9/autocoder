import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen } from 'lucide-react';

interface ProjectCardProps {
  id: string;
  name: string;
  lastModified: string;
}

const ProjectCard = ({ id, name, lastModified }: ProjectCardProps) => {
  return (
    <Link href={`/projects/${id}`}>
      <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 bg-card border-border hover:border-primary/20">
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
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
};

export default ProjectCard; 