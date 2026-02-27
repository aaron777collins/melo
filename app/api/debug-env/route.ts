import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Return environment variables for debugging
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
    timestamp: new Date().toISOString(),
    middleware_check: process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' ? 'WOULD_ADD_UPGRADE' : 'WOULD_NOT_ADD_UPGRADE'
  };

  return NextResponse.json(envInfo);
}