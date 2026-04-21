# 🚀 Optimized Queue System Documentation

## Overview

The SmartPrint queue system has been completely redesigned for optimal performance, fairness, and starvation prevention. The system uses an intelligent priority algorithm that balances multiple factors to ensure:

- **Staff & Admin priority** over students
- **Smaller jobs** get processed faster
- **No starvation** - large jobs eventually get prioritized
- **Fair scheduling** - no single role monopolizes the queue
- **Real-time monitoring** with alerts and diagnostics

## Architecture

The queue system is now modular and organized into separate concerns:

```
Queue System Structure:
├── queueConfig.js           # Centralized configuration (easy tuning)
├── priorityCalculator.js    # Priority algorithm engine
├── priorityQueue.js         # Data structure & operations  
├── queueManager.js          # Central orchestrator
├── queueMonitor.js          # Health monitoring & analytics
└── controllers/queueController.js  # API endpoints
```

### Each Module's Responsibility

| Module | Purpose |
|--------|---------|
| **queueConfig.js** | All tunable parameters (weights, thresholds, intervals) |
| **priorityCalculator.js** | Priority score calculation (role, size, aging, payment) |
| **priorityQueue.js** | Efficient queue data structure with O(n log n) operations |
| **queueManager.js** | Central orchestrator that manages persistence & broadcasting |
| **queueMonitor.js** | Tracks metrics, detects starvation, generates reports |

## Priority Algorithm

### Score Components

Each job's priority score is calculated as the sum of:

```
Total Priority Score = Role Bonus + Size Bonus + Aging Bonus + Payment Bonus
```

#### 1. Role Bonus (0-100)
- **Admin**: +100 (highest)
- **Staff**: +60 (high)
- **Student**: +0 (baseline)

**Effect**: Ensures admins and staff get preference

#### 2. Size Bonus (1-50)
```
Size Bonus = 100 / (pages × copies)  [capped at 50]
```

**Effect**: 
- 1-page job: +100 points → moves to front quickly
- 10-page job: +10 points
- 100-page job: +1 point
- Prevents "queue monopoly" by large jobs

#### 3. Aging Bonus (0-200)
**Linear Aging** (0-30 minutes):
```
Bonus = waiting_minutes × 0.5
```

**Accelerated Aging** (30-120 minutes):
```
Bonus = (30 × 0.5) + (excess_minutes × 0.5 × 1.5)
```

**Guaranteed Aging** (120+ minutes):
```
Bonus = 200 (absolute maximum)
```

**Effect**:
- Jobs gain priority the longer they wait
- Acceleration prevents indefinite starvation
- Large jobs eventually guarantee processing

#### 4. Payment Bonus (+15)
- Paid/queued/printing jobs get slight boost

### Example Priority Calculations

**Job A** (Student, 5 pages, 2 copies, waiting 10 min):
```
Score = 0 (student) + 10 (50÷10) + 5 (10×0.5) + 15 (paid)
      = 30
```

**Job B** (Staff, 50 pages, 1 copy, waiting 15 min):
```
Score = 60 (staff) + 2 (100÷50) + 7.5 (15×0.5) + 15 (paid)
      = 84.5 ✓ Higher priority
```

**Job C** (Student, 100 pages, 1 copy, waiting 120 min):
```
Score = 0 (student) + 1 (100÷100) + 200 (max aging) + 15 (paid)
      = 216 ✓ Gets priority despite being a large job
```

## Starvation Prevention

The algorithm prevents two types of starvation:

### 1. Small Job Starvation
Could happen if: Large jobs always prioritized

Prevention: Small jobs get size bonus (higher scores)

### 2. Large Job Starvation
Could happen if: Only small/prioritized jobs in queue

Prevention: 
- Aging bonus increases exponentially after 30 minutes
- At 120 minutes, all jobs get MAX_AGING_BONUS (200 points)
- Guaranteed to be processed

### Monitoring

The system automatically detects starving jobs (waiting > 45 min) and:
- Logs warnings
- Broadcasts alerts to admin clients
- Includes in monitoring reports
- Triggers recommendations

## Queue Operations

### Enqueue (Add Job)
```javascript
const position = addJobToQueue(job);
// Returns position in queue
```

### Dequeue (Remove Job)
```javascript
removeFromQueue(jobId);
// Called when job completes/fails
```

### Peek (Next Job)
```javascript
const nextJob = getNextJob();
// Use for printer to get next job to process
```

### Refresh (Aging)
Automatically called every 5 minutes:
- Recalculates all priority scores
- Applies aging bonus
- Re-sorts queue
- Broadcasts updated queue to clients

## API Endpoints

### 1. GET `/api/queue`
**Get current queue**

**Students see**: Only their own job position
**Admin/Staff see**: Entire queue

```json
{
  "success": true,
  "queue": [{
    "_id": "...",
    "originalName": "document.pdf",
    "userRole": "staff",
    "pages": 5,
    "copies": 1,
    "priorityScore": 84.5,
    "queuePosition": 1,
    "status": "queued"
  }],
  "totalJobs": 25
}
```

