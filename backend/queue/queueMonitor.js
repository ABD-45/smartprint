/**
 * Queue Monitor & Analytics
 * 
 * Tracks queue health, identifies starving jobs,
 * monitors performance metrics, and alerts on issues
 */

const queueConfig = require('./queueConfig');
const { isJobStarving, estimateTimeToProcess } = require('./priorityCalculator');

class QueueMonitor {
  constructor() {
    this.metrics = {
      totalJobsProcessed: 0,
      totalTimeSavedByPrioritization: 0, // In minutes
      averageTimeInQueue: 0,
      starvationEvents: 0,
      roleDistribution: { admin: 0, staff: 0, student: 0 },
    };

    this.alerts = [];
  }

  /**
   * Update metrics based on current queue state
   */
  updateMetrics(queue) {
    if (!queue || queue.size === 0) {
      this.metrics.averageTimeInQueue = 0;
      return;
    }

    // Calculate average waiting time
    let totalWaitTime = 0;
    let count = 0;

    const allJobs = queue.getAll();
    for (const job of allJobs) {
      if (job.queuedAt) {
        const waitTime = (new Date() - new Date(job.queuedAt)) / (1000 * 60);
        totalWaitTime += waitTime;
        count++;
      }
    }

    this.metrics.averageTimeInQueue = count > 0 ? Math.round(totalWaitTime / count) : 0;
  }

  /**
   * Check for starving jobs and generate alerts
   */
  checkForStarvation(queue) {
    this.alerts = [];

    const starvingJobs = queue.getStarvingJobs();

    if (starvingJobs.length > 0) {
      this.metrics.starvationEvents += 1;

      for (const job of starvingJobs) {
        const waitMinutes = Math.round(
          (new Date() - new Date(job.queuedAt)) / (1000 * 60)
        );

        this.alerts.push({
          severity: 'WARNING',
          type: 'STARVATION',
          jobId: job._id,
          message: `Job starving: waited ${waitMinutes} minutes`,
          timestamp: new Date(),
          jobDetails: {
            role: job.userRole,
            pages: job.pages,
            copies: job.copies,
            position: job.queuePosition,
          },
        });
      }
    }

    return this.alerts;
  }

  /**
   * Check queue health for anomalies
   */
  checkQueueHealth(queue) {
    const stats = queue.getStats();

    // Alert if queue is too long
    if (stats.totalJobs > 50) {
      this.alerts.push({
        severity: 'INFO',
        type: 'QUEUE_SIZE',
        message: `Queue has ${stats.totalJobs} jobs - consider adding capacity`,
        timestamp: new Date(),
      });
    }

    // Alert if estimated clear time is too long
    if (stats.estimatedTimeToCompleteMinutes > 480) { // 8 hours
      this.alerts.push({
        severity: 'WARNING',
        type: 'HIGH_LOAD',
        message: `Estimated clear time: ${stats.estimatedTimeToCompleteMinutes} minutes (8+ hours)`,
        timestamp: new Date(),
      });
    }

    // Alert if all student jobs are at bottom
    const studentJobs = queue.getByRole('student');
    if (studentJobs.length > 5) {
      const avgStudentPos = studentJobs.reduce((sum, j) => sum + j.queuePosition, 0) / studentJobs.length;
      const avgStaffPos = queue.getByRole('staff').length > 0
        ? queue.getByRole('staff').reduce((sum, j) => sum + j.queuePosition, 0) / queue.getByRole('staff').length
        : 0;

      if (avgStudentPos > avgStaffPos * 5) {
        this.alerts.push({
          severity: 'INFO',
          type: 'ROLE_IMBALANCE',
          message: 'Student jobs significantly behind staff jobs',
          timestamp: new Date(),
        });
      }
    }

    return this.alerts;
  }

  /**
   * Generate performance report
   */
  generateReport(queue) {
    const stats = queue.getStats();
    const diagnostics = queue.getDiagnostics();

    return {
      timestamp: new Date(),
      summary: {
        totalJobs: stats.totalJobs,
        totalPages: stats.totalPages,
        estimatedTimeMinutes: stats.estimatedTimeToCompleteMinutes,
        jobsByRole: stats.jobsByRole,
        starving: stats.starvingJobs,
      },
      metrics: this.metrics,
      alerts: this.alerts,
      diagnostics,
      recommendations: this.generateRecommendations(stats),
    };
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(stats) {
    const recommendations = [];

    if (stats.totalJobs > 50) {
      recommendations.push('Consider increasing printer capacity or adding another printer');
    }

    if (stats.estimatedTimeToCompleteMinutes > 480) {
      recommendations.push('Queue clear time exceeds 8 hours - monitor closely');
    }

    if (stats.starvingJobs > 3) {
      recommendations.push('Multiple jobs starving - check for printer issues or increase speed');
    }

    if (stats.jobsByRole.student > stats.totalJobs * 0.8) {
      recommendations.push('Queue heavily dominated by student jobs - check role distribution');
    }

    if (stats.jobsByRole.admin === 0 && stats.jobsByRole.staff === 0) {
      recommendations.push('No staff/admin jobs in queue - role-based prioritization inactive');
    }

    return recommendations;
  }

  /**
   * Record job completion
   */
  recordJobCompletion(job, timeInQueueMinutes) {
    this.metrics.totalJobsProcessed += 1;
    
    // Track role distribution
    this.metrics.roleDistribution[job.userRole] += 1;
  }

  /**
   * Get all current alerts
   */
  getAlerts() {
    return this.alerts;
  }

  /**
   * Clear alerts (after acknowledged)
   */
  clearAlerts() {
    this.alerts = [];
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      totalJobsProcessed: 0,
      totalTimeSavedByPrioritization: 0,
      averageTimeInQueue: 0,
      starvationEvents: 0,
      roleDistribution: { admin: 0, staff: 0, student: 0 },
    };
    this.alerts = [];
  }
}

module.exports = QueueMonitor;
