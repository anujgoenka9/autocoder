import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';

/**
 * Add credits to a user's account
 */
export async function addCredits(userId: string, amount: number): Promise<number> {
  const result = await db
    .update(users)
    .set({
      credits: sql`credits + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ credits: users.credits });

  return result[0]?.credits || 0;
}

/**
 * Deduct credits from a user's account
 * Returns true if successful, false if insufficient credits
 */
export async function deductCredits(userId: string, amount: number): Promise<boolean> {
  // First check if user has enough credits
  const currentCredits = await getCredits(userId);
  
  if (currentCredits < amount) {
    return false; // Insufficient credits
  }
  
  // Deduct credits only if user has enough
  const result = await db
    .update(users)
    .set({
      credits: sql`credits - ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ credits: users.credits });

  return result.length > 0;
}

/**
 * Get current credit balance for a user
 */
export async function getCredits(userId: string): Promise<number> {
  const result = await db
    .select({ credits: users.credits })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0]?.credits || 0;
}

/**
 * Check if user has sufficient credits
 */
export async function hasSufficientCredits(userId: string, required: number): Promise<boolean> {
  const credits = await getCredits(userId);
  return credits >= required;
}

/**
 * Subtract credits for billing cycle end (can go to 0, never negative)
 * This is used for subscription billing cycles, not regular usage
 */
export async function subtractBillingCycleCredits(userId: string, amount: number): Promise<number> {
  const result = await db
    .update(users)
    .set({
      credits: sql`GREATEST(credits - ${amount}, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ credits: users.credits });

  return result[0]?.credits || 0;
} 