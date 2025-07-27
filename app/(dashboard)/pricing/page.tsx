import { checkoutAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { SubmitButton } from './submit-button';
import { Button } from '@/components/ui/button';

// Prices are fresh for one hour max
export const revalidate = 3600;

export default async function PricingPage() {
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
  ]);

  const plusPlan = products.find((product) => product.name === 'Plus');
  const plusPrice = prices.find((price) => price.productId === plusPlan?.id);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-2 gap-8 max-w-xl mx-auto">
        <PricingCard
          name="Base"
          price={0}
          interval="month"
          features={[
            '3 credits',
            'Basic workspace access',
            'Email Support',
          ]}
          priceId={null}
          isFree={true}
        />
        <PricingCard
          name={plusPlan?.name || 'Plus'}
          price={plusPrice?.unitAmount || 1200}
          interval={plusPrice?.interval || 'month'}
          features={[
            'Everything in Base, and:',
            '100 monthly credits',
            '24/7 Support + Slack Access'
          ]}
          priceId={plusPrice?.id}
          isFree={false}
        />
      </div>
    </main>
  );
}

function PricingCard({
  name,
  price,
  interval,
  features,
  priceId,
  isFree,
}: {
  name: string;
  price: number;
  interval: string;
  features: string[];
  priceId?: string | null;
  isFree: boolean;
}) {
  return (
    <div className="pt-6">
      <h2 className="text-2xl font-medium text-gray-900 mb-2">{name}</h2>
      <p className="text-4xl font-medium text-gray-900 mb-6">
        {isFree ? (
          <>
            Free
          </>
        ) : (
          <>
            ${price / 100}{' '}
            <span className="text-xl font-normal text-gray-600">
              / {interval}
            </span>
          </>
        )}
      </p>
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      {!isFree && priceId && (
        <form action={checkoutAction}>
          <input type="hidden" name="priceId" value={priceId} />
          <SubmitButton />
        </form>
      )}
      {isFree && (
        <Button
          disabled
          variant="outline"
          className="w-full rounded-full"
        >
          Current Plan
        </Button>
      )}
    </div>
  );
}
