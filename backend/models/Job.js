const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userRole: {
      type: String,
      enum: ["student", "staff", "admin"],
      required: true,
    },
    // File details
    fileName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number, // bytes
    },
    mimeType: {
      type: String,
    },

    // Print options
    pages: {
      type: Number,
      required: true,
      min: [1, "Pages must be at least 1"],
    },
    copies: {
      type: Number,
      default: 1,
      min: 1,
      max: 50,
    },
    color: {
      type: Boolean,
      default: false,
    },
    duplex: {
      type: Boolean,
      default: false,
    },
    paperSize: {
      type: String,
      enum: ["A4", "A3", "Letter"],
      default: "A4",
    },
    orientation: {
      type: String,
      enum: ["portrait", "landscape"],
      default: "portrait",
    },

    // Pricing
    pricePerPage: {
      type: Number,
      default: 1.0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },

    // Status flow: uploaded → paid → queued → printing → done → collected | failed
    status: {
      type: String,
      enum: ["uploaded", "paid", "queued", "printing", "done", "collected", "failed", "cancelled"],
      default: "uploaded",
    },
    statusHistory: {
      type: [
        {
          status: String,
          timestamp: { type: Date, default: Date.now },
          note: String,
        },
      ],
      default: [],
    },

    // Priority queue
    priorityScore: {
      type: Number,
      default: 0,
    },
    queuePosition: {
      type: Number,
      default: null,
    },
    queueNumber: {
      type: String,   // Human-readable: "Q-001", "Q-042"
      default: null,
    },
    queuedAt: {
      type: Date,
    },

    // Print shop assignment
    shopId: {
      type: String,
      default: "shop-001",
    },

    // OTP for pickup verification
    otp: {
      type: String,
      select: false, // hidden by default
    },
    otpExpiry: {
      type: Date,
    },
    otpVerified: {
      type: Boolean,
      default: false,
    },

    // ETA
    estimatedTime: {
      type: Number, // minutes
    },

    // Print results
    startedPrintingAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    collectedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-push to status history on status change
JobSchema.pre("save", async function () {
  if (this.isModified("status")) {
    this.statusHistory.push({ status: this.status });
  }
});

module.exports = mongoose.model("Job", JobSchema);
