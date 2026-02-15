import { NextResponse } from "next/server";

// This endpoint now uses Matrix API directly
// Deprecated - use Matrix SDK on client
export async function PATCH() {
  return NextResponse.json({ error: "Use Matrix API" }, { status: 410 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Use Matrix API" }, { status: 410 });
}
export async function POST() {
  return NextResponse.json({ error: "Use Matrix API" }, { status: 410 });
}
