# 🖨️ SmartPrint — Complete Tech Stack & File Structure

## 📋 Executive Overview

**SmartPrint** is a full-stack college print management system with:
- **Backend**: Node.js + Express (Real-time queue with priority scoring)
- **Frontend**: React + Vite (Modern SPA with Socket.IO)
- **Database**: MongoDB (Mongoose ODM)
- **Object Storage**: MinIO (S3-compatible)
- **Payments**: Razorpay integration
- **Notifications**: Twilio (SMS/WhatsApp), OTP service
- **Print Agent**: Windows service for local printer integration
- **Orchestration**: Docker Compose
- **Real-time**: Socket.IO bidirectional events

---

## 🗂️ Root Directory Structure

```
smartprint/
├── backend/                          # Node.js Express server
├── frontend/                         # React + Vite SPA
├── print-agent/                      # Windows print service agent
├── scratch/                          # Development experiments
├── stitch_smartprint_management_system/  # UI mockups/prototypes
├── docker-compose.yml                # Full stack orchestration
├── package.json                      # Root dependencies
├── README.md                         # Quick start guide
├── ARCHITECTURE_DIAGRAMS.md          # System architecture
├── PROJECT_WORKFLOW_AND_FEATURES.md  # Feature documentation
├── QUICK_REFERENCE.md                # Command reference
├── test-upload.js                    # File upload testing
└── test.txt                          # Placeholder test file
```

---

# 🎯 BACKEND DIRECTORY — `/backend`

## 📦 Dependencies (package.json)

### Core Framework & Server
| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.2.1 | HTTP REST API framework |
| `socket.io` | ^4.8.3 | Real-time bidirectional communication |
| `http` | built-in | HTTP server (Node.js native) |

### Database & ODM
| Package | Version | Purpose |
|---------|---------|---------|
| `mongoose` | ^9.4.1 | MongoDB ODM with schema validation |

### Authentication & Security
| Package | Version | Purpose |
|---------|---------|---------|
| `jsonwebtoken` | ^9.0.3 | JWT token generation & verification |
| `bcryptjs` | ^3.0.3 | Password hashing (bcrypt algorithm) |
| `helmet` | ^8.1.0 | HTTP security headers |
| `cors` | ^2.8.6 | Cross-origin resource sharing |

### File Handling & Storage
| Package | Version | Purpose |
|---------|---------|---------|
| `multer` | ^2.1.1 | File upload middleware |
| `minio` | ^8.0.7 | MinIO S3-compatible client |
| `adm-zip` | ^0.5.17 | ZIP file creation/extraction |

### Document Processing
| Package | Version | Purpose |
|---------|---------|---------|
| `pdf-lib` | ^1.17.1 | PDF manipulation (read/write/modify) |
| `pdf-parse` | ^2.4.5 | PDF text extraction & parsing |
| `mammoth` | ^1.12.0 | DOCX to HTML conversion |

### Payment & Notification
| Package | Version | Purpose |
|---------|---------|---------|
| `razorpay` | ^2.9.6 | Razorpay payment gateway |
| `twilio` | ^6.0.0 | SMS & WhatsApp notifications |

### Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| `dotenv` | ^17.4.2 | Environment variable management |
| `morgan` | ^1.10.1 | HTTP request logging |
| `uuid` | ^13.0.0 | UUID generation for unique IDs |
| `crypto` | ^1.0.1 | Cryptographic utilities |

### Development
| Package | Version | Purpose |
|---------|---------|---------|
| `nodemon` | ^3.1.14 | Auto-restart server on file changes |

---

## 📁 Backend Structure

### 1. **controllers/** — Route Handlers

```
controllers/
├── authController.js         # Register, login, logout, JWT refresh
├── jobController.js          # Create/read/update job records
├── paymentController.js      # Payment orders, verification, history
├── queueController.js        # Queue status, metrics, admin ops
└── adminController.js        # Analytics, user management, revenue stats
```

