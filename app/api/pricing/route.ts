import { NextRequest, NextResponse } from 'next/server';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { getUser } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const [prices, products, user] = await Promise.all([
      getStripePrices(),
      getStripeProducts(),
      getUser(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        prices,
        products,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          subscriptionPlan: user.subscriptionPlan,
          subscriptionStatus: user.subscriptionStatus,
        } : null
      }
    });
  } catch (error) {
    console.error('Failed to fetch pricing data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing data' },
      { status: 500 }
    );
  }
} 