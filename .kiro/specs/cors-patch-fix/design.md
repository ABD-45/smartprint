# Design Document

## Overview

The CORS configuration issue stems from how Express handles preflight OPTIONS requests and CORS middleware setup. While the current `corsOptions` object correctly includes PATCH in the methods array, the origin validation function and lack of explicit OPTIONS handler may cause inconsistent behavior. This design ensures that:

1. All HTTP methods (including PATCH) are consistently allowed
2. Preflight OPTIONS requests are explicitly handled
3. Origin validation works correctly for both development and production environments
4. No conflicting CORS configurations exist

## Architecture

### Current State Analysis

The backend currently has:
- CORS middleware configured with a dynamic origin function
- Methods array includes PATCH: `["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]`
- Credentials enabled: `credentials: true`
- Socket.IO configured with the same CORS options

**Potential Issues Identified:**
1. The origin validation function uses a callback pattern that might fail silently
2. No explicit `app.options("*", cors())` handler for preflight requests
3. Helmet middleware might interfere with CORS headers in some edge cases

### Proposed Solution

Simplify and strengthen the CORS configuration by:
1. Using a static array for allowed origins (simpler and more reliable)
2. Adding explicit OPTIONS handler before routes
3. Ensuring CORS middleware is applied before other middleware that might interfere
4. Maintaining the same security posture with clearer code

## Components and Interfaces

### Modified CORS Configuration

**Location:** `backend/server.js`

**Changes:**

1. **Simplified Origin Validation**
   - Replace the origin function with a static array
   - Include regex pattern for Cloudflare Pages subdomains
   - Maintain localhost support for development

2. **Explicit Preflight Handler**
   - Add `app.options("*", cors(corsOptions))` before route definitions
   - Ensures all OPTIONS requests receive proper CORS headers

3. **Middleware Order**
   - CORS middleware must be applied early in the middleware chain
   - Order: Helmet → CORS → Morgan → Body parsers → Routes

### CORS Options Object

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
  credentials: true
};
```

**Key Properties:**
- `origin`: Array of allowed origins (strings and regex)
- `methods`: All HTTP methods needed by the application
- `allowedHeaders`: Headers the frontend needs to send
- `credentials`: Allows cookies and authorization headers

### Socket.IO Configuration

Socket.IO already uses the same `corsOptions`, which is correct. No changes needed to the Socket.IO setup.

## Data Models

No data model changes required. This is purely a middleware configuration fix.

## Error Handling

### CORS Errors

**Before Fix:**
- Browser blocks PATCH requests with `net::ERR_FAILED`
- Console shows CORS policy error
- Preflight response missing PATCH in allowed methods

**After Fix:**
- All preflight requests receive correct headers
- PATCH requests proceed normally
- Clear error messages if origin is not allowed

### Validation

The simplified origin array approach provides clearer error handling:
- If origin is in the array → allowed
- If origin matches regex → allowed
- Otherwise → CORS error with clear message

## Testing Strategy

### Manual Testing

1. **Preflight Request Test**
   - Use browser DevTools Network tab
   - Verify OPTIONS request to `/api/admin/jobs/:id/status`
   - Check response headers include:
     - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS`
     - `Access-Control-Allow-Origin: <requesting-origin>`
     - `Access-Control-Allow-Credentials: true`

2. **PATCH Request Test**
   - Send PATCH request from frontend to update job status
   - Verify request completes without CORS error
   - Verify job status updates successfully

3. **Origin Validation Test**
   - Test from localhost:5173 → should work
   - Test from smartprint.pages.dev → should work
   - Test from unauthorized domain → should fail with CORS error

### Automated Testing

Create a test script to verify CORS headers:

```javascript
// Test preflight response
const response = await fetch('http://localhost:5000/api/admin/jobs/123/status', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:5173',
    'Access-Control-Request-Method': 'PATCH'
  }
});

// Verify headers
assert(response.headers.get('Access-Control-Allow-Methods').includes('PATCH'));
assert(response.headers.get('Access-Control-Allow-Origin') === 'http://localhost:5173');
```

### Integration Testing

1. Start backend server
2. Start frontend development server
3. Login as admin user
4. Navigate to job management
5. Update job status using PATCH request
6. Verify no CORS errors in console
7. Verify job status updates in database

## Implementation Notes

### Middleware Order Importance

The order of middleware in Express matters:

```javascript
// ✅ Correct order
app.use(helmet());           // Security headers first
app.use(cors(corsOptions));  // CORS before routes
app.options("*", cors());    // Explicit preflight handler
app.use(morgan("dev"));      // Logging
app.use(express.json());     // Body parsing
// ... routes
```

### Regex Pattern for Subdomains

The regex `/\.smartprint\.pages\.dev$/` matches:
- `preview.smartprint.pages.dev`
- `staging.smartprint.pages.dev`
- Any subdomain of `smartprint.pages.dev`

But does NOT match:
- `smartprint.pages.dev` (use explicit string for main domain)
- `fakesmartprint.pages.dev` (requires dot before smartprint)

### Environment Variables

Consider adding `CLIENT_URL` to environment variables for production:
- Development: `http://localhost:5173`
- Production: `https://smartprint.pages.dev`

This allows dynamic configuration without code changes.

## Security Considerations

1. **Origin Validation:** Only allow trusted domains
2. **Credentials:** Required for authentication but increases security requirements
3. **Allowed Headers:** Limit to only necessary headers
4. **Methods:** Include only methods actually used by the API

The proposed configuration maintains security while fixing the PATCH issue.
