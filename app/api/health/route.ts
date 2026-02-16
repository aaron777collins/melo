import { NextResponse } from "next/server";

/**
 * Health Check Endpoint
 * 
 * Returns system health status including memory usage, uptime, and environment info.
 * This endpoint is used by monitoring systems and load balancers.
 * 
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check system health
 *     description: Returns detailed system health information including memory usage, uptime, and version
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *       503:
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 error:
 *                   type: string
 *                   example: Health check failed
 */
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