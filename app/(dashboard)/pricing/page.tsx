import { checkoutAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { SubmitButton } from './submit-button';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/db/queries';

// Prices are fresh for one hour max
export const revalidate = 3600;

export default async function PricingPage() {
  const [prices, products, user] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
    getUser(),
  ]);

  const plusPlan = products.find((product) => product.name === 'Plus');
  const plusPrice = prices.find((price) => price.productId === plusPlan?.id);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-background">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">Choose Your Plan</h1>
        <p className="text-lg text-muted-foreground">
          Select the perfect plan for your needs
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
          isCurrentPlan={user?.subscriptionPlan === 'base'}
          userSubscription={user?.subscriptionPlan}
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
          isCurrentPlan={user?.subscriptionPlan === 'plus'}
          userSubscription={user?.subscriptionPlan}
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
  isCurrentPlan,
  userSubscription,
}: {
  name: string;
  price: number;
  interval: string;
  features: string[];
  priceId?: string | null;
  isFree: boolean;
  isCurrentPlan: boolean;
  userSubscription?: string | null;
}) {
  const showUpgradeButton = !isFree && !isCurrentPlan;
  const showCurrentPlanButton = isCurrentPlan;
  
  return (
    <div className="bg-card border border-border rounded-lg p-8 hover:shadow-lg transition-shadow duration-300">
      <h2 className="text-2xl font-medium text-card-foreground mb-2">{name}</h2>
      <p className="text-4xl font-medium text-card-foreground mb-6">
        {isFree ? (
          <>
            Free
          </>
        ) : (
          <>
            ${price / 100}{' '}
            <span className="text-xl font-normal text-muted-foreground">
              / {interval}
            </span>
          </>
        )}
      </p>
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-ai-primary mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
      
      {showUpgradeButton && priceId && (
        <form action={checkoutAction}>
          <input type="hidden" name="priceId" value={priceId} />
          <SubmitButton />
        </form>
      )}
      
      {showCurrentPlanButton && (
        <Button
          disabled
          variant="outline"
          className="w-full rounded-full border-border"
        >
          Current Plan
        </Button>
      )}
      
      {isFree && !isCurrentPlan && userSubscription === 'plus' && (
        <Button
          disabled
          variant="outline"
          className="w-full rounded-full border-border"
        >
          Previous Plan
        </Button>
      )}
    </div>
  );
}
