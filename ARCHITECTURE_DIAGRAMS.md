# SmartPrint Architecture & Workflow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌──────────────┬──────────────┬─────────────┬──────────────┐   │
│  │   Student    │   PrintShop  │    Admin    │     Auth     │   │
│  │   Pages      │   Dashboard  │ Dashboard   │    Pages     │   │
│  └──────────────┴──────────────┴─────────────┴──────────────┘   │
│                                 ▲                                 │
│                    Socket.IO (WebSocket)                        │
│                           ▲   │   ▼                             │
│              Axios HTTP (REST API)                              │
└──────────────────┬────────────────────────────────────────────┘
                   │
          ┌────────▼────────────────────────────────────────┐
          │       BACKEND (Node.js + Express)               │
          │                                                  │
          │  ┌──────────┬──────────┬────────┬───────────┐  │
          │  │   Auth   │   Jobs   │Payment │ Queue    │  │
          │  │Controller│Controller│Ctrl    │Controller│  │
          │  └──────────┴──────────┴────────┴───────────┘  │
          │                                                  │
          │  ┌────────────────────────────────────────┐    │
          │  │    Priority Queue System (In-Memory)   │    │
          │  │  - Queue Manager                       │    │
          │  │  - Priority Calculator                 │    │
          │  │  - Queue Monitor                       │    │
          │  └────────────────────────────────────────┘    │
          │                                                  │
          │  ┌──────────────────────────────────────┐      │
          │  │         Services                      │      │
          │  │ ├─ MinIO (File Storage)              │      │
          │  │ ├─ Razorpay (Payments)               │      │
          │  │ ├─ OTP Service                       │      │
          │  │ └─ Print Service (CUPS)              │      │
          │  └──────────────────────────────────────┘      │
          │                                                  │
          │  Socket.IO Server (Real-time Updates)         │
          └────────────┬────────────┬─────────────────────┘
                       │            │
        ┌──────────────▼─┐  ┌───────▼──────────────┐
        │    MongoDB     │  │  MinIO (S3 Storage)  │
        │   (Database)   │  │  (File Storage)      │
        │                │  │                      │
        │  - Users       │  │  - Uploaded Files    │
        │  - Jobs        │  │  - Print Documents   │
        │  - Payments    │  │                      │
        └────────────────┘  └──────────────────────┘
```

## Student Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         STUDENT WORKFLOW                         │
└─────────────────────────────────────────────────────────────────┘

   ┌─────────────────┐
   │  Not Logged In  │
   └────────┬────────┘
            │
            ├─→ Register (email, password, name)
            │   ✓ Username & password hashed
            │   ✓ JWT token generated
            │
            ├─→ Login (email, password)
            │   ✓ Credentials validated
            │   ✓ JWT token generated (7 days)
            │   ✓ Last login updated
            │
   ┌────────▼──────────────────┐
   │   Authenticated Student    │
   └────────┬───────────────────┘
            │
            ├─→ [UPLOAD PAGE]
            │   ├─ Select file (PDF, DOC, DOCX, PNG, JPG)
            │   ├─ Enter options:
            │   │  ├─ Number of pages
            │   │  ├─ Copies (1-50)
            │   │  ├─ Color (yes/no)
            │   │  ├─ Duplex (yes/no)
            │   │  ├─ Paper size (A4/A3/Letter)
            │   │  └─ Orientation (portrait/landscape)
            │   │
            │   ├─ Price calculation:
            │   │  └─ [₹1 per B&W page, ₹5 per color page]
            │   │  └─ [10% discount if duplex]
            │   │  └─ [Total = Price × Pages × Copies]
            │   │
            │   ├─ Submit form
            │   ├─ File uploaded to MinIO (S3)
            │   ├─ Job created in MongoDB
            │   └─ Job status: "uploaded" ✓
            │
            ├─→ [PAYMENT PAGE]
            │   ├─ Show total amount
            │   ├─ Show Razorpay payment form
            │   ├─ Student enters card details
            │   ├─ Razorpay processes payment
            │   ├─ Verify signature (HMAC)
            │   ├─ Job status: "uploaded" → "paid"
            │   ├─ Job ADDED to priority queue
            │   └─ Socket.IO broadcast to PrintShop ✓
            │
            ├─→ [TRACKING PAGE]
            │   ├─ View all my jobs
            │   ├─ See real-time queue position
            │   ├─ Get estimated wait time
            │   ├─ Priority score calculation shown
            │   │
            │   ├─ When printing starts:
            │   │  └─ Status changes: "queued" → "printing"
            │   │  └─ Real-time notification (Socket.IO)
            │   │  └─ Estimated completion time shown
            │   │
            │   ├─ When printing completes:
            │   │  ├─ Status changes: "printing" → "done"
            │   │  ├─ 6-digit OTP generated
            │   │  ├─ OTP displayed/sent to student
            │   │  ├─ OTP expires in 30 minutes
            │   │  └─ Real-time notification (Socket.IO) ✓
            │   │
            │   └─ Collect at counter:
            │      ├─ Student arrives with OTP
            │      ├─ Enter OTP in system
            │      ├─ OTP verified (digits + time)
            │      ├─ Status: "done" → "collected"
            │      └─ Prints handed over ✓ COMPLETE
            │
            └─→ [PROFILE/HISTORY]
                ├─ View all past jobs
                ├─ See payment history
                ├─ Update profile info
                └─ Logout

Priority Calculation (while in queue):
┌─────────────────────────────────────────┐
│ Score = Role + Size + Aging + Payment   │
├─────────────────────────────────────────┤
│ Role Bonus:          0 (student)         │
│ Size Bonus:          100 ÷ (pages×copies)│
│ Aging Bonus:         waiting_min × 0.5   │
│ Payment Bonus:       +15                 │
├─────────────────────────────────────────┤
│ Example: 5-page, 2-copy, waiting 10 min │
│ = 0 + 10 + 5 + 15 = 30 points            │
└─────────────────────────────────────────┘
```

