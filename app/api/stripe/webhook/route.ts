import Stripe from 'stripe';
import { stripe } from '@/lib/payments/stripe';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
      await updateUserSubscription(updatedSubscription.customer as string, updatedSubscription);
      break;
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCancellation(deletedSubscription.customer as string);
      break;
    case 'invoice.payment_succeeded':
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
