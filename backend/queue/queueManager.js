/**
 * Queue Manager — Central Orchestrator
 *
 * Responsibilities:
 * - Priority queue CRUD (in-memory heap)
 * - MongoDB persistence (queuePosition, queueNumber, estimatedTime)
 * - Real-time broadcasts via Socket.IO
 * - Periodic aging / health checks
 */

const PriorityQueue = require('./priorityQueue');
const QueueMonitor  = require('./queueMonitor');
const queueConfig   = require('./queueConfig');
const { formatQueueNumber, estimateJobETA, estimateTimeToProcess } = require('./priorityCalculator');
const Job = require('../models/Job');

// ── Singletons ──────────────────────────────────────────────
const pq      = new PriorityQueue();
const monitor = new QueueMonitor();

let _io              = null;
let _refreshInterval = null;
let _monitorInterval = null;

// ─────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────
const initQueueManager = async (io) => {
  _io = io;
  try {
    console.log('🚀 Initialising Queue Manager…');

    // 1. Clear stale queueNumber/queuePosition from completed jobs in DB
    await Job.updateMany(
      { status: { $in: ['done', 'collected', 'failed', 'cancelled', 'uploaded', 'paid'] } },
      { $set: { queueNumber: null, queuePosition: null } }
    ).catch(e => console.warn('Stale Q-number cleanup warning:', e.message));

    // 2. Restore active queued/printing jobs into memory
    const restored = await restoreQueuedJobs();
    console.log(`✅ Queue Manager ready — ${restored} jobs restored`);

    // 3. Re-assign Q-numbers sequentially (Q-001, Q-002 … Q-00N)
    //    This fixes stale numbers from previous server sessions
    await _syncPositionsToDB();
    console.log(`✅ Q-numbers reassigned for ${restored} jobs`);

    // 4. Periodic priority recalculation (aging)
    if (_refreshInterval) clearInterval(_refreshInterval);
    _refreshInterval = setInterval(async () => {
      pq.refresh();
      await _syncPositionsToDB();
      broadcastQueue();
      console.log(`🔄 Queue refreshed @ ${new Date().toLocaleTimeString()}`);
    }, queueConfig.QUEUE_REFRESH_INTERVAL_MS);

    // 5. Periodic health monitoring
    if (_monitorInterval) clearInterval(_monitorInterval);
    _monitorInterval = setInterval(() => {
      performHealthCheck();
    }, queueConfig.STARVATION_CHECK_INTERVAL_MS);

    console.log('✅ Refresh: every 5 min | Health check: every 1 min');
  } catch (err) {
    console.error('❌ Queue Manager init error:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// Restore from DB on server start
// ─────────────────────────────────────────────────────────────
const restoreQueuedJobs = async () => {
  try {
    const jobs = await Job.find({ status: { $in: ['queued', 'printing'] } }).sort({ queuedAt: 1 });
    if (jobs.length > 0) pq.enqueueBatch(jobs);
    return jobs.length;
  } catch (err) {
    console.error('Error restoring queued jobs:', err.message);
    return 0;
  }
};

// ─────────────────────────────────────────────────────────────
// Add job to queue
// ─────────────────────────────────────────────────────────────
const addJobToQueue = async (job, io) => {
  if (io) _io = io;

  try {
    job.status   = 'queued';
    job.queuedAt = new Date();

    // Persist basic fields before score calculation
    await Job.findByIdAndUpdate(job._id, {
      status:        'queued',
      queuedAt:      job.queuedAt,
      priorityScore: 0,
    });

    // Add to in-memory queue (calculates priority score)
    const position = pq.enqueue(job);

    // Build Q-number and ETA
    const queueNumber = formatQueueNumber(position);
    const sortedQueue = pq.getAll();
    const etaMinutes  = estimateJobETA(job, sortedQueue);

    // Persist position + queueNumber + ETA to DB
    await Job.findByIdAndUpdate(job._id, {
      queuePosition: position,
      queueNumber,
      estimatedTime: etaMinutes,
    });

    // Broadcast queue update to all connected clients
    broadcastQueue();

    // Notify the specific job's room
    if (_io) {
      _io.to(`job-${job._id}`).emit('jobStatusUpdate', {
        status:        'queued',
        position,
        queueNumber,
        etaMinutes,
        score:         job.priorityScore,
      });
    }

    console.log(`📋 Job ${job._id} → ${queueNumber} (pos #${position}, ETA ~${etaMinutes}min, score ${job.priorityScore})`);
    return { position, queueNumber, etaMinutes };
  } catch (err) {
    console.error('Error adding job to queue:', err.message);
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────
// Remove job (on completion / failure / cancellation)
// ─────────────────────────────────────────────────────────────
const removeFromQueue = async (jobId) => {
  try {
    const removed = pq.dequeue(jobId);

    if (removed) {
      await Job.findByIdAndUpdate(jobId, {
        queuePosition: null,
        queueNumber:   null,
      });
      // Recalculate ETAs for everyone left in queue
      await _syncPositionsToDB();
      broadcastQueue();
      console.log(`🗑️  Job ${jobId} removed from queue`);
    }

    return removed;
  } catch (err) {
    console.error('Error removing job from queue:', err.message);
    return false;
  }
};

// ─────────────────────────────────────────────────────────────
// Internal: sync positions + Q-numbers + ETAs for all jobs in queue
// ─────────────────────────────────────────────────────────────
const _syncPositionsToDB = async () => {
  const sortedQueue = pq.getAll();
  const bulkOps     = sortedQueue.map((job, idx) => {
    const position    = idx + 1;
    const queueNumber = formatQueueNumber(position);
    const etaMinutes  = estimateJobETA(job, sortedQueue);

    // ✅ Also update in-memory job object so getQueue() returns correct positions
    job.queuePosition = position;
    job.queueNumber   = queueNumber;
    job.estimatedTime = etaMinutes;

    return {
      updateOne: {
        filter: { _id: job._id },
        update: { $set: { queuePosition: position, queueNumber, estimatedTime: etaMinutes } },
      },
    };
  });

  if (bulkOps.length > 0) {
    await Job.bulkWrite(bulkOps).catch((e) =>
      console.error('Bulk position sync error:', e.message)
    );
  }
};

// ─────────────────────────────────────────────────────────────
// Read helpers
// ─────────────────────────────────────────────────────────────
const getNextJob      = ()     => pq.peek();
const getQueue        = ()     => pq.getAll();
const getQueueStats   = ()     => pq.getStats();
const getQueueDiagnostics = () => pq.getDiagnostics();
const getJobsByRole   = (role) => pq.getByRole(role);

/**
 * Get detailed position data for a single job
 * Used by the /queue/position/:jobId endpoint
 */
const getJobPositionData = (jobId) => {
  const sortedQueue = pq.getAll();
  const job = sortedQueue.find((j) => j._id.toString() === jobId.toString());
  if (!job) return null;

  const position    = job.queuePosition;
  const queueNumber = formatQueueNumber(position);
  const jobsAhead   = sortedQueue.filter((j) => j.queuePosition < position);
  const pagesAhead  = jobsAhead.reduce((s, j) => s + (j.pages || 0) * (j.copies || 1), 0);
  const myPages     = (job.pages || 0) * (job.copies || 1);
  const etaMinutes  = Math.ceil((pagesAhead + myPages) / queueConfig.PAGES_PER_MINUTE);
  const waitingMinutes = job.queuedAt
    ? Math.round((Date.now() - new Date(job.queuedAt).getTime()) / 60000)
    : 0;

  return {
    inQueue:        true,
    position,
    queueNumber,
    totalInQueue:   sortedQueue.length,
    jobsAhead:      jobsAhead.length,
    pagesAhead,
    etaMinutes,
    waitingMinutes,
    priorityScore:  job.priorityScore,
    job: {
      _id:          job._id,
      originalName: job.originalName || job.fileName,
      status:       job.status,
      pages:        job.pages,
      copies:       job.copies,
      color:        job.color,
      duplex:       job.duplex,
      paperSize:    job.paperSize,
      orientation:  job.orientation,
      totalPages:   myPages,
      totalAmount:  job.totalAmount,
      userRole:     job.userRole,
      queuedAt:     job.queuedAt,
    },
  };
};

// ─────────────────────────────────────────────────────────────
// Health check & monitoring
// ─────────────────────────────────────────────────────────────
const performHealthCheck = () => {
  try {
    monitor.updateMetrics(pq);
    monitor.checkForStarvation(pq);
    monitor.checkQueueHealth(pq);

    const alerts = monitor.getAlerts();
    if (alerts.length > 0) console.warn(`⚠️  Queue alerts (${alerts.length}):`, alerts);

    if (_io) {
      _io.to('queue-room').emit('queueHealth', {
        timestamp: new Date(),
        alerts,
        stats: pq.getStats(),
      });
    }
  } catch (err) {
    console.error('Health check error:', err.message);
  }
};

const getMonitoringReport = () => monitor.generateReport(pq);

// ─────────────────────────────────────────────────────────────
// Broadcast full queue to all connected clients
// Includes Q-number + ETA for every job
// ─────────────────────────────────────────────────────────────
const broadcastQueue = () => {
  if (!_io) return;
  try {
    const sortedQueue = pq.getAll();
    const broadcastData = sortedQueue.map((job) => {
      const myPages    = (job.pages || 0) * (job.copies || 1);
      const etaMinutes = estimateJobETA(job, sortedQueue);
      return {
        _id:          job._id,
        originalName: job.originalName || job.fileName || 'Unknown',
        userRole:     job.userRole,
        pages:        job.pages,
        copies:       job.copies,
        color:        job.color,
        duplex:       job.duplex,
        paperSize:    job.paperSize,
        totalPages:   myPages,
        totalAmount:  job.totalAmount,
        priorityScore: job.priorityScore,
        queuePosition: job.queuePosition,
        queueNumber:  formatQueueNumber(job.queuePosition),
        etaMinutes,
        status:       job.status,
        queuedAt:     job.queuedAt,
      };
    });

    _io.to('queue-room').emit('queueUpdate', {
      timestamp: new Date(),
      queue:     broadcastData,
      stats:     pq.getStats(),
    });
  } catch (err) {
    console.error('Broadcast error:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// Shutdown
// ─────────────────────────────────────────────────────────────
const shutdownQueueManager = () => {
  if (_refreshInterval) { clearInterval(_refreshInterval); _refreshInterval = null; }
  if (_monitorInterval)  { clearInterval(_monitorInterval);  _monitorInterval  = null; }
  console.log('🛑 Queue Manager shutdown');
};

module.exports = {
  initQueueManager,
  shutdownQueueManager,
  addJobToQueue,
  removeFromQueue,
  getNextJob,
  getQueue,
  getQueueStats,
  getQueueDiagnostics,
  getJobsByRole,
  getJobPositionData,
  broadcastQueue,
  performHealthCheck,
  getMonitoringReport,
};
