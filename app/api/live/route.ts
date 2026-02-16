import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Simple liveness check - application is responding
    const livenessStatus = {
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid,
      nodeVersion: process.version,
    };

    return NextResponse.json(livenessStatus, { status: 200 });
    
  } catch (error) {
    // If we reach this point, something is seriously wrong
    return NextResponse.json(
      { 
        status: "dead", 
        timestamp: new Date().toISOString(),
        error: "Liveness check failed" 
      },
      { status: 503 }
    );
  }
}