**Key Controllers:**
- **authController.js**: JWT-based auth, password reset, profile updates
- **jobController.js**: File upload, job status tracking, document parsing
- **paymentController.js**: Razorpay order creation, HMAC verification, webhooks
- **queueController.js**: Real-time queue state, position tracking
- **adminController.js**: Revenue analytics, user stats, job metrics

---

### 2. **middleware/** — Express Middleware

```
middleware/
└── auth.js                   # JWT verification, role-based access control (RBAC)
```

**Features:**
- Extract & verify JWT from headers
- Check user roles (student, printshop, admin)
- Attach decoded user to `req.user`
- Role-based route protection

---

### 3. **models/** — MongoDB Schemas

```
models/
├── User.js                   # Student/Printshop/Admin user schema
├── Job.js                    # Print job document schema
└── Payment.js                # Payment transaction schema
```

#### **User.js** Schema
```javascript
{
  name: String,
  email: String (unique),
  phone: String,
  password: String (hashed),
  role: Enum ["student", "printshop", "admin"],
  department: String,
  college: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### **Job.js** Schema
```javascript
{
  userId: ObjectId (ref: User),
  fileName: String,
  fileSize: Number,
  fileType: String (pdf, docx, image),
  pageCount: Number,
  minioPath: String (S3 path),
  status: Enum ["pending", "processing", "ready", "pickup", "completed", "failed"],
  cost: Number (pages × pricePerPage),
  priority: Number (calculated by queue system),
  copies: Number,
  colorType: String (b&w, color),
  createdAt: Date,
  estimatedReadyTime: Date,
  completedAt: Date
}
```

#### **Payment.js** Schema
```javascript
{
  userId: ObjectId (ref: User),
  jobId: ObjectId (ref: Job),
  amount: Number,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  status: Enum ["pending", "completed", "failed"],
  createdAt: Date,
  verifiedAt: Date
}
```

---

### 4. **queue/** — Priority Queue System

```
queue/
├── priorityQueue.js          # Core queue data structure (sorted array)
├── priorityCalculator.js     # Priority scoring algorithm
├── queueManager.js           # Queue lifecycle & state management
├── queueMonitor.js           # Real-time monitoring & alerts
├── queueConfig.js            # Configuration constants
├── examples.js               # Usage examples & test cases
├── README.md                 # Queue system documentation
└── QUICK_REFERENCE.md        # API reference
```

#### **priorityQueue.js** — Data Structure
- **Engine**: Sorted array (O(n log n) refresh, O(n) enqueue)
- **Deduplication**: Auto-removes old entries for same job
- **Lookup**: O(1) via internal jobMap
- **Methods**: `enqueue()`, `dequeue()`, `peek()`, `getAll()`, `search()`

#### **priorityCalculator.js** — Scoring Formula
```
Priority = BasePriority + RoleBonus + PageCountFactor + AgeBonus
         + (isStarving ? StarvingBonus : 0)

