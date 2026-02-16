import { NextResponse } from "next/server";

export async function GET() {
  try {
    const matrixHomeserver = process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL;
    
    if (!matrixHomeserver) {
      return NextResponse.json(
        { 
          status: "not ready", 
          timestamp: new Date().toISOString(),
          error: "Matrix homeserver URL not configured",
          checks: {
            matrix: {
              status: "failed",
              error: "NEXT_PUBLIC_MATRIX_HOMESERVER_URL not set"
            }
          }
        },
        { status: 503 }
      );
    }

    // Check Matrix homeserver connectivity with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      const response = await fetch(`${matrixHomeserver}/_matrix/client/versions`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeout);
      
      const matrixStatus = {
        status: response.ok ? "healthy" : "unhealthy",
        statusCode: response.status,
        url: `${matrixHomeserver}/_matrix/client/versions`
      };

      if (!response.ok) {
        return NextResponse.json(
          { 
            status: "not ready", 
            timestamp: new Date().toISOString(),
            error: "Matrix homeserver not responding correctly",
            checks: {
              matrix: matrixStatus
            }
          },
          { status: 503 }
        );
      }

      // All checks passed
      return NextResponse.json(
        { 
          status: "ready", 
          timestamp: new Date().toISOString(),
          checks: {
            matrix: matrixStatus
          }
        },
        { status: 200 }
      );

    } catch (fetchError) {
      clearTimeout(timeout);
      
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      const isTimeout = errorMessage.includes('abort') || errorMessage.includes('timeout');
      
      return NextResponse.json(
        { 
          status: "not ready", 
          timestamp: new Date().toISOString(),
          error: isTimeout ? "Matrix homeserver connection timeout" : "Matrix homeserver connection failed",
          checks: {
            matrix: {
              status: "failed",
              error: errorMessage,
              url: `${matrixHomeserver}/_matrix/client/versions`
            }
          }
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error("Readiness check error:", error);
    return NextResponse.json(
      { 
        status: "not ready", 
        timestamp: new Date().toISOString(),
        error: "Readiness check failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 503 }
    );
  }
}