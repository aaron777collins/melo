
const sdk = require('matrix-js-sdk');

async function benchmarkMatrixSDK() {
  const start = Date.now();
  
  // Test client initialization
  const client = sdk.createClient({
    baseUrl: 'https://matrix.org',
    userId: '@test:matrix.org',
    accessToken: 'dummy_token'
  });
  
  const initTime = Date.now() - start;
  
  // Test event creation performance
  const eventStart = Date.now();
  for (let i = 0; i < 1000; i++) {
    const event = {
      type: 'm.room.message',
      content: {
        msgtype: 'm.text',
        body: 'Test message ' + i
      }
    };
  }
  const eventTime = Date.now() - eventStart;
  
  return {
    initTime: initTime,
    eventCreationTime: eventTime,
    eventsPerSecond: Math.round(1000 / (eventTime / 1000))
  };
}

benchmarkMatrixSDK().then(console.log).catch(console.error);
      