'use server';

import { redirect } from 'next/navigation';
import { stripe } from '@/lib/payments/stripe';
import { getUser } from '@/lib/db/queries';

export async function getUserWithSubscription() {
  try {
    const user = await getUser();
    if (!user) {
      redirect('/sign-in');
    }
    
    return {
      success: true,
      user
    };
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return {
      success: false,
      error: 'Failed to fetch user data'
    };
  }
}

export async function cancelSubscriptionAtPeriodEnd() {
  try {
    const user = await getUser();
    if (!user || !user.stripeSubscriptionId) {
      return {
        success: false,
        error: 'No active subscription found'
      };
    }

    // Cancel subscription at the end of the current billing period
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    return {
      success: true,
      message: 'Your subscription will be canceled at the end of the current billing period. You\'ll continue to have access until then.'
    };
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    return {
      success: false,
      error: 'Failed to cancel subscription. Please try again.'
    };
  }
}

export async function getSubscriptionDetails() {
  try {
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    if (!user.stripeSubscriptionId) {
      return {
        success: true,
        plan: user.subscriptionPlan || 'base',
        status: 'inactive',
        cancelAtPeriodEnd: false
      };
    }

    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    
    return {
      success: true,
      plan: user.subscriptionPlan || 'base',
      status: subscription.status,
      cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
      currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null,
      stripeSubscriptionId: user.stripeSubscriptionId
    };
  } catch (error) {
    console.error('Failed to get subscription details:', error);
    return {
      success: false,
      error: 'Failed to fetch subscription details'
    };
  }
} 