BasePriority = baseScore (default: 100)
RoleBonus = 50 (students) | 100 (printshop staff)
PageCountFactor = Math.sqrt(pageCount) × 5
AgeBonus = ageInMinutes × agingFactor (prevent starvation)
StarvingBonus = 200 (if waiting >30 min)
```

#### **queueManager.js** — Lifecycle
- Initialize queue on server startup
- Load pending jobs from MongoDB
- Monitor job status changes (Socket.IO events)
- Broadcast queue updates every 5s
- Handle job completion & OTP generation

#### **queueMonitor.js** — Alerts & Metrics
- Track average wait time
- Detect queue congestion
- Monitor job failure rates
- Alert admin on anomalies

#### **queueConfig.js** — Constants
```javascript
{
  AGING_FACTOR: 0.5,           // Priority increase per minute
  BASE_SCORE: 100,             // Starting priority
  STARVATION_THRESHOLD: 30,    // Minutes before boosting
  STARVATION_BONUS: 200,       // Priority boost when starving
  UPDATE_INTERVAL: 5000,       // Refresh interval (ms)
  MAX_QUEUE_SIZE: 500          // Hard limit
}
```

---

### 5. **routes/** — Express Route Definitions

```
routes/
├── auth.routes.js            # POST /api/auth/register, /login, /me
├── job.routes.js             # POST/GET jobs, /upload, /:id/status
├── payment.routes.js         # POST /orders, /verify, /history
├── queue.routes.js           # GET /queue, /metrics, /position/:jobId
└── admin.routes.js           # GET /analytics, /users, /jobs
```

**Route Patterns:**
- All routes prefixed with `/api`
- JWT auth on protected routes (auth middleware)
- Role checks for admin/printshop routes

---

### 6. **services/** — Business Logic

```
services/
├── minioService.js           # Upload, download, delete files from MinIO
├── otpService.js             # Generate, verify 6-digit OTP (time-limited)
├── notificationService.js    # Email, SMS notifications
├── whatsappService.js        # WhatsApp messages via Twilio
└── printService.js           # CUPS integration (local printer dispatch)
```

#### **minioService.js**
```javascript
{
  uploadFile(file, jobId),           // Upload to MinIO bucket
  getDownloadUrl(filePath, ttl),     // Generate signed download URL
  deleteFile(filePath),              // Delete file from bucket
  initBucket()                       // Create bucket on startup
}
```

#### **otpService.js**
```javascript
{
  generateOTP(),                     // Generate 6-digit code
  storeOTP(jobId, otp, ttl=10min),   // Store in-memory with expiry
  verifyOTP(jobId, userOTP),         // Verify & consume OTP
  cleanupExpired()                   // Auto-cleanup old OTPs
}
```

#### **notificationService.js**
```javascript
{
  sendEmail(email, subject, body),
  sendSMS(phone, message),
  notifyJobReady(job),
  notifyPaymentConfirmed(payment)
}
```

#### **whatsappService.js**
```javascript
{
  sendWhatsAppMessage(phone, templateId, variables),
  notifyJobStatusChange(job)
}
```

#### **printService.js**
```javascript
{
  printDocument(filePath, copies, colorMode),
  dispatchToPrinter(jobId),
  getPrinterList(),
  checkPrinterStatus()
}
```

---

### 7. **utils/** — Helper Functions

```
utils/
├── helpers.js                # Common utilities (date, formatting, etc.)
└── pageDetector.js           # Extract page count from PDF/DOCX
```

#### **helpers.js**
```javascript
{
  generateJobId(),
  formatPrice(amount),
  parsePhoneNumber(phone),
  calculateEstimatedTime(pageCount),
  getStatusLabel(status)
}
```

#### **pageDetector.js**
```javascript
{
  detectPageCount(buffer, fileType),  // PDF, DOCX, images
  validateFileType(mimeType),
  estimateFileSizeFromPages(pageCount)
}
```

---

### 8. **Root Files**

```
backend/
├── server.js                 # Express app setup, routes, Socket.IO initialization
├── .env.example              # Environment template
├── Dockerfile                # Docker image (Node 20-alpine)
├── package.json              # Dependencies & scripts
├── package-lock.json         # Dependency lock file
└── scripts/
    └── cleandb.js            # Database cleanup utility
