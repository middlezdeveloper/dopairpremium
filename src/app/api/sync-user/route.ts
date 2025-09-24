import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header from the incoming request
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Get the request body
    const body = await request.json();

    // Call the Cloud Function directly from server-side (no CORS issues)
    const response = await fetch('https://us-central1-dopair.cloudfunctions.net/syncUserStatus', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Check if response is JSON or HTML
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON, get text (likely an error page)
      const text = await response.text();
      data = { error: `Function error: ${response.status}`, details: text.substring(0, 200) };
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Sync user API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}