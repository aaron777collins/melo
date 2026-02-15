import { NextResponse } from "next/server";

/**
 * Server (Space) API
 * 
 * Creating servers is now handled client-side via Matrix SDK in InitialModal.
 * This API route is deprecated.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Use Matrix SDK directly to create spaces. This endpoint is deprecated." },
    { status: 410 } // Gone
  );
}
