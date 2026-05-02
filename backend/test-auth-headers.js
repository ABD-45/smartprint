/**
 * Authenticated Request Headers Test
 * Tests that CORS allows Authorization and Content-Type headers
 */

const http = require('http');

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

async function testPreflightWithHeaders(origin, requestedHeaders) {
  console.log(`\n🔐 Testing preflight with headers from: ${origin}`);
  console.log(`   Requested Headers: ${requestedHeaders.join(', ')}`);
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/jobs/test123/status',
    method: 'OPTIONS',
    headers: {
      'Origin': origin,
      'Access-Control-Request-Method': 'PATCH',
      'Access-Control-Request-Headers': requestedHeaders.join(',')
    }
  };

  try {
    const response = await makeRequest(options);
    const allowHeaders = response.headers['access-control-allow-headers'];
    const allowCredentials = response.headers['access-control-allow-credentials'];
    
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Allow-Headers: ${allowHeaders || 'NOT SET'}`);
    console.log(`   Allow-Credentials: ${allowCredentials || 'NOT SET'}`);
    
    // Check if all requested headers are allowed
    let allHeadersAllowed = true;
    const missingHeaders = [];
    
    if (allowHeaders) {
      const allowedHeadersList = allowHeaders.toLowerCase().split(',').map(h => h.trim());
      for (const header of requestedHeaders) {
        if (!allowedHeadersList.includes(header.toLowerCase())) {
          allHeadersAllowed = false;
          missingHeaders.push(header);
        }
      }
    } else {
      allHeadersAllowed = false;
    }
    
    if (allHeadersAllowed) {
      console.log('   ✅ All requested headers are allowed');
    } else {
      console.log(`   ❌ Missing headers: ${missingHeaders.join(', ')}`);
    }
    
    if (allowCredentials === 'true') {
      console.log('   ✅ Credentials are allowed');
    } else {
      console.log('   ❌ Credentials are NOT allowed');
    }
    
    return {
      passed: allHeadersAllowed && allowCredentials === 'true',
      allowHeaders,
      allowCredentials
    };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { passed: false, error: true };
  }
}

async function checkServerHealth() {
  console.log('🏥 Checking server health...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/health',
    method: 'GET'
  };

  try {
    const response = await makeRequest(options);
    if (response.statusCode === 200) {
      console.log('   ✅ Server is running\n');
      return true;
    }
  } catch (error) {
    console.log('   ❌ Server not running on port 5000');
    console.log('   Please start the server with: npm start\n');
    return false;
  }
}

async function runTests() {
  console.log('🚀 Authentication Headers Test for SmartPrint Backend\n');
  console.log('='.repeat(70));
  
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    process.exit(1);
  }
  
  console.log('='.repeat(70));
  console.log('Testing Custom Headers with CORS');
  console.log('='.repeat(70));
  
  const testCases = [
    {
      origin: 'http://localhost:5173',
      headers: ['Content-Type', 'Authorization'],
      description: 'Standard auth headers'
    },
    {
      origin: 'http://localhost:5173',
      headers: ['Content-Type'],
      description: 'Content-Type only'
    },
    {
      origin: 'http://localhost:5173',
      headers: ['Authorization'],
      description: 'Authorization only'
    },
    {
      origin: 'https://smartprint.pages.dev',
      headers: ['Content-Type', 'Authorization'],
      description: 'Production origin with auth headers'
    }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.description}`);
    const result = await testPreflightWithHeaders(testCase.origin, testCase.headers);
    results.push({ ...testCase, ...result });
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('Test Summary');
  console.log('='.repeat(70));
  
  const passed = results.filter(r => r.passed && !r.error).length;
  const failed = results.filter(r => !r.passed && !r.error).length;
  const errors = results.filter(r => r.error).length;
  
  console.log(`\n✅ Passed: ${passed}/${testCases.length}`);
  console.log(`❌ Failed: ${failed}/${testCases.length}`);
  if (errors > 0) {
    console.log(`⚠️  Errors: ${errors}/${testCases.length}`);
  }
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed && !r.error).forEach(r => {
      console.log(`   - ${r.description}`);
    });
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('Key Findings:');
  console.log('='.repeat(70));
  
  const firstResult = results[0];
  if (firstResult && !firstResult.error) {
    console.log(`\n✓ Allowed Headers: ${firstResult.allowHeaders || 'NOT SET'}`);
    console.log(`✓ Credentials Allowed: ${firstResult.allowCredentials || 'NOT SET'}`);
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (passed === testCases.length) {
    console.log('🎉 All authentication header tests passed!');
    console.log('\n📝 Your CORS configuration correctly allows:');
    console.log('   - Authorization header (for JWT tokens)');
    console.log('   - Content-Type header (for JSON payloads)');
    console.log('   - Credentials (cookies and auth headers)');
    console.log('='.repeat(70));
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the configuration.');
    console.log('='.repeat(70));
    process.exit(1);
  }
}

runTests();
