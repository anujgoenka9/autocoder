'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession } from './stripe';
import { getUser } from '@/lib/db/queries';

export const checkoutAction = async (formData: FormData) => {
  const user = await getUser();
  const priceId = formData.get('priceId') as string;
  
  if (!user) {
    // Redirect to sign-in with pricing information
    redirect(`/sign-in?redirect=pricing&priceId=${encodeURIComponent(priceId)}`);
  }

  await createCheckoutSession({ priceId });
};
