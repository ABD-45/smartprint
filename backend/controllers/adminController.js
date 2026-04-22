const Job = require("../models/Job");
const Payment = require("../models/Payment");
const User = require("../models/User");
const { getQueue, removeFromQueue, broadcastQueue } = require("../queue/queueManager");
const { generateOTP } = require("../utils/helpers");
const { printFile } = require("../services/printService");
const { getPresignedUrl } = require("../services/minioService");
const { sendJobReadyNotification, sendJobFailedNotification } = require("../services/notificationService");

/**
 * GET /api/admin/jobs — All jobs with filters
 */
const getAllJobs = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, shopId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (shopId) filter.shopId = shopId;

    const skip = (page - 1) * limit;

    const queueStatuses = ["queued", "printing"];
    const isQueueFilter = status && queueStatuses.includes(status);
    const sortOrder = isQueueFilter
      ? { queuePosition: 1 }
      : { createdAt: -1 };

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("userId", "name email role phone")
        .sort(sortOrder)
        .skip(skip)
        .limit(parseInt(limit)),
      Job.countDocuments(filter),
    ]);

    res.json({
      success: true,
      jobs,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/analytics — Key stats for admin dashboard
 */
const getAnalytics = async (req, res) => {
  try {
    const { peakRange = "24h", from, to } = req.query;
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    let peakStartDate;
    let peakEndDate = now;

    if (from && to) {
      peakStartDate = new Date(from);
      peakEndDate = new Date(to);
    } else {
      switch (peakRange) {
        case "7d":
          peakStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          peakStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "24h":
        default:
          peakStartDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
      }
    }

    const [
      totalJobs,
      todayJobs,
      completedJobs,
      todayCompleted,
      totalRevenue,
      todayRevenue,
      usersByRole,
      statusBreakdown,
    ] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ createdAt: { $gte: todayStart } }),
      Job.countDocuments({ status: { $in: ["done", "collected"] } }),
      Job.countDocuments({ completedAt: { $gte: todayStart } }),
      Payment.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        { $match: { status: "paid", createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Job.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    // Peak hours — based on the selected range
    const peakHoursRaw = await Job.aggregate([
      { $match: { createdAt: { $gte: peakStartDate, $lte: peakEndDate } } },
      {
        $group: {
          _id: { $hour: { date: "$createdAt", timezone: "Asia/Kolkata" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Build full 24-hour array with 0s for empty hours
    const peakHoursMap = {};
    peakHoursRaw.forEach(({ _id, count }) => { peakHoursMap[_id] = count; });
    const peakHours = Array.from({ length: 24 }, (_, h) => ({
      _id: h,
      count: peakHoursMap[h] || 0,
    }));

    const hasAnyActivity = peakHoursRaw.length > 0;

    res.json({
      success: true,
      analytics: {
        totalJobs,
        todayJobs,
        completedJobs,
        todayCompleted,          // ← accurate "Done Today" count
        hasAnyActivity,          // ← false if no jobs in last 24h
        totalRevenue: totalRevenue[0]?.total || 0,
        todayRevenue: todayRevenue[0]?.total || 0,
        usersByRole,
        statusBreakdown,
        peakHours,               // ← full 24h array
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/analytics/timeline — Daily or Monthly job/revenue timeline
 * Query: range=daily (last 30 days) | monthly (last 12 months)
 */
const getTimeline = async (req, res) => {
  try {
    const { range = "daily" } = req.query;
    const now = new Date();

    let startDate, groupFormat, labelFormat;

    if (range === "monthly") {
      // Last 12 months
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      groupFormat = { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } };
    } else {
      // Last 30 days (daily)
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      groupFormat = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
    }

    const [jobTimeline, revenueTimeline] = await Promise.all([
      Job.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: groupFormat, jobs: { $sum: 1 }, sheets: { $sum: { $multiply: ["$pages", "$copies"] } } } },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]),
      Payment.aggregate([
        { $match: { status: "paid", createdAt: { $gte: startDate } } },
        { $group: { _id: groupFormat, revenue: { $sum: "$amount" } } },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]),
    ]);

    // Merge revenue into job timeline
    const revenueMap = {};
    revenueTimeline.forEach((r) => {
      const key = range === "monthly"
        ? `${r._id.year}-${r._id.month}`
        : `${r._id.year}-${r._id.month}-${r._id.day}`;
      revenueMap[key] = r.revenue;
    });

    const timeline = jobTimeline.map((t) => {
      const key = range === "monthly"
        ? `${t._id.year}-${t._id.month}`
        : `${t._id.year}-${t._id.month}-${t._id.day}`;
      return {
        label: range === "monthly"
          ? new Date(t._id.year, t._id.month - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
          : new Date(t._id.year, t._id.month - 1, t._id.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        jobs: t.jobs,
        sheets: t.sheets,
        revenue: revenueMap[key] || 0,
      };
    });

    res.json({ success: true, timeline, range });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/users — All users
 */
const getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, users, pagination: { total, page: parseInt(page) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/admin/jobs/:id/status — Update job status (printshop action)
 */
const updateJobStatus_ = async (req, res) => {
  try {
    const { action } = req.body;
    const job = await Job.findById(req.params.id).select("+otp");

    if (!job) return res.status(404).json({ success: false, message: "Job not found." });

    const io = req.app.get("io");

    if (action === "start-printing") {
      if (job.status !== "queued") {
        return res.status(400).json({ success: false, message: "Job must be queued first." });
      }

      const signedUrl = await getPresignedUrl(job.fileName);
      
      // Instead of local printFile, emit to the hardware agent
      io.to(`shop-${job.shopId || "shop-001"}`).emit("incoming_print_job", {
        jobId: job._id,
        fileUrl: signedUrl,
        originalName: job.originalName,
        settings: {
          printerName: null, // Agent will use default if not specified
          copies: job.copies,
          color: job.color,
          paperSize: job.paperSize,
          orientation: job.orientation
        }
      });

      job.status = "printing";
      job.startedPrintingAt = new Date();
      await job.save();

      broadcastQueue();
      io.to(`job-${job._id}`).emit("jobStatusUpdate", { status: "printing" });
    } else if (action === "mark-done") {
      if (job.status !== "printing") {
        return res.status(400).json({ success: false, message: "Job must be in printing state." });
      }

      const otp = generateOTP();
      job.otp = otp;
      job.otpExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000);
      job.status = "done";
      job.completedAt = new Date();   // ← this is what "Done Today" now tracks
      await job.save();

      console.log(`✅ Job marked as done: ${job._id}, OTP=${otp}`);

      removeFromQueue(job._id.toString());
      await job.populate("userId", "name email role phone");

      broadcastQueue();
      io.to(`job-${job._id}`).emit("jobStatusUpdate", { status: "done", otp });

      // Send WhatsApp notification
      if (job.userId?.phone) {
        sendJobReadyNotification(job.userId.phone, job.originalName, otp);
      }
    } else if (action === "mark-failed") {
      job.status = "failed";
      job.failureReason = req.body.reason || "Print failed";
      job.retryCount = (job.retryCount || 0) + 1;
      await job.save();

      removeFromQueue(job._id.toString());
      await job.populate("userId", "name email role phone");
      broadcastQueue();
      io.to(`job-${job._id}`).emit("jobStatusUpdate", { status: "failed" });

      // Send WhatsApp notification
      if (job.userId?.phone) {
        sendJobFailedNotification(job.userId.phone, job.originalName, job.failureReason);
      }
    } else if (action === "requeue") {
      job.status = "paid";
      job.failureReason = null;
      await job.save();
      await job.populate("userId", "name email role");
      await addJobToQueue_andEmit(job, io);
    } else {
      return res.status(400).json({ success: false, message: "Invalid action." });
    }

    res.json({ success: true, message: `Job ${action} successful`, job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const { addJobToQueue } = require("../queue/queueManager");
const addJobToQueue_andEmit = async (job, io) => {
  await addJobToQueue(job, io);
};

module.exports = { getAllJobs, getAnalytics, getAllUsers, updateJobStatus: updateJobStatus_, getTimeline };