### 2. GET `/api/queue/stats`
**Queue statistics**

```json
{
  "success": true,
  "stats": {
    "totalJobs": 25,
    "totalPages": 500,
    "estimatedTimeMinutes": 25,
    "jobsByRole": { "admin": 1, "staff": 3, "student": 21 },
    "starvingJobs": 0,
    "averagePriority": 45.2,
    "priorityRange": { "min": 5, "max": 150 }
  }
}
```

### 3. GET `/api/queue/position/:jobId`
**Get specific job's position**

```json
{
  "success": true,
  "inQueue": true,
  "position": 5,
  "totalInQueue": 25,
  "jobsAhead": 4,
  "pagesAhead": 45,
  "priorityScore": 60,
  "waitingMinutes": 15,
  "etaMinutes": 7
}
```

### 4. GET `/api/queue/diagnostics` (Admin/Staff only)
**Detailed queue diagnostics**

```json
{
  "success": true,
  "diagnostics": {
    "totalJobs": 25,
    "nextJob": {
      "id": "...",
      "fileName": "urgent.pdf",
      "userRole": "admin",
      "priorityScore": 150,
      "waitingMinutes": 5
    },
    "topJobs": [...]
  }
}
```

### 5. GET `/api/queue/role/:role` (Admin only)
**Filter jobs by role**

Example: `GET /api/queue/role/student`

```json
{
  "success": true,
  "role": "student",
  "jobs": [...],
  "count": 21,
  "avgPriority": 35.4
}
```

### 6. GET `/api/queue/report` (Admin only)
**Comprehensive monitoring report**

```json
{
  "success": true,
  "report": {
    "timestamp": "2024-04-17T...",
    "summary": { ... },
    "metrics": {
      "totalJobsProcessed": 150,
      "starvationEvents": 0,
      "roleDistribution": { "admin": 2, "staff": 30, "student": 118 }
    },
    "alerts": [],
    "diagnostics": { ... },
    "recommendations": []
  }
}
```

## Configuration Tuning

All parameters are in `queueConfig.js`:

```javascript
// Role bonuses (adjust to change priority levels)
ROLE_BONUSES: {
  admin: 100,     // Increase to give admins more priority
  staff: 60,      // Adjust for staff priority
  student: 0,     // Always base
}

// Size bonus (adjust to favor small jobs more/less)
SIZE_BONUS_BASE: 100,        // Higher = more favor to small jobs
MAX_SIZE_BONUS: 50,          // Cap to prevent extreme bias

// Aging (adjust starvation prevention)
AGING_MULTIPLIER: 0.5,       // Increase for faster aging
AGING_ACCELERATION_THRESHOLD: 30,  // When to accelerate
MAX_AGING_TIME: 120,         // Minutes for max aging bonus

// Refresh intervals
QUEUE_REFRESH_INTERVAL_MS: 5 * 60 * 1000,  // Every 5 min
STARVATION_CHECK_INTERVAL_MS: 1 * 60 * 1000, // Every 1 min
```

## Performance Metrics

- **Queue refresh**: O(n log n) - sort operation
- **Add job**: O(n) - includes re-sort
- **Remove job**: O(n) - filtering + re-sort
- **Lookup**: O(1) - HashMap for quick access
- **Memory**: Minimal - in-memory data structures

For queues < 1000 jobs: All operations < 100ms

## Socket.IO Events

### Server → Client

**queueUpdate** (broadcasted every 5 min or on change)
```javascript
io.to("queue-room").emit("queueUpdate", {
  timestamp: "...",
  queue: [...],
  stats: {...}
});
```

**queueHealth** (every 1 min)
```javascript
io.to("queue-room").emit("queueHealth", {
  timestamp: "...",
  alerts: [...],
  stats: {...}
});
```

**jobStatusUpdate** (per job)
```javascript
io.to(`job-${jobId}`).emit("jobStatusUpdate", {
  status: "queued",
  position: 5,
  score: 84.5
});
```

## Best Practices

1. **Adjust weights in queueConfig.js** based on real-world behavior
2. **Monitor the report endpoint** regularly for health issues
3. **Set up alerts** for starvation events (> 45 min wait)
4. **Track metrics** to identify bottlenecks
5. **Test the system** under load to see real behavior

## Troubleshooting

### Jobs in queue not moving
- Check if printer is running/available
- Verify job status is "queued" in database
- Check logs for errors

### One role always at bottom
- Adjust ROLE_BONUSES in queueConfig.js
- Check MIN_ROTATIONS_PER_ROLE setting

### Jobs starving
- Reduce AGING_ACCELERATION_THRESHOLD
- Increase AGING_MULTIPLIER
- Check printer capacity

### Queue refresh not updating clients
- Verify Socket.IO connections
- Check if client is in "queue-room"
- Verify broadcast errors in logs
