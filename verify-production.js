/**
 * Production Configuration Verification Script
 * Run this to verify your production setup
 */

const https = require('https');

const BACKEND_URL = 'smartprint-6i2b.onrender.com';
const FRONTEND_ORIGIN = 'https://smartprint.pages.dev';

console.log('🔍 SmartPrint Production Verification\n');
console.log('='.repeat(70));

// Test 1: Health Check
function testHealth() {
  return new Promise((resolve) => {
    console.log('\n1️⃣  Testing Backend Health...');
    
    https.get(`https://${BACKEND_URL}/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('   ✅ Backend is running');
          console.log(`   Response: ${data}`);
          resolve(true);
        } else {
          console.log(`   ❌ Backend returned ${res.statusCode}`);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log(`   ❌ Backend not accessible: ${err.message}`);
      resolve(false);
    });
  });
}

// Test 2: CORS Preflight for PATCH
function testCORS() {
  return new Promise((resolve) => {
    console.log('\n2️⃣  Testing CORS for PATCH requests...');
    
    const options = {
      hostname: BACKEND_URL,
      path: '/api/admin/jobs/test/status',
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'PATCH',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    };

    const req = https.request(options, (res) => {
      const allowMethods = res.headers['access-control-allow-methods'];
      const allowOrigin = res.headers['access-control-allow-origin'];
      const allowCredentials = res.headers['access-control-allow-credentials'];
      
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Allow-Origin: ${allowOrigin || 'NOT SET'}`);
      console.log(`   Allow-Methods: ${allowMethods || 'NOT SET'}`);
      console.log(`   Allow-Credentials: ${allowCredentials || 'NOT SET'}`);
      
      if (allowMethods && allowMethods.includes('PATCH')) {
        console.log('   ✅ PATCH method is allowed');
        resolve(true);
      } else {
        console.log('   ❌ PATCH method is NOT allowed');
        resolve(false);
      }
    });

    req.on('error', (err) => {
      console.log(`   ❌ CORS test failed: ${err.message}`);
      resolve(false);
    });

    req.end();
  });
}

// Test 3: Check if login endpoint works
function testLogin() {
  return new Promise((resolve) => {
    console.log('\n3️⃣  Testing Login Endpoint...');
    
    const postData = JSON.stringify({
      email: 'test@example.com',
      password: 'testpassword'
    });

    const options = {
      hostname: BACKEND_URL,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'Origin': FRONTEND_ORIGIN
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        
        if (res.statusCode === 200 || res.statusCode === 400 || res.statusCode === 401) {
          console.log('   ✅ Login endpoint is accessible');
          console.log(`   Response: ${data.substring(0, 100)}...`);
          resolve(true);
        } else {
          console.log(`   ⚠️  Unexpected status: ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`   ❌ Login test failed: ${err.message}`);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// Test 4: Check Socket.IO endpoint
function testSocketIO() {
  return new Promise((resolve) => {
    console.log('\n4️⃣  Testing Socket.IO Endpoint...');
    
    https.get(`https://${BACKEND_URL}/socket.io/`, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      
      if (res.statusCode === 200 || res.statusCode === 400) {
        console.log('   ✅ Socket.IO endpoint is accessible');
        resolve(true);
      } else {
        console.log(`   ⚠️  Unexpected status: ${res.statusCode}`);
        resolve(false);
      }
    }).on('error', (err) => {
      console.log(`   ❌ Socket.IO test failed: ${err.message}`);
      resolve(false);
    });
  });
}

// Run all tests
async function runTests() {
  const results = {
    health: await testHealth(),
    cors: await testCORS(),
    login: await testLogin(),
    socketio: await testSocketIO()
  };

  console.log('\n' + '='.repeat(70));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(70));
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  console.log('\nDetailed Results:');
  console.log(`  Health Check: ${results.health ? '✅' : '❌'}`);
  console.log(`  CORS (PATCH): ${results.cors ? '✅' : '❌'}`);
  console.log(`  Login Endpoint: ${results.login ? '✅' : '❌'}`);
  console.log(`  Socket.IO: ${results.socketio ? '✅' : '❌'}`);
  
  console.log('\n' + '='.repeat(70));
  
  if (passed === total) {
    console.log('🎉 All tests passed! Your production setup is correct.');
    console.log('\n📝 If you\'re still seeing errors:');
    console.log('   1. Check user role in MongoDB (must be "admin" or "printshop")');
    console.log('   2. Clear browser cache and hard refresh');
    console.log('   3. Check browser console for specific errors');
    console.log('   4. Verify you\'re using the correct login credentials');
  } else {
    console.log('⚠️  Some tests failed. Check the details above.');
    console.log('\n📝 Next steps:');
    if (!results.health) {
      console.log('   - Backend may not be running. Check Render dashboard.');
    }
    if (!results.cors) {
      console.log('   - CORS configuration issue. Redeploy backend with latest code.');
    }
    if (!results.login) {
      console.log('   - Login endpoint issue. Check backend logs.');
    }
    if (!results.socketio) {
      console.log('   - Socket.IO issue. Check backend configuration.');
    }
  }
  
  console.log('='.repeat(70));
}

runTests();
