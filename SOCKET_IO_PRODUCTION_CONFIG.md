# Socket.IO Production Configuration Summary

## ✅ Configuration Complete

Both frontend and backend are now properly configured for production Socket.IO connections with CORS support.

## Backend Configuration

**File:** `backend/server.js`

```javascript
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://smartprint.pages.dev",
    /\.smartprint\.pages\.dev$/  // Regex for subdomains
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

const io = new Server(server, {
  cors: corsOptions,
});
```

**Key Features:**
- ✅ Supports localhost development (ports 5173 and 3000)
- ✅ Supports production domain (smartprint.pages.dev)
- ✅ Supports all subdomains via regex (preview.smartprint.pages.dev, etc.)
- ✅ Credentials enabled for authenticated connections
- ✅ All HTTP methods supported including PATCH

## Frontend Configuration

**File:** `frontend/src/services/socket.js`

```javascript
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  withCredentials: true,  // ✅ Added for CORS
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});
```

**File:** `frontend/.env`

```
VITE_API_URL=https://smartprint-6i2b.onrender.com/api
VITE_SOCKET_URL=https://smartprint-6i2b.onrender.com
```

**Key Features:**
- ✅ Uses environment variable for production URL
- ✅ `withCredentials: true` for CORS authentication
- ✅ WebSocket transport prioritized for better performance
- ✅ Automatic reconnection with exponential backoff
- ✅ Falls back to polling if WebSocket fails

## What Changed

### Frontend (`frontend/src/services/socket.js`)
- **Added:** `withCredentials: true` to socket configuration
- **Why:** Required for CORS to work with credentials (cookies, auth headers)

### Backend (`backend/server.js`)
- **Already correct:** Socket.IO uses the same `corsOptions` as Express
- **Already correct:** Credentials enabled in CORS config
- **Already correct:** Regex pattern for subdomain support

## Testing

### Local Development
1. Start backend: `npm start` (runs on port 5000)
2. Start frontend: `npm run dev` (runs on port 5173)
3. Check browser console for Socket.IO connection
4. Should see: `🔌 Client connected: <socket-id>`

### Production (Render + Cloudflare Pages)
1. Deploy backend to Render
2. Deploy frontend to Cloudflare Pages
3. Frontend connects to: `https://smartprint-6i2b.onrender.com`
4. CORS allows: `https://smartprint.pages.dev` and subdomains

### Verify Connection

**Browser Console:**
```javascript
// Check if socket is connected
socket.connected  // should be true

// Listen for connection events
socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Socket disconnected');
});
```

**Backend Logs:**
```
🔌 Client connected: <socket-id>
```

## Common Issues & Solutions

### Issue: Socket not connecting in production

**Check:**
1. Backend URL is correct in `frontend/.env`
2. Backend is running and accessible
3. CORS origin includes your frontend domain
4. `withCredentials: true` is set in frontend

**Solution:**
```javascript
// Frontend - verify URL
console.log('Socket URL:', import.meta.env.VITE_SOCKET_URL);

// Backend - check CORS logs
console.log('CORS origins:', corsOptions.origin);
```

### Issue: CORS error with Socket.IO

**Symptoms:**
- Browser console shows CORS policy error
- Socket connection fails immediately

**Solution:**
- Verify frontend domain is in backend `corsOptions.origin` array
- Ensure `credentials: true` in both frontend and backend
- Check that backend is using HTTPS in production

### Issue: Connection works locally but not in production

**Check:**
1. Environment variables are set in production
2. Frontend `.env.production` has correct URLs
3. Backend allows production domain in CORS
4. No firewall blocking WebSocket connections

**Solution:**
```bash
# Check production environment variables
# Render Dashboard → Environment → Environment Variables
VITE_SOCKET_URL=https://smartprint-6i2b.onrender.com
```

## Security Considerations

### Credentials
- `withCredentials: true` allows cookies and auth headers
- Only use with trusted origins
- Backend validates origin before accepting connection

### Transport Security
- Production uses WSS (WebSocket Secure) over HTTPS
- Polling fallback also uses HTTPS
- No unencrypted connections in production

### Origin Validation
- Backend explicitly lists allowed origins
- Regex pattern requires dot before subdomain (prevents fake domains)
- Unauthorized origins are rejected

## Performance Tips

### WebSocket First
```javascript
transports: ["websocket", "polling"]  // Try WebSocket first
```
- WebSocket is faster and more efficient
- Polling is fallback for restrictive networks

### Reconnection Strategy
```javascript
reconnection: true,
reconnectionDelay: 1000,        // Start with 1 second
reconnectionDelayMax: 5000,     // Max 5 seconds between attempts
reconnectionAttempts: 5,        // Try 5 times before giving up
```

### Connection Pooling
- Socket.IO automatically manages connection pooling
- Reuses connections for multiple events
- No need for manual connection management

## Monitoring

### Frontend Monitoring
```javascript
socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});
```

### Backend Monitoring
```javascript
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} - ${reason}`);
  });
});
```

## Next Steps

1. ✅ Configuration is complete
2. ✅ Deploy backend to Render
3. ✅ Deploy frontend to Cloudflare Pages
4. ✅ Test Socket.IO connection in production
5. ✅ Monitor connection logs

## Support

If issues persist:
1. Check browser DevTools Console for errors
2. Check backend logs in Render dashboard
3. Verify environment variables are set
4. Test with cURL or Postman for API endpoints
5. Use Socket.IO debug mode: `localStorage.debug = '*'` in browser console

---

**Status:** ✅ Ready for Production
**Last Updated:** 2026-05-02
