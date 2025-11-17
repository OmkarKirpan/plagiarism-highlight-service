#!/usr/bin/env node

/**
 * Test script for Copyleaks Plagiarism Check
 *
 * This script tests the plagiarism detection functionality by:
 * 1. Submitting a text scan
 * 2. Waiting for webhook completion
 * 3. Checking results
 *
 * Usage: node test-plagiarism.js
 */

require('dotenv').config();
const axios = require('axios');

const CONFIG = {
  SERVER_URL: `http://localhost:${process.env.PORT || 3000}`,
  TEST_TEXT: `Plagiarism is the representation of another person's language, thoughts, ideas, or expressions as one's own original work.
Although precise definitions vary depending on the institution, such representations are generally considered to violate journalistic ethics
as well as academic integrity and could, in some cases, be considered plagiarism and/or copyright infringement. Plagiarism is not in itself a crime,
but like counterfeiting fraud can be punished in a court for prejudices caused by copyright infringement, violation of moral rights, or torts.`,
  POLL_INTERVAL: 5000, // 5 seconds
  MAX_POLLS: 24 // 2 minutes total (24 * 5s)
};

// Color codes for output
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

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkHealth() {
  logSection('1. Health Check');
  try {
    const response = await axios.get(`${CONFIG.SERVER_URL}/health`);
    log('✓ Server is running', 'green');
    log(`  Status: ${response.data.status}`, 'blue');
    log(`  Authenticated: ${response.data.authenticated}`, 'blue');
    return true;
  } catch (error) {
    log('✗ Server health check failed', 'red');
    log(`  Error: ${error.message}`, 'red');
    return false;
  }
}

