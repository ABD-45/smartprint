/**
 * Queue Controller
 * All endpoints return queueNumber + etaMinutes + print details
 */

const {
  getQueue,
  getQueueStats,
  getQueueDiagnostics,
  getJobsByRole,
  getMonitoringReport,
  getJobPositionData,
} = require('../queue/queueManager');
const { formatQueueNumber, estimateJobETA } = require('../queue/priorityCalculator');
const queueConfig = require('../queue/queueConfig');
const Job = require('../models/Job');

// ─────────────────────────────────────────────────────────────
// GET /api/queue
// Students & staff → only their own job(s)
// Admin / printshop → full queue
// ─────────────────────────────────────────────────────────────
const getLiveQueue = async (req, res) => {
  try {
    const queue = getQueue();

    if (['student', 'staff'].includes(req.user.role)) {
      // Only show the user's own jobs — with Q-number + ETA
      const userJobs = queue.filter(
        (j) => j.userId?.toString() === req.user._id.toString()
      );

      const enriched = userJobs.map((job) => {
        const plain = job.toObject ? job.toObject() : job;
        return {
          ...plain,
          queueNumber: formatQueueNumber(plain.queuePosition),
          etaMinutes:  estimateJobETA(plain, queue),
        };
      });

      return res.json({
        success:      true,
        queue:        enriched,
        totalInQueue: queue.length,
        userPosition: enriched[0]?.queuePosition ?? null,
        queueNumber:  enriched[0] ? formatQueueNumber(enriched[0].queuePosition) : null,
      });
    }

    // Admin / printshop — full queue with ETAs
    const enriched = queue.map((job) => {
      const plain = job.toObject ? job.toObject() : job;
      return {
        ...plain,
        queueNumber: formatQueueNumber(plain.queuePosition),
        etaMinutes:  estimateJobETA(plain, queue),
      };
    });

    res.json({ success: true, queue: enriched, total: enriched.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/queue/stats
// ─────────────────────────────────────────────────────────────
const getQueueStats_ = async (req, res) => {
  try {
    const stats = getQueueStats();
    res.json({
      success: true,
      stats: {
        totalJobs:             stats.totalJobs,
        totalPages:            stats.totalPages,
        estimatedTimeMinutes:  stats.estimatedTimeToCompleteMinutes,
        jobsByRole:            stats.jobsByRole,
        starvingJobs:          stats.starvingJobs,
        averagePriority:       stats.averagePriority,
        priorityRange: {
          min: stats.minPriority,
          max: stats.maxPriority,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/queue/position/:jobId
// Returns rich data: Q-number, ETA, print details, position
// ─────────────────────────────────────────────────────────────
const getJobPosition = async (req, res) => {
  try {
    const jobId = req.params.jobId;

    // --- Check permission first ---
    // Students & staff can only query their own jobs
    if (['student', 'staff'].includes(req.user.role)) {
      const job = await Job.findById(jobId).lean();
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found.' });
      }
      if (job.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Cannot access other users\' jobs.' });
      }
    }

    // --- In-memory lookup ---
    const data = getJobPositionData(jobId);

    if (!data) {
      // Not currently in queue — fetch DB state
      const job = await Job.findById(jobId).lean();
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found.' });
      }
      return res.json({
        success:  true,
        inQueue:  false,
        status:   job.status,
        job: {
          _id:          job._id,
          originalName: job.originalName,
          status:       job.status,
          pages:        job.pages,
          copies:       job.copies,
          color:        job.color,
          duplex:       job.duplex,
          paperSize:    job.paperSize,
          orientation:  job.orientation,
          totalPages:   (job.pages || 0) * (job.copies || 1),
          totalAmount:  job.totalAmount,
          userRole:     job.userRole,
          queueNumber:  job.queueNumber,
          estimatedTime: job.estimatedTime,
        },
      });
    }

    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/queue/diagnostics  (Admin / Staff only)
// ─────────────────────────────────────────────────────────────
const getDiagnostics = async (req, res) => {
  try {
    if (req.user.role === 'student') {
      return res.status(403).json({ success: false, message: 'Admin/Staff only.' });
    }
    res.json({ success: true, diagnostics: getQueueDiagnostics() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/queue/role/:role  (Admin only)
// ─────────────────────────────────────────────────────────────
const getJobsByRoleFilter = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only.' });
    }
    const { role } = req.params;
    if (!['admin', 'staff', 'student'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }
    const jobs = getJobsByRole(role);
    res.json({
      success:     true,
      role,
      jobs,
      count:       jobs.length,
      avgPriority: jobs.length > 0
        ? Math.round((jobs.reduce((s, j) => s + j.priorityScore, 0) / jobs.length) * 100) / 100
        : 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/queue/report  (Admin only)
// ─────────────────────────────────────────────────────────────
const getMonitoringReportHandler = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only.' });
    }
    res.json({ success: true, report: getMonitoringReport() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getLiveQueue,
  getQueueStats: getQueueStats_,
  getJobPosition,
  getDiagnostics,
  getJobsByRoleFilter,
  getMonitoringReportHandler,
};
