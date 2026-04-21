const express = require("express");
const router = express.Router();
const {
  getLiveQueue,
  getQueueStats: getQueueStats_,
  getJobPosition,
  getDiagnostics,
  getJobsByRoleFilter,
  getMonitoringReportHandler,
} = require("../controllers/queueController");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// Queue information endpoints
router.get("/", getLiveQueue);
router.get("/stats", getQueueStats_);
router.get("/position/:jobId", getJobPosition);

// Admin/Staff monitoring endpoints
router.get("/diagnostics", getDiagnostics);
router.get("/role/:role", getJobsByRoleFilter);
router.get("/report", getMonitoringReportHandler);

module.exports = router;
