import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Basic health check - could be enhanced with DB connectivity check
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "unknown",
      node: process.version,
    };

    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { 
        status: "unhealthy", 
        timestamp: new Date().toISOString(),
        error: "Health check failed" 
      },
      { status: 503 }
    );
  }
}