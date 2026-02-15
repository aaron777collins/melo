import { NextResponse } from "next/server";

/**
 * Test endpoint for verifying rate limiting functionality
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Rate limit test endpoint",
    timestamp: new Date().toISOString(),
  });
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Rate limit test endpoint (POST)",
    timestamp: new Date().toISOString(),
  });
}