```

#### **server.js** — Initialization
```javascript
// Key setup steps:
1. Load environment variables (dotenv)
2. Create Express app
3. Set up middleware (helmet, cors, morgan)
4. Create HTTP server (for Socket.IO)
5. Configure Socket.IO with CORS
6. Connect to MongoDB
7. Initialize queue manager & MinIO
8. Register routes (auth, job, payment, queue, admin)
9. Start server on PORT (default 5000)
```

#### **Dockerfile**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev          # Production deps only
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

---

# 🎨 FRONTEND DIRECTORY — `/frontend`

## 📦 Dependencies (package.json)

### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.4 | UI library (components, hooks, JSX) |
| `react-dom` | ^19.2.4 | React DOM renderer |
| `vite` | ^8.0.4 | Lightning-fast build tool & dev server |

### Routing & State
| Package | Version | Purpose |
|---------|---------|---------|
| `react-router-dom` | ^7.14.1 | Client-side routing (pages) |
| Context API | native | State management (AuthContext, QueueContext) |

### HTTP & Real-time
| Package | Version | Purpose |
|---------|---------|---------|
| `axios` | ^1.15.0 | HTTP client (REST API calls) |
| `socket.io-client` | ^4.8.3 | Real-time WebSocket communication |

### UI Components & UX
| Package | Version | Purpose |
|---------|---------|---------|
| `react-dropzone` | ^15.0.0 | Drag-and-drop file upload |
| `react-hot-toast` | ^2.6.0 | Toast notifications (alerts, success, error) |

### Development
| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^8.0.4 | Build tool & dev server |
| `@vitejs/plugin-react` | ^6.0.1 | Vite React plugin (JSX support) |
| `eslint` | ^9.39.4 | Code linting & style checking |
| `@eslint/js` | ^9.39.4 | ESLint JavaScript config |
| `eslint-plugin-react-hooks` | ^7.0.1 | ESLint rules for React hooks |
| `eslint-plugin-react-refresh` | ^0.5.2 | ESLint rules for Vite refresh |
| `globals` | ^17.4.0 | Global variable definitions |
| TypeScript types | - | Type hints for React & React DOM |

---

## 📁 Frontend Structure

### 1. **components/** — Reusable React Components

```
components/
├── FileUploader.jsx          # Drag-and-drop upload interface
├── JobCard.jsx               # Individual job card display
├── Navbar.jsx                # Top navigation bar
├── OTPModal.jsx              # 6-digit OTP verification modal
├── PaymentButton.jsx         # Razorpay payment trigger
├── ProtectedRoute.jsx        # Route guard (authentication check)
├── QueueList.jsx             # Real-time queue view
├── Sidebar.jsx               # Navigation sidebar
├── StatusBadge.jsx           # Job status indicator
└── ThemeSwitcher.jsx         # Dark/light mode toggle
```

#### **FileUploader.jsx**
- React-dropzone for drag-and-drop
- File validation (type, size)
- Progress bar upload indicator
- Axios multipart form data

#### **JobCard.jsx**
- Display job details (file, pages, cost)
- Status badge with color coding
- Action buttons (view, cancel, download)
- Real-time updates via Socket.IO

#### **Navbar.jsx**
- Logo & branding
- User profile menu
- Logout button
- Role-based menu items

#### **OTPModal.jsx**
- 6-digit input fields
- Real-time validation
- Time countdown (10 min)
- Verify button

#### **PaymentButton.jsx**
- Razorpay integration
- One-click checkout
- Payment status callback

#### **ProtectedRoute.jsx**
- Check authentication token
- Redirect to login if unauthorized
- Role-based access

#### **QueueList.jsx**
- Real-time queue updates (Socket.IO)
- Position tracking
- Estimated wait time
- Sorting/filtering options

#### **Sidebar.jsx**
- Navigation links (dashboard, jobs, etc.)
- Active route highlighting
- Collapse/expand toggle

#### **StatusBadge.jsx**
- Color-coded status (pending, processing, ready, completed)
- Icon indicators
- Tooltip info

#### **ThemeSwitcher.jsx**
- Light/dark mode toggle
- LocalStorage persistence
- CSS class switching

---

### 2. **context/** — React Context (Global State)

```
context/
├── AuthContext.jsx           # User authentication state & methods
├── QueueContext.jsx          # Real-time queue updates (Socket.IO)
└── ThemeContext.jsx          # Dark/light mode theme state
```

#### **AuthContext.jsx**
```javascript
// Provides:
- user: { id, email, name, role }
- token: JWT token from localStorage
- loading: Authentication check in progress
- login(email, password)
- register(formData)
- logout()
- updateProfile(data)
- isAuthenticated: Boolean
- hasRole(role): Boolean
```

#### **QueueContext.jsx**
```javascript
// Provides:
- queue: Array of job objects
- userPosition: Current user's position in queue
- estimatedTime: Seconds until ready
- refreshQueue(): Trigger immediate update
- subscribeToUpdates(): Socket.IO listeners
- Real-time subscription pattern
```

#### **ThemeContext.jsx**
```javascript
// Provides:
- theme: "light" | "dark"
- toggleTheme()
- themeClasses: CSS class names
```

---

### 3. **hooks/** — Custom React Hooks

```
hooks/
└── useAuth.js                # Simplified authentication hook
```

#### **useAuth.js**
```javascript
// Hook:
const { user, token, login, logout, isAuthenticated } = useAuth();

