'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Users, 
  CreditCard, 
  FolderOpen, 
  Settings,
  User,
  Shield
} from 'lucide-react';
import { getActivityLogs } from '@/lib/db/queries';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createNewProject, initializeChat } from '@/app/api/chat/actions';

export default function DashboardPage() {
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpeningProjects, setIsOpeningProjects] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchActivityLogs() {
      try {
        const logs = await getActivityLogs();
        setActivityLogs(logs);
      } catch (error) {
        console.error('Failed to fetch activity logs:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchActivityLogs();
  }, []);

  const handleOpenProjects = async () => {
    setIsOpeningProjects(true);
    try {
      // Try to get the latest project first
      const result = await initializeChat();
      
      if (result.success && result.project) {
        // Redirect to the latest project
        router.push(`/projects/${result.project.id}`);
      } else {
        // No projects exist, create a new one
        const newProjectResult = await createNewProject();
        if (newProjectResult.success && newProjectResult.projectId) {
          router.push(`/projects/${newProjectResult.projectId}`);
        } else {
          console.error('Failed to create new project');
        }
      }
    } catch (error) {
      console.error('Error opening projects:', error);
    } finally {
      setIsOpeningProjects(false);
    }
  };

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h3 className="text-lg font-medium text-card-foreground">Dashboard</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account and view your activity.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">1</div>
            <p className="text-xs text-muted-foreground">
              You are the only user
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Subscription</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">Free</div>
            <p className="text-xs text-muted-foreground">
              Current plan
            </p>
            <Link href="/pricing">
              <Button variant="outline" className="mt-3 w-full border-border hover:bg-accent">
                Upgrade Plan
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">Workspace</div>
            <p className="text-xs text-muted-foreground">
              Build and manage your projects
            </p>
            <Button 
              variant="outline" 
              className="mt-3 w-full border-border hover:bg-accent"
              onClick={handleOpenProjects}
              disabled={isOpeningProjects}
            >
              {isOpeningProjects ? 'Opening...' : 'Open Projects'}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              {activityLogs.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Recent activities
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2 mt-1"></div>
                  </div>
                ))}
              </div>
            ) : activityLogs.length > 0 ? (
              activityLogs.map((log) => (
                <div key={log.id} className="flex items-center space-x-4">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-primary text-white">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-card-foreground">
                      {log.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/general" className="block">
              <Button variant="outline" className="w-full justify-start border-border hover:bg-accent">
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </Button>
            </Link>
            <Link href="/dashboard/security" className="block">
              <Button variant="outline" className="w-full justify-start border-border hover:bg-accent">
                <Shield className="mr-2 h-4 w-4" />
                Security Settings
              </Button>
            </Link>
            <Link href="/pricing" className="block">
              <Button variant="outline" className="w-full justify-start border-border hover:bg-accent">
                <CreditCard className="mr-2 h-4 w-4" />
                Billing & Plans
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
