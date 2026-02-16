#!/usr/bin/env tsx

/**
 * Background Job Worker CLI
 * 
 * Command-line script to start background job workers.
 * 
 * Usage:
 *   npx tsx scripts/start-worker.ts
 *   npx tsx scripts/start-worker.ts --concurrency 5 --types email,file
 */

import { JobWorker } from "@/lib/jobs/worker";
import { program } from "commander";

program
  .name("start-worker")
  .description("Start a background job worker")
  .option("-c, --concurrency <number>", "number of concurrent jobs", "1")
  .option("-t, --types <types>", "comma-separated list of job types to handle")
  .option("-w, --worker-id <id>", "custom worker ID")
  .option("-p, --poll-interval <ms>", "polling interval in milliseconds", "1000")
  .option("--heartbeat-interval <ms>", "heartbeat interval in milliseconds", "30000");

program.parse();

const options = program.opts();

async function main() {
  console.log("🚀 Starting HAOS Background Job Worker");
  console.log("=====================================");
  
  const concurrency = parseInt(options.concurrency);
  const jobTypes = options.types ? options.types.split(",").map((t: string) => t.trim()) : [];
  const pollInterval = parseInt(options.pollInterval);
  const heartbeatInterval = parseInt(options.heartbeatInterval);
  
  const worker = new JobWorker({
    workerId: options.workerId,
    concurrency,
    jobTypes,
    pollInterval,
    heartbeatInterval,
  });
  
  try {
    await worker.start();
    
    // Keep the process running
    process.on("SIGTERM", () => {
      console.log("\nReceived SIGTERM, shutting down gracefully...");
      worker.shutdown("SIGTERM");
    });
    
    process.on("SIGINT", () => {
      console.log("\nReceived SIGINT, shutting down gracefully...");
      worker.shutdown("SIGINT");
    });
    
  } catch (error) {
    console.error("Failed to start worker:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});