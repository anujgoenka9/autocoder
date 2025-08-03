import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { users } from './schema';

async function createStripeProducts() {
  console.log('Creating Stripe product and price...');

  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Plus subscription plan',
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1000, // $10 in cents
    currency: 'usd',
    recurring: {
      interval: 'month'
    },
  });

  console.log('Stripe products and prices created successfully.');
}

async function seed() {
  console.log('Starting seed process...');

  // Create a test user with a UUID (simulating Supabase user ID)
  const testUserId = crypto.randomUUID();
  const email = 'test@test.com';

  try {
    const [user] = await db
      .insert(users)
      .values({
        id: testUserId,
        email: email,
        name: "Test User",
        role: "owner",
        credits: 10, // Give some initial credits
        subscriptionPlan: 'base',
        subscriptionStatus: 'inactive',
      })
      .returning();

    console.log('✅ Test user created:', { id: user.id, email: user.email, name: user.name });
  } catch (error) {
    console.error('❌ Failed to create test user:', error);
    // Continue with other seed operations even if user creation fails
  }

  // Create Stripe products
  try {
    await createStripeProducts();
    console.log('✅ Stripe products created successfully');
  } catch (error) {
    console.error('❌ Failed to create Stripe products:', error);
  }

  console.log('🎉 Seed process completed!');
  console.log('');
  console.log('📝 Next steps:');
  console.log('1. Create a real user account at: http://localhost:3000/sign-up');
  console.log('2. Sign in with your new account');
  console.log('3. Test the application features');
}

seed()
  .catch((error) => {
    console.error('❌ Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('🏁 Seed process finished. Exiting...');
    process.exit(0);
  });