## PrintShop Operator Workflow

```
┌──────────────────────────────────────────┐
│      PRINTSHOP OPERATOR WORKFLOW         │
└──────────────────────────────────────────┘

1. Login as PrintShop role
   └─ Email + password
   └─ Role: "printshop"

2. PrintShop Dashboard
   ├─ [LIVE QUEUE VIEW]
   │  ├─ Real-time list of jobs (sorted by priority)
   │  ├─ For each job:
   │  │  ├─ Queue position (Q-001, Q-002, etc.)
   │  │  ├─ Student name
   │  │  ├─ Pages & copies
   │  │  ├─ Color/duplex settings
   │  │  ├─ Priority score
   │  │  ├─ Est. wait time
   │  │  └─ Action button: "Start Printing"
   │  │
   │  ├─ Socket.IO auto-updates as:
   │  │  ├─ New jobs enter queue
   │  │  ├─ Jobs complete
   │  │  ├─ Priority scores change
   │  │  └─ Aging bonus increases
   │  │
   │  └─ Queue statistics:
   │     ├─ Total jobs in queue
   │     ├─ Average wait time
   │     ├─ Queue length
   │     └─ Peak hours indicator
   │
   ├─ [JOB DISPATCH]
   │  ├─ Click "Start Printing" on top job
   │  ├─ System sends to CUPS printer
   │  ├─ File downloaded from MinIO
   │  ├─ Printer queue updated
   │  ├─ Job status: "queued" → "printing"
   │  ├─ Estimated print time calculated
   │  └─ Socket.IO broadcast to student ✓
   │
   ├─ [MARK COMPLETION]
   │  ├─ When printing physically finishes
   │  ├─ Click "Mark as Done" button
   │  ├─ System generates 6-digit OTP
   │  │  └─ OTP: random, time-limited (30 min), database stored
   │  ├─ Job status: "printing" → "done"
   │  ├─ OTP displayed on screen
   │  ├─ OTP sent to student (if email configured)
   │  └─ Socket.IO notification to student ✓
   │
   ├─ [OTP VERIFICATION (Pickup)]
   │  ├─ Student arrives at counter
   │  ├─ Operator enters OTP from student
   │  ├─ System verifies:
   │  │  ├─ OTP matches (6 digits)
   │  │  ├─ OTP not expired (30 min check)
   │  │  └─ Job status is "done"
   │  ├─ If valid:
   │  │  ├─ Job status: "done" → "collected"
   │  │  ├─ Success message shown
   │  │  └─ Prints handed over ✓
   │  └─ If invalid:
   │     ├─ Error message shown
   │     ├─ Try again or generate new OTP
   │     └─ Operator can override (with admin approval)
   │
   ├─ [QUEUE MONITORING]
   │  ├─ Monitor queue health
   │  ├─ Identify starving jobs (> 45 min wait)
   │  ├─ Manual priority adjustments (if needed)
   │  ├─ View diagnostics:
   │  │  ├─ Avg queue time
   │  │  ├─ Print speed stats
   │  │  ├─ SLA compliance
   │  │  └─ Peak usage times
   │  └─ Generate queue reports
   │
   └─ [JOB HISTORY]
      ├─ View completed jobs for today/week
      ├─ Filter by status
      ├─ See reprint requests
      └─ Download job reports

Socket.IO Events (PrintShop listens to):
├─ queue:update        → New job joined or left queue
├─ job:status-change   → Job status changed (queued→printing→done)
├─ queue:stats         → Queue statistics updated
└─ alert:starvation    → Job waiting too long alert
```

