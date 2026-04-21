/**
 * Queue System - Integration Example & Test
 * 
 * Shows how to use the optimized queue system
 * in a real application scenario
 */

// ============================================
// EXAMPLE 1: Adding jobs to queue
// ============================================

async function example_addJobsToQueue(jobs) {
  const { addJobToQueue } = require('./queueManager');

  console.log('📋 Adding jobs to queue...');

  for (const job of jobs) {
    const position = await addJobToQueue(job);
    console.log(`✓ Job ${job._id} queued at position #${position}`);
  }
}

// ============================================
// EXAMPLE 2: Processing jobs from queue
// ============================================

async function example_processQueue() {
  const {
    getNextJob,
    removeFromQueue,
    broadcastQueue,
  } = require('./queueManager');

  let processed = 0;

  while (true) {
    const job = getNextJob();
    
    if (!job) {
      console.log('✅ Queue empty - all jobs processed');
      break;
    }

    console.log(`📤 Processing: ${job.originalName} (Position #${job.queuePosition})`);

    // Simulate processing
    await simulatePrinting(job);

    // Remove from queue after completion
    await removeFromQueue(job._id);

    // Update clients
    broadcastQueue();

    processed++;
    console.log(`✓ Completed job #${processed}`);
  }
}

// ============================================
// EXAMPLE 3: Get queue statistics
// ============================================

function example_getStats() {
  const { getQueueStats } = require('./queueManager');

  const stats = getQueueStats();

  console.log('📊 Queue Statistics:');
  console.log(`  Total Jobs: ${stats.totalJobs}`);
  console.log(`  Total Pages: ${stats.totalPages}`);
  console.log(`  Est. Time: ${stats.estimatedTimeToCompleteMinutes} min`);
  console.log(`  By Role: Admin=${stats.jobsByRole.admin}, Staff=${stats.jobsByRole.staff}, Student=${stats.jobsByRole.student}`);
  console.log(`  Starving: ${stats.starvingJobs} jobs`);
  console.log(`  Avg Priority: ${stats.averagePriority}`);
}

// ============================================
// EXAMPLE 4: Monitor queue health
// ============================================

function example_monitorHealth() {
  const { getMonitoringReport } = require('./queueManager');

  const report = getMonitoringReport();

  console.log('🏥 Queue Health Report:');
  console.log('  Timestamp:', report.timestamp);
  console.log('  Summary:', report.summary);

  if (report.alerts.length > 0) {
    console.log('  ⚠️  Alerts:');
    report.alerts.forEach(alert => {
      console.log(`    - ${alert.severity}: ${alert.message}`);
    });
  }

  if (report.recommendations.length > 0) {
    console.log('  💡 Recommendations:');
    report.recommendations.forEach(rec => {
      console.log(`    - ${rec}`);
    });
  }
}

// ============================================
// EXAMPLE 5: Role-based queue filtering
// ============================================

function example_filterByRole() {
  const { getJobsByRole } = require('./queueManager');

  ['admin', 'staff', 'student'].forEach(role => {
    const jobs = getJobsByRole(role);
    console.log(`${role}: ${jobs.length} jobs`);
    jobs.slice(0, 2).forEach(job => {
      console.log(`  - ${job.originalName} (Score: ${job.priorityScore})`);
    });
  });
}

// ============================================
// EXAMPLE 6: Real-time updates via Socket.IO
// ============================================

function example_socketIoIntegration(io) {
  console.log('🔄 Setting up real-time updates...');

  io.on('connection', (socket) => {
    // Users subscribe to queue updates
    socket.on('subscribe:queue', () => {
      socket.join('queue-room');
      console.log('✓ User subscribed to queue');
    });

    // Subscribe to specific job updates
    socket.on('subscribe:job', (jobId) => {
      socket.join(`job-${jobId}`);
      console.log(`✓ User subscribed to job ${jobId}`);
    });

    // Receive diagnostics request (admin)
    socket.on('request:diagnostics', () => {
      if (socket.handshake.auth.role === 'admin') {
        const { getQueueDiagnostics } = require('./queueManager');
        socket.emit('diagnostics', getQueueDiagnostics());
      }
    });

    socket.on('disconnect', () => {
      console.log('✓ User disconnected');
    });
  });

  // Broadcast queue updates
  setInterval(() => {
    const { getQueue, getQueueStats } = require('./queueManager');
    io.to('queue-room').emit('queueUpdate', {
      timestamp: new Date(),
      queue: getQueue(),
      stats: getQueueStats(),
    });
  }, 30000); // Every 30 seconds
}

// ============================================
// EXAMPLE 7: Tuning priority for test scenarios
// ============================================

