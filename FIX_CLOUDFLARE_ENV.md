# 🔥 URGENT: Fix Cloudflare Pages Environment Variables

## ❌ Problem

Your deployed frontend is using the **OLD backend URL**:
- Old (wrong): `https://smartprint-backend-cwur.onrender.com`
- New (correct): `https://smartprint-6i2b.onrender.com`

The local `.env` file is correct, but **Cloudflare Pages has its own environment variables** that override it.

## ✅ Solution: Update Cloudflare Pages Environment Variables

### Step 1: Go to Cloudflare Dashboard

1. Open https://dash.cloudflare.com
2. Click on **Pages** in the left sidebar
3. Find and click on your **smartprint** project

### Step 2: Update Environment Variables

1. Click on **Settings** tab
2. Scroll down to **Environment variables** section
3. Look for these variables:
   - `VITE_API_URL`
   - `VITE_SOCKET_URL`

### Step 3: Update the Values

**For Production environment:**

| Variable | Old Value (WRONG) | New Value (CORRECT) |
|----------|-------------------|---------------------|
| `VITE_API_URL` | `https://smartprint-backend-cwur.onrender.com/api` | `https://smartprint-6i2b.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://smartprint-backend-cwur.onrender.com` | `https://smartprint-6i2b.onrender.com` |

**Steps to update:**
1. Click **Edit** next to each variable
2. Change the value to the new URL
3. Click **Save**

### Step 4: Redeploy

After updating environment variables:

**Option A: Trigger Redeploy (Recommended)**
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **Retry deployment** button
4. Wait for deployment to complete

**Option B: Push New Commit**
```bash
git commit --allow-empty -m "Trigger redeploy with new env vars"
git push origin main
```

### Step 5: Verify

After deployment completes:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard refresh** (Ctrl+Shift+R)
3. Open https://smartprint.pages.dev
4. Open browser console (F12)
5. Check the API URL:
   ```javascript
   console.log('API URL:', import.meta.env.VITE_API_URL);
   // Should show: https://smartprint-6i2b.onrender.com/api
   ```

## 🎯 Quick Verification

### Before Fix
```
❌ smartprint-backend-cwur.onrender.com/api/admin/analytics
❌ CORS error: Method PATCH is not allowed
❌ 403 Forbidden
```

### After Fix
```
✅ smartprint-6i2b.onrender.com/api/admin/analytics
✅ PATCH requests work
✅ No CORS errors
```

## 📸 Visual Guide

### Finding Environment Variables in Cloudflare

```
Cloudflare Dashboard
  └─ Pages
      └─ smartprint (your project)
          └─ Settings
              └─ Environment variables
                  ├─ Production
                  │   ├─ VITE_API_URL = https://smartprint-6i2b.onrender.com/api
                  │   └─ VITE_SOCKET_URL = https://smartprint-6i2b.onrender.com
                  └─ Preview (optional)
                      ├─ VITE_API_URL = https://smartprint-6i2b.onrender.com/api
                      └─ VITE_SOCKET_URL = https://smartprint-6i2b.onrender.com
```

## ⚠️ Important Notes

### Why This Happened

1. Your local `.env` file has the correct URL
2. But Cloudflare Pages uses its own environment variables
3. When you deploy, Cloudflare injects its own env vars
4. These override your local `.env` file

### Environment Variable Priority

```
Cloudflare Pages Env Vars (highest priority)
    ↓
.env file (ignored in production)
    ↓
Default fallback in code
```

### Both Environments

If you have **Preview** deployments, update those too:
- Production: Used for main branch
- Preview: Used for pull requests and other branches

## 🔍 Troubleshooting

### Still seeing old URL after redeploy?

1. **Clear browser cache completely:**
   - Chrome: Settings → Privacy → Clear browsing data
   - Select "Cached images and files"
   - Time range: "All time"
   - Click "Clear data"

2. **Try incognito/private window:**
   - This bypasses cache
   - If it works here, it's a cache issue

3. **Check service worker:**
   ```javascript
   // In browser console
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(registration => registration.unregister());
   });
   // Then refresh page
   ```

4. **Verify deployment used new env vars:**
   - Go to Cloudflare Pages → Deployments
   - Click on latest deployment
   - Check "Environment variables" section
   - Should show new URLs

### Environment variables not showing?

If you don't see `VITE_API_URL` in Cloudflare:
1. Click **Add variable**
2. Variable name: `VITE_API_URL`
3. Value: `https://smartprint-6i2b.onrender.com/api`
4. Environment: **Production** (check the box)
5. Click **Save**

Repeat for `VITE_SOCKET_URL`.

## ✅ Success Checklist

- [ ] Logged into Cloudflare Dashboard
- [ ] Found smartprint project in Pages
- [ ] Opened Settings → Environment variables
- [ ] Updated `VITE_API_URL` to new URL
- [ ] Updated `VITE_SOCKET_URL` to new URL
- [ ] Saved changes
- [ ] Triggered redeploy
- [ ] Deployment completed successfully
- [ ] Cleared browser cache
- [ ] Hard refreshed page
- [ ] Verified new URL in console
- [ ] No more CORS errors
- [ ] Admin features working

## 🚀 After Fix

Once environment variables are updated and redeployed:

1. ✅ All requests go to new backend
2. ✅ CORS works (new backend has PATCH enabled)
3. ✅ Admin routes work (if user role is correct)
4. ✅ Socket.IO connects properly
5. ✅ No more 403 or CORS errors

## 📞 Need Help?

If you're stuck:
1. Take a screenshot of Cloudflare environment variables
2. Check deployment logs in Cloudflare
3. Verify new backend is running: https://smartprint-6i2b.onrender.com/health
4. Test with cURL to isolate frontend vs backend issues

---

**Priority:** 🔥 HIGH - Do this immediately
**Time Required:** 5 minutes
**Difficulty:** Easy - Just update env vars and redeploy
