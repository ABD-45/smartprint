const Job = require("../models/Job");
const { uploadFileToMinio, getPresignedUrl } = require("../services/minioService");
const { calculatePrice, generateOTP, estimatePrintTime } = require("../utils/helpers");
const { detectPageCount } = require("../utils/pageDetector");
const { addJobToQueue } = require("../queue/queueManager");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// Multer in-memory storage (file goes to MinIO)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx", ".txt", ".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("File type not supported. Allowed: PDF, DOC, DOCX, TXT, PNG, JPG"));
  },
});

/**
 * POST /api/jobs/analyze
 * Lightweight pre-flight: read file buffer, detect pages, return info.
 * Does NOT store the file or create a job — used by the frontend for the
 * live file-info card before the student confirms and submits.
 */
const analyzeFile = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: "No file uploaded." });

    const { pages, method, confidence } = await detectPageCount(
      file.buffer,
      file.mimetype,
      file.originalname
    );

    return res.json({
      success: true,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      pages,
      method,
      confidence,
    });
  } catch (err) {
    console.error("❌ analyzeFile error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/jobs/upload
 */
const createJob = async (req, res) => {
  try {
    console.log("📤 Job upload request received");
    console.log("   File:", req.file ? `${req.file.originalname} (${req.file.size} bytes)` : "NO FILE");
    console.log("   Body:", req.body);
    console.log("   User:", req.user?._id);

    const { copies, color, duplex, paperSize, orientation } = req.body;
    // pages from body is the user-confirmed value; if missing we auto-detect
    let { pages } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ success: false, message: "No file uploaded." });

    // ── Auto-detect pages if not provided or invalid ──────────────────────
    let pageDetection = { method: "manual", confidence: "manual" };
    if (!pages || parseInt(pages) < 1) {
      console.log("🔍 Auto-detecting page count from file buffer...");
      pageDetection = await detectPageCount(file.buffer, file.mimetype, file.originalname);
      pages = pageDetection.pages;
      console.log(`   ✓ Detected ${pages} pages (method: ${pageDetection.method}, confidence: ${pageDetection.confidence})`);
    } else {
      console.log(`   ✓ Using user-supplied page count: ${pages}`);
    }

    // Upload to MinIO
    console.log("📦 Uploading file to MinIO...");
    const fileName = `${uuidv4()}_${file.originalname.replace(/\s+/g, "_")}`;
    const fileUrl = await uploadFileToMinio(fileName, file.buffer, file.mimetype);
    console.log("   ✓ File uploaded to MinIO:", fileUrl);

    // Calculate price
    const opts = {
      pages: parseInt(pages),
      copies: parseInt(copies) || 1,
      color: color === "true" || color === true,
      duplex: duplex === "true" || duplex === true,
    };
    console.log("📊 Calculating price with options:", opts);
    const { pricePerPage, totalAmount } = calculatePrice(opts);
    console.log("   ✓ Price calculated: ₹" + totalAmount);

    // Create job
    console.log("💾 Creating job record in MongoDB...");
    const jobData = {
      userId: req.user._id,
      userRole: req.user.role,
      fileName,
      originalName: file.originalname,
      fileUrl,
      fileSize: file.size,
      mimeType: file.mimetype,
      pages: opts.pages,
      copies: opts.copies,
      color: opts.color,
      duplex: opts.duplex,
      paperSize: paperSize || "A4",
      orientation: orientation || "portrait",
      pricePerPage,
      totalAmount,
      status: "uploaded",
    };

    const job = await Job.create(jobData);
    console.log("   ✓ Job created:", job._id);

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      job: {
        id: job._id,
        fileName: job.originalName,
        pages: job.pages,
        copies: job.copies,
        color: job.color,
        duplex: job.duplex,
        totalAmount: job.totalAmount,
        status: job.status,
        pageDetection,
      },
    });
  } catch (err) {
    console.error("❌ Job upload error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/jobs/my
 */
const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/jobs/:id
 */
const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("userId", "name email");
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });

    // Only job owner, admin, or printshop can see
    const isOwner = job.userId._id.toString() === req.user._id.toString();
    const isPrivileged = ["admin", "printshop"].includes(req.user.role);
    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    // Add presigned file URL for printshop/admin
    let signedUrl = null;
    if (isPrivileged) {
      signedUrl = await getPresignedUrl(job.fileName);
    }

    res.json({ success: true, job, signedUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/jobs/:id/verify-otp
 */
const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log(`🔐 OTP verification request: job=${req.params.id}, otp=${otp}, user=${req.user._id}`);
    
    const job = await Job.findById(req.params.id).select("+otp").populate("userId", "name email");

    if (!job) {
      console.warn(`⚠️  Job not found: ${req.params.id}`);
      return res.status(404).json({ success: false, message: "Job not found." });
    }
    
    console.log(`   Job found: ${job._id}, status=${job.status}, expected otp=${job.otp}, actual otp=${otp}`);
    
    // Only job owner or printshop/admin can verify OTP
    const isOwner = job.userId._id.toString() === req.user._id.toString();
    const isPrivileged = ["admin", "printshop"].includes(req.user.role);
    console.log(`   Auth check: isOwner=${isOwner}, isPrivileged=${isPrivileged}, userRole=${req.user.role}`);
    
    if (!isOwner && !isPrivileged) {
      console.warn(`⚠️  Access denied for user ${req.user._id} with role ${req.user.role}`);
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    if (job.status !== "done") {
      console.warn(`⚠️  Job status is ${job.status}, expected 'done'`);
      return res.status(400).json({ success: false, message: "Job is not ready for pickup." });
    }
    if (job.otpVerified) {
      console.warn(`⚠️  OTP already verified for job ${job._id}`);
      return res.status(400).json({ success: false, message: "OTP already used." });
    }
    if (new Date() > job.otpExpiry) {
      console.warn(`⚠️  OTP expired for job ${job._id}. Expiry: ${job.otpExpiry}, Now: ${new Date()}`);
      return res.status(400).json({ success: false, message: "OTP expired." });
    }
    if (job.otp !== otp) {
      console.warn(`⚠️  OTP mismatch for job ${job._id}. Expected: ${job.otp}, Got: ${otp}`);
      return res.status(400).json({ success: false, message: "Incorrect OTP." });
    }

    job.otpVerified = true;
    job.status = "collected"; // Move to collected status
    job.collectedAt = new Date();
    await job.save();

    console.log(`✓ OTP verified for job ${job._id} by user ${req.user._id}. Status changed to 'collected'`);

    // Notify via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(`job-${job._id}`).emit("jobVerified", { jobId: job._id });
      console.log(`   Socket.IO event 'jobVerified' emitted for job ${job._id}`);
    } else {
      console.warn(`⚠️  Socket.IO not available for job verification notification`);
    }

    res.json({ success: true, message: "OTP verified. Job marked as collected!", job });
  } catch (err) {
    console.error("❌ OTP verification error:", err);
    console.error("   Stack:", err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/jobs/:id/otp — For the job owner to see their OTP (after printing done)
 */
const getJobOTP = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).select("+otp");
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });

    const isOwner = job.userId.toString() === req.user._id.toString();
    if (!isOwner) return res.status(403).json({ success: false, message: "Access denied." });

    if (job.status !== "done") {
      return res.status(400).json({ success: false, message: "Prints not ready yet." });
    }

    res.json({ success: true, otp: job.otp, otpExpiry: job.otpExpiry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  upload,
  analyzeFile,
  createJob,
  getMyJobs,
  getJobById,
  verifyOTP,
  getJobOTP,
};