// Returns:
{
  user: User object or null,
  token: JWT token or null,
  isAuthenticated: Boolean,
  isLoading: Boolean,
  login: async (email, password) => Promise,
  logout: () => void,
  register: async (formData) => Promise,
  hasRole: (role) => Boolean
}
```

---

### 4. **pages/** — Full Page Components

```
pages/
├── LoginPage.jsx             # Email/password login form
├── RegisterPage.jsx          # New user registration
├── student/
│   ├── Dashboard.jsx         # Student main dashboard
│   ├── UploadJob.jsx         # File upload form
│   ├── MyJobs.jsx            # Student's job history
│   └── Pickup.jsx            # OTP verification at counter
├── printshop/
│   ├── Dashboard.jsx         # Print shop operator dashboard
│   ├── Queue.jsx             # Real-time queue management
│   ├── Dispatch.jsx          # Job dispatch to printer
│   └── Analytics.jsx         # Job metrics & statistics
└── admin/
    ├── Dashboard.jsx         # Admin analytics dashboard
    ├── Users.jsx             # User management
    ├── Jobs.jsx              # All jobs (search, filter)
    └── Revenue.jsx           # Revenue analytics & reports
```

#### **student/Dashboard.jsx**
- Welcome message (personalized)
- Quick upload button
- Active jobs list
- Job history with filters

#### **student/UploadJob.jsx**
- FileUploader component
- Copies & color mode selection
- Price calculation
- Submit & confirmation

#### **student/MyJobs.jsx**
- Filterable job list (JobCard components)
- Status indicators
- Download receipt
- Print history export

#### **student/Pickup.jsx**
- OTPModal component
- Real-time order status
- Verification feedback

#### **printshop/Dashboard.jsx**
- Queue summary (total, processing, ready)
- Key metrics (avg wait time, throughput)
- Recent activity log
- Quick actions

#### **printshop/Queue.jsx**
- QueueList component (real-time)
- Detailed queue status
- Job dispatcher controls
- Priority adjustment

#### **printshop/Dispatch.jsx**
- Job selection interface
- Printer selection dropdown
- Print settings (copies, color, paper size)
- Confirmation & receipt

#### **printshop/Analytics.jsx**
- Charts (jobs/day, revenue, wait times)
- Date range filter
- Export to CSV/PDF
- Trend analysis

#### **admin/Dashboard.jsx**
- Key metrics (total revenue, users, jobs)
- Charts (trending data)
- Recent transactions
- System health status

#### **admin/Users.jsx**
- User list with filters
- Role assignment
- Deactivate/activate users
- Search & pagination

#### **admin/Jobs.jsx**
- All jobs in system (search, sort, filter)
- Job details modal
- Admin actions (retry, cancel, force complete)
- Bulk operations

#### **admin/Revenue.jsx**
- Revenue breakdown by date
- Payment status distribution
- Top users by spending
- Download reports

---

### 5. **services/** — API Client Wrappers

```
services/
├── authService.js            # Authentication API calls
├── jobService.js             # Job CRUD operations
├── paymentService.js         # Payment API calls
└── queueService.js           # Queue status API calls
```

#### **authService.js**
```javascript
{
  register(formData),          // POST /api/auth/register
  login(email, password),      // POST /api/auth/login
  logout(),                    // POST /api/auth/logout
  getMe(token),                // GET /api/auth/me
  updateProfile(data),         // PUT /api/auth/profile
  refreshToken(),              // POST /api/auth/refresh
  resetPassword(email)         // POST /api/auth/forgot-password
}
```

#### **jobService.js**
```javascript
{
  uploadFile(formData),        // POST /api/jobs/upload (multipart)
  getJobs(filters),            // GET /api/jobs?status=...&limit=...
  getJob(jobId),               // GET /api/jobs/:id
  getMyJobs(),                 // GET /api/jobs/my
  cancelJob(jobId),            // DELETE /api/jobs/:id
  downloadReceipt(jobId)       // GET /api/jobs/:id/receipt
}
```

#### **paymentService.js**
```javascript
{
  createOrder(jobId, amount),  // POST /api/payments/orders
  verifyPayment(data),         // POST /api/payments/verify
  getTransactionHistory(),     // GET /api/payments/history
  getReceiptPDF(paymentId)     // GET /api/payments/:id/receipt
}
```

#### **queueService.js**
```javascript
{
  getQueue(limit),             // GET /api/queue?limit=50
  getPosition(jobId),          // GET /api/queue/position/:jobId
  getMetrics(),                // GET /api/queue/metrics
  estimateWaitTime(jobId)      // GET /api/queue/estimate/:jobId
}
```

---

### 6. **styles/** — CSS & Styling

```
styles/
├── components/               # Component-specific styles
├── pages/                    # Page-specific styles
├── variables.css             # Color, spacing, typography
└── responsive.css            # Mobile, tablet, desktop media queries
```

---

### 7. **utils/** — Frontend Utilities

```
utils/
├── helpers.js                # String formatting, date utilities
├── validation.js             # Form validation rules
├── constants.js              # App-wide constants (URLs, roles)
└── storage.js                # LocalStorage wrapper
```

---

### 8. **Root Files**

```
frontend/
├── index.html                # HTML entry point
├── main.jsx                  # React root & provider wrapping
├── App.jsx                   # Main app component (routes)
├── App.css                   # Global app styles
├── index.css                 # Global CSS reset & base styles
├── vite.config.js            # Vite build configuration
├── eslint.config.js          # ESLint rules
├── package.json              # Dependencies & scripts
├── package-lock.json         # Lock file
├── Dockerfile                # Docker image
├── README.md                 # Frontend documentation
└── .gitignore                # Git exclusions
```

#### **vite.config.js**
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000'  // Backend proxy
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
```

