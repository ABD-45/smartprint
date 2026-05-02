/**
 * CORS Test Script
 * Tests preflight OPTIONS and PATCH requests to verify CORS configuration
 */

const http = require('http');

const testOrigins = [
  'http://localhost:5173',
  'https://smartprint.pages.dev',
  'https://preview.smartprint.pages.dev'
];

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testPreflightRequest(origin) {
  console.log(`\n🧪 Testing preflight OPTIONS from: ${origin}`);
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/jobs/test123/status',
    method: 'OPTIONS',
    headers: {
      'Origin': origin,
      'Access-Control-Request-Method': 'PATCH',
      'Access-Control-Request-Headers': 'Content-Type,Authorization'
    }
  };

  try {
    const response = await makeRequest(options);
    
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Allow-Origin: ${response.headers['access-control-allow-origin'] || 'NOT SET'}`);
    console.log(`   Allow-Methods: ${response.headers['access-control-allow-methods'] || 'NOT SET'}`);
    console.log(`   Allow-Headers: ${response.headers['access-control-allow-headers'] || 'NOT SET'}`);
    console.log(`   Allow-Credentials: ${response.headers['access-control-allow-credentials'] || 'NOT SET'}`);
    
    // Verify PATCH is included
    const methods = response.headers['access-control-allow-methods'] || '';
    if (methods.includes('PATCH')) {
      console.log('   ✅ PATCH method is allowed');
    } else {
      console.log('   ❌ PATCH method is NOT allowed');
    }
    
    return response;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function testHealthEndpoint() {
  console.log('\n🏥 Testing health endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/health',
    method: 'GET'
  };

  try {
    const response = await makeRequest(options);
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Response: ${response.body}`);
    return response.statusCode === 200;
  } catch (error) {
    console.log(`   ❌ Server not running: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting CORS Tests for SmartPrint Backend\n');
  console.log('=' .repeat(60));
  
  // Check if server is running
  const serverRunning = await testHealthEndpoint();
  
  if (!serverRunning) {
    console.log('\n⚠️  Backend server is not running on port 5000');
    console.log('   Please start the server with: npm start');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Testing CORS Preflight Requests');
  console.log('='.repeat(60));
  
  // Test each origin
  for (const origin of testOrigins) {
    await testPreflightRequest(origin);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ CORS Tests Complete');
  console.log('='.repeat(60));
  console.log('\n📝 Next Steps:');
  console.log('   1. Verify all origins show "PATCH method is allowed"');
  console.log('   2. Test actual PATCH request from your frontend');
  console.log('   3. Check browser DevTools Network tab for CORS errors\n');
}

runTests();