async function submitPlagiarismCheck() {
  logSection('2. Submit Plagiarism Check');

  try {
    const requestBody = {
      text: CONFIG.TEST_TEXT,
      options: {
        sensitivityLevel: 3,
        language: 'en'
      }
    };

    log(`Submitting text (${CONFIG.TEST_TEXT.length} characters)...`, 'yellow');

    const response = await axios.post(
      `${CONFIG.SERVER_URL}/api/check/plagiarism`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      log('✓ Plagiarism check submitted successfully', 'green');
      log(`  Scan ID: ${response.data.scanId}`, 'blue');
      log(`  Status: ${response.data.result.status}`, 'blue');
      return response.data.scanId;
    } else {
      log('✗ Submission failed', 'red');
      return null;
    }
  } catch (error) {
    log('✗ Submission error', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    if (error.response?.data) {
      log(`  Details: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
    return null;
  }
}

async function pollForResults(scanId) {
  logSection('3. Poll for Results');

  let pollCount = 0;

  while (pollCount < CONFIG.MAX_POLLS) {
    pollCount++;

    try {
      log(`Polling attempt ${pollCount}/${CONFIG.MAX_POLLS}...`, 'yellow');

      const response = await axios.get(
        `${CONFIG.SERVER_URL}/api/results/${scanId.replace('scan-', '')}`
      );

      const plagiarismResult = response.data.plagiarism;

      if (!plagiarismResult) {
        log('  No plagiarism data yet', 'yellow');
      } else if (plagiarismResult.status === 'completed') {
        log('✓ Scan completed!', 'green');
        log(`  Status: ${plagiarismResult.status}`, 'blue');
        log(`  Results count: ${plagiarismResult.results?.length || 0}`, 'blue');

        if (plagiarismResult.results && plagiarismResult.results.length > 0) {
          log(`  Match percentage: ${plagiarismResult.results[0].matchPercentage || 0}%`, 'blue');
        }

        return plagiarismResult;
      } else if (plagiarismResult.status === 'error') {
        log('✗ Scan failed', 'red');
        log(`  Error: ${JSON.stringify(plagiarismResult, null, 2)}`, 'red');
        return null;
      } else {
        log(`  Status: ${plagiarismResult.status || 'pending'}`, 'yellow');
      }

    } catch (error) {
      log(`  Polling error: ${error.message}`, 'red');
    }

    if (pollCount < CONFIG.MAX_POLLS) {
      await sleep(CONFIG.POLL_INTERVAL);
    }
  }

  log('✗ Timeout: Scan did not complete within expected time', 'red');
  return null;
}

async function exportResults(scanId) {
  logSection('4. Export Results');

  try {
    log('Requesting export...', 'yellow');

    const response = await axios.post(
      `${CONFIG.SERVER_URL}/api/results/${scanId}/export`,
      {},
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      log('✓ Export initiated successfully', 'green');
      log(`  Export ID: ${response.data.exportId}`, 'blue');
      return response.data.exportId;
    } else {
      log('✗ Export failed', 'red');
      return null;
    }
  } catch (error) {
    log('✗ Export error', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');

    if (error.response?.status === 400) {
      log('  This may be expected if no plagiarism was detected', 'yellow');
    }

    return null;
  }
}

async function getHighlightedText(checkId) {
  logSection('5. Get Highlighted Text');

  // Poll for export completion
  let pollCount = 0;

  while (pollCount < CONFIG.MAX_POLLS) {
    pollCount++;

    try {
      log(`Polling for highlighted text ${pollCount}/${CONFIG.MAX_POLLS}...`, 'yellow');

      const response = await axios.get(
        `${CONFIG.SERVER_URL}/api/results/${checkId}/highlighted`
      );

      if (response.data.success) {
        log('✓ Highlighted text retrieved', 'green');
        log(`  Grammar issues: ${response.data.statistics?.grammarIssues || 0}`, 'blue');
        log(`  Plagiarism matches: ${response.data.statistics?.plagiarismMatches || 0}`, 'blue');

        if (response.data.html) {
          log(`  HTML length: ${response.data.html.length} characters`, 'blue');
        }

        return response.data;
      }
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        log(`  Not ready yet: ${error.response?.data?.error || error.message}`, 'yellow');
      } else {
        log(`  Error: ${error.message}`, 'red');
      }
    }

    if (pollCount < CONFIG.MAX_POLLS) {
      await sleep(CONFIG.POLL_INTERVAL);
    }
  }

  log('✗ Timeout: Could not retrieve highlighted text', 'red');
  return null;
}

async function runTests() {
  console.log('\n');
  log('Copyleaks Plagiarism Check Test Suite', 'cyan');
  log('========================================', 'cyan');
  log(`Server URL: ${CONFIG.SERVER_URL}`, 'blue');
  log(`Text length: ${CONFIG.TEST_TEXT.length} characters`, 'blue');
  console.log('\n');

  // Step 1: Health check
  const healthOk = await checkHealth();
  if (!healthOk) {
    log('\n❌ Test suite aborted: Server is not running or not healthy', 'red');
    log('Please start the server with: npm start', 'yellow');
    process.exit(1);
  }

  // Step 2: Submit plagiarism check
  const scanId = await submitPlagiarismCheck();
  if (!scanId) {
    log('\n❌ Test suite aborted: Could not submit plagiarism check', 'red');
    process.exit(1);
  }

  // Step 3: Poll for results
  const result = await pollForResults(scanId);
  if (!result) {
    log('\n⚠️  Warning: Could not get scan results', 'yellow');
  }

  // Step 4: Export results (if completed)
  if (result && result.status === 'completed' && result.results?.length > 0) {
    const exportId = await exportResults(scanId);
    if (exportId) {
      // Step 5: Get highlighted text
      const checkId = scanId.replace('scan-', '');
      await getHighlightedText(checkId);
    }
  }

  // Final summary
  logSection('Test Summary');
  log('✓ Health check passed', 'green');
  log('✓ Plagiarism check submitted', 'green');

  if (result) {
    log('✓ Results retrieved', 'green');
  } else {
    log('✗ Results retrieval failed or timed out', 'red');
  }

  log('\n✓ Test suite completed', 'green');
  console.log('\n');
}

// Run tests
runTests().catch(error => {
  console.error('\n');
  log('❌ Unexpected error:', 'red');
  console.error(error);
  process.exit(1);
});