#### **eslint.config.js**
```javascript
// Rules:
- Recommend ESLint JS config
- React hooks best practices
- React refresh for Vite HMR
- No unused variables (case-insensitive)
- JSX support
```

#### **Dockerfile**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci                     # Install all deps
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

---

# 🖥️ PRINT AGENT DIRECTORY — `/print-agent`

## 📦 Dependencies (package.json)

| Package | Version | Purpose |
|---------|---------|---------|
| `axios` | ^1.15.1 | HTTP client for API calls |
| `socket.io-client` | ^4.8.3 | Real-time WebSocket connection |
| `pdf-to-printer` | ^5.7.0 | Print PDF files to Windows printers |
| `node-windows` | ^1.0.0-beta.8 | Windows service wrapper (install as daemon) |

---

## 📁 Print Agent Structure

```
print-agent/
├── agent.js                  # Main daemon/service logic
├── install-service.js        # Windows service installer
├── package.json              # Dependencies
├── ClickToInstall.bat        # Batch file for easy installation
├── smart-print-setup.exe     # Installer executable
└── daemon/
    ├── smartprintagent.exe.config  # .NET config (if needed)
    └── smartprintagent.xml         # Service configuration XML
```

#### **agent.js** — Main Service Logic
```javascript
// Responsibilities:
1. Connect to backend via Socket.IO (long-lived connection)
2. Listen for print job events
3. Download job file from MinIO
4. Dispatch to local printer via pdf-to-printer
5. Report job status back to backend (success/failure)
6. Handle retry logic for failed prints
7. Monitor printer availability
8. Report queue position updates

// Key Listeners:
- 'print:dispatch' -> Download & print file
- 'print:cancel' -> Cancel ongoing print
- 'status:request' -> Send printer status

// Real-time Updates:
- Emit 'job:printing'
- Emit 'job:completed' with status
- Emit 'job:failed' with error message
```

