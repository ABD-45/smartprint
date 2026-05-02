# Quick Start - Testing CORS Fix

## 🚀 Fast Track Testing (5 minutes)

### Step 1: Start the Server
```bash
cd backend
npm start
```

Wait for: `✅ MongoDB connected` and `🚀 SmartPrint server running on port 5000`

### Step 2: Run Automated Tests (in new terminal)
```bash
# Test 1: Basic CORS functionality
node backend/test-cors.js

# Test 2: Origin validation
node backend/test-origin-validation.js

# Test 3: Authentication headers
node backend/test-auth-headers.js
```

### Step 3: Test from Frontend
1. Start your frontend: `npm run dev`
2. Login as admin
3. Try to update a job status (triggers PATCH request)
4. Check browser console - should see NO CORS errors ✅

## ✅ Success Indicators

You should see:
- ✅ All test scripts pass
- ✅ "PATCH method is allowed" in test output
- ✅ No CORS errors in browser console
- ✅ Job status updates successfully

## ❌ If Tests Fail

### Server not running?
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Start server
npm start
```

### Still getting CORS errors?
1. Clear browser cache (Ctrl+Shift+Delete)
2. Restart backend server
3. Hard refresh frontend (Ctrl+Shift+R)
4. Check `backend/server.js` has the changes

### Need to verify changes?
Check `backend/server.js` contains:
```javascript
// Line ~22-31: Updated corsOptions
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://smartprint.pages.dev",
    /\.smartprint\.pages\.dev$/
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// Line ~65: Explicit OPTIONS handler
app.options("*", cors(corsOptions));
```

## 🔍 Manual Verification (Optional)

### Using cURL:
```bash
curl -i -X OPTIONS http://localhost:5000/api/admin/jobs/test/status \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: PATCH"
```

Look for in response:
```
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
Access-Control-Allow-Origin: http://localhost:5173
```

### Using Browser DevTools:
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Update job status
5. Click on OPTIONS request
6. Check Response Headers:
   - `access-control-allow-methods` includes PATCH ✅
   - `access-control-allow-origin` matches your origin ✅

## 📚 More Information

- **Full testing guide:** `CORS_TESTING.md`
- **Implementation details:** `CORS_FIX_SUMMARY.md`
- **Test scripts:** `test-*.js` files

## 🎉 Done!

If all tests pass and frontend works without CORS errors, you're all set!

The PATCH request issue is fixed. 🚀
