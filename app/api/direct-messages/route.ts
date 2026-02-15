import { NextResponse } from "next/server";

// Direct messages now use Matrix API
export async function GET() {
  return NextResponse.json({ error: "Use Matrix API" }, { status: 410 });
}
export async function POST() {
  return NextResponse.json({ error: "Use Matrix API" }, { status: 410 });
}
