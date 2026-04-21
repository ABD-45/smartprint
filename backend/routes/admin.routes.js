const express = require("express");
const router = express.Router();
const {
  getAllJobs,
  getAnalytics,
  getAllUsers,
  updateJobStatus,
  getTimeline,
} = require("../controllers/adminController");
const { authenticate, authorize } = require("../middleware/auth");

// All admin routes require auth
router.use(authenticate);

// Admin-only routes
router.get("/jobs", authorize("admin", "printshop"), getAllJobs);
router.get("/analytics", authorize("admin"), getAnalytics);
router.get("/analytics/timeline", authorize("admin"), getTimeline);
router.get("/users", authorize("admin"), getAllUsers);

// Printshop/admin can update job status
router.patch("/jobs/:id/status", authorize("admin", "printshop"), updateJobStatus);

module.exports = router;
