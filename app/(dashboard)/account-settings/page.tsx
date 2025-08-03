'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Activity, 
  Users, 
  CreditCard, 
  Settings,
  User,
  Shield,
  Lock,
  Trash2,
  Loader2,
  AlertCircle,
  UserPlus,
  UserCog,
  LogOut,
  UserMinus,
  Mail,
  CheckCircle,
  Crown,
  Edit,
  Key,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  getUserWithSubscription, 
  getSubscriptionDetails, 
  cancelSubscriptionAtPeriodEnd
} from '@/app/api/account/actions';

import { updateAccount, updatePassword, deleteAccount } from '@/app/api/account/supabase-actions';
import { fetchUserCredits } from '@/lib/utils/credits-client';
import useSWR from 'swr';
import { Suspense } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Activity log functions removed - using Supabase auth events

type ActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

function AccountForm({ state, nameValue = '', emailValue = '' }: {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="name" className="text-sm font-medium text-card-foreground mb-2 block">
          Full Name
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter your full name"
                            defaultValue={nameValue}
          required
          className="bg-background border-border focus:border-ai-primary focus:ring-ai-primary transition-colors"
        />
      </div>
      <div>
        <Label htmlFor="email" className="text-sm font-medium text-card-foreground mb-2 block">
          Email Address
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email address"
          defaultValue={emailValue}
          required
          className="bg-background border-border focus:border-ai-primary focus:ring-ai-primary transition-colors"
        />
      </div>
    </div>
  );
}

function AccountFormWithData({ state }: { state: ActionState }) {
  const { data: user } = useSWR('/api/user', fetcher);
  return (
    <AccountForm
      state={state}
      nameValue={user?.name ?? ''}
      emailValue={user?.email ?? ''}
    />
  );
}

