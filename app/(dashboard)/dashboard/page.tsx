'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { User } from '@/lib/db/schema';
import useSWR from 'swr';
import { Suspense } from 'react';
import Link from 'next/link';
import { Calendar, User as UserIcon, Activity, FolderOpen } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function UserProfileSkeleton() {
  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
      </CardHeader>
    </Card>
  );
}

function UserProfile() {
  const { data: userData } = useSWR<User>('/api/user', fetcher);

  if (!userData) {
    return <UserProfileSkeleton />;
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="" alt="Profile" />
            <AvatarFallback>
              {userData.name?.charAt(0)?.toUpperCase() || userData.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">
              {userData.name || 'User'}
            </h3>
            <p className="text-sm text-muted-foreground">{userData.email}</p>
            <p className="text-sm text-muted-foreground">
              Role: {userData.role}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SubscriptionCard() {
  const { data: userData } = useSWR<User>('/api/user', fetcher);

  const planName = userData?.subscriptionPlan === 'plus' ? 'Plus' : 'Base';
  const isActive = userData?.subscriptionStatus === 'active';
  const canUpgrade = userData?.subscriptionPlan === 'base';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Subscription</CardTitle>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {planName} {userData?.subscriptionPlan === 'plus' && '($12/mo)'}
        </div>
        <p className="text-xs text-muted-foreground">
          {isActive ? 'Active subscription' : userData?.subscriptionPlan === 'plus' ? 'Subscription status' : 'Free plan'}
        </p>
        {canUpgrade ? (
          <Link href="/pricing">
            <Button variant="outline" className="mt-3 w-full">
              Upgrade Plan
            </Button>
          </Link>
        ) : (
          <Button variant="outline" className="mt-3 w-full" disabled>
            Current Plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <Suspense fallback={<UserProfileSkeleton />}>
        <UserProfile />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Profile</div>
            <p className="text-xs text-muted-foreground">
              Manage your account settings
            </p>
            <Link href="/dashboard/general">
              <Button variant="outline" className="mt-3 w-full">
                Manage Account
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Logs</div>
            <p className="text-xs text-muted-foreground">
              View your recent activity
            </p>
            <Link href="/dashboard/activity">
              <Button variant="outline" className="mt-3 w-full">
                View Activity
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Workspace</div>
            <p className="text-xs text-muted-foreground">
              Build and manage your projects
            </p>
            <Link href="/projects">
              <Button variant="outline" className="mt-3 w-full">
                Open Projects
              </Button>
            </Link>
          </CardContent>
        </Card>

        <SubscriptionCard />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome to your Dashboard!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is your personal dashboard. You can manage your account, view activity logs, 
            and upgrade your subscription from here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