## Admin Dashboard Workflow

```
┌──────────────────────────────────────────┐
│          ADMIN DASHBOARD WORKFLOW        │
└──────────────────────────────────────────┘

1. Login as Admin role
   └─ Email + password
   └─ Role: "admin"

2. Analytics Dashboard
   ├─ [REVENUE METRICS]
   │  ├─ Total revenue (all-time)
   │  ├─ Today's revenue
   │  ├─ Revenue trend (last 7 days)
   │  ├─ Average revenue per job
   │  └─ Revenue by user/role
   │
   ├─ [JOB ANALYTICS]
   │  ├─ Total jobs count
   │  ├─ Jobs completed today
   │  ├─ Jobs currently printing
   │  ├─ Failed jobs count
   │  ├─ Job status breakdown (pie chart)
   │  ├─ Average pages per job
   │  ├─ Most printed file types
   │  └─ Job completion rate (%)
   │
   ├─ [USER ANALYTICS]
   │  ├─ Total users by role:
   │  │  ├─ Students
   │  │  ├─ Staff
   │  │  ├─ Admin
   │  │  └─ PrintShop operators
   │  ├─ New users (today, week, month)
   │  ├─ Most active users (by jobs uploaded)
   │  ├─ User retention metrics
   │  └─ Last login information
   │
   ├─ [QUEUE ANALYTICS]
   │  ├─ Average queue length
   │  ├─ Average wait time
   │  ├─ Peak hours (last 7 days)
   │  ├─ Queue efficiency score
   │  ├─ Starvation incidents (jobs > 45 min)
   │  └─ SLA compliance percentage
   │
   └─ [CHARTS & GRAPHS]
      ├─ Revenue trend line chart
      ├─ Job status breakdown (pie)
      ├─ Users by role (bar)
      ├─ Peak hours analysis
      └─ Download reports (CSV, PDF)

3. User Management
   ├─ [USER LIST]
   │  ├─ View all users with pagination
   │  ├─ Filter by role (student, staff, admin, printshop)
   │  ├─ Search by name/email
   │  ├─ Sort by join date, activity, etc.
   │  │
   │  ├─ For each user, view:
   │  │  ├─ Name, email, phone
   │  │  ├─ Role & permissions
   │  │  ├─ College ID (for students)
   │  │  ├─ Join date
   │  │  ├─ Last login
   │  │  ├─ Total jobs uploaded
   │  │  ├─ Total spent (if student)
   │  │  └─ Activity level
   │  │
   │  └─ Action buttons:
   │     ├─ View details
   │     ├─ Edit profile
   │     ├─ Change role
   │     ├─ Deactivate account
   │     ├─ View audit log
   │     └─ Send message
   │
   ├─ [USER DETAILS]
   │  ├─ View full profile
   │  ├─ See all jobs uploaded by user
   │  ├─ Payment history
   │  ├─ Queue positions (historical)
   │  ├─ Edit user information
   │  ├─ Reset password
   │  └─ View activity timeline
   │
   └─ [USER ACTIONS]
      ├─ Create new user (bulk import from CSV)
      ├─ Deactivate/reactivate accounts
      ├─ Assign roles
      ├─ Manage permissions
      └─ Send notifications

4. Job Management
   ├─ [ALL JOBS VIEW]
   │  ├─ View all jobs in system
   │  ├─ Filter by:
   │  │  ├─ Status (uploaded, paid, queued, printing, done, collected, failed, cancelled)
   │  │  ├─ Date range
   │  │  ├─ User role (student, staff, admin)
   │  │  ├─ Price range
   │  │  └─ Print shop
   │  ├─ Sort by: date, status, price, user
   │  ├─ Pagination (20 jobs per page)
   │  │
   │  ├─ For each job:
   │  │  ├─ Job ID & status
   │  │  ├─ Student name
   │  │  ├─ Pages & copies
   │  │  ├─ Price
   │  │  ├─ Created & updated timestamps
   │  │  ├─ Queue position (if queued)
   │  │  └─ Action buttons
   │  │
   │  └─ Action buttons:
   │     ├─ View details
   │     ├─ Download file
   │     ├─ Change status
   │     ├─ Reprint (if failed)
   │     ├─ Refund (if applicable)
   │     └─ Delete
   │
   ├─ [JOB DETAILS]
   │  ├─ Full job information
   │  ├─ Student contact info
   │  ├─ File details & preview
   │  ├─ Print settings
   │  ├─ Payment details
   │  ├─ Status timeline (created → paid → queued → printing → done → collected)
   │  ├─ OTP details (if generated)
   │  ├─ Queue position history
   │  ├─ Estimated vs actual print time
   │  └─ Manual override options
   │
   └─ [JOB ACTIONS]
      ├─ Change job status manually
      ├─ Reprint failed jobs
      ├─ Process refunds
      ├─ View/download files
      ├─ Email student
      └─ Add notes/comments

5. Queue Management
   ├─ [LIVE QUEUE]
   │  ├─ View real-time queue (same as PrintShop sees)
   │  ├─ All jobs with priority scores
   │  ├─ Queue statistics (length, avg wait, peak)
   │  ├─ Starving jobs alerts (> 45 min)
   │  └─ Manual reordering if needed
   │
   ├─ [DIAGNOSTICS]
   │  ├─ Queue health status
   │  ├─ Performance metrics:
   │  │  ├─ Avg queue length
   │  │  ├─ Avg wait time
   │  │  ├─ Max wait time
   │  │  ├─ Min wait time
   │  │  └─ Throughput (jobs/hour)
   │  ├─ Starvation analysis
   │  ├─ Alerts & warnings
   │  └─ Recommendations
   │
   └─ [QUEUE REPORTS]
      ├─ Historical queue data
      ├─ Performance trends
      ├─ Optimization suggestions
      ├─ SLA compliance report
      └─ Export queue data

6. System Configuration
   ├─ [SETTINGS]
   │  ├─ Price per page (B&W, color)
   │  ├─ Paper sizes & orientations
   │  ├─ Max file size
   │  ├─ OTP expiration time
   │  ├─ Queue priority weights
   │  ├─ Payment gateway settings
   │  ├─ Email/notification settings
   │  └─ Backup & restore
   │
   ├─ [AUDIT LOG]
   │  ├─ View all system activities
   │  ├─ Filter by user, action, date
   │  ├─ Track who did what and when
   │  └─ Export audit trails
   │
   └─ [SYSTEM STATUS]
      ├─ Database connection status
      ├─ MinIO storage status
      ├─ Payment gateway status
      ├─ Email service status
      ├─ Queue system health
      └─ Last backup timestamp
```

## Priority Queue Algorithm Flow

```
┌────────────────────────────────────────────────────┐
│         JOB ENTERS QUEUE (After Payment)           │
└────────────────────────────────────────────────────┘
                        ▼
        ┌───────────────────────────────────┐
        │  Retrieve Job Details:            │
        │  ├─ User role (student/staff/etc) │
        │  ├─ Pages & copies                │
        │  ├─ Current timestamp             │
        │  └─ Job ID                        │
        └───────────┬───────────────────────┘
                    ▼
        ┌───────────────────────────────────┐
        │ Calculate Priority Score:         │
        └───────┬───────────────────────────┘
                ▼
     ┌──────────────────────────┐
     │ 1. ROLE BONUS            │
     │ ├─ Admin:    +100        │
     │ ├─ Staff:    +60         │
     │ └─ Student:  +0          │
     └──────────┬───────────────┘
                ▼
     ┌──────────────────────────────────────┐
     │ 2. SIZE BONUS                        │
     │ Formula: 100 ÷ (pages × copies)      │
     │ Capped at: 50                        │
     │ Examples:                            │
     │ ├─ 1 page, 1 copy:   +50             │
     │ ├─ 5 pages, 2 copies: +10            │
     │ └─ 100 pages, 1 copy: +1             │
     └──────────┬───────────────────────────┘
                ▼
     ┌──────────────────────────────────────┐
     │ 3. AGING BONUS                       │
     │ wait_time = now - job_created_at     │
     │                                      │
     │ IF wait_time ≤ 30 min:              │
     │   bonus = wait_time × 0.5            │
     │                                      │
     │ ELSE IF wait_time ≤ 120 min:        │
     │   bonus = 15 + (excess × 0.75)       │
     │                                      │
     │ ELSE (120+ min):                    │
     │   bonus = 200 (MAX GUARANTEED)       │
     └──────────┬───────────────────────────┘
                ▼
     ┌──────────────────────────────────────┐
     │ 4. PAYMENT BONUS                     │
     │ ├─ Paid:      +15                    │
     │ └─ Unpaid:    +0                     │
     └──────────┬───────────────────────────┘
                ▼
        ┌──────────────────────────────────┐
        │ TOTAL SCORE = Sum of all bonuses │
        └──────────┬─────────────────────┬─┘
                   │                     │
        ┌──────────▼─┐        ┌─────────▼────────────┐
        │ Insert into│        │ Recalculate all      │
        │ priority   │        │ scores due to        │
        │ queue      │        │ new position         │
        │ (sorted)   │        │ affecting all        │
        └──────────┬─┘        │ in-queue jobs        │
                   │          └─────────┬────────────┘
                   │                    │
                   └────────┬───────────┘
                            ▼
              ┌─────────────────────────┐
              │ Broadcast queue update  │
              │ via Socket.IO to all    │
              │ connected clients       │
              └─────────────────────────┘
```

## Data Flow Diagram

```
STUDENT INTERACTION:
┌───────────────┐
│  Student UI   │
│  (Upload)     │
└───────┬───────┘
        │ POST /api/jobs/upload
        │ [File + Options]
        ▼
┌──────────────────────┐
│ Job Controller       │
│ (Validate + Upload)  │
└───────┬──────────────┘
        │
        ├─→ Multer (In-memory)
        │
        ├─→ MinIO Service
        │   └─ Upload file to S3
        │   └─ Get presigned URL
        │
        ├─→ Calculate Price
        │   └─ Rate: ₹1 B&W, ₹5 color
        │   └─ Discount: 10% duplex
        │
        └─→ Job Model
            └─ Save to MongoDB
            └─ Status: "uploaded"
            └─ Return job object

PAYMENT FLOW:
┌─────────────────────┐
│  Student UI         │
│  (Razorpay Button)  │
└────────┬────────────┘
         │ POST /api/payments/create-order
         │ [Job ID]
         ▼
┌──────────────────────┐
│ Payment Controller   │
└────────┬─────────────┘
         │
         ├─→ Razorpay API
         │   └─ Create order
         │   └─ Return order ID
         │
         ├─→ Payment Model
         │   └─ Save record
         │   └─ Status: "created"
         │
         └─→ Return order object
             └─ Return Razorpay key

         │ Student completes payment in UI
         │ POST /api/payments/verify
         │ [Razorpay response]
         ▼
┌──────────────────────────┐
│ Payment Controller       │
│ (Verify Signature)       │
└────────┬─────────────────┘
         │
         ├─→ Verify HMAC
         │   └─ Check signature
         │
         ├─→ Payment Model
         │   └─ Update status: "paid"
         │
         ├─→ Job Model
         │   └─ Update status: "uploaded" → "paid"
         │
         └─→ Queue Manager
             ├─ Add job to priority queue
             ├─ Calculate priority score
             └─ Save queue state
                     │
                     ▼
                Socket.IO
                Broadcast
                queue:update
                to all clients

PRINTSHOP MONITORING:
┌───────────────┐
│ PrintShop UI  │
│ (Queue View)  │
└───────┬───────┘
        │
        │ GET /api/queue/
        ▼
┌──────────────────────────┐
│ Queue Controller         │
│ (Get Live Queue)         │
└────────┬─────────────────┘
         │
         ├─→ Queue Manager
         │   └─ Get current queue
         │
         ├─→ Queue Monitor
         │   └─ Calculate stats
         │   └─ Check starvation
         │
         └─→ Return queue state
             ├─ Jobs with priority scores
             ├─ Queue position
             ├─ Est. wait time
             └─ Statistics

Socket.IO Push Updates:
├─ queue:update
│  (When job added/removed)
├─ job:status-change
│  (When status changes)
├─ queue:stats
│  (Periodic updates)
└─ alert:starvation
   (When job > 45 min)
```

