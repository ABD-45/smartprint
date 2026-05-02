# CORS Testing Guide

## Overview
This guide explains how to test the CORS configuration fix for PATCH requests.

## Automated Testing

### Run the Test Script

1. Start the backend server:
```bash
npm start
```

2. In a separate terminal, run the CORS test:
```bash
node backend/test-cors.js
```

### Expected Results

The test script will verify:
- ✅ Server is running on port 5000
- ✅ Preflight OPTIONS requests return correct headers
- ✅ `Access-Control-Allow-Methods` includes PATCH
- ✅ All configured origins are accepted

## Manual Testing with cURL

### Test Preflight Request

```bash
curl -i -X OPTIONS http://localhost:5000/api/admin/jobs/test123/status \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: PATCH" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization"
```

**Expected Response Headers:**
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization
Access-Control-Allow-Credentials: true
```

### Test from Different Origins

Test localhost:5173:
```bash
curl -i -X OPTIONS http://localhost:5000/api/admin/jobs/test123/status \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: PATCH"
```

Test production domain:
```bash
curl -i -X OPTIONS http://localhost:5000/api/admin/jobs/test123/status \
  -H "Origin: https://smartprint.pages.dev" \
  -H "Access-Control-Request-Method: PATCH"
```

Test subdomain (should work with regex):
```bash
curl -i -X OPTIONS http://localhost:5000/api/admin/jobs/test123/status \
  -H "Origin: https://preview.smartprint.pages.dev" \
  -H "Access-Control-Request-Method: PATCH"
```

## Browser Testing

### Using DevTools

1. Start both backend and frontend servers
2. Open browser DevTools (F12)
3. Go to Network tab
4. Filter by "Fetch/XHR"
5. Perform an action that triggers a PATCH request (e.g., update job status)
6. Look for two requests:
   - **OPTIONS** (preflight) - should return 204
   - **PATCH** (actual request) - should return 200

### Check Response Headers

In the Network tab, click on the OPTIONS request and verify:
- **Status:** 204 No Content
- **Response Headers:**
  - `access-control-allow-methods` includes PATCH
  - `access-control-allow-origin` matches your frontend origin
  - `access-control-allow-credentials` is true

### Common Issues

❌ **If you see "CORS policy" error:**
- Check that the origin is in the allowed list
- Verify the OPTIONS request completed successfully
- Check that PATCH is in the allowed methods

❌ **If OPTIONS request fails:**
- Verify server is running
- Check that `app.options("*", cors())` is present
- Ensure CORS middleware is loaded before routes

## Integration Testing

### Test Complete Flow

1. **Login as admin:**
   - Navigate to login page
   - Enter admin credentials
   - Verify authentication token is stored

2. **Navigate to job management:**
   - Go to admin dashboard
   - View list of jobs

3. **Update job status:**
   - Click on a job
   - Change status (triggers PATCH request)
   - Verify no CORS errors in console
   - Verify status updates successfully

### Verify in Database

After updating a job status, check MongoDB:
```javascript
// In MongoDB shell or Compass
db.jobs.findOne({ _id: ObjectId("your-job-id") })
```

Verify the status field has been updated.

## Testing Checklist

- [ ] Server starts without errors
- [ ] Health endpoint responds (GET /health)
- [ ] OPTIONS preflight returns 204
- [ ] PATCH is in Access-Control-Allow-Methods header
- [ ] localhost:5173 origin is accepted
- [ ] smartprint.pages.dev origin is accepted
- [ ] Subdomain (preview.smartprint.pages.dev) is accepted
- [ ] Unauthorized origin is rejected
- [ ] Frontend PATCH request completes without CORS error
- [ ] Job status updates successfully in database
- [ ] Authorization header is accepted
- [ ] Content-Type header is accepted

## Troubleshooting

### PATCH still blocked

1. Clear browser cache
2. Restart backend server
3. Check for duplicate CORS middleware
4. Verify middleware order in server.js

### Origin not accepted

1. Check origin spelling (http vs https)
2. Verify port number matches
3. Check regex pattern for subdomains
4. Look at server logs for CORS errors

### Headers not allowed

1. Verify allowedHeaders includes your header
2. Check Access-Control-Allow-Headers in response
3. Ensure header name matches exactly (case-sensitive)

## Success Criteria

✅ All tests pass
✅ No CORS errors in browser console
✅ PATCH requests complete successfully
✅ Job status updates persist in database
✅ All origins work as expected
