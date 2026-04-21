# SmartPrint - Quick Reference Guide

## 🚀 Quick Start Commands

### Development Setup
```bash
# Install dependencies
cd backend && npm install && cd ../frontend && npm install

# Start backend (from backend/)
npm run dev                 # Runs on http://localhost:3000

# Start frontend (from frontend/)
npm run dev                 # Runs on http://localhost:5173

# Using Docker Compose (from root)
docker compose up --build
```

### API Endpoints Cheat Sheet

#### Authentication
```
POST   /api/auth/register           # Register new user
POST   /api/auth/login              # Login & get JWT
GET    /api/auth/me                 # Get current user
PUT    /api/auth/profile            # Update profile
```

#### Jobs & Uploads
```
POST   /api/jobs/upload             # Upload file + print options
GET    /api/jobs/my                 # Get user's jobs
GET    /api/jobs/:id                # Get job details
GET    /api/jobs/:id/otp            # Get OTP (when done)
POST   /api/jobs/:id/verify-otp     # Verify OTP for pickup
```

#### Payments
```
POST   /api/payments/create-order   # Create Razorpay order
POST   /api/payments/verify         # Verify payment signature
GET    /api/payments/my             # Get payment history
```

#### Queue Management
```
GET    /api/queue/                  # Get live queue
GET    /api/queue/stats             # Get queue statistics
GET    /api/queue/position/:jobId   # Get job position
GET    /api/queue/diagnostics       # Queue health (Admin)
GET    /api/queue/role/:role        # Filter by role
GET    /api/queue/report            # Monitoring report (Admin)
```

#### Admin Only
```
GET    /api/admin/jobs              # Get all jobs
GET    /api/admin/analytics         # Get dashboard data
GET    /api/admin/users             # Get all users
PATCH  /api/admin/jobs/:id/status   # Update job status
```

---

## 👥 User Roles & Permissions

| Role | Register | Upload | Pay | Track | View Queue | Manage Queue | Admin Panel |
|------|----------|--------|-----|-------|-----------|--------------|-------------|
| **Student** | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Staff** | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| **PrintShop** | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ |
| **Admin** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 💰 Pricing Calculation

```javascript
// Formula:
baseCost = pricePerPage × pages × copies

// Price per page:
// ├─ B&W (color=false):  ₹1
// └─ Color (color=true): ₹5

// Discounts:
// ├─ Duplex (double-sided): -10% (multiply by 0.9)
// └─ No other discounts currently

// Example:
// 5 pages, 2 copies, Color, Duplex
// = 5 × 5 × 2 × 0.9 = ₹45
```

---

## 🔑 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/smartprint

# JWT
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRE=7d

# File Storage (MinIO)
MINIO_ENDPOINT=localhost:9000
MINIO_BUCKET=smartprint
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_REGION=us-east-1

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=test_MOCK_key
RAZORPAY_KEY_SECRET=test_MOCK_secret

# Frontend
CLIENT_URL=http://localhost:5173

# Print Service (CUPS)
CUPS_PRINTER_NAME=default
CUPS_SERVER=localhost
```

### Frontend (.env if needed)
```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

---

## 📊 Job Status Transitions

```
Normal Flow:
uploaded → paid → queued → printing → done → collected

Possible Transitions:
├─ uploaded → paid (payment successful)
├─ paid → queued (payment verified + added to queue)
├─ queued → printing (operator clicks "Start Printing")
├─ printing → done (printing complete)
├─ done → collected (OTP verified)
│
├─ uploaded → cancelled (user cancels before payment)
├─ queued → failed (printing error)
└─ failed → ? (admin can reprint or refund)
```

---

## 🎯 Priority Queue Algorithm

```
Priority Score = Role Bonus + Size Bonus + Aging Bonus + Payment Bonus

1. ROLE BONUS
   ├─ Admin:    +100
   ├─ Staff:    +60
   └─ Student:  +0

2. SIZE BONUS (smaller jobs prioritized)
   └─ Formula: 100 ÷ (pages × copies)
   ├─ 1 page:    +50
   ├─ 5 pages:   +10
   └─ 100 pages: +1

3. AGING BONUS (wait time)
   ├─ 0-30 min:      waiting_time × 0.5
   ├─ 30-120 min:    15 + (excess × 0.75)
   └─ 120+ min:      +200 (guaranteed)

4. PAYMENT BONUS
   └─ Paid: +15

Higher score = Higher priority = Prints sooner
```

---

## 📝 Common Workflows

