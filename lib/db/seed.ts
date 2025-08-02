import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { users, activityLogs, ActivityType } from './schema';
import { hashPassword } from '@/lib/auth/session';

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
  const email = 'test@test.com';
  const password = 'admin123';
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values([
      {
        email: email,
        passwordHash: passwordHash,
        role: "owner",
        name: "Test User",
      },
    ])
    .returning();

  console.log('Initial user created.');

  // Create some sample activity logs
  await db.insert(activityLogs).values([
    {
      userId: user.id,
      action: ActivityType.SIGN_UP,
      ipAddress: '127.0.0.1',
    },
    {
      userId: user.id,
      action: ActivityType.SIGN_IN,
      ipAddress: '127.0.0.1',
    },
  ]);

  console.log('Sample activity logs created.');

  await createStripeProducts();
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });
