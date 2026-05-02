/**
 * Origin Validation Test Script
 * Tests that CORS accepts allowed origins and rejects unauthorized ones
 */

const http = require('http');

const testCases = [
  {
    origin: 'http://localhost:5173',
    shouldPass: true,
    description: 'Development frontend (localhost:5173)'
  },
  {
    origin: 'http://localhost:3000',
    shouldPass: true,
    description: 'Alternative development port (localhost:3000)'
  },
  {
    origin: 'https://smartprint.pages.dev',
    shouldPass: true,
    description: 'Production domain'
  },
  {
    origin: 'https://preview.smartprint.pages.dev',
    shouldPass: true,
    description: 'Preview subdomain (regex match)'
  },
  {
    origin: 'https://staging.smartprint.pages.dev',
    shouldPass: true,
    description: 'Staging subdomain (regex match)'
  },
  {
    origin: 'https://evil.com',
    shouldPass: false,
    description: 'Unauthorized domain'
  },
  {
    origin: 'https://fakesmartprint.pages.dev',
    shouldPass: false,
    description: 'Fake domain (should not match regex)'
  },
  {
    origin: 'http://localhost:8080',
    shouldPass: false,
    description: 'Unauthorized localhost port'
  }
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

async function testOrigin(testCase) {
  const { origin, shouldPass, description } = testCase;
  
  console.log(`\n📍 Testing: ${description}`);
  console.log(`   Origin: ${origin}`);
  console.log(`   Expected: ${shouldPass ? '✅ PASS' : '❌ REJECT'}`);
  
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
    const allowOrigin = response.headers['access-control-allow-origin'];
    const allowMethods = response.headers['access-control-allow-methods'];
    
    if (shouldPass) {
      // Should be accepted
      if (allowOrigin === origin && allowMethods && allowMethods.includes('PATCH')) {
        console.log(`   ✅ PASSED - Origin accepted, PATCH allowed`);
        return { passed: true, expected: true };
      } else {
        console.log(`   ❌ FAILED - Origin should be accepted but was rejected`);
        console.log(`      Allow-Origin: ${allowOrigin || 'NOT SET'}`);
        console.log(`      Allow-Methods: ${allowMethods || 'NOT SET'}`);
        return { passed: false, expected: true };
      }
    } else {
      // Should be rejected
      if (!allowOrigin || allowOrigin !== origin) {
        console.log(`   ✅ PASSED - Origin correctly rejected`);
        return { passed: true, expected: false };
      } else {
        console.log(`   ❌ FAILED - Origin should be rejected but was accepted`);
        console.log(`      Allow-Origin: ${allowOrigin}`);
        return { passed: false, expected: false };
      }
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
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
  console.log('🚀 Origin Validation Tests for SmartPrint Backend\n');
  console.log('='.repeat(70));
  
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    process.exit(1);
  }
  
  console.log('='.repeat(70));
  console.log('Testing Origin Validation');
  console.log('='.repeat(70));
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testOrigin(testCase);
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
      console.log(`   - ${r.description} (${r.origin})`);
    });
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (passed === testCases.length) {
    console.log('🎉 All origin validation tests passed!');
    console.log('='.repeat(70));
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the configuration.');
    console.log('='.repeat(70));
    process.exit(1);
  }
}

runTests();
