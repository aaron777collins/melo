import { NextResponse } from "next/server";

// Server operations now use Matrix API directly
// These endpoints are deprecated

export async function PATCH() {
  return NextResponse.json(
    { error: "Use Matrix API to update spaces" },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Use Matrix API to delete/leave spaces" },
    { status: 410 }
  );
}
