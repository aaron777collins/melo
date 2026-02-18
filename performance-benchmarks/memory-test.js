
const v8 = require('v8');
const process = require('process');

function getMemoryUsage() {
  const usage = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();
  
  return {
    rss: usage.rss,
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    heapSizeLimit: heapStats.heap_size_limit,
    totalHeapSize: heapStats.total_heap_size,
    usedHeapSize: heapStats.used_heap_size
  };
}

// Simulate some Matrix operations
async function simulateMatrixOperations() {
  const measurements = [];
  
  // Initial measurement
  measurements.push({
    stage: 'initial',
    memory: getMemoryUsage()
  });
  
  // Simulate creating many Matrix events
  const events = [];
  for (let i = 0; i < 10000; i++) {
    events.push({
      type: 'm.room.message',
      content: { msgtype: 'm.text', body: 'Message ' + i },
      timestamp: Date.now(),
      eventId: '$event_' + i + ':matrix.org'
    });
  }
  
  measurements.push({
    stage: 'after_events',
    memory: getMemoryUsage()
  });
  
  // Simulate processing events
  const processed = events.map(event => ({
    ...event,
    processed: true,
    processedAt: Date.now()
  }));
  
  measurements.push({
    stage: 'after_processing',
    memory: getMemoryUsage()
  });
  
  // Clear events (simulate cleanup)
  events.length = 0;
  processed.length = 0;
  
  // Force garbage collection if possible
  if (global.gc) {
    global.gc();
  }
  
  measurements.push({
    stage: 'after_cleanup',
    memory: getMemoryUsage()
  });
  
  return measurements;
}

simulateMatrixOperations().then(result => {
  console.log(JSON.stringify(result));
}).catch(error => {
  console.error(JSON.stringify({error: error.message}));
});
      