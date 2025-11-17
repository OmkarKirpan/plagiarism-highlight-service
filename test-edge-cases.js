#!/usr/bin/env node

/**
 * Edge Cases and Error Handling Test Script
 *
 * Tests boundary conditions, error handling, and edge cases.
 *
 * Usage: node test-edge-cases.js
 */

require('dotenv').config();
const axios = require('axios');

const CONFIG = {
  SERVER_URL: `http://localhost:${process.env.PORT || 3000}`
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const results = {
  passed: 0,
  failed: 0
};

async function testCase(name, testFn, shouldSucceed = false) {
  try {
    const result = await testFn();

    if (shouldSucceed) {
      if (result.success) {
        log(`  ✓ ${name}: Passed as expected`, 'green');
        results.passed++;
      } else {
        log(`  ✗ ${name}: Should have succeeded but didn't`, 'red');
        results.failed++;
      }
    } else {
      log(`  ✗ ${name}: Should have failed but succeeded`, 'red');
      results.failed++;
    }
  } catch (error) {
    if (!shouldSucceed) {
      const status = error.response?.status || 'unknown';
      const message = error.response?.data?.error || error.message;
      log(`  ✓ ${name}: Failed as expected (${status})`, 'green');
      log(`    Message: ${message}`, 'blue');
      results.passed++;
    } else {
      log(`  ✗ ${name}: Should have succeeded but failed`, 'red');
      log(`    Error: ${error.message}`, 'red');
      results.failed++;
    }
  }
}

async function runTests() {
  log('\n╔═══════════════════════════════════════════════╗', 'cyan');
  log('║   EDGE CASES & ERROR HANDLING TEST SUITE    ║', 'cyan');
  log('╚═══════════════════════════════════════════════╝', 'cyan');
  log(`\nServer: ${CONFIG.SERVER_URL}\n`, 'blue');

  // Health check
  try {
    const health = await axios.get(`${CONFIG.SERVER_URL}/health`);
    if (health.data.status === 'ok') {
      log('✓ Server health check passed\n', 'green');
    }
  } catch (error) {
    log('✗ Server not running\n', 'red');
    process.exit(1);
  }

  // ==========================================================================
  // VALIDATION TESTS
  // ==========================================================================

  log('Validation Tests:', 'cyan');
  log('─'.repeat(50), 'cyan');

  await testCase(
    'Empty text in grammar check',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check/grammar`, { text: '' }),
    false
  );

  await testCase(
    'Missing text field',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check`, { options: {} }),
    false
  );

  await testCase(
    'Null text value',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check`, { text: null }),
    false
  );

  await testCase(
    'Non-string text (number)',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check`, { text: 12345 }),
    false
  );

  await testCase(
    'Non-string text (object)',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check`, { text: { content: 'test' } }),
    false
  );

  // ==========================================================================
  // BOUNDARY CONDITIONS
  // ==========================================================================

  log('\nBoundary Condition Tests:', 'cyan');
  log('─'.repeat(50), 'cyan');

  await testCase(
    'Very short text (3 chars)',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check/grammar`, { text: 'Hi!' }),
    true
  );

  await testCase(
    'Single word',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check/grammar`, { text: 'test' }),
    true
  );

  await testCase(
    'Only whitespace',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check`, { text: '   \n\t  ' }),
    false
  );

  await testCase(
    'Very long text (10000 chars)',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check/grammar`, {
      text: 'A'.repeat(10000)
    }),
    true
  );

  // ==========================================================================
  // SPECIAL CHARACTERS
  // ==========================================================================

  log('\nSpecial Character Tests:', 'cyan');
  log('─'.repeat(50), 'cyan');

  await testCase(
    'Unicode characters',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check/grammar`, {
      text: 'Testing émojis 😀 and spëcial çharacters'
    }),
    true
  );

  await testCase(
    'Emojis only',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check/grammar`, {
      text: '😀😁😂🤣😃😄😅😆'
    }),
    true
  );

  await testCase(
    'Mixed scripts (Latin + Cyrillic)',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check/grammar`, {
      text: 'Hello мир world'
    }),
    true
  );

  await testCase(
    'Special HTML entities',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check/grammar`, {
      text: '<script>alert("test");</script> &lt;div&gt;'
    }),
    true
  );

  await testCase(
    'Newlines and tabs',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check/grammar`, {
      text: 'Line 1\n\nLine 2\tTab\tSeparated'
    }),
    true
  );

  // ==========================================================================
  // RESOURCE ACCESS TESTS
  // ==========================================================================

  log('\nResource Access Tests:', 'cyan');
  log('─'.repeat(50), 'cyan');

  await testCase(
    'Non-existent check ID',
    () => axios.get(`${CONFIG.SERVER_URL}/api/results/nonexistent-12345`),
    false
  );

  await testCase(
    'Malformed check ID',
    () => axios.get(`${CONFIG.SERVER_URL}/api/results/../../etc/passwd`),
    false
  );

  await testCase(
    'Export non-existent scan',
    () => axios.post(`${CONFIG.SERVER_URL}/api/results/scan-nonexistent/export`),
    false
  );

  await testCase(
    'Delete non-existent check',
    () => axios.delete(`${CONFIG.SERVER_URL}/api/results/nonexistent-12345`),
    true // Delete should succeed even if not found (idempotent)
  );

  // ==========================================================================
  // INVALID PARAMETERS
  // ==========================================================================

  log('\nInvalid Parameter Tests:', 'cyan');
  log('─'.repeat(50), 'cyan');

  await testCase(
    'Invalid sensitivity level (0)',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check/plagiarism`, {
      text: 'Test text',
      options: { sensitivityLevel: 0 }
    }),
    true // Should accept and normalize
  );

  await testCase(
    'Invalid sensitivity level (10)',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check/plagiarism`, {
      text: 'Test text',
      options: { sensitivityLevel: 10 }
    }),
    true // Should accept and normalize
  );

  await testCase(
    'Invalid language code',
    () => axios.post(`${CONFIG.SERVER_URL}/api/check/grammar`, {
      text: 'Test text',
      options: { language: 'xyz123' }
    }),
    true // Should accept (API handles invalid codes)
  );

  // ==========================================================================
  // HTTP METHOD TESTS
  // ==========================================================================

  log('\nHTTP Method Tests:', 'cyan');
  log('─'.repeat(50), 'cyan');

  await testCase(
    'GET on POST endpoint',
    () => axios.get(`${CONFIG.SERVER_URL}/api/check`),
    false
  );

  await testCase(
    'PUT on POST endpoint',
    () => axios.put(`${CONFIG.SERVER_URL}/api/check`, { text: 'test' }),
    false
  );

  await testCase(
    'DELETE on POST endpoint',
    () => axios.delete(`${CONFIG.SERVER_URL}/api/check`),
    false
  );

  // ==========================================================================
  // CONTENT TYPE TESTS
  // ==========================================================================

  log('\nContent Type Tests:', 'cyan');
  log('─'.repeat(50), 'cyan');

  await testCase(
    'Missing Content-Type header',
    () => axios.post(
      `${CONFIG.SERVER_URL}/api/check/grammar`,
      'text=test',
      { headers: { 'Content-Type': 'text/plain' } }
    ),
    false
  );

  await testCase(
    'Form-encoded instead of JSON',
    () => axios.post(
      `${CONFIG.SERVER_URL}/api/check/grammar`,
      'text=test',
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ),
    false
  );

  // ==========================================================================
  // CONCURRENT REQUESTS
  // ==========================================================================

  log('\nConcurrency Tests:', 'cyan');
  log('─'.repeat(50), 'cyan');

  try {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        axios.post(`${CONFIG.SERVER_URL}/api/check/grammar`, {
          text: `Test text ${i}`,
          checkId: `concurrent-${i}`
        })
      );
    }

    const responses = await Promise.all(promises);
    const allSuccess = responses.every(r => r.data.success);

    if (allSuccess) {
      log('  ✓ Concurrent requests: All 5 succeeded', 'green');
      results.passed++;
    } else {
      log('  ✗ Concurrent requests: Some failed', 'red');
      results.failed++;
    }
  } catch (error) {
    log('  ✗ Concurrent requests: Error occurred', 'red');
    log(`    ${error.message}`, 'red');
    results.failed++;
  }

  // ==========================================================================
  // CREATE AND DELETE LIFECYCLE
  // ==========================================================================

  log('\nLifecycle Tests:', 'cyan');
  log('─'.repeat(50), 'cyan');

  try {
    const checkId = `lifecycle-${Date.now()}`;

    // Create
    const createRes = await axios.post(`${CONFIG.SERVER_URL}/api/check/grammar`, {
      text: 'Lifecycle test',
      checkId
    });

    if (!createRes.data.success) {
      throw new Error('Create failed');
    }

    // Retrieve
    const getRes = await axios.get(`${CONFIG.SERVER_URL}/api/results/${checkId}`);

    if (!getRes.data.grammar) {
      throw new Error('Retrieve failed');
    }

    // Delete
    await axios.delete(`${CONFIG.SERVER_URL}/api/results/${checkId}`);

    // Verify deleted
    try {
      await axios.get(`${CONFIG.SERVER_URL}/api/results/${checkId}`);
      throw new Error('Should have been deleted');
    } catch (error) {
      if (error.response?.status !== 404) {
        throw error;
      }
    }

    log('  ✓ Create-Retrieve-Delete lifecycle: Passed', 'green');
    results.passed++;

  } catch (error) {
    log('  ✗ Create-Retrieve-Delete lifecycle: Failed', 'red');
    log(`    ${error.message}`, 'red');
    results.failed++;
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================

  const total = results.passed + results.failed;
  const passRate = ((results.passed / total) * 100).toFixed(1);

  log('\n' + '═'.repeat(50), 'cyan');
  log('SUMMARY:', 'cyan');
  log('═'.repeat(50), 'cyan');
  log(`Total Tests: ${total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Pass Rate: ${passRate}%\n`, passRate >= 80 ? 'green' : 'yellow');

  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
