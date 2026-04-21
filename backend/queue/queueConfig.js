/**
 * Queue Configuration
 * Centralized settings for priority calculation and queue behavior
 *
 * Priority order enforced:
 *   1. Staff · small jobs   (highest)
 *   2. Staff · large jobs
 *   3. Student · small jobs
 *   4. Student · large jobs (lowest, but aging prevents starvation)
 */

module.exports = {
  // ────────────────────────────────────────
  // Role-based Priority Bonuses
  // Large gap (1000) ensures staff ALWAYS above students regardless of page size
  // ────────────────────────────────────────
  ROLE_BONUSES: {
    admin:   1000,  // Same tier as staff (admins rarely print)
    staff:   1000,  // High priority — always above students
    student: 0,     // Base priority
  },

  // ────────────────────────────────────────
  // Job Size & Efficiency Scoring
  // Formula: SIZE_BONUS_BASE / (pages × copies)
  // Small jobs get higher score → processed first within same role
  // ────────────────────────────────────────
  SIZE_BONUS_BASE: 500,  // Base divisor — bigger = more differentiation
  MAX_SIZE_BONUS:  200,  // Cap: prevents tiny jobs from monopolising queue
                          // 1p→200, 3p→167, 10p→50, 25p→20, 100p→5

  // ────────────────────────────────────────
  // Starvation Prevention (Aging Algorithm)
  // Jobs gain priority points every minute they wait
  // ────────────────────────────────────────
  AGING_MULTIPLIER:              1.0,  // points per minute (linear phase)
  AGING_ACCELERATION_THRESHOLD: 20,   // minutes before exponential kicks in
  AGING_ACCELERATION_FACTOR:    3.0,  // multiply rate after threshold
  MAX_AGING_TIME:                90,  // minutes — guaranteed promotion after this
  MAX_AGING_BONUS:               800, // points added at MAX_AGING_TIME
                                       // (ensures even large-student job overtakes fresh staff)

  // ────────────────────────────────────────
  // Payment & Status Bonuses
  // ────────────────────────────────────────
  PAID_JOB_BONUS:        10,  // Paid jobs get slight edge
  PRIORITY_STATUS_BONUS:  5,  // "priority" status flag

  // ────────────────────────────────────────
  // Queue Refresh & Health Check Intervals
  // ────────────────────────────────────────
  QUEUE_REFRESH_INTERVAL_MS:    5 * 60 * 1000,  // recalculate priorities every 5 min
  STARVATION_CHECK_INTERVAL_MS: 1 * 60 * 1000,  // check starving jobs every 1 min

  // ────────────────────────────────────────
  // Fair Scheduling Parameters
  // ────────────────────────────────────────
  MAX_CONSECUTIVE_SAME_ROLE: 5,
  MIN_ROTATIONS_PER_ROLE:    1,

  // ────────────────────────────────────────
  // Queue Analytics & Metrics
  // ────────────────────────────────────────
  PAGES_PER_MINUTE:           20,   // Assumed printer speed (ppm) for ETA
  STARVATION_THRESHOLD_MINUTES: 30, // Flag job as "starving" if waited this long

  // ────────────────────────────────────────
  // Queue Number Display Format
  // ────────────────────────────────────────
  QUEUE_NUMBER_PREFIX: 'Q',  // Displayed as Q-001, Q-002 …

  // ────────────────────────────────────────
  // Debug & Logging
  // ────────────────────────────────────────
  DEBUG_PRIORITY_CALCULATION: false, // Set true to log priority calc details
};