#### **install-service.js** — Windows Service Installer
```javascript
// Uses node-windows to wrap as Windows service
// Registers agent.js as background service
// Auto-start on system boot
// Can be run via: node install-service.js

// Creates:
- Service name: "SmartPrint Agent"
- Description: "Local print dispatcher"
- Startup: Automatic
- Recoverable: Yes (restart on failure)
```

#### **ClickToInstall.bat** — Quick Installer
```batch
# Double-click to install print agent as Windows service
# Runs: npm install && node install-service.js
```

---

# 🐳 DOCKER COMPOSE — `docker-compose.yml`

## Services Architecture

### 1. **MongoDB** (`mongo:7`)
```yaml
Container: smartprint-mongo
Port: 27017
Volumes: mongo_data (persistent database)
Network: smartprint-net
Database: smartprint
Features:
  - Restart policy: unless-stopped
  - Health checks: integrated
```

### 2. **MinIO** (`minio/minio:latest`)
```yaml
Container: smartprint-minio
Ports:
  - 9000 (S3 API)
  - 9001 (Web Console)
Volumes: minio_data (persistent storage)
Credentials: minioadmin / minioadmin
Health Checks:
  - Interval: 30s
  - Timeout: 10s
  - Max retries: 3
```

### 3. **MinIO Init** (`minio/mc:latest`)
```yaml
Container: smartprint-minio-init
Purpose: One-shot bucket initialization
Depends On: minio (health check)
Actions:
  - Create 'smartprint' bucket
  - Set anonymous download access
```

### 4. **Backend** (Node.js)
```yaml
Container: smartprint-backend
Port: 5000
Build: ./backend/Dockerfile
Dependencies: mongo, minio
Environment:
  - NODE_ENV: production
  - MONGO_URI: mongodb://mongo:27017/smartprint
  - MINIO_ENDPOINT: minio (internal network DNS)
  - MINIO_PORT: 9000
  - RAZORPAY_KEY_ID: (from .env)
  - RAZORPAY_KEY_SECRET: (from .env)
  - JWT_SECRET: (from .env)
  - CLIENT_URL: http://localhost:5173
```

### 5. **Frontend** (React + Vite)
```yaml
Container: smartprint-frontend
Port: 5173
Build: ./frontend/Dockerfile
Purpose: Development server (comment out for production)
Environment:
  - VITE_API_URL: http://backend:5000/api (internal network)
```

---

# 🔧 Configuration Files

## `.env.example` (Backend)
```env
PORT=5000
NODE_ENV=development|production

MONGO_URI=mongodb://mongo:27017/smartprint
JWT_SECRET=your-secret-key-change-me
JWT_EXPIRE=7d

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=smartprint

RAZORPAY_KEY_ID=rzp_test_XXXXXX
RAZORPAY_KEY_SECRET=XXXXXX

TWILIO_ACCOUNT_SID=ACXXXXXX
TWILIO_AUTH_TOKEN=XXXXXX
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

CLIENT_URL=http://localhost:5173
```

---

# 📊 Development Scripts

### Backend
```bash
npm run dev          # Start with nodemon (hot-reload)
npm start            # Production start
npm test             # Run tests (not configured)
```