## Status Transition Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    JOB STATUS WORKFLOW                            │
└──────────────────────────────────────────────────────────────────┘

NORMAL FLOW:
┌─────────┐      ┌───────┐      ┌────────┐      ┌──────────┐
│Uploaded │─────→│ Paid  │─────→│Queued  │─────→│ Printing │
└─────────┘      └───────┘      └────────┘      └────┬─────┘
                                                      │
                ┌─────────────────────────────────────┘
                │
                ├─→ ┌──────┐      ┌───────────┐
                │   │ Done │─────→│ Collected │
                │   └──────┘      └───────────┘
                │   (With OTP)    (After OTP verified)
                │
                └─→ ┌───────────┐
                    │   Failed  │  (Printshop issue)
                    └───────────┘
                            │
                            └─→ Can be refunded or reprinted

ALTERNATIVE FLOWS:
Cancelled:        ┌─────────┐      Cancelled
                  │Uploaded │
                  └────┬────┘
                       └─→ ┌──────────┐  (Before payment)
                           │Cancelled │
                           └──────────┘

Failed:           ┌────────┐           ┌───────┐         ┌───────────┐
                  │Queued │           │Failed │         │ Refunded  │
                  └───┬────┘           └───┬───┘         └───────────┘
                      │                    │                    ▲
                      └───→ Printing       └────────────────────┘
                           error


STATE COUNTS (MongoDB):
└─ statuses: [uploaded, paid, queued, printing, done, collected, failed, cancelled]
   └─ Used for analytics, filtering, and status breakdowns
   └─ Admin can manually override status if needed
```

## Real-time Communication Flow (Socket.IO)

```
┌─────────────────────────────────────────────────────────────┐
│              SOCKET.IO EVENT BROADCASTING                    │
└─────────────────────────────────────────────────────────────┘

TRIGGER EVENTS:

1. Queue Update
   ├─ When: Job payment verified
   ├─ Action: Job added to queue
   ├─ Event: io.emit('queue:update', currentQueue)
   └─ Listeners: All connected clients
               └─ PrintShop updates display
               └─ Students see queue position
               └─ Admin sees live queue

2. Job Status Change
   ├─ When: PrintShop clicks "Start Printing"
   ├─ Change: queued → printing
   ├─ Event: io.emit('job:status-change', jobData)
   └─ Listeners: Job owner + admin + printshop
               └─ Student sees "now printing"
               └─ Admin gets notification

3. Printing Completed
   ├─ When: Operator clicks "Mark Done"
   ├─ Action: Generate OTP, change status
   ├─ Event: io.emit('job:status-change', jobData)
   │         io.emit('otp:generated', {jobId, otp_hint})
   └─ Listeners: Job owner gets OTP notification
               └─ Operator sees ready for pickup
               └─ Admin logs completion

4. Queue Statistics
   ├─ When: Periodic interval (e.g., every 5 sec)
   ├─ Action: Calculate queue stats
   ├─ Event: io.emit('queue:stats', statsObject)
   └─ Listeners: Dashboard clients
               └─ Admin dashboard updates
               └─ Queue graph refreshes

5. Starvation Alert
   ├─ When: Job waiting > 45 minutes
   ├─ Action: Check threshold, send alert
   ├─ Event: io.emit('alert:starvation', jobData)
   └─ Listeners: Admin + printshop staff
               └─ Alert notification shown
               └─ Recommendation given

CLIENT-SIDE LISTENERS (React):

