# 🖨️ SmartPrint — Complete Project Workflow & Features

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [User Roles & Access Control](#user-roles--access-control)
4. [Complete Workflow](#complete-workflow)
5. [Features by Module](#features-by-module)
6. [Database Models](#database-models)
7. [API Endpoints](#api-endpoints)
8. [Real-time Features](#real-time-features)
9. [Queue System](#queue-system)
10. [Technology Stack](#technology-stack)

---

## 🎯 Project Overview

**SmartPrint** is a full-stack, production-ready college print management system that allows:
- **Students** to upload documents, pay online, and collect prints via OTP
- **Print Shop Operators** to manage a real-time priority-based queue
- **Admin** to monitor analytics, manage users, and oversee the entire system

**Key Differentiator:** Advanced priority queue system that prevents job starvation while ensuring fair scheduling.

---

## 🏗️ System Architecture

### Technology Stack

```
Frontend:
├── React 18 (JSX)
├── Vite (Build tool)
├── React Router (Navigation)
├── Socket.IO Client (Real-time updates)
├── Axios (API calls)
├── React Hot Toast (Notifications)
└── CSS (Responsive UI)

Backend:
├── Node.js (Runtime)
├── Express.js (Framework)
├── MongoDB (Database)
├── Mongoose (ODM)
├── Socket.IO (WebSocket)
├── JWT (Authentication)
├── Bcryptjs (Password hashing)
├── MinIO (File storage - S3 compatible)
├── Razorpay (Payment gateway)
└── Multer (File upload handling)

Infrastructure:
├── Docker (Containerization)
├── Docker Compose (Orchestration)
├── MongoDB Container
└── MinIO Container
```

### Project Structure

```
smartprint/
├── backend/
│   ├── controllers/
│   │   ├── authController.js       (Auth logic: register, login, profile)
│   │   ├── jobController.js        (Job management: upload, status)
│   │   ├── paymentController.js    (Payment: create order, verify)
│   │   ├── queueController.js      (Queue: get stats, diagnostics)
│   │   └── adminController.js      (Admin: analytics, user management)
│   ├── middleware/
│   │   └── auth.js                 (JWT verification, role authorization)
│   ├── models/
│   │   ├── User.js                 (Users: students, staff, admin, printshop)
│   │   ├── Job.js                  (Print jobs)
│   │   └── Payment.js              (Payment records)
│   ├── queue/
│   │   ├── queueConfig.js          (Tunable parameters)
│   │   ├── priorityCalculator.js   (Priority algorithm)
│   │   ├── priorityQueue.js        (Queue data structure)
│   │   ├── queueManager.js         (Orchestrator)
│   │   ├── queueMonitor.js         (Health & analytics)
│   │   ├── examples.js             (Usage examples)
│   │   └── QUEUE_SYSTEM.md         (Documentation)
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── job.routes.js
│   │   ├── payment.routes.js
│   │   ├── queue.routes.js
│   │   └── admin.routes.js
│   ├── services/
│   │   ├── minioService.js         (File upload/download)
│   │   ├── otpService.js           (OTP generation)
│   │   └── printService.js         (Print dispatch - CUPS integration)
│   ├── utils/
│   │   └── helpers.js              (Price calc, OTP, time estimation)
│   ├── server.js                   (Entry point)
│   ├── docker-compose.yml
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── FileUploader.jsx    (Drag-drop file upload)
│   │   │   ├── JobCard.jsx         (Job display card)
│   │   │   ├── QueueList.jsx       (Live queue display)
│   │   │   ├── StatusBadge.jsx     (Status indicator)
│   │   │   ├── PaymentButton.jsx   (Razorpay integration)
│   │   │   ├── OTPModal.jsx        (OTP input/verification)
│   │   │   └── ProtectedRoute.jsx  (Route protection)
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     (User auth state)
│   │   │   └── QueueContext.jsx    (Real-time queue via Socket.IO)
│   │   ├── hooks/
│   │   │   └── useAuth.js          (Auth hook)
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx       (Login form)
│   │   │   ├── RegisterPage.jsx    (Registration form)
│   │   │   ├── student/
│   │   │   │   ├── UploadPage.jsx  (File upload)
│   │   │   │   ├── PaymentPage.jsx (Payment processing)
│   │   │   │   └── TrackPage.jsx   (Job tracking)
│   │   │   ├── printshop/
│   │   │   │   └── PrintShopDashboard.jsx (Queue management)
│   │   │   └── admin/
│   │   │       └── AdminDashboard.jsx (Analytics, user management)
│   │   ├── services/
│   │   │   ├── authService.js      (Auth API calls)
│   │   │   ├── jobService.js       (Job API calls)
│   │   │   ├── paymentService.js   (Payment API calls)
│   │   │   └── queueService.js     (Queue API calls)
│   │   └── utils/
│   │       └── helpers.js
│   ├── vite.config.js
│   └── package.json
│
└── docker-compose.yml (MongoDB, MinIO, Backend, Frontend)
```

---

## 👥 User Roles & Access Control

### Role Hierarchy

| Role | Description | Permissions |
|------|-------------|-------------|
| **Student** (Default) | Uploads documents, makes payments | Upload jobs, pay, track, collect with OTP |
| **Staff** | Can upload like student | Same as student |
| **Admin** | Full system access | All user operations, analytics, job management, user management |
| **PrintShop** | Manages queue and printing | View queue, dispatch jobs, verify OTP, update job status |

### Access Control

```
Authentication:
- All routes require JWT token in Authorization header
- JWT contains: user ID + role
- Token expires in 7 days (configurable)

Authorization:
- Role-based middleware checks user role
- Routes specify allowed roles
- Enforced at controller level
```

---

## 🔄 Complete Workflow

### Student Print Job Lifecycle

```
1. AUTHENTICATION
   ├─ Register (email, password, name, phone, college ID)
   └─ Login (email, password → JWT token)

2. UPLOAD STAGE
   ├─ Upload file (PDF, DOC, DOCX, TXT, PNG, JPG)
   ├─ Select options:
   │  ├─ Number of pages
   │  ├─ Number of copies (1-50)
   │  ├─ Color (B&W by default)
   │  ├─ Duplex (double-sided printing)
   │  ├─ Paper size (A4, A3, Letter)
   │  └─ Orientation (portrait, landscape)
   ├─ File uploaded to MinIO (S3-compatible storage)
   ├─ Price calculated: pricePerPage × pages × copies × discounts
   ├─ Job created in DB with status: "uploaded"
   └─ Job stored: ❌ NOT in queue yet

3. PAYMENT STAGE
   ├─ Razorpay order created (with mock mode support)
   ├─ Student completes payment
   ├─ Signature verified (HMAC validation)
   ├─ Job status: "uploaded" → "paid"
   ├─ Job ADDED to priority queue ✅
   └─ Payment record stored with status: "paid"

4. QUEUE STAGE (Automatic)
   ├─ Job enters in-memory priority queue
   ├─ Priority score calculated based on:
   │  ├─ Role (Admin: +100, Staff: +60, Student: +0)
   │  ├─ Job size (smaller jobs get priority)
   │  ├─ Wait time (aging bonus increases over time)
   │  └─ Payment status (paid jobs get +15 bonus)
   ├─ Real-time Socket.IO update sent to all clients
   ├─ Job status: "paid" → "queued"
   ├─ Queue position calculated and stored
   └─ PrintShop sees job in live queue

5. PRINTING STAGE
   ├─ PrintShop operator views live queue
   ├─ Clicks "Start Printing" on next job
   ├─ Job dispatched to CUPS (printer system)
   ├─ Job status: "queued" → "printing"
   ├─ Real-time update broadcasted
   └─ Estimated time calculated

6. COMPLETION & PICKUP
   ├─ When printing done:
   │  ├─ Job status: "printing" → "done"
   │  ├─ OTP generated (6-digit, time-limited, e.g., 30 min)
   │  ├─ OTP sent to student
   │  └─ Real-time notification
   │
   ├─ Student arrives at counter with OTP
   ├─ PrintShop scans/enters OTP in system
   ├─ OTP verified (time check + digit match)
   ├─ Job status: "done" → "collected"
   └─ Prints handed over ✅ COMPLETE

7. OPTIONAL: CANCELLATION
   ├─ Student can cancel before payment
   ├─ Job status: "uploaded" → "cancelled"
   ├─ Or: Before printing starts
   │  ├─ Job removed from queue
   │  └─ Refund can be processed
   └─ Or: After failure
       ├─ Job status: "queued" → "failed"
       └─ Admin can investigate

### Admin Dashboard Flow

```
1. View Analytics Dashboard
   ├─ Total jobs count (all-time)
   ├─ Today's jobs count
   ├─ Completed jobs count
   ├─ Total revenue (all paid payments)
   ├─ Today's revenue
   ├─ Users by role breakdown
   ├─ Job status breakdown
   ├─ Peak hours analysis (last 7 days)
   └─ Most active users

2. Manage Jobs
   ├─ View all jobs with filtering:
   │  ├─ By status (uploaded, paid, queued, printing, done, etc.)
   │  ├─ By page number (pagination)
   │  └─ By shop ID
   ├─ Update job status manually
   └─ Download/view file from MinIO

3. Manage Users
   ├─ View all users
   ├─ Filter by role
   ├─ View user details
   ├─ Deactivate users
   └─ Update user profile

4. Monitor Queue Health
   ├─ View live queue with priority scores
   ├─ Check diagnostics (avg wait time, queue length, starvation alerts)
   ├─ View monitoring reports
   └─ Get recommendations for optimization
```

### PrintShop Operator Flow

```
1. Login (as printshop role)

2. View Live Queue
   ├─ Real-time list of jobs in priority order
   ├─ Each job shows:
   │  ├─ Queue position (Q-001, Q-002, etc.)
   │  ├─ Student name
   │  ├─ Pages & copies
   │  ├─ Color/duplex settings
   │  ├─ Priority score
   │  ├─ Estimated wait time
   │  └─ Job ID
   ├─ Socket.IO broadcasts any queue changes instantly
   └─ Updates every time a new job enters or one completes

3. Dispatch Job
   ├─ Click "Start Printing" on top job
   ├─ Job status: "queued" → "printing"
   ├─ Print dispatched to CUPS
   ├─ File downloaded from MinIO
   └─ Real-time update sent to students

4. Mark Completion
   ├─ When printing done, click "Mark Complete"
   ├─ Job status: "printing" → "done"
   ├─ 6-digit OTP generated
   ├─ OTP sent/displayed
   └─ Real-time notification sent

5. Verify Pickup
   ├─ Student arrives with OTP
   ├─ Scan/enter OTP in system
   ├─ OTP verified (timestamp + digits)
   ├─ Job status: "done" → "collected"
   ├─ Success confirmation shown
   └─ Prints handed over
```

---

## 🔧 Features by Module

### 1. Authentication Module
**Location:** `backend/controllers/authController.js`, `backend/routes/auth.routes.js`

```
Endpoints:
├─ POST /api/auth/register
│  └─ Input: name, email, phone, password, role (optional), collegeId
│  └─ Output: JWT token + user object
│  └─ Features:
│     ├─ Email validation & uniqueness check
│     ├─ Password hashing (bcryptjs, salt rounds 12)
│     ├─ Role assignment (default: student)
│     └─ College ID storage for student tracking
│
├─ POST /api/auth/login
│  └─ Input: email, password
│  └─ Output: JWT token + user object
│  └─ Features:
│     ├─ Email lookup
│     ├─ Password comparison
│     ├─ User active status check
│     ├─ Last login timestamp update
│     └─ Token generation (7d expiry)
│
├─ GET /api/auth/me
│  └─ Protected route (requires JWT)
│  └─ Output: Current user object
│  └─ Features: User profile info
│
└─ PUT /api/auth/profile
   └─ Protected route
   └─ Input: Updatable fields (name, phone, etc.)
   └─ Output: Updated user object
   └─ Features: Profile customization
```

### 2. File Upload & Job Management Module
**Location:** `backend/controllers/jobController.js`, `backend/routes/job.routes.js`

```
Endpoints:
├─ POST /api/jobs/upload
│  └─ Protected route (authenticated users only)
│  └─ Input: File + print options (pages, copies, color, duplex, etc.)
│  └─ Output: Job object with ID and pricing
│  └─ Features:
│     ├─ Multer file handling (in-memory storage)
│     ├─ File validation (50 MB limit)
│     ├─ Supported formats: PDF, DOC, DOCX, TXT, PNG, JPG
│     ├─ MinIO S3 upload (presigned URL)
│     ├─ Automatic price calculation
│     ├─ Job record creation in MongoDB
│     ├─ Status: "uploaded" (not in queue yet)
│     └─ UUID for unique file naming
│
├─ GET /api/jobs/my
│  └─ Protected route (job owner only)
│  └─ Output: Array of user's jobs (sorted by newest first)
│  └─ Features:
│     ├─ User-specific filtering
│     ├─ Full job history
│     └─ Status tracking
│
├─ GET /api/jobs/:id
│  └─ Protected route (owner, admin, printshop)
│  └─ Output: Single job details with user info
│  └─ Features:
│     ├─ Job details with user reference
│     ├─ File metadata
│     ├─ Print settings
│     ├─ Pricing information
│     └─ Current status
│
├─ GET /api/jobs/:id/otp
│  └─ Protected route (job owner only)
│  └─ Output: OTP details (if job completed)
│  └─ Features:
│     ├─ OTP retrieval for ready jobs
│     ├─ Time-limited validation
│     └─ Expiration check
│
└─ POST /api/jobs/:id/verify-otp
   └─ Protected route (any authenticated user)
   └─ Input: Job ID, OTP digits
   └─ Output: Verification result
   └─ Features:
      ├─ OTP validation
      ├─ Time limit check (e.g., 30 min)
      ├─ Status update: "done" → "collected"
      ├─ Completion logging
      └─ Real-time broadcast
```

### 3. Payment Module (Razorpay Integration)
**Location:** `backend/controllers/paymentController.js`, `backend/routes/payment.routes.js`

```
Endpoints:
├─ POST /api/payments/create-order
│  └─ Protected route (job owner)
│  └─ Input: Job ID
│  └─ Output: Razorpay order object + key ID
│  └─ Features:
│     ├─ Job validation (status: "uploaded")
│     ├─ Amount calculation (in paise)
│     ├─ Razorpay order creation
│     ├─ Mock mode support (development)
│     ├─ Payment record creation (status: "created")
│     ├─ Receipt tracking
│     └─ Notes with job/user IDs
│
├─ POST /api/payments/verify
│  └─ Protected route (job owner)
│  └─ Input: razorpay_order_id, razorpay_payment_id, razorpay_signature
│  └─ Output: Verification result + job status update
│  └─ Features:
│     ├─ Payment record lookup
│     ├─ HMAC signature verification
│     ├─ Mock mode support
│     ├─ Job status: "uploaded" → "paid"
│     ├─ Add job to priority queue
│     ├─ Payment status: "created" → "paid"
│     ├─ Real-time queue broadcast
│     └─ Success notification
│
└─ GET /api/payments/my
   └─ Protected route (job owner)
   └─ Output: Array of user's payment records
   └─ Features:
      ├─ Payment history
      ├─ Status tracking
      ├─ Amount verification
      └─ Timestamp info
```

### 4. Priority Queue Module
**Location:** `backend/queue/*`

```
Key Features:
├─ In-memory priority queue (not database)
├─ Efficient data structure (O(n log n) operations)
├─ Real-time Socket.IO broadcasting
├─ Automatic persistence to MongoDB (optional)
├─ Multi-factor priority algorithm

Priority Calculation (per job):
├─ Role Bonus (0-100)
│  ├─ Admin: +100
│  ├─ Staff: +60
│  └─ Student: +0
│
├─ Size Bonus (1-50)
│  └─ Formula: 100 / (pages × copies), capped at 50
│  └─ Example: 1-page job gets +50, 100-page gets +1
│
├─ Aging Bonus (0-200)
│  ├─ 0-30 min: waiting_minutes × 0.5
│  ├─ 30-120 min: (30 × 0.5) + (excess_minutes × 0.75)
│  └─ 120+ min: 200 (guaranteed processing)
│
└─ Payment Bonus (+15)
   └─ Paid jobs get slight priority boost

Starvation Prevention:
├─ Small jobs: High size bonus prevents getting stuck behind large jobs
└─ Large jobs: Aging bonus grows exponentially, guaranteed priority after 2 hours

Queue Operations:
├─ addJobToQueue(job) — Add job, calculate position
├─ removeFromQueue(jobId) — Remove completed job
├─ getNextJob() — Peek at highest priority job
├─ getQueue() — Get full queue snapshot
└─ broadcastQueue() — Socket.IO emit to all clients
```

### 5. Queue Monitoring & Diagnostics
**Location:** `backend/controllers/queueController.js`

```
Endpoints:
├─ GET /api/queue/
│  └─ Output: Live queue with all jobs + priority scores
│  └─ Features: Real-time queue state
│
├─ GET /api/queue/stats
│  └─ Output: Queue statistics
│  └─ Includes:
│     ├─ Queue length
│     ├─ Average wait time
│     ├─ Min/max priority scores
│     ├─ Jobs per role
│     ├─ Estimated processing time
│     └─ Starvation alerts (jobs > 45 min)
│
├─ GET /api/queue/position/:jobId
│  └─ Output: Specific job's position and priority
│  └─ Features:
│     ├─ Exact position number
│     ├─ Priority score breakdown
│     ├─ Estimated wait time
│     └─ Job details
│
├─ GET /api/queue/diagnostics
│  └─ Admin/Staff only
│  └─ Output: Health diagnostics
│  └─ Includes:
│     ├─ Queue health status
│     ├─ Performance metrics
│     ├─ Starving jobs (waiting > 45 min)
│     ├─ Recommendations
│     └─ Alert generation
│
├─ GET /api/queue/role/:role
│  └─ Output: Jobs filtered by user role
│
└─ GET /api/queue/report
   └─ Output: Monitoring report
   └─ Includes:
      ├─ Historical queue data
      ├─ Performance trends
      ├─ Optimization suggestions
      └─ SLA compliance metrics
```

### 6. Admin Management Module
**Location:** `backend/controllers/adminController.js`, `backend/routes/admin.routes.js`

```
Endpoints:
├─ GET /api/admin/jobs
│  └─ Admin/PrintShop only
│  └─ Output: All jobs with pagination + filtering
│  └─ Features:
│     ├─ Filter by status, page, limit, shopId
│     ├─ Sorting: queue priority (for active jobs) vs creation date
│     ├─ Pagination support
│     └─ User population (name, email, role, phone)
│
├─ GET /api/admin/analytics
│  └─ Admin only
│  └─ Output: Comprehensive dashboard analytics
│  └─ Includes:
│     ├─ Total jobs (all-time)
│     ├─ Today's jobs count
│     ├─ Completed jobs count
│     ├─ Total revenue (from paid payments)
│     ├─ Today's revenue
│     ├─ Users by role (breakdown)
│     ├─ Job status breakdown
│     ├─ Peak hours analysis (last 7 days)
│     └─ Most active users
│
├─ GET /api/admin/users
│  └─ Admin only
│  └─ Output: All users with optional filters
│  └─ Features:
│     ├─ User listing
│     ├─ Role filtering
│     ├─ Activity tracking
│     └─ Last login info
│
└─ PATCH /api/admin/jobs/:id/status
   └─ Admin/PrintShop only
   └─ Input: New status
   └─ Output: Updated job
   └─ Features:
      ├─ Manual status updates
      ├─ Queue management
      ├─ Real-time broadcast
      └─ Validation checks
```

### 7. Real-time Updates (Socket.IO)
**Location:** Server setup in `backend/server.js`, Frontend `context/QueueContext.jsx`

```
Real-time Events:
├─ queue:update
│  └─ Emitted when job enters/leaves queue
│  └─ Data: Full queue state
│  └─ Listeners: All connected clients
│
├─ job:status-change
│  └─ Emitted when job status changes
│  └─ Data: Job ID + new status
│  └─ Listeners: Relevant users (owner, admin, printshop)
│
├─ queue:stats
│  └─ Emitted periodically with queue statistics
│  └─ Data: Stats object
│  └─ Listeners: Dashboard clients
│
└─ alert:starvation
   └─ Emitted when job waits > 45 minutes
   └─ Data: Job details
   └─ Listeners: Admin/PrintShop staff
```

---

## 💾 Database Models

### User Schema
```javascript
{
  name: String (required),
  email: String (unique, required),
  phone: String (Indian format validation),
  password: String (bcrypt hashed, min 6 chars),
  role: "student" | "staff" | "admin" | "printshop",
  shopId: String (for printshop users),
  collegeId: String (for student tracking),
  isActive: Boolean (default: true),
  lastLogin: Date,
  timestamps: {createdAt, updatedAt}
}
```

### Job Schema
```javascript
{
  userId: ObjectId (ref: User),
  userRole: "student" | "staff" | "admin",
  
  // File info
  fileName: String (UUID-based),
  originalName: String,
  fileUrl: String (MinIO presigned URL),
  fileSize: Number (bytes),
  mimeType: String,
  
  // Print options
  pages: Number (min: 1),
  copies: Number (1-50),
  color: Boolean (default: false),
  duplex: Boolean (default: false),
  paperSize: "A4" | "A3" | "Letter",
  orientation: "portrait" | "landscape",
  
  // Pricing
  pricePerPage: Number,
  totalAmount: Number,
  
  // Status workflow
  status: "uploaded" | "paid" | "queued" | "printing" | "done" | "collected" | "failed" | "cancelled",
  queuePosition: Number (position in queue),
  estimatedTime: Number (minutes),
  
  // OTP & Pickup
  otp: String (6 digits, time-limited),
  otpGeneratedAt: Date,
  otpExpiresAt: Date,
  
  timestamps: {createdAt, updatedAt}
}
```

### Payment Schema
```javascript
{
  userId: ObjectId (ref: User),
  jobId: ObjectId (ref: Job),
  
  // Razorpay integration
  razorpayOrderId: String (unique),
  razorpayPaymentId: String,
  razorpaySignature: String,
  
  // Payment details
  amount: Number (in INR),
  currency: String (default: "INR"),
  
  // Status workflow
  status: "created" | "paid" | "failed" | "refunded",
  verifiedAt: Date (when signature verified),
  failureReason: String (if failed),
  
  timestamps: {createdAt, updatedAt}
}
```

---

## 📡 API Endpoints Summary

### Authentication
```
POST   /api/auth/register          — Register new user
POST   /api/auth/login             — Login user
GET    /api/auth/me                — Get current user
PUT    /api/auth/profile           — Update profile
```

### Jobs
```
POST   /api/jobs/upload            — Upload print job
GET    /api/jobs/my                — Get my jobs
GET    /api/jobs/:id               — Get job details
GET    /api/jobs/:id/otp           — Get OTP for pickup
POST   /api/jobs/:id/verify-otp    — Verify OTP for pickup
```

### Payments
```
POST   /api/payments/create-order  — Create Razorpay order
POST   /api/payments/verify        — Verify payment signature
GET    /api/payments/my            — Get payment history
```

### Queue
```
GET    /api/queue/                 — Get live queue
GET    /api/queue/stats            — Get queue statistics
GET    /api/queue/position/:jobId  — Get job position
GET    /api/queue/diagnostics      — Get queue health (Admin)
GET    /api/queue/role/:role       — Filter by role
GET    /api/queue/report           — Get monitoring report (Admin)
```

### Admin
```
GET    /api/admin/jobs             — Get all jobs (Admin/PrintShop)
GET    /api/admin/analytics        — Get dashboard analytics (Admin)
GET    /api/admin/users            — Get all users (Admin)
PATCH  /api/admin/jobs/:id/status  — Update job status (Admin/PrintShop)
```

---

## 🔌 Real-time Features

### Socket.IO Implementation

**Server Setup:**
```javascript
// HTTP server with Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", credentials: true }
});
```

**Broadcasting Queue Changes:**
```
When:
├─ Job payment verified → Added to queue
├─ Job status changes (queued → printing → done)
├─ OTP generated for pickup
└─ Queue reordered due to new job

Then:
└─ io.emit('queue:update', currentQueue)
   Sends to all connected clients in real-time
```

**Frontend Subscription (React):**
```javascript
// QueueContext.jsx
useEffect(() => {
  socket.on('queue:update', (queue) => {
    setQueue(queue);  // Update state instantly
  });
  
  socket.on('job:status-change', (job) => {
    // Update specific job in UI
  });
}, []);
```

**Live Features:**
```
✓ Queue position updates instantly as jobs complete
✓ New jobs appear in real-time without page refresh
✓ Status changes (printing → done) broadcast immediately
✓ Print shop sees queue reordering as priorities change
✓ Students see job status updates in real-time
✓ Starvation alerts sent to admin instantly
```

---

## 🚀 Queue System - Advanced Details

### Priority Score Example

**Scenario:** 3 jobs in queue at same timestamp

| Job | Role | Pages | Wait (min) | Score | Position |
|-----|------|-------|-----------|-------|----------|
| A | Student | 1 | 5 | 0 + 50 + 2.5 + 15 = 67.5 | 2 |
| B | Staff | 50 | 10 | 60 + 2 + 5 + 15 = 82 | 1 |
| C | Student | 100 | 2 | 0 + 1 + 1 + 15 = 17 | 3 |

**Result:** Job B prints first (highest priority), then A, then C

**After 40 minutes:**
| Job | Score | Position | Reason |
|-----|-------|----------|--------|
| A | 0 + 50 + 20 + 15 = 85 | 1 | Aging bonus increased |
| B | 60 + 2 + 20 + 15 = 97 | (completed) | Already printed |
| C | 0 + 1 + 20 + 15 = 36 | 2 | Still behind A |

**After 2+ hours:**
| Job | Score | Position | Reason |
|-----|-------|----------|--------|
| C | 0 + 1 + 200 + 15 = 216 | 1 | Max aging guarantee |

→ Job C now has highest priority (guaranteed processing)

### Starvation Prevention Mechanism

```
Timeline for large job (100 pages):
├─ 0-30 min: Wait + low size bonus + role bonus = May wait
├─ 30-60 min: Aging accelerates (1.5x multiplier)
├─ 60-120 min: Approaching max aging
└─ 120+ min: MAX_AGING_BONUS (200) awarded → GUARANTEED priority

Result: No job can wait indefinitely
```

---

## 📊 Analytics Dashboard Features

### Real-time Metrics
```
Revenue Dashboard:
├─ Total revenue (all-time, today)
├─ Average revenue per job
├─ Revenue trend (last 7 days)
└─ Revenue by user/role

Job Analytics:
├─ Total jobs, completed jobs, pending jobs
├─ Job status breakdown
├─ Average job size (pages)
├─ Most printed file types
└─ Job completion rate

User Analytics:
├─ Total users by role
├─ New users (today, this week)
├─ Most active users
├─ User registration trend
└─ Active vs inactive users

Queue Analytics:
├─ Average queue length
├─ Average wait time
├─ Peak hours identification
├─ Queue efficiency score
└─ Starvation incidents
```

---

## 🔐 Security Features

### Authentication & Authorization
```
✓ JWT tokens (7 day expiry)
✓ Bcrypt password hashing (12 salt rounds)
✓ Role-based access control (RBAC)
✓ Protected routes with middleware
✓ Helmet for security headers
✓ CORS configured
✓ Input validation
✓ Email uniqueness enforcement
```

### Payment Security
```
✓ Razorpay HMAC signature verification
✓ Amount validation
✓ Order ID matching
✓ Timestamp validation
✓ Payment status tracking
✓ Failed payment logging
```

### File Security
```
✓ File size limit (50 MB)
✓ File type validation
✓ MinIO presigned URLs (time-limited access)
✓ UUID file naming (no predictable paths)
✓ Access control (owner/admin/printshop only)
```

---

## 🚀 Deployment Information

### Docker Compose Setup
```bash
# Starts:
├─ MongoDB container (database)
├─ MinIO container (file storage)
├─ Backend container (Node.js + Express)
└─ Frontend container (React + Vite)

# Networks: Backend connected to MongoDB + MinIO
# Volumes: MongoDB persistence, MinIO data
# Ports: 3000 (backend), 5173 (frontend), 9000 (MinIO)
```

### Environment Variables Required
```
# Backend (.env)
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/smartprint
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

RAZORPAY_KEY_ID=test_MOCK_key
RAZORPAY_KEY_SECRET=test_MOCK_secret

CLIENT_URL=http://localhost:5173
```

---

## 🎯 Key Project Highlights

✅ **Full-Stack Implementation** — React frontend + Node.js backend
✅ **Real-time Updates** — Socket.IO for instant notifications
✅ **Smart Queue System** — Multi-factor priority algorithm with starvation prevention
✅ **Payment Integration** — Razorpay with mock mode support
✅ **File Management** — MinIO S3-compatible storage
✅ **Role-Based Access** — 4 user roles with different permissions
✅ **OTP Verification** — Time-limited 6-digit codes for pickup
✅ **Analytics Dashboard** — Comprehensive admin insights
✅ **Docker Ready** — Full containerization with docker-compose
✅ **Production Standards** — Security headers, validation, error handling

---

## 📝 Summary

SmartPrint is a **comprehensive college print management system** that handles the complete workflow from document upload to final print collection. The system's key differentiator is its **intelligent priority queue** that ensures fair scheduling while preventing any job from waiting indefinitely.

**For Students:** Simple upload → pay → track → collect flow
**For PrintShop:** Real-time queue management with smart prioritization
**For Admin:** Full analytics and system oversight

All components communicate in real-time via Socket.IO, creating a seamless experience across all user roles.
