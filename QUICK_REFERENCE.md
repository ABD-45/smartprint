# SmartPrint Quick Reference

## 🔗 URLs

| Service | URL |
|---------|-----|
| **Backend API** | `https://smartprint-6i2b.onrender.com/api` |
| **Backend Health** | `https://smartprint-6i2b.onrender.com/health` |
| **Frontend** | `https://smartprint.pages.dev` |
| **Socket.IO** | `https://smartprint-6i2b.onrender.com` |

## ⚡ Quick Commands

### Test Production
```bash
node verify-production.js
```

### Update User Role (MongoDB)
```javascript
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin" } }
)
```

### Test CORS with cURL
```bash
curl -i -X OPTIONS https://smartprint-6i2b.onrender.com/api/admin/jobs/test/status \
  -H "Origin: https://smartprint.pages.dev" \
  -H "Access-Control-Request-Method: PATCH"
```

### Check Socket Connection (Browser Console)
```javascript
socket.connected  // should be true
console.log('Socket ID:', socket.id);
```

## 🔑 Environment Variables

### Backend (Render)
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NODE_ENV=production
```

### Frontend (Cloudflare Pages)
```
VITE_API_URL=https://smartprint-6i2b.onrender.com/api
VITE_SOCKET_URL=https://smartprint-6i2b.onrender.com
```

## 🛠️ Common Fixes

### 403 Forbidden
```javascript
// Update user role in MongoDB
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin" } }
)
// Then re-login
```

### CORS Error
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R)
3. Verify backend is deployed with latest code

### Socket Not Connecting
```javascript
// Check URL in browser console
console.log(import.meta.env.VITE_SOCKET_URL);
// Should be: https://smartprint-6i2b.onrender.com
```

## 📊 User Roles

| Role | Access |
|------|--------|
| **admin** | Full access to all routes |
| **printshop** | Can view jobs, update job status |
| **student** | Can create jobs, view own jobs |

## 🔍 Debugging

### Check User Role
```javascript
// In browser console after login
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Role:', payload.role);
```

### Check API URL
```javascript
// In browser console
console.log('API:', import.meta.env.VITE_API_URL);
console.log('Socket:', import.meta.env.VITE_SOCKET_URL);
```

### Monitor Socket Events
```javascript
socket.on('connect', () => console.log('✅ Connected:', socket.id));
socket.on('disconnect', () => console.log('❌ Disconnected'));
socket.on('connect_error', (err) => console.error('Error:', err));
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `backend/server.js` | CORS & Socket.IO config |
| `backend/routes/admin.routes.js` | Admin route authorization |
| `frontend/src/services/socket.js` | Socket.IO client |
| `frontend/.env` | Frontend environment variables |

## ✅ Deployment Checklist

- [ ] Push code to GitHub
- [ ] Backend auto-deploys (Render)
- [ ] Frontend auto-deploys (Cloudflare)
- [ ] Environment variables set
- [ ] User role updated to admin
- [ ] Run `node verify-production.js`
- [ ] Test login
- [ ] Test admin features
- [ ] Verify Socket.IO connection

## 🆘 Emergency Contacts

- **Render Dashboard:** https://dashboard.render.com
- **Cloudflare Dashboard:** https://dash.cloudflare.com
- **MongoDB Atlas:** https://cloud.mongodb.com

## 📚 Documentation

- `DEPLOYMENT_STATUS.md` - Full deployment guide
- `PRODUCTION_TROUBLESHOOTING.md` - Detailed troubleshooting
- `CORS_FIX_SUMMARY.md` - CORS configuration details
- `SOCKET_IO_PRODUCTION_CONFIG.md` - Socket.IO setup
- `verify-production.js` - Automated testing script

---

**Quick Start:** Run `node verify-production.js` to test everything!