QueueContext.jsx:
├─ socket.on('queue:update', (queue) => {
│  └─ setQueue(queue)
│  └─ Re-render queue list with new positions
│
├─ socket.on('job:status-change', (job) => {
│  └─ updateJobInState(job)
│  └─ Show status badge update
│
├─ socket.on('queue:stats', (stats) => {
│  └─ setStats(stats)
│  └─ Update dashboard charts
│
└─ socket.on('alert:starvation', (job) => {
   └─ showNotification("Job waiting too long")
   └─ Highlight job in queue
```

---

## Database Schema Relationships

```
┌────────────────┐
│     User       │
├────────────────┤
│ _id (PK)       │
│ email          │
│ password       │
│ name           │
│ role           │
│ collegeId      │
│ createdAt      │
└────────┬───────┘
         │ 1:Many
         │
    ┌────▼─────────────┐
    │                  │
    ├──────────────────┤
    │      Job         │  1:1 ─────────► MinIO (File Storage)
    ├──────────────────┤                  └─ fileUrl (presigned)
    │ _id (PK)         │
    │ userId (FK)      │
    │ userRole         │
    │ fileName         │
    │ originalName     │
    │ fileUrl          │
    │ pages            │
    │ copies           │
    │ color            │
    │ duplex           │
    │ totalAmount      │
    │ status           │
    │ queuePosition    │
    │ otp              │
    │ createdAt        │
    └────┬─────────────┘
         │ 1:1
         │
    ┌────▼──────────────┐
    │    Payment        │
    ├───────────────────┤
    │ _id (PK)          │
    │ userId (FK)       │
    │ jobId (FK)        │
    │ razorpayOrderId   │
    │ razorpayPaymentId │
    │ razorpaySignature │
    │ amount            │
    │ status            │
    │ verifiedAt        │
    │ createdAt         │
    └───────────────────┘

INDEXES:
├─ User: email (unique), role
├─ Job: userId, status, createdAt, queuePosition
└─ Payment: userId, jobId, razorpayOrderId (unique)
```

---

## API Response Flow Example

```
UPLOAD FLOW:
┌──────────────────────────────┐
│ Frontend: POST /api/jobs/upload
│ Headers: Authorization: Bearer {JWT}
│ Body: FormData
│   ├─ file: [File object]
│   ├─ pages: 5
│   ├─ copies: 2
│   ├─ color: false
│   ├─ duplex: true
│   └─ ...
└──────────────┬───────────────┘
               ▼
┌───────────────────────────────────┐
│ Backend Response (201 Created)    │
│ {                                 │
│   "success": true,               │
│   "message": "Job created",       │
│   "job": {                        │
│     "id": "507f1f77bcf86cd799439011",
│     "fileName": "abc-123.pdf",    │
│     "pages": 5,                   │
│     "copies": 2,                  │
│     "color": false,               │
│     "duplex": true,               │
│     "totalAmount": 9,  ← ₹1*5*2*0.9
│     "status": "uploaded"          │
│   }                               │
│ }                                 │
└───────────────┬───────────────────┘
                ▼
        Frontend navigates to
        Payment page
```

```
PAYMENT VERIFICATION FLOW:
┌──────────────────────────────┐
│ Frontend: POST /api/payments/verify
│ Headers: Authorization: Bearer {JWT}
│ Body: {
│   razorpay_order_id: "order_xxx",
│   razorpay_payment_id: "pay_xxx",
│   razorpay_signature: "sig_xxx",
│   jobId: "507f1f77bcf86cd799439011"
│ }
└──────────────┬───────────────┘
               ▼
┌────────────────────────────────────┐
│ Backend:                            │
│ 1. Verify HMAC signature            │
│ 2. Update Payment status → "paid"   │
│ 3. Update Job status → "paid"       │
│ 4. Add to priority queue            │
│ 5. Broadcast queue:update via IO    │
└────────────────┬───────────────────┘
                 ▼
┌─────────────────────────────────────┐
│ Backend Response (200 OK)           │
│ {                                   │
│   "success": true,                  │
│   "message": "Payment verified",    │
│   "job": {                          │
│     "id": "507f1f77bcf86cd799439011",
│     "status": "paid",               │
│     "queuePosition": 1              │
│   },                                │
│   "queue": [                        │
│     {job1 with priority score},     │
│     {job2 with priority score},     │
│     ...                             │
│   ]                                 │
│ }                                   │
└─────────────────┬───────────────────┘
                  ▼
        Socket.IO broadcasts
        queue:update to all
        
        PrintShop sees job
        appear in queue ✓
        
        Student sees in
        tracking page ✓
```

---

This comprehensive architecture ensures:
✅ Real-time updates across all users
✅ Fair job scheduling with starvation prevention
✅ Seamless payment integration
✅ Complete audit trail
✅ Scalable and maintainable design