function example_priorityTuning() {
  const config = require('./queueConfig');

  console.log('Current Priority Configuration:');
  console.log('  Role Bonuses:', config.ROLE_BONUSES);
  console.log('  Max Size Bonus:', config.MAX_SIZE_BONUS);
  console.log('  Aging Multiplier:', config.AGING_MULTIPLIER);
  console.log('  Starvation Threshold: ', config.STARVATION_THRESHOLD_MINUTES, 'min');

  // Example: Adjust for staff-heavy environment
  console.log('\n📝 To make queue more staff-friendly:');
  console.log('  config.ROLE_BONUSES.staff = 100  // More priority');
  console.log('  config.AGING_MULTIPLIER = 0.3    // Slower aging for students');

  // Example: More equal treatment
  console.log('\n📝 To make queue more equal:');
  console.log('  config.ROLE_BONUSES.staff = 40   // Less staff priority');
  console.log('  config.MAX_SIZE_BONUS = 100      // More bonus for small jobs');
}

// ============================================
// EXAMPLE 8: Priority score breakdown
// ============================================

function example_priorityBreakdown() {
  const {
    calculatePriority,
    calculateRoleBonus,
    calculateSizeBonus,
    calculateAgingBonus,
    calculatePaymentBonus,
  } = require('./priorityCalculator');

  const sampleJob = {
    _id: 'job123',
    userRole: 'staff',
    pages: 10,
    copies: 2,
    queuedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
    status: 'queued',
  };

  console.log('📊 Priority Score Breakdown for:', sampleJob.userRole);
  console.log('  Role Bonus:', calculateRoleBonus(sampleJob.userRole));
  console.log('  Size Bonus:', calculateSizeBonus(sampleJob.pages, sampleJob.copies));
  console.log('  Aging Bonus:', calculateAgingBonus(sampleJob.queuedAt));
  console.log('  Payment Bonus:', calculatePaymentBonus(sampleJob.status));
  console.log('  ---');
  console.log('  TOTAL SCORE:', calculatePriority(sampleJob));
}

// ============================================
// EXAMPLE 9: Load testing
// ============================================

async function example_loadTest() {
  const { addJobToQueue, getQueueStats } = require('./queueManager');

  console.log('🚀 Queue Load Test');

  // Add 1000 jobs
  const jobs = generateTestJobs(1000);

  const start = Date.now();

  for (let i = 0; i < jobs.length; i++) {
    await addJobToQueue(jobs[i]);

    if ((i + 1) % 100 === 0) {
      console.log(`  ✓ Added ${i + 1} jobs...`);
    }
  }

  const elapsed = Date.now() - start;
  const stats = getQueueStats();

  console.log(`\n✓ Completed in ${elapsed}ms`);
  console.log('Stats after load:', stats);
  console.log(`  Avg time per job: ${(elapsed / 1000).toFixed(2)}ms`);
}

// ============================================
// HELPERS
// ============================================

function generateTestJobs(count) {
  const roles = ['admin', 'staff', 'student'];
  const jobs = [];

  for (let i = 0; i < count; i++) {
    jobs.push({
      _id: `job_${i}`,
      userRole: roles[i % roles.length],
      pages: Math.floor(Math.random() * 100) + 1,
      copies: Math.floor(Math.random() * 5) + 1,
      originalName: `document_${i}.pdf`,
      status: 'queued',
      queuedAt: new Date(),
    });
  }

  return jobs;
}

function simulatePrinting(job) {
  const pageTime = 3000; // 3 sec per page
  const totalTime = job.pages * job.copies * pageTime;

  return new Promise(resolve => {
    setTimeout(() => {
      console.log(`✓ Printed: ${job.originalName}`);
      resolve();
    }, totalTime);
  });
}

// ============================================
// EXPORT EXAMPLES
// ============================================

module.exports = {
  example_addJobsToQueue,
  example_processQueue,
  example_getStats,
  example_monitorHealth,
  example_filterByRole,
  example_socketIoIntegration,
  example_priorityTuning,
  example_priorityBreakdown,
  example_loadTest,
};

// ============================================
// RUN EXAMPLES (if executed directly)
// ============================================

if (require.main === module) {
  console.log('Queue System - Integration Examples\n');

  example_priorityBreakdown();
  console.log('\n---\n');

  example_priorityTuning();
  console.log('\n---\n');

  console.log('📚 See documentation:');
  console.log('  - QUEUE_SYSTEM.md      (Complete documentation)');
  console.log('  - QUICK_REFERENCE.md   (Quick lookup)');
  console.log('\n✓ Examples ready to use in your code!');
}
