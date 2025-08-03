import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { deductCredits } from '@/lib/utils/credits';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount = 1 } = await request.json();
    
    console.log(`Attempting to deduct ${amount} credits from user ${user.id}`);
    
    // Get current credits before deduction
    const { getCredits } = await import('@/lib/utils/credits');
    const currentCredits = await getCredits(user.id);
    console.log(`Current credits: ${currentCredits}`);
    
    // Deduct 1 credit for each AI response
    const success = await deductCredits(user.id, amount);
    console.log(`Deduction success: ${success}`);
    
    if (!success) {
      console.log('Insufficient credits for deduction');
      return NextResponse.json({ 
        error: 'Insufficient credits',
        insufficientCredits: true 
      }, { status: 400 });
    }

    // Get updated credit balance
    const remainingCredits = await getCredits(user.id);
    console.log(`Remaining credits: ${remainingCredits}`);
    
    return NextResponse.json({ 
      success: true,
      remainingCredits,
      deducted: amount
    });
  } catch (error) {
    console.error('Error deducting credits:', error);
    return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 });
  }
} 