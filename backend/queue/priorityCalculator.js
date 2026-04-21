/**
 * Priority Calculator Engine
 *
 * Scoring formula (higher = more urgent):
 *
 *   score = roleBonus + sizeBonus + agingBonus + paymentBonus
 *
 *   roleBonus  : staff/admin=1000, student=0
 *                → guarantees staff always above students
 *
 *   sizeBonus  : 500 / (pages × copies), capped at 200
 *                → within same role, smaller jobs go first
 *                  1p→200  3p→167  10p→50  25p→20  100p→5
 *
 *   agingBonus : linear up to 20 min, then exponential
 *                → prevents starvation; a student waiting 90 min
 *                  gets +800 pts, overtaking fresh staff jobs
 *
 *   paymentBonus: +10 for paid jobs
 *
 * Effective ordering example:
 *   Staff  · 1p   → 1200   Staff  · 20p  → 1025
 *   Staff  · 5p   → 1100   Student · 1p  →  200
 *   Student · 5p  →  100   Student · 20p →   25
 */

const queueConfig = require('./queueConfig');

// ─────────────────────────────────────────────────────────────
// Master scorer
// ─────────────────────────────────────────────────────────────
const calculatePriority = (job) => {
  const components = {
    role:    calculateRoleBonus(job.userRole),
    size:    calculateSizeBonus(job.pages, job.copies),
    aging:   calculateAgingBonus(job.queuedAt),
    payment: calculatePaymentBonus(job.status),
  };

  const totalScore = Object.values(components).reduce((sum, v) => sum + v, 0);

  if (queueConfig.DEBUG_PRIORITY_CALCULATION) {
    console.log(`[PRIORITY] Job ${job._id}:`, components, `→ Total: ${totalScore}`);
  }

  return Math.round(totalScore * 100) / 100;
};

// ─────────────────────────────────────────────────────────────
// Role bonus
// ─────────────────────────────────────────────────────────────
const calculateRoleBonus = (role) =>
  queueConfig.ROLE_BONUSES[role] ?? queueConfig.ROLE_BONUSES.student;

// ─────────────────────────────────────────────────────────────
// Size bonus  — smaller pages = higher bonus
// ─────────────────────────────────────────────────────────────
const calculateSizeBonus = (pages, copies) => {
  const totalPages = Math.max((pages || 1) * (copies || 1), 1);
  const raw = queueConfig.SIZE_BONUS_BASE / totalPages;
  return Math.min(raw, queueConfig.MAX_SIZE_BONUS);
};

// ─────────────────────────────────────────────────────────────
// Aging bonus — prevents starvation
// Linear for first AGING_ACCELERATION_THRESHOLD minutes,
// then exponential growth until MAX_AGING_TIME (guaranteed cap)
// ─────────────────────────────────────────────────────────────
const calculateAgingBonus = (queuedAt) => {
  if (!queuedAt) return 0;

  const waitingMinutes = (Date.now() - new Date(queuedAt).getTime()) / 60000;

  // Guaranteed maximum after MAX_AGING_TIME
  if (waitingMinutes >= queueConfig.MAX_AGING_TIME) {
    return queueConfig.MAX_AGING_BONUS;
  }

  const threshold = queueConfig.AGING_ACCELERATION_THRESHOLD;
  const multiplier = queueConfig.AGING_MULTIPLIER;

  if (waitingMinutes <= threshold) {
    // Linear phase
    return Math.round(waitingMinutes * multiplier * 100) / 100;
  }

  // Exponential phase
  const linearPart = threshold * multiplier;
  const excessMin  = waitingMinutes - threshold;
  const expPart    = excessMin * multiplier * queueConfig.AGING_ACCELERATION_FACTOR;
  return Math.round((linearPart + expPart) * 100) / 100;
};

// ─────────────────────────────────────────────────────────────
// Payment bonus
// ─────────────────────────────────────────────────────────────
const calculatePaymentBonus = (status) => {
  if (['paid', 'queued', 'printing'].includes(status)) return queueConfig.PAID_JOB_BONUS;
  if (status === 'priority') return queueConfig.PRIORITY_STATUS_BONUS;
  return 0;
};

// ─────────────────────────────────────────────────────────────
// Starvation check
// ─────────────────────────────────────────────────────────────
const isJobStarving = (queuedAt) => {
  if (!queuedAt) return false;
  const waitingMinutes = (Date.now() - new Date(queuedAt).getTime()) / 60000;
  return waitingMinutes > queueConfig.STARVATION_THRESHOLD_MINUTES;
};

// ─────────────────────────────────────────────────────────────
// ETA helpers
// ─────────────────────────────────────────────────────────────

/**
 * Total time to clear N pages at printer speed (minutes)
 */
const estimateTimeToProcess = (totalPages) =>
  Math.ceil(totalPages / queueConfig.PAGES_PER_MINUTE);

/**
 * ETA for a specific job: how many minutes until IT finishes printing
 * @param {Object} job        - the job we care about
 * @param {Array}  sortedQueue - full queue sorted by priority (highest first)
 * @returns {number} minutes until job completes printing
 */
const estimateJobETA = (job, sortedQueue) => {
  const jobId = job._id?.toString();
  let pagesAhead = 0;

  for (const q of sortedQueue) {
    if (q._id?.toString() === jobId) break;
    pagesAhead += (q.pages || 0) * (q.copies || 1);
  }

  const myPages = (job.pages || 0) * (job.copies || 1);
  return Math.ceil((pagesAhead + myPages) / queueConfig.PAGES_PER_MINUTE);
};

// ─────────────────────────────────────────────────────────────
// Queue number formatter   Q-001, Q-042, Q-100 …
// ─────────────────────────────────────────────────────────────
const formatQueueNumber = (position) => {
  if (!position) return null;
  return `${queueConfig.QUEUE_NUMBER_PREFIX}-${String(position).padStart(3, '0')}`;
};

// ─────────────────────────────────────────────────────────────
// Priority tier label (for UI display)
// ─────────────────────────────────────────────────────────────
const getPriorityTier = (score) => {
  if (score >= 1100) return 'CRITICAL';
  if (score >= 900)  return 'HIGH';
  if (score >= 100)  return 'NORMAL';
  if (score >= 20)   return 'LOW';
  return 'BACKGROUND';
};

module.exports = {
  calculatePriority,
  calculateRoleBonus,
  calculateSizeBonus,
  calculateAgingBonus,
  calculatePaymentBonus,
  isJobStarving,
  estimateTimeToProcess,
  estimateJobETA,
  formatQueueNumber,
  getPriorityTier,
};
