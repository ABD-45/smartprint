# Production Troubleshooting Guide

## ✅ Current Configuration Status

### Backend (server.js) - ✅ CORRECT
```javascript
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://smartprint.pages.dev",
    /\.smartprint\.pages\.dev$/  // Regex for subdomains
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],  // ✅ PATCH included
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));  // ✅ Applied globally
```

### Frontend (.env) - ✅ CORRECT
```
VITE_API_URL=https://smartprint-6i2b.onrender.com/api
VITE_SOCKET_URL=https://smartprint-6i2b.onrender.com
```

### Admin Routes Authorization - ✅ CORRECT
```javascript
// Both admin and printshop can access these routes
router.get("/jobs", authorize("admin", "printshop"), getAllJobs);
router.patch("/jobs/:id/status", authorize("admin", "printshop"), updateJobStatus);

// Only admin can access analytics
router.get("/analytics", authorize("admin"), getAnalytics);
```

## 🔍 Diagnosing Issues

### Issue 1: 403 Forbidden on Admin Routes

**Symptoms:**
- `/api/admin/analytics` returns 403
- `/api/admin/jobs` returns 403

**Root Cause:**
User role is not `admin` or `printshop`

**Check User Role:**
```javascript
// In browser console after login
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('User role:', payload.role);
```

**Fix in MongoDB:**
```javascript
// Update user role
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin" } }
)
```

**Or via MongoDB Compass:**
1. Connect to your MongoDB
2. Find your user document
3. Change `role` field to `"admin"` or `"printshop"`
4. Save

### Issue 2: PATCH Method Not Allowed

**Status:** ✅ Already Fixed

The backend already includes PATCH in the methods array. If you still see this error:

**Check:**
1. Backend is redeployed with latest code
2. No caching issues (clear browser cache)
3. Correct backend URL is being used

**Verify with cURL:**
```bash
curl -i -X OPTIONS https://smartprint-6i2b.onrender.com/api/admin/jobs/test/status \
  -H "Origin: https://smartprint.pages.dev" \
  -H "Access-Control-Request-Method: PATCH"
```

**Expected Response:**
```
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
```

### Issue 3: Wrong Backend URL

**Status:** ✅ No old URLs found in code

**Verify Frontend is Using Correct URL:**
```javascript
// In browser console
console.log('API URL:', import.meta.env.VITE_API_URL);
console.log('Socket URL:', import.meta.env.VITE_SOCKET_URL);
```

**Should show:**
```
API URL: https://smartprint-6i2b.onrender.com/api
Socket URL: https://smartprint-6i2b.onrender.com
```

**If wrong, check:**
1. `frontend/.env` file has correct URLs
2. Cloudflare Pages environment variables are set
3. Frontend is rebuilt and redeployed

### Issue 4: WebSocket Connection Failing

**Status:** ✅ Already Fixed

Socket.IO is configured with the same CORS options.

**Check Connection:**
```javascript
// In browser console
socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket error:', error.message);
});
```

**Common Causes:**
1. Backend not running
2. Firewall blocking WebSocket
3. CORS not allowing origin
4. Wrong socket URL

## 🚀 Deployment Checklist

### Backend (Render)

- [ ] Latest code pushed to GitHub
- [ ] Render auto-deploys from GitHub
- [ ] Environment variables set:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NODE_ENV=production`
- [ ] Build succeeds without errors
- [ ] Health check passes: `https://smartprint-6i2b.onrender.com/health`

### Frontend (Cloudflare Pages)

- [ ] Latest code pushed to GitHub
- [ ] Cloudflare auto-deploys from GitHub
- [ ] Environment variables set:
  - `VITE_API_URL=https://smartprint-6i2b.onrender.com/api`
  - `VITE_SOCKET_URL=https://smartprint-6i2b.onrender.com`
- [ ] Build succeeds without errors
- [ ] Site accessible: `https://smartprint.pages.dev`

### Database (MongoDB)

- [ ] At least one user has `role: "admin"` or `role: "printshop"`
- [ ] Connection string is correct in Render environment variables
- [ ] Database is accessible from Render IP

## 🧪 Testing After Deployment

### 1. Test Authentication
```bash
# Login
curl -X POST https://smartprint-6i2b.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Should return token
```