### Frontend
```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Production build (create dist/)
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Root
```bash
docker-compose up --build      # Full stack
docker-compose down            # Stop all services
docker-compose logs -f backend # Tail backend logs
```

---

# 🔌 API Routes Overview

## Authentication Routes (`/api/auth`)
- `POST /register` — User registration
- `POST /login` — Login with JWT
- `GET /me` — Get current user
- `PUT /profile` — Update profile
- `POST /logout` — Logout
- `POST /refresh` — Refresh JWT

## Job Routes (`/api/jobs`)
- `POST /upload` — Upload document (multipart)
- `GET` — Get user's jobs (with filters)
- `GET /:id` — Get job details
- `DELETE /:id` — Cancel job

## Payment Routes (`/api/payments`)
- `POST /orders` — Create Razorpay order
- `POST /verify` — Verify payment (HMAC check)
- `GET /history` — Payment history

## Queue Routes (`/api/queue`)
- `GET` — Get queue status
- `GET /position/:jobId` — Get user's queue position
- `GET /metrics` — Queue metrics (avg wait time, throughput)
- `GET /estimate/:jobId` — Estimate wait time

## Admin Routes (`/api/admin`)
- `GET /analytics` — Revenue, user stats
- `GET /users` — User management
- `GET /jobs` — All jobs
- `POST /actions/:jobId` — Admin actions (retry, cancel)

---

# 🎯 Real-time Events (Socket.IO)

## Client → Server (Emit)
```javascript
socket.emit('queue:subscribe')         // Subscribe to queue updates
socket.emit('job:upload', jobData)     // New job notification
socket.emit('job:cancel', jobId)       // Cancel job
socket.emit('print:dispatch', jobId)   // Request print dispatch
```

## Server → Client (Broadcast)
```javascript
io.emit('queue:update', queueData)     // Queue state change
io.emit('job:status', jobStatus)       // Job status update
io.emit('otp:generated', {jobId, otp}) // OTP generated
io.emit('position:changed', position)  // Position in queue
```

---

# 📦 Tech Stack Summary Table

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 | UI components & state |
| | Vite | Build & dev server |
| | React Router | Client-side routing |
| | Axios | HTTP client |
| | Socket.IO | Real-time updates |
| | React Dropzone | File upload UX |
| | ESLint | Code quality |
| **Backend** | Node.js | JavaScript runtime |
| | Express.js | HTTP framework |
| | MongoDB | Document database |
| | Mongoose | ODM & validation |
| | Socket.IO | Real-time server |
| | JWT | Authentication |
| | bcryptjs | Password hashing |
| | Multer | File upload handling |
| | MinIO | S3-compatible storage |
| | Razorpay | Payment gateway |
| | Twilio | SMS/WhatsApp |
| | pdf-lib, pdf-parse | PDF processing |
| **Services** | Docker | Containerization |
| | Docker Compose | Multi-container orchestration |
| **Print Agent** | Node.js | Daemon service |
| | pdf-to-printer | Windows print dispatch |
| | node-windows | Windows service wrapper |

---

# 🚀 Deployment Flow

## Local Development
```
Frontend (Vite 5173) → Backend (Express 5000)
                    ↓
            MongoDB (27017) + MinIO (9000)
```

## Docker Compose
```
nginx (reverse proxy) → Backend container → MongoDB + MinIO containers
            ↓
       Frontend (optional: static build)
```

## Production Recommendations
1. Use environment-specific `.env` files
2. Enable MinIO SSL (MINIO_USE_SSL=true)
3. Use managed MongoDB (Atlas) instead of local
4. Reverse proxy with nginx/Apache
5. Enable CORS headers for production domain
6. Use strong JWT_SECRET
7. Setup HTTPS/SSL certificates

---

# 📝 Summary

**SmartPrint** is a comprehensive, modular architecture with:
- ✅ Clear separation of concerns (MVC pattern)
- ✅ Real-time capabilities (Socket.IO)
- ✅ Scalable queue system (priority scoring)
- ✅ Production-ready security (JWT, bcrypt, helmet)
- ✅ Cloud-ready storage (MinIO S3-compatible)
- ✅ Payment integration (Razorpay)
- ✅ Multi-user roles (student, printshop, admin)
- ✅ Containerized deployment (Docker Compose)
- ✅ Cross-platform notifications (Twilio SMS/WhatsApp)
- ✅ Local printer integration (Windows service agent)
