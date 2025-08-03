'use client';

import { checkoutAction } from '@/lib/payments/actions';
import { Check, AlertCircle } from 'lucide-react';
import { SubmitButton } from './submit-button';
import { Button } from '@/components/ui/button';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function PricingPageContent() {
  const [prices, setPrices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showError, setShowError] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for error parameter
    const error = searchParams.get('error');
    if (error === 'checkout_failed') {
      setShowError(true);
      // Remove the parameter from URL without page reload
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
      
      // Hide error message after 5 seconds
      setTimeout(() => setShowError(false), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetcher('/api/pricing');
        if (response.success) {
          setPrices(response.data.prices);
          setProducts(response.data.products);
          setUser(response.data.user);
        } else {
          console.error('Failed to fetch pricing data:', response.error);
        }
      } catch (error) {
        console.error('Failed to fetch pricing data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ai-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading pricing information...</p>
        </div>
      </main>
    );
  }

  const plusPlan = products.find((product) => product.name === 'Plus');
  const plusPrice = prices.find((price) => price.productId === plusPlan?.id);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-background">
      {/* Error Message */}
      {showError && (
        <div className="mb-8 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center">
            <div className="bg-red-100 rounded-full p-2 mr-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Payment Failed</h3>
              <p className="text-red-700">
                There was an issue processing your payment. Please try again or contact support if the problem persists.
              </p>
            </div>
          </div>
        </div>
      )}

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

export default function PricingPage() {
  return (
    <Suspense fallback={
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ai-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading pricing information...</p>
        </div>
      </main>
    }>
      <PricingPageContent />
    </Suspense>
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