### 2. Test Admin Endpoint
```bash
# Get jobs (requires admin/printshop role)
curl https://smartprint-6i2b.onrender.com/api/admin/jobs \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return 200 if role is correct
# Should return 403 if role is wrong
```

### 3. Test PATCH Request
```bash
# Update job status
curl -X PATCH https://smartprint-6i2b.onrender.com/api/admin/jobs/JOB_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"printing"}'

# Should return 200 and updated job
```

### 4. Test CORS
```bash
# Preflight request
curl -i -X OPTIONS https://smartprint-6i2b.onrender.com/api/admin/jobs/test/status \
  -H "Origin: https://smartprint.pages.dev" \
  -H "Access-Control-Request-Method: PATCH"

# Should include PATCH in Allow-Methods header
```

### 5. Test Socket.IO
Open browser console on `https://smartprint.pages.dev`:
```javascript
// Check socket connection
socket.connected  // should be true

// Test emit
socket.emit('test', { message: 'hello' });
```

## 🐛 Common Errors & Solutions

### Error: "Access denied" (403)

**Cause:** User role is not authorized

**Solution:**
1. Check user role in database
2. Update to `admin` or `printshop`
3. Re-login to get new token

### Error: "CORS policy: Method PATCH is not allowed"

**Cause:** Backend CORS not configured (but we already fixed this)

**Solution:**
1. Verify backend has latest code
2. Redeploy backend
3. Clear browser cache
4. Hard refresh (Ctrl+Shift+R)

### Error: "Failed to fetch" or "Network error"

**Cause:** Wrong backend URL or backend not running

**Solution:**
1. Check backend URL in frontend `.env`
2. Verify backend is running: `https://smartprint-6i2b.onrender.com/health`
3. Check Render logs for errors

### Error: "WebSocket connection failed"

**Cause:** Socket.IO CORS or connection issue

**Solution:**
1. Verify Socket URL is correct
2. Check backend CORS includes your origin
3. Check browser console for specific error
4. Try polling transport: `transports: ["polling", "websocket"]`

### Error: "Token expired" or "Invalid token"

**Cause:** JWT token expired or invalid

**Solution:**
1. Re-login to get new token
2. Check JWT_SECRET is same in backend
3. Verify token is being sent in Authorization header

## 📊 Monitoring

### Backend Logs (Render Dashboard)
Watch for:
- `✅ MongoDB connected`
- `🚀 SmartPrint server running on port 5000`
- `🔌 Client connected: <socket-id>`
- Any CORS errors
- Any authentication errors

### Frontend Console (Browser DevTools)
Watch for:
- Socket connection status
- API request/response
- CORS errors
- Authentication errors

### Network Tab (Browser DevTools)
Check:
- Request URLs are correct
- Response status codes
- CORS headers in response
- Authorization header in request

## 🎯 Quick Fix Commands

### Update User Role (MongoDB Shell)
```javascript
use smartprint
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin" } }
)
```

### Clear Browser Cache
- Chrome: Ctrl+Shift+Delete → Clear cache
- Or hard refresh: Ctrl+Shift+R

### Redeploy Backend (Render)
1. Go to Render Dashboard
2. Select your service
3. Click "Manual Deploy" → "Deploy latest commit"

### Redeploy Frontend (Cloudflare Pages)
1. Go to Cloudflare Dashboard
2. Select your Pages project
3. Click "Deployments" → "Retry deployment"
4. Or push new commit to trigger auto-deploy

## ✅ Success Indicators

When everything is working:

- ✅ Login works and returns token
- ✅ Admin dashboard loads without errors
- ✅ Job list displays
- ✅ Analytics show data
- ✅ PATCH requests succeed (update job status)
- ✅ Socket.IO connected (see socket ID in console)
- ✅ Real-time updates work
- ✅ No CORS errors in console
- ✅ No 403 errors on admin routes

## 📞 Support

If issues persist after following this guide:

1. Check Render logs for backend errors
2. Check browser console for frontend errors
3. Verify all environment variables are set
4. Test with cURL to isolate frontend vs backend issues
5. Check MongoDB connection and user roles

---

**Last Updated:** 2026-05-02
**Status:** Configuration verified and correct
