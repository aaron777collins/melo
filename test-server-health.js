#!/usr/bin/env node

/**
 * Health check script for dev2.aaroncollins.info
 * Verifies the server is responsive before running E2E tests
 */

const https = require('https');

const BASE_URL = process.env.TEST_BASE_URL || 'https://dev2.aaroncollins.info';

function checkServerHealth() {
  console.log(`🔍 Checking server health: ${BASE_URL}`);
  
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      timeout: 30000,
      // Ignore self-signed certs for dev server
      rejectUnauthorized: false
    };

    const req = https.request(BASE_URL, options, (res) => {
      console.log(`✅ Server responded: ${res.statusCode} ${res.statusMessage}`);
      
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve({
          status: res.statusCode,
          ok: true
        });
      } else {
        reject(new Error(`Server returned ${res.statusCode}: ${res.statusMessage}`));
      }
    });

    req.on('error', (err) => {
      console.error(`❌ Server check failed:`, err.message);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error(`❌ Server check timed out after 30 seconds`);
      reject(new Error('Server health check timed out'));
    });

    req.end();
  });
}

async function main() {
  try {
    const result = await checkServerHealth();
    console.log(`🎉 Server is healthy and ready for E2E tests!`);
    process.exit(0);
  } catch (error) {
    console.error(`💥 Server health check failed:`, error.message);
    console.error(`Please ensure the server is running at ${BASE_URL}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkServerHealth };