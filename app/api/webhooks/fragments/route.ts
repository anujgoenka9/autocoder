import { NextRequest, NextResponse } from 'next/server';
import { broadcastFragmentUpdate } from '@/app/api/events/fragments/[projectId]/route';

// This endpoint receives webhook notifications from the database trigger
// when fragments are inserted or updated

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, table, schema, record, old_record } = body;

    if (!type || !table || table !== 'fragments') {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    const project_id = record?.project_id;
    const fragment_id = record?.id;

    if (!project_id || !fragment_id) {
      return NextResponse.json(
        { error: 'Missing project_id or fragment_id in record' },
        { status: 400 }
      );
    }

    // Add a small delay to ensure SSE connection is established
    setTimeout(() => {
      broadcastFragmentUpdate(project_id, {
        type: 'fragment_updated',
        projectId: project_id,
        fragmentId: fragment_id,
        timestamp: new Date().toISOString(),
        operation: type
      });
    }, 100);

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook received and broadcasted successfully'
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Add GET method for webhook verification
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Fragments webhook endpoint is active' 
  });
} 