### Student Upload Flow
```
1. Register/Login
2. Click "Upload" tab
3. Select file (PDF, DOC, DOCX, TXT, PNG, JPG)
4. Enter print options (pages, copies, color, duplex, etc.)
5. Review price calculation
6. Click "Submit"
7. Redirected to payment page
8. Enter card details (Razorpay)
9. Verify OTP (from card issuer)
10. Payment success → added to queue
11. Go to "Track" to see queue position
```

### PrintShop Operator Flow
```
1. Login as PrintShop role
2. View live queue dashboard
3. See sorted jobs by priority
4. Click "Start Printing" on top job
5. File auto-downloads from MinIO
6. Job sent to CUPS printer
7. Operator physically prints document
8. Click "Mark as Done" when complete
9. System generates 6-digit OTP
10. Wait for student to arrive
11. Student provides OTP
12. Scan/verify OTP in system
13. Job marked as "collected"
14. Next job automatically selected
```

### Admin Analytics Flow
```
1. Login as Admin
2. Go to Admin Dashboard
3. See revenue metrics (total, today, trend)
4. See job analytics (completed, failed, etc.)
5. See user metrics (by role, new users, activity)
6. See queue metrics (avg wait, efficiency, etc.)
7. Export report (CSV/PDF)
8. Go to "Jobs" tab to see all jobs
9. Filter by status, date range, etc.
10. Click on job to see details
11. Manually update status if needed
12. Go to "Users" tab to manage users
```

---

## 🔌 Socket.IO Events

### Server → Client (Broadcasting)
```javascript
// Queue updated (new job or removed)
socket.on('queue:update', (queue) => {
  // queue = full array of jobs with priority scores
});

// Job status changed
socket.on('job:status-change', (job) => {
  // job = updated job object
});

// Queue statistics updated
socket.on('queue:stats', (stats) => {
  // stats = {length, avgWait, maxWait, etc}
});

// Starvation alert (job > 45 min)
socket.on('alert:starvation', (job) => {
  // Notify admin/printshop
});
```

### Client → Server (If needed)
```javascript
// Usually automatic, but you can request:
socket.emit('queue:request', (queue) => {
  // Get current queue immediately
});
```

---

## 🗄️ MongoDB Collections

```
smartprint
├── users
│   ├─ Indexes: email (unique), role
│   └─ Sample doc: {name, email, password, role, collegeId, ...}
│
├── jobs
│   ├─ Indexes: userId, status, createdAt, queuePosition
│   └─ Sample doc: {userId, userRole, pages, copies, status, otp, ...}
│
└── payments
    ├─ Indexes: userId, jobId, razorpayOrderId (unique)
    └─ Sample doc: {userId, jobId, razorpayOrderId, status, amount, ...}
```

---

## 🐛 Debugging Tips

### Check JWT Token
```javascript
// Decode JWT to verify payload
// Use online tool: https://jwt.io
// Or in browser console:
const token = localStorage.getItem('authToken');
console.log(JSON.parse(atob(token.split('.')[1])));
```

### Check API Response
```javascript
// In browser Network tab:
// 1. Open DevTools (F12)
// 2. Go to Network tab
// 3. Make API request
// 4. Click request → Response tab
// 5. Check status code & response data
```

### Check Socket.IO Connection
```javascript
// In browser console:
console.log(socket.connected);  // true = connected
console.log(socket.id);         // unique socket ID

// Listen for connection events:
socket.on('connect', () => console.log('Connected'));
socket.on('disconnect', () => console.log('Disconnected'));
```

### MongoDB Connection
```bash
# Test MongoDB connection
mongo mongodb://localhost:27017/smartprint

# Query collections
db.users.find().limit(1)
db.jobs.find({status: "queued"})
db.payments.find({status: "paid"})
```

### MinIO File Storage
```bash
# MinIO Console: http://localhost:9001
# Credentials: minioadmin / minioadmin
# Browse: smartprint bucket → uploaded files

# Or use MinIO CLI:
mc ls minio/smartprint/
```

---

## 🚨 Common Issues & Solutions

### "JWT expired" Error
```
Solution:
1. Clear localStorage in browser
2. Login again (new token with 7d expiry)
3. Or wait for token refresh (if implemented)
```

### "File upload fails"
```
Possible causes:
├─ File size > 50 MB
├─ Unsupported file type
├─ MinIO not running/connected
└─ Network/CORS issue

Solution:
1. Check file size (max 50 MB)
2. Verify file extension (PDF, DOC, DOCX, TXT, PNG, JPG)
3. Check MinIO is running: curl http://localhost:9000/minio/health
4. Check browser console for errors
```

### "Payment verification fails"
```
Possible causes:
├─ Razorpay key not configured
├─ HMAC signature mismatch
├─ Order ID mismatch
└─ Amount mismatch

Solution:
1. Check .env has RAZORPAY_KEY_ID and SECRET
2. In dev: Use mock mode (keys contain "MOCK")
3. Check Razorpay response values match stored values
4. Verify amount in paise (multiply by 100)
```

### "Queue doesn't update in real-time"
```
Possible causes:
├─ Socket.IO not connected
├─ CORS misconfigured
└─ Backend not broadcasting

Solution:
1. Check socket.connected in console
2. Verify CLIENT_URL in backend .env
3. Check backend logs for Socket.IO messages
4. Refresh page (may reconnect socket)
```

---

## 📚 Useful Links

### Documentation in Project
```
├─ backend/queue/QUEUE_SYSTEM.md    - Priority algorithm details
├─ backend/queue/QUICK_REFERENCE.md - Queue system quick ref
├─ backend/README.md                - Backend setup
├─ frontend/README.md               - Frontend setup
└─ docker-compose.yml               - Docker configuration
```

### External Tools
```
├─ MongoDB: http://localhost:27017
├─ MinIO Console: http://localhost:9001
├─ Backend API: http://localhost:3000
├─ Frontend: http://localhost:5173
├─ JWT Decoder: https://jwt.io
└─ Razorpay: https://dashboard.razorpay.com
```

---

## ✅ Testing Checklist

### Manual Testing
```
[ ] Can register new user
[ ] Can login with credentials
[ ] Can upload file with options
[ ] Price calculated correctly
[ ] Can proceed to payment
[ ] Payment verification works
[ ] Job appears in queue
[ ] Queue position updates in real-time
[ ] PrintShop sees queue
[ ] Can start printing job
[ ] Can mark job as complete
[ ] OTP generated & displayed
[ ] OTP verification works
[ ] Admin can see analytics
[ ] Admin can manage jobs
[ ] Can logout & login again
```

### API Testing (Postman/Curl)
```
1. POST /api/auth/login
   - Get JWT token
   - Copy token for next requests

2. POST /api/jobs/upload
   - Use token in Authorization: Bearer {token}
   - Upload file with form data
   - Check response job ID

3. POST /api/payments/create-order
   - Create order with job ID
   - Get razorpay order ID

4. GET /api/queue/
   - Should see uploaded job in queue
   - Check priority score calculated

5. POST /api/jobs/:id/verify-otp
   - Test OTP verification
```

---

## 🎓 Learning Path

### For New Developers
```
Week 1: Understand Architecture
├─ Read PROJECT_WORKFLOW_AND_FEATURES.md
├─ Read ARCHITECTURE_DIAGRAMS.md
└─ Review project structure

Week 2: Setup & Basics
├─ Follow Quick Start commands
├─ Register & login
├─ Upload a file
└─ Verify payment flow

Week 3: Deep Dive
├─ Study queue algorithm (QUEUE_SYSTEM.md)
├─ Review controllers and models
├─ Understand Socket.IO implementation
└─ Read individual service files

Week 4: Development
├─ Make small code changes
├─ Test your changes
├─ Review with senior dev
└─ Deploy to dev environment
```

---

## 📞 Support Resources

### Getting Help
```
1. Check existing documentation
   └─ QUEUE_SYSTEM.md, README.md files

2. Review error logs
   └─ Backend: Terminal output
   └─ Frontend: Browser console (F12)
   └─ Database: MongoDB logs

3. Search GitHub issues
   └─ Similar problems already solved?

4. Ask team members
   └─ Pair programming session
   └─ Code review discussion

5. Create debug build
   └─ Add console.log statements
   └─ Check variable values
   └─ Trace execution flow
```

---

## 📋 Checklist Before Deployment

```
Backend:
[ ] All .env variables set correctly
[ ] Database connection tested
[ ] MinIO connection tested
[ ] Razorpay keys (real or test)
[ ] JWT_SECRET is strong & unique
[ ] CORS origin correct
[ ] Error handling in place
[ ] Logging enabled
[ ] Database backups configured

Frontend:
[ ] API_URL points to correct backend
[ ] Socket URL points to correct backend
[ ] No console errors/warnings
[ ] Responsive design tested
[ ] All pages load correctly
[ ] Payment flow tested
[ ] Queue real-time updates working

General:
[ ] All tests passing
[ ] Code reviewed
[ ] Security audit done
[ ] Performance tested
[ ] Backup & recovery plan ready
[ ] Monitoring/alerts configured
```

---

This quick reference should help you navigate the SmartPrint system efficiently!
