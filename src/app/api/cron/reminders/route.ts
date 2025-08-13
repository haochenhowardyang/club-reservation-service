import { NextRequest, NextResponse } from 'next/server';
import { runReminderJob } from '@/lib/jobs/reminder-job';

/**
 * API endpoint to trigger reminder notifications
 * This can be called by:
 * 1. External cron services (like cron-job.org, EasyCron)
 * 2. Vercel Cron Jobs
 * 3. Manual admin trigger
 * 4. Fly.io scheduled tasks
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication for security
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON API] Starting reminder job via API trigger');
    
    // Run the reminder job
    await runReminderJob();
    
    return NextResponse.json({
      success: true,
      message: 'Reminder job completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRON API] Error in reminder job:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run reminder job',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check and manual testing
 */
export async function GET() {
  return NextResponse.json({
    message: 'Reminder cron endpoint is active',
    timestamp: new Date().toISOString(),
    usage: 'POST to this endpoint to trigger reminder job',
  });
}
