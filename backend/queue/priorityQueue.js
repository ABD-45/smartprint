/**
 * Optimized Priority Queue Data Structure
 * 
 * In-memory queue backed by sorted array
 * Efficient operations: O(n log n) on refresh, O(n) on enqueue
 * 
 * Features:
 * - Auto-deduplication
 * - Position tracking
 * - Batch operations
 * - Search/lookup utilities
 */

const { calculatePriority, isJobStarving, estimateTimeToProcess } = require('./priorityCalculator');

class PriorityQueue {
  constructor() {
    this._queue = [];          // Sorted array of jobs
    this._jobMap = new Map();  // Quick lookup: jobId -> job
  }

  /**
   * Add or update job in queue
   * Maintains sorted order
   */
  enqueue(job) {
    if (!job || !job._id) {
      throw new Error('Invalid job: must have _id');
    }

    // Normalize to plain object (Mongoose v9 documents are Proxy-based;
    // spreading them with {...doc} loses all schema fields)
    const plain = job.toObject ? job.toObject() : { ...job };

    // Calculate fresh priority score
    plain.priorityScore = calculatePriority(plain);

    // Check if job already exists
    if (this._jobMap.has(plain._id.toString())) {
      // Update existing job
      const existingIdx = this._queue.findIndex(j => j._id.toString() === plain._id.toString());
      if (existingIdx !== -1) {
        this._queue[existingIdx] = plain;
      }
    } else {
      // Add new job
      this._queue.push(plain);
      this._jobMap.set(plain._id.toString(), plain);
    }

    // Re-sort and update positions
    this._sort();
    this._updatePositions();

    return plain.queuePosition;
  }

  /**
   * Add multiple jobs at once
   * More efficient than calling enqueue() repeatedly
   */
  enqueueBatch(jobs) {
    for (const job of jobs) {
      if (job && job._id) {
        // Normalize to plain object (Mongoose v9 Proxy documents lose fields when spread)
        const plain = job.toObject ? job.toObject() : { ...job };
        plain.priorityScore = calculatePriority(plain);
        this._jobMap.set(plain._id.toString(), plain);
        this._queue.push(plain);
      }
    }

    this._sort();
    this._updatePositions();
    
    return this._queue.length;
  }

  /**
   * Remove job by ID
   */
  dequeue(jobId) {
    const jobIdStr = jobId.toString();
    const initialLength = this._queue.length;

    this._queue = this._queue.filter(j => j._id.toString() !== jobIdStr);
    this._jobMap.delete(jobIdStr);
    this._updatePositions();

    return initialLength !== this._queue.length;
  }

  /**
   * Remove multiple jobs
   */
  dequeueBatch(jobIds) {
    const jobIdStrs = jobIds.map(id => id.toString());
    const initialLength = this._queue.length;

    this._queue = this._queue.filter(j => !jobIdStrs.includes(j._id.toString()));
    jobIdStrs.forEach(id => this._jobMap.delete(id));
    this._updatePositions();

    return initialLength - this._queue.length;
  }

  /**
   * Get highest priority job without removing
   */
  peek() {
    return this._queue[0] || null;
  }

  /**
   * Get top N jobs
   */
  peekN(n = 5) {
    return this._queue.slice(0, n);
  }

  /**
   * Get job by ID
   */
  get(jobId) {
    return this._jobMap.get(jobId.toString()) || null;
  }

  /**
   * Check if job exists
   */
  has(jobId) {
    return this._jobMap.has(jobId.toString());
  }

  /**
   * Get all jobs (sorted)
   */
  getAll() {
    return [...this._queue];
  }

  /**
   * Get all jobs by role
   */
  getByRole(role) {
    return this._queue.filter(j => j.userRole === role);
  }

  /**
   * Get all starving jobs (waiting too long)
   */
  getStarvingJobs() {
    return this._queue.filter(j => isJobStarving(j.queuedAt));
  }

  /**
   * Refresh priority scores for all jobs
   * Call periodically to apply aging and recalculate priorities
   */
  refresh() {
    // Recalculate priority scores — jobs in queue are already plain objects
    // (normalized at enqueue/enqueueBatch), so spread is safe here
    this._queue = this._queue.map(job => ({
      ...job,
      priorityScore: calculatePriority(job),
    }));

    this._sort();
    this._updatePositions();
  }

  /**
   * Queue size
   */
  get size() {
    return this._queue.length;
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const totalJobs = this._queue.length;
    const totalPages = this._queue.reduce((sum, j) => sum + j.pages * (j.copies || 1), 0);
    const timeToComplete = estimateTimeToProcess(totalPages);

    const byRole = {
      admin: this._queue.filter(j => j.userRole === 'admin').length,
      staff: this._queue.filter(j => j.userRole === 'staff').length,
      student: this._queue.filter(j => j.userRole === 'student').length,
    };

    const starvingJobs = this.getStarvingJobs().length;

    const avgPriority = totalJobs > 0
      ? Math.round((this._queue.reduce((sum, j) => sum + j.priorityScore, 0) / totalJobs) * 100) / 100
      : 0;

    return {
      totalJobs,
      totalPages,
      estimatedTimeToCompleteMinutes: timeToComplete,
      jobsByRole: byRole,
      starvingJobs,
      averagePriority: avgPriority,
      minPriority: totalJobs > 0 ? this._queue[this._queue.length - 1].priorityScore : 0,
      maxPriority: totalJobs > 0 ? this._queue[0].priorityScore : 0,
    };
  }

  /**
   * Get detailed queue diagnostics
   */
  getDiagnostics() {
    const stats = this.getStats();
    const nextJob = this.peek();

    return {
      ...stats,
      nextJob: nextJob ? {
        id: nextJob._id,
        fileName: nextJob.originalName,
        userRole: nextJob.userRole,
        priorityScore: nextJob.priorityScore,
        pages: nextJob.pages,
        copies: nextJob.copies,
        waitingMinutes: nextJob.queuedAt ? 
          Math.round((new Date() - new Date(nextJob.queuedAt)) / (1000 * 60)) : 0,
      } : null,
      topJobs: this._queue.slice(0, 3).map(j => ({
        id: j._id,
        fileName: j.originalName,
        role: j.userRole,
        score: j.priorityScore,
        position: j.queuePosition,
      })),
    };
  }

  /**
   * Clear entire queue
   */
  clear() {
    this._queue = [];
    this._jobMap.clear();
  }

  /**
   * Internal: Sort queue by priority (highest first)
   */
  _sort() {
    this._queue.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Internal: Update position field for all jobs
   */
  _updatePositions() {
    this._queue.forEach((job, index) => {
      job.queuePosition = index + 1;
    });
  }
}

module.exports = PriorityQueue;
