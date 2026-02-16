import { NextResponse } from "next/server";
import { getClient, getCryptoState } from "@/lib/matrix/client";

export async function GET() {
  try {
    const checks: Record<string, boolean> = {};
    let overallStatus = "ready";
    const details: Record<string, any> = {};

    // Check Matrix client connectivity
    const client = getClient();
    if (client) {
      // Check if client is connected and syncing
      const syncState = client.getSyncState();
      checks.matrixClient = !!client;
      checks.matrixSync = syncState === "SYNCING" || syncState === "PREPARED";
      details.matrixSyncState = syncState;
      
      // Check crypto state if E2EE is enabled
      try {
        const cryptoState = getCryptoState();
        checks.matrixCrypto = cryptoState.status === "ready" || cryptoState.status === "uninitialized";
        details.matrixCryptoStatus = cryptoState.status;
        
        if (cryptoState.status === "error") {
          details.matrixCryptoError = cryptoState.error?.message;
        }
      } catch (error) {
        checks.matrixCrypto = true; // Don't fail if crypto is not initialized
        details.matrixCryptoStatus = "not_available";
      }
    } else {
      checks.matrixClient = false;
      checks.matrixSync = false;
      details.matrixSyncState = "no_client";
    }

    // Determine overall status
    const failedChecks = Object.entries(checks).filter(([_, passed]) => !passed);
    if (failedChecks.length > 0) {
      overallStatus = "not_ready";
      details.failedChecks = failedChecks.map(([check]) => check);
    }

    const readinessStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      details,
    };

    const statusCode = overallStatus === "ready" ? 200 : 503;
    return NextResponse.json(readinessStatus, { status: statusCode });

  } catch (error) {
    return NextResponse.json(
      { 
        status: "not_ready", 
        timestamp: new Date().toISOString(),
        error: "Readiness check failed",
        details: {
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        }
      },
      { status: 503 }
    );
  }
}