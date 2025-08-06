/**
 * Client-side utility functions for managing credits
 */

export async function fetchUserCredits(): Promise<number> {
  try {
    const response = await fetch('/api/user/credits');
    
    if (response.ok) {
      const data = await response.json();
      return data.credits || 0;
    } else {
      const errorText = await response.text();
      console.error('Credits API error response:', errorText);
      return 0;
    }
  } catch (error) {
    console.error('Failed to fetch credits:', error);
    return 0;
  }
} 