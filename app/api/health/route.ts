import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get memory usage info
    const memUsage = process.memoryUsage();
    
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "unknown", 
      node: process.version,
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
      },
      environment: process.env.NODE_ENV || "unknown",
    };

    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    console.error("Health check error:", error);
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