'use server';

import { getActivityLogs } from '@/lib/db/queries';

export async function getDashboardActivityLogs() {
  try {
    const logs = await getActivityLogs();
    return {
      success: true,
      logs
    };
  } catch (error) {
    console.error('Failed to fetch activity logs:', error);
    return {
      success: false,
      error: 'Failed to fetch activity logs',
      logs: []
    };
  }
} 