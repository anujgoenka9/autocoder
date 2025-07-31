import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Get the Python API URL
    const pythonApiUrl = process.env.NODE_ENV === 'development' 
      ? 'http://127.0.0.1:8000/api/agent/continue'
      : `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/agent/continue`;
    
    // Forward the request to the Python API
    const response = await fetch(pythonApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error('Error proxying to Python API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 