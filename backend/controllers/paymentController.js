const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/Payment");
const Job = require("../models/Job");
const { addJobToQueue } = require("../queue/queueManager");

// Mock mode when using placeholder keys
const isMockMode =
  !process.env.RAZORPAY_KEY_ID ||
  process.env.RAZORPAY_KEY_ID.includes("MOCK") ||
  process.env.RAZORPAY_KEY_ID.includes("test_MOCK");

let razorpay = null;
if (!isMockMode) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/**
 * POST /api/payments/create-order
 */
const createOrder = async (req, res) => {
  try {
    const { jobId } = req.body;

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });
    if (job.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    if (job.status !== "uploaded") {
      return res.status(400).json({ success: false, message: "Job is not in payable state." });
    }

    const amountInPaise = Math.round(job.totalAmount * 100);

    let order;
    let razorpayOrderId;

    if (isMockMode) {
      // Mock order for development
      razorpayOrderId = `mock_order_${Date.now()}`;
      order = {
        id: razorpayOrderId,
        amount: amountInPaise,
        currency: "INR",
        status: "created",
      };
      console.log("⚠️  Razorpay MOCK MODE — using simulated order");
    } else {
      order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `smartprint_${jobId}`,
        notes: { jobId: jobId.toString(), userId: req.user._id.toString() },
      });
      razorpayOrderId = order.id;
    }

    // Save payment record
    const payment = await Payment.create({
      userId: req.user._id,
      jobId: job._id,
      razorpayOrderId,
      amount: job.totalAmount,
    });

    res.json({
      success: true,
      order,
      payment: { id: payment._id, amount: payment.amount },
      keyId: isMockMode ? "mock_key" : process.env.RAZORPAY_KEY_ID,
      isMockMode,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/payments/verify
 */
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, jobId } = req.body;

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment record not found." });
    }

    let isValid = false;

    if (isMockMode) {
      // In mock mode, accept any verification
      isValid = true;
      console.log("⚠️  Razorpay MOCK MODE — skipping signature verification");
    } else {
      // Real signature verification
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");
      isValid = expectedSignature === razorpay_signature;
    }

    if (!isValid) {
      payment.status = "failed";
      payment.failureReason = "Signature mismatch";
      await payment.save();
      return res.status(400).json({ success: false, message: "Payment verification failed." });
    }

    // Update payment
    payment.razorpayPaymentId = razorpay_payment_id || `mock_pay_${Date.now()}`;
    payment.razorpaySignature = razorpay_signature || "mock_signature";
    payment.status = "paid";
    payment.verifiedAt = new Date();
    await payment.save();

    // Update job status → paid → queued
    try {
      const job = await Job.findById(payment.jobId);
      if (!job) {
        console.warn(`⚠️  Job ${payment.jobId} not found for payment ${payment._id}`);
        return res.json({
          success: true,
          message: "Payment verified but job not found.",
          payment: { id: payment._id, status: payment.status },
        });
      }

      job.status = "paid";
      await job.save();
      console.log(`✓ Job ${job._id} marked as paid`);

      // Add to priority queue
      const io = req.app.get("io");
      const { position, etaMinutes } = await addJobToQueue(job, io);
      console.log(`✓ Job ${job._id} added to queue at position ${position}`);

      // Send WhatsApp notification
      await job.populate("userId", "name phone");
      if (job.userId?.phone) {
        const { sendJobQueuedNotification } = require("../services/notificationService");
        sendJobQueuedNotification(job.userId.phone, job.originalName, position, etaMinutes);
      }
      
      if (!io) {
        console.warn("⚠️  Socket.IO not available for broadcasting queue updates");
      }
    } catch (jobErr) {
      console.error(`❌ Error processing job for payment: ${jobErr.message}`);
      console.error(jobErr);
      // Don't fail payment - it was already verified. Job will be processed by admin later.
    }

    res.json({
      success: true,
      message: "Payment verified! Your job has been added to the print queue.",
      payment: { id: payment._id, status: payment.status },
    });
  } catch (err) {
    console.error("❌ Payment verification error:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/payments/my
 */
const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .populate("jobId", "originalName status totalAmount createdAt")
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createOrder, verifyPayment, getMyPayments };
