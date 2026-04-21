const crypto = require("crypto");

const OTP_TTL_MINUTES = 30;

/**
 * Generate a 6-digit numeric OTP
 * @returns {string} 6-digit OTP padded with leading zeros
 */
const generateOTP = () => {
  const otp = crypto.randomInt(100000, 999999);
  return otp.toString();
};

/**
 * Attach OTP to a Job document and persist it.
 * Called when the print shop marks a job as "done".
 *
 * @param {Object} job - Mongoose Job document
 * @returns {string} the generated OTP (for logging / notification)
 */
const assignOTPToJob = async (job) => {
  const otp = generateOTP();
  const expiry = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  job.otp = otp;
  job.otpExpiry = expiry;
  job.otpVerified = false;
  await job.save();

  console.log(`🔑 OTP assigned to job ${job._id}: ${otp} (expires ${expiry.toISOString()})`);
  return otp;
};

/**
 * Verify an OTP submitted by a student at pickup.
 *
 * @param {Object} job  - Job document (must have been fetched with +otp select)
 * @param {string} inputOTP - OTP entered by student
 * @returns {{ valid: boolean, reason?: string }}
 */
const verifyJobOTP = (job, inputOTP) => {
  if (job.otpVerified) {
    return { valid: false, reason: "OTP already used." };
  }

  if (!job.otp || !job.otpExpiry) {
    return { valid: false, reason: "No OTP assigned to this job." };
  }

  if (new Date() > new Date(job.otpExpiry)) {
    return { valid: false, reason: "OTP has expired." };
  }

  if (job.otp !== inputOTP.trim()) {
    return { valid: false, reason: "Incorrect OTP." };
  }

  return { valid: true };
};

/**
 * Mask OTP for safe display (e.g., "1**45*")
 * Used for partial hint in track page
 */
const maskOTP = (otp) => {
  if (!otp || otp.length < 4) return "******";
  return otp[0] + "**" + otp.slice(3, 4) + "**";
};

module.exports = { generateOTP, assignOTPToJob, verifyJobOTP, maskOTP };
