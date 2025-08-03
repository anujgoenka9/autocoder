import Stripe from 'stripe';
import { stripe } from '@/lib/payments/stripe';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { addCredits, deductCredits, getCredits, subtractBillingCycleCredits } from '@/lib/utils/credits';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function updateUserSubscription(customerId: string, subscription: Stripe.Subscription) {
  try {
    const plan = subscription.items.data[0]?.price;
    const productName = (plan?.product as Stripe.Product)?.name;
    
    await db
      .update(users)
      .set({
        subscriptionPlan: productName?.toLowerCase() === 'plus' ? 'plus' : 'base',
        subscriptionStatus: subscription.status,
        stripeSubscriptionId: subscription.id,
        updatedAt: new Date(),
      })
      .where(eq(users.stripeCustomerId, customerId));
      
    console.log(`Updated subscription for customer ${customerId}: ${subscription.status}`);
  } catch (error) {
    console.error('Error updating user subscription:', error);
  }
}

async function handleSubscriptionCancellation(customerId: string) {
  try {
    await db
      .update(users)
      .set({
        subscriptionPlan: 'base',
        subscriptionStatus: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(users.stripeCustomerId, customerId));
      
    console.log(`Cancelled subscription for customer ${customerId}`);
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

async function handleMonthlyCredits(customerId: string) {
  try {
    // Get user by customer ID
    const user = await db
      .select({ id: users.id, subscriptionPlan: users.subscriptionPlan })
      .from(users)
      .where(eq(users.stripeCustomerId, customerId))
      .limit(1);

    if (user.length > 0 && user[0].subscriptionPlan === 'plus') {
      const newCredits = await addCredits(user[0].id, 100);
      console.log(`Added 100 credits to user ${user[0].id} (customer ${customerId}). New total: ${newCredits}`);
    }
  } catch (error) {
    console.error('Error adding monthly credits:', error);
  }
}

async function handleBillingCycleEnd(customerId: string) {
  try {
    // Get user by customer ID
    const user = await db
      .select({ id: users.id, subscriptionPlan: users.subscriptionPlan })
      .from(users)
      .where(eq(users.stripeCustomerId, customerId))
      .limit(1);

    if (user.length > 0) {
      // Subtract 100 credits for billing cycle end (will go to 0 if less than 100)
      const remainingCredits = await subtractBillingCycleCredits(user[0].id, 100);
      console.log(`Billing cycle ended for user ${user[0].id} (customer ${customerId}). Subtracted up to 100 credits. Remaining: ${remainingCredits}`);
    }
  } catch (error) {
    console.error('Error handling billing cycle end:', error);
  }
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed.' },
      { status: 400 }
    );
  }

  switch (event.type) {
    case 'customer.subscription.created':
      const createdSubscription = event.data.object as Stripe.Subscription;
      await updateUserSubscription(createdSubscription.customer as string, createdSubscription);
      break;
    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object as Stripe.Subscription;
      // Handle both regular updates and period-end cancellations
      if (updatedSubscription.status === 'canceled') {
        if (updatedSubscription.cancel_at_period_end) {
          // Subscription was cancelled at period end and has now expired
          await handleSubscriptionCancellation(updatedSubscription.customer as string);
          // Handle billing cycle end for cancelled subscription
          await handleBillingCycleEnd(updatedSubscription.customer as string);
        } else {
          // Subscription was cancelled immediately
          await handleSubscriptionCancellation(updatedSubscription.customer as string);
          // Handle billing cycle end for immediately cancelled subscription
          await handleBillingCycleEnd(updatedSubscription.customer as string);
        }
      } else {
        await updateUserSubscription(updatedSubscription.customer as string, updatedSubscription);
      }
      break;
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCancellation(deletedSubscription.customer as string);
      // Handle billing cycle end for deleted subscription
      await handleBillingCycleEnd(deletedSubscription.customer as string);
      break;
    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.status === 'paid' && typeof invoice.customer === 'string') {
        // First, subtract 100 credits for the previous billing cycle (if any)
        await handleBillingCycleEnd(invoice.customer);
        // Then add 100 credits for the new billing cycle (for plus tier users)
        await handleMonthlyCredits(invoice.customer);
      }
      console.log('Payment succeeded:', event.data.object.id);
      break;
    case 'invoice.payment_failed':
      console.log('Payment failed:', event.data.object.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
