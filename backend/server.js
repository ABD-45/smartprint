const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const jobRoutes = require("./routes/job.routes");
const paymentRoutes = require("./routes/payment.routes");
const queueRoutes = require("./routes/queue.routes");
const adminRoutes = require("./routes/admin.routes");

const { initQueueManager } = require("./queue/queueManager");

const app = express();
const server = http.createServer(app);

// Socket.IO with CORS
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://smartprint.pages.dev",
    /\.smartprint\.pages\.dev$/  // Regex for subdomains
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

const io = new Server(server, {
  cors: corsOptions,
});

// Make io accessible to routes
app.set("io", io);

// Middleware
// Configure Helmet with relaxed CSP for development
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? true
        : {
            directives: {
              defaultSrc: ["'self'"],
              connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*", "wss://localhost:*"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:", "https:"],
            },
          },
  })
);
app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Explicit preflight handler for all routes
app.options("*", cors(corsOptions));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    // Init priority queue manager after DB is ready
    initQueueManager(io);

    // Socket.IO events
    io.on("connection", (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      socket.on("joinQueue", () => {
        socket.join("queue-room");
      });

      socket.on("joinJob", (jobId) => {
        socket.join(`job-${jobId}`);
      });

      // --- Print Agent Events ---
      socket.on("register_shop", ({ shopId }) => {
        socket.join(`shop-${shopId}`);
        console.log(`🖨️  Print Agent registered for shop: ${shopId} (${socket.id})`);
      });

      socket.on("job_status", async ({ jobId, status, note, reason }) => {
        console.log(`📟 Job status update from agent: ${jobId} -> ${status}`);
        const Job = require("./models/Job");
        try {
          const job = await Job.findById(jobId);
          if (job) {
            // Update internal status if needed or just broadcast
            io.to(`job-${jobId}`).emit("jobStatusUpdate", { status, note, reason });
            if (status === "failed") {
               job.status = "failed";
               job.failureReason = reason || "Agent reported failure";
               await job.save();
            }
          }
        } catch (err) {
          console.error("Error processing agent status:", err);
        }
      });

      socket.on("disconnect", () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 SmartPrint server running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = { app, io };
