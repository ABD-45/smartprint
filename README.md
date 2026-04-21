# 🖨️ SmartPrint — College Print Management System

A full-stack, production-ready print management platform for colleges. Students upload documents, pay online, and collect prints via OTP — while print shop operators manage a real-time, priority-based queue.

---

## ✨ Features

| Area | What it does |
|------|-------------|
| **Auth** | JWT-based login/register, bcrypt passwords, role-based access control |
| **File Upload** | Drag-and-drop upload → stored in MinIO (S3-compatible) |
| **Payments** | Razorpay integration with order creation + HMAC signature verification |
| **Priority Queue** | In-memory queue with role bonuses, page-count scoring, and aging to prevent starvation |
| **Real-time** | Socket.IO broadcasts queue updates + job status changes instantly |
| **OTP Pickup** | 6-digit time-limited OTP generated on print completion; student scans at counter |
| **Admin Dashboard** | Revenue stats, user management, job analytics |
| **Print Shop** | Live queue view, one-click print dispatch, OTP verification at pickup |

---

## 🗂️ Project Structure

```
smartprint/
├── backend/
│   ├── controllers/        # Route handlers
│   ├── middleware/         # JWT auth + RBAC
│   ├── models/             # Mongoose schemas (User, Job, Payment)
│   ├── queue/              # In-memory priority queue
│   ├── routes/             # Express routers
│   ├── services/           # MinIO, OTP, Print (CUPS)
│   ├── utils/              # Shared helpers
│   ├── .env.example
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/     # Navbar, FileUploader, QueueList, OTPModal …
│       ├── context/        # AuthContext, QueueContext (Socket.IO)
│       ├── hooks/          # useAuth
│       ├── pages/          # student/, printshop/, admin/
│       ├── services/       # Axios wrappers
│       └── utils/          # helpers.js
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start (Local Dev — No Docker)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- MinIO (local binary or Docker: `docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"`)

### 1. Clone & install dependencies

```bash
git clone <repo>
cd smartprint

# Backend
cd backend
cp .env.example .env        # fill in your values
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start Backend

```bash
cd backend
npm run dev          # nodemon
```

### 3. Start Frontend

```bash
cd frontend
npm run dev          # Vite dev server at http://localhost:5173
```

---

## 🐳 Quick Start (Docker Compose)

```bash
# Start MongoDB + MinIO + Backend + Frontend
docker compose up --build

# Open frontend
open http://localhost:5173

# MinIO Console
open http://localhost:9001   # minioadmin / minioadmin
```

---

## ⚙️ Environment Variables (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/smartprint` |
| `JWT_SECRET` | Secret for signing JWTs | *set this!* |
| `JWT_EXPIRE` | Token TTL | `7d` |
| `MINIO_ENDPOINT` | MinIO host | `localhost` |
| `MINIO_PORT` | MinIO port | `9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO secret key | `minioadmin` |
| `MINIO_BUCKET` | Bucket name | `smartprint` |
| `RAZORPAY_KEY_ID` | Razorpay API key | `rzp_test_…` |
| `RAZORPAY_KEY_SECRET` | Razorpay secret | — |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |

---

## 🔑 User Roles

| Role | Access |
|------|--------|
| `student` | Upload, pay, track jobs |
| `staff` | Same as student + priority boost |
| `printshop` | Print queue dashboard, mark jobs done |
| `admin` | All of the above + analytics + user management |

> **First admin account** — Register normally, then update the role in MongoDB:
> ```js
> db.users.updateOne({ email: "admin@college.edu" }, { $set: { role: "admin" } })
> ```

---

## 📡 API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register student/staff |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | ✅ | Get current user |

### Jobs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/jobs/upload` | ✅ | Upload file → create job |
| GET | `/api/jobs/my` | ✅ | Get own jobs |
| GET | `/api/jobs/:id` | ✅ | Get single job |
| POST | `/api/jobs/:id/verify-otp` | ✅ | Verify pickup OTP |
| GET | `/api/jobs/:id/otp` | ✅ | View OTP (owner, after done) |

### Payments
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/payments/create-order` | ✅ | Create Razorpay order |
| POST | `/api/payments/verify` | ✅ | Verify & record payment |

### Queue
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/queue` | ✅ | Live queue |
| GET | `/api/queue/stats` | ✅ | Queue statistics |
| GET | `/api/queue/position/:jobId` | ✅ | Position + ETA for a job |

### Admin
| Method | Path | Auth | Role |
|--------|------|------|------|
| GET | `/api/admin/stats` | ✅ | admin |
| GET | `/api/admin/users` | ✅ | admin |
| GET | `/api/admin/jobs` | ✅ | admin/printshop |
| PATCH | `/api/admin/jobs/:id/status` | ✅ | printshop/admin |

---

## 🧮 Priority Queue Algorithm

```
score = role_bonus + page_bonus + aging_bonus + paid_bonus

role_bonus  = admin: 100 | staff: 50 | student: 0
page_bonus  = 100 / (pages × copies)        — favors small jobs
aging_bonus = waitingMinutes × 0.5          — prevents starvation
paid_bonus  = isPaid ? 10 : 0
```

Queue is refreshed every 5 minutes to recompute aging bonuses.

---

## 🔌 Socket.IO Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `joinQueue` | Client → Server | — |
| `joinJob` | Client → Server | `jobId` |
| `queueUpdate` | Server → Client | `Job[]` |
| `jobStatusUpdate` | Server → Client | `{ status, position }` |
| `jobVerified` | Server → Client | `{ jobId }` |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6, Socket.IO Client |
| Backend | Node.js, Express 4, Socket.IO |
| Database | MongoDB 7 + Mongoose |
| Object Storage | MinIO (S3-compatible) |
| Auth | JWT + bcrypt |
| Payments | Razorpay |
| Printing | CUPS `lp` (Linux) / Mock (Windows/Dev) |
| Infra | Docker Compose |

---

## 👥 Team Workflow

To ensure smooth collaboration, please follow these guidelines:

### 1. Setup
```bash
git clone <repo-url>
cd smartprint
cp .env.example .env
docker-compose up
```

### 2. Branching Strategy
Never work directly on `main`. Create feature branches:
```bash
git checkout -b feature/your-feature-name
```
Common prefixes: `feature/`, `bugfix/`, `hotfix/`, `refactor/`.

### 3. Pull Requests
1. Push your branch: `git push origin feature/your-feature-name`
2. Open a Pull Request (PR) on GitHub.
3. Wait for review/tests before merging.

---

## 📝 License

MIT — Built for educational purposes.
