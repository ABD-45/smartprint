# Queue System - Quick Reference

## File Structure
```
backend/queue/
├── queueConfig.js         # Configuration
├── priorityCalculator.js  # Priority algorithm
├── priorityQueue.js       # Queue data structure
├── queueManager.js        # Main orchestrator
├── queueMonitor.js        # Monitoring
└── QUEUE_SYSTEM.md        # Full documentation
```

## Key Functions

### queueManager.js
```javascript
// Add job to queue
addJobToQueue(job, io)  // Returns: position in queue

// Remove job from queue
removeFromQueue(jobId)  // Returns: boolean

// Get next job to print
getNextJob()  // Returns: job object or null

// Get all queued jobs
getQueue()  // Returns: job array sorted by priority

// Get stats
getQueueStats()  // Returns: {totalJobs, totalPages, etc}

// Get diagnostics
getQueueDiagnostics()  // Returns: detailed info + top jobs

// Get jobs by role
getJobsByRole('staff')  // Returns: jobs array

// Get monitoring report
getMonitoringReport()  // Returns: comprehensive report
```

### priorityCalculator.js
```javascript
// Calculate priority score for a job
calculatePriority(job)

// Components (for debugging)
calculateRoleBonus(role)
calculateSizeBonus(pages, copies)
calculateAgingBonus(queuedAt)
calculatePaymentBonus(status)

// Utilities
isJobStarving(queuedAt)     // > 45 min
estimateTimeToProcess(totalPages)
getPriorityTier(score)      // 'CRITICAL', 'HIGH', etc
```

## Priority Score Quick Guide

| Job Type | Base Score | After 30 min | After 120 min |
|----------|-----------|-------------|--------------|
| Admin, 1 page | 100+ | 107.5+ | 300+ ⭐ |
| Staff, 10 pages | 60+ | 67.5+ | 260+ |
| Student, 100 pages | 1+ | 8.5+ | 201+ |
| Student, 1 page | 100+ | 107.5+ | 300+ |

## API Endpoints

```
GET  /api/queue                 # Get queue
GET  /api/queue/stats           # Get statistics
GET  /api/queue/position/:id    # Get job position
GET  /api/queue/diagnostics     # Admin: detailed info
GET  /api/queue/role/:role      # Admin: filter by role
GET  /api/queue/report          # Admin: monitoring report
```

## Common Tasks

### Get next job from queue
```javascript
const nextJob = getNextJob();
if (nextJob) {
  // Process nextJob
  // When done:
  await removeFromQueue(nextJob._id);
}
```

### Check job's queue position
```javascript
const queue = getQueue();
const job = queue.find(j => j._id.toString() === jobId);
console.log(`Position: #${job.queuePosition} (Score: ${job.priorityScore})`);
```

### Add job to queue after payment
```javascript
const position = await addJobToQueue(jobDocument);
console.log(`Job queued at position #${position}`);
```

### Monitor for starving jobs
```javascript
const report = getMonitoringReport();
if (report.metrics.starvationEvents > 0) {
  console.warn('Starving jobs detected:', report.summary.starving);
}
```

## Configuration Examples

### To prioritize staff more
```javascript
// In queueConfig.js
ROLE_BONUSES: {
  admin: 100,
  staff: 80,    // Increased from 60
  student: 0,
}
```

### To favor small jobs less
```javascript
MAX_SIZE_BONUS: 20,  // Reduced from 50
```

### To accelerate aging faster
```javascript
AGING_MULTIPLIER: 1.0,  // Doubled from 0.5
AGING_ACCELERATION_THRESHOLD: 15,  // Reduced from 30
```

## Events

### Subscribe to queue updates (Client)
```javascript
socket.emit("subscribe:queue");

socket.on("queueUpdate", (data) => {
  console.log("Queue:", data.queue);
  console.log("Stats:", data.stats);
});
```

### Subscribe to job updates (Client)
```javascript
socket.emit("subscribe:job", jobId);

socket.on("jobStatusUpdate", (data) => {
  console.log("Position:", data.position);
  console.log("Score:", data.score);
});
```

### Health alerts (Admin/Staff)
```javascript
socket.on("queueHealth", (data) => {
  if (data.alerts.length > 0) {
    console.warn("Queue alerts:", data.alerts);
  }
});
```

## Debugging

### Enable debug logging
```javascript
// In queueConfig.js
DEBUG_PRIORITY_CALCULATION: true
```

This logs each priority calculation to console.

### Check queue health
```javascript
GET /api/queue/diagnostics
```

Returns top jobs, estimated clear time, and anomalies.

### View monitoring report
```javascript
GET /api/queue/report
```

Returns metrics, alerts, and recommendations.

## Performance Tips

1. **Batch operations** - Use `enqueueBatch()` for bulk adds
2. **Cache stats** - Don't call `getQueueStats()` too frequently
3. **Monitor intervals** - Don't set refresh < 1 minute
4. **Limit queue size** - Alert if > 100 jobs

## Common Issues & Fixes

**Jobs not progressing:**
- Check printer status
- Verify job status is "queued"
- Check error logs

**All students at bottom:**
- Check ROLE_BONUSES values
- Verify aging bonus calculation

**Large jobs wait too long:**
- Reduce AGING_ACCELERATION_THRESHOLD
- Increase AGING_MULTIPLIER
- Check if no large jobs in test

**Queue updates not appearing:**
- Verify Socket.IO connection
- Check if client joined "queue-room"
- Check network for errors
