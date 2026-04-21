const express = require("express");
const router = express.Router();
const {
  upload,
  analyzeFile,
  createJob,
  getMyJobs,
  getJobById,
  verifyOTP,
  getJobOTP,
} = require("../controllers/jobController");
const { authenticate, authorize } = require("../middleware/auth");

// All routes require authentication
router.use(authenticate);

// Analyze file: detect pages without creating a job (used by frontend live preview)
router.post("/analyze", upload.single("file"), analyzeFile);

// Upload a new print job
router.post("/upload", upload.single("file"), createJob);

// Get current user's jobs
router.get("/my", getMyJobs);

// Get single job details
router.get("/:id", getJobById);

// Get OTP for job pickup (job owner only)
router.get("/:id/otp", getJobOTP);

// Verify OTP at pickup
router.post("/:id/verify-otp", verifyOTP);

module.exports = router;
