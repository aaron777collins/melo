import { NextRequest, NextResponse } from "next/server";

// Stub implementation - Matrix uses media repository instead of uploadthing
export async function GET(request: NextRequest) {
  return NextResponse.json({ error: "Uploadthing not configured - use Matrix media repository" }, { status: 501 });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: "Uploadthing not configured - use Matrix media repository" }, { status: 501 });
}
