const http = require('http');

const testRoutes = [
  '/sign-in',
  '/sign-up',
  '/',
  '/setup'
];

async function testRoute(route) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${route}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`${route}: ${res.statusCode}`);
        if (res.statusCode >= 400) {
          console.log(`  Error: ${data.substring(0, 200)}...`);
        }
        resolve({ route, status: res.statusCode, data });
      });
    });
    req.on('error', (err) => {
      console.log(`${route}: ERROR - ${err.message}`);
      resolve({ route, status: 'ERROR', error: err.message });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`${route}: TIMEOUT`);
      resolve({ route, status: 'TIMEOUT' });
    });
  });
}

async function testAllRoutes() {
  console.log('Testing routes...\n');
  for (const route of testRoutes) {
    await testRoute(route);
  }
  console.log('\nDone testing routes');
}

testAllRoutes();