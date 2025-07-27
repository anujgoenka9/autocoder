'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession } from './stripe';
import { withUser } from '@/lib/auth/middleware';

export const checkoutAction = withUser(async (formData, user) => {
  const priceId = formData.get('priceId') as string;
  await createCheckoutSession({ priceId });
});