function AccountSettingsContent() {
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  // Activity logs removed
  const [credits, setCredits] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accountState, accountAction, isAccountPending] = useActionState(
    updateAccount,
    {}
  );

  const [passwordState, passwordAction, isPasswordPending] = useActionState(
    updatePassword, 
    {}
  );

  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteAccount, 
    {}
  );

  useEffect(() => {
    // Check for payment success parameter
    const paymentSuccess = searchParams.get('payment');
    if (paymentSuccess === 'success') {
      setShowPaymentSuccess(true);
      // Remove the parameter from URL without page reload
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.toString());
      
      // Hide success message after 5 seconds
      setTimeout(() => setShowPaymentSuccess(false), 5000);
    }

    async function fetchData() {
      try {
        const [userResult, subscriptionResult] = await Promise.all([
          getUserWithSubscription(),
          getSubscriptionDetails()
        ]);

        if (userResult.success && userResult.user) {
          setUser(userResult.user);
          // Get user credits via API
          const userCredits = await fetchUserCredits();
          setCredits(userCredits);
        }

        if (subscriptionResult.success) {
          setSubscription(subscriptionResult);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [searchParams]);

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelSubscriptionAtPeriodEnd();
      if (result.success) {
        setShowCancelDialog(false);
        // Refresh subscription data
        const newSubscription = await getSubscriptionDetails();
        if (newSubscription.success) {
          setSubscription(newSubscription);
        }
        alert(result.message);
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-ai-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your account settings...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-background min-h-screen">
      {/* Header Section */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-ai-primary mb-4">
          Account Settings
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Manage your account information, subscription plan, security settings, and view your recent activity.
        </p>
      </div>

      {/* Payment Success Banner */}
      {showPaymentSuccess && (
        <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center">
            <div className="bg-green-100 rounded-full p-2 mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800">Payment Successful!</h3>
              <p className="text-green-700">
                Your subscription has been upgraded successfully. Welcome to the Plus plan!
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 max-w-4xl mx-auto">
        {/* Account Information */}
        <Card className="bg-card border border-border hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-card to-card/90 border-b border-border">
            <CardTitle className="flex items-center gap-3 text-xl text-card-foreground">
              <div className="bg-ai-primary/10 rounded-full p-2">
                <User className="h-5 w-5 text-ai-primary" />
              </div>
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form className="space-y-6" action={accountAction}>
              <Suspense fallback={<AccountForm state={accountState} />}>
                <AccountFormWithData state={accountState} />
              </Suspense>
              {accountState.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{accountState.error}</p>
                </div>
              )}
              {accountState.message && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-700 text-sm">{accountState.message}</p>
                </div>
              )}
              <Button
                type="submit"
                className="bg-gradient-to-r from-ai-primary to-ai-primary/90 hover:from-ai-primary/90 hover:to-ai-primary text-white font-medium px-8 py-2 rounded-lg transition-all duration-200 hover:shadow-md"
                disabled={isAccountPending}
              >
                {isAccountPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Subscription Management */}
        <Card className="bg-card border border-border hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-card to-card/90 border-b border-border">
            <CardTitle className="flex items-center gap-3 text-xl text-card-foreground">
              <div className="bg-ai-primary/10 rounded-full p-2">
                <CreditCard className="h-5 w-5 text-ai-primary" />
              </div>
              Subscription Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-ai-primary/10 to-ai-primary/20 rounded-2xl p-4">
                  {subscription?.plan === 'plus' ? (
                    <Crown className="h-8 w-8 text-yellow-500" />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-card-foreground capitalize">
                    {subscription?.plan === 'base' ? 'Free Plan' : `${subscription?.plan} Plan`}
                  </h3>
                  <p className="text-muted-foreground">
                    {subscription?.plan === 'base' 
                      ? 'Basic features included' 
                      : subscription?.cancelAtPeriodEnd 
                        ? `Cancelling ${subscription?.currentPeriodEnd ? `on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : 'at period end'}`
                        : 'Premium features included'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Credits remaining: <span className="font-semibold text-ai-primary">{credits}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                {subscription?.plan === 'base' ? (
                  <Button
                    onClick={() => router.push('/pricing')}
                    className="bg-gradient-to-r from-ai-primary to-ai-primary/90 hover:from-ai-primary/90 hover:to-ai-primary text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 hover:shadow-md"
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade Plan
                  </Button>
                ) : subscription?.cancelAtPeriodEnd ? (
                  <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 px-4 py-2">
                    <Calendar className="mr-2 h-4 w-4" />
                    Cancellation Scheduled
                  </Badge>
                ) : (
                  <Button
                    onClick={() => setShowCancelDialog(true)}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="bg-card border border-border hover:shadow-lg transition-all duration-300 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-card to-card/90 border-b border-border">
            <CardTitle className="flex items-center gap-3 text-xl text-card-foreground">
              <div className="bg-ai-primary/10 rounded-full p-2">
                <Shield className="h-5 w-5 text-ai-primary" />
              </div>
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-8">
              {/* Change Password */}
              <div>
                <h3 className="text-lg font-semibold text-card-foreground mb-6 flex items-center gap-2">
                  <Key className="h-5 w-5 text-ai-primary" />
                  Change Password
                </h3>
                <form className="space-y-6" action={passwordAction}>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Label htmlFor="new-password" className="text-sm font-medium text-card-foreground mb-2 block">
                        New Password
                      </Label>
                      <Input
                        id="new-password"
                        name="newPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        maxLength={100}
                        className="bg-background border-border focus:border-ai-primary focus:ring-ai-primary transition-colors"
                        placeholder="Enter your new password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm-password" className="text-sm font-medium text-card-foreground mb-2 block">
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirm-password"
                        name="confirmPassword"
                        type="password"
                        required
                        minLength={8}
                        maxLength={100}
                        className="bg-background border-border focus:border-ai-primary focus:ring-ai-primary transition-colors"
                        placeholder="Confirm your new password"
                      />
                    </div>
                  </div>
                  {passwordState.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-700 text-sm">{passwordState.error}</p>
                    </div>
                  )}
                  {passwordState.message && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-700 text-sm">{passwordState.message}</p>
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-ai-primary to-ai-primary/90 hover:from-ai-primary/90 hover:to-ai-primary text-white font-medium px-8 py-2 rounded-lg transition-all duration-200 hover:shadow-md"
                    disabled={isPasswordPending}
                  >
                    {isPasswordPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </form>
              </div>

              <div className="border-t border-border pt-8">
                <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-500" />
                  Delete Account
                </h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                  <p className="text-red-800 text-sm leading-relaxed">
                    <strong>Warning:</strong> Account deletion is permanent and cannot be undone. 
                    All your data, projects, and subscription will be permanently removed.
                  </p>
                </div>
                <form action={deleteAction} className="space-y-6">
                  <div>
                    <Label htmlFor="confirm-delete" className="text-sm font-medium text-card-foreground mb-2 block">
                      Type "DELETE" to confirm
                    </Label>
                    <Input
                      id="confirm-delete"
                      name="confirmText"
                      type="text"
                      required
                      className="bg-background border-border focus:border-red-500 focus:ring-red-500 transition-colors"
                      placeholder="Type DELETE to confirm"
                    />
                  </div>
                  {deleteState.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-700 text-sm">{deleteState.error}</p>
                    </div>
                  )}
                  <Button
                    type="submit"
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 font-medium px-8 py-2 rounded-lg transition-all duration-200 hover:shadow-md"
                    disabled={isDeletePending}
                  >
                    {isDeletePending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting Account...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Account Permanently
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Log removed - Supabase handles auth events */}
      </div>

      {/* Cancel Subscription Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">Cancel Subscription</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your subscription will be canceled at the end of the current billing cycle. 
                You'll continue to have access to all premium features until then.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
                disabled={isCancelling}
                className="flex-1 border-border hover:bg-accent"
              >
                Keep Subscription
              </Button>
              <Button
                onClick={handleCancelSubscription}
                disabled={isCancelling}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel at Period End'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function AccountSettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-ai-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your account settings...</p>
        </div>
      </div>
    }>
      <AccountSettingsContent />
    </Suspense>
  );
} 