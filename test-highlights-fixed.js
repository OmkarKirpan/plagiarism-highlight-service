#!/usr/bin/env node

/**
 * Comprehensive Test for Fixed Text Highlighting Features
 *
 * This test verifies all the fixes made to:
 * - Crawled text extraction
 * - API error handling
 * - HTML generation
 * - Webhook connectivity
 * - CSS stylesheet serving
 */

const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.COPYLEAKS_API_KEY;
const EMAIL = process.env.COPYLEAKS_EMAIL;

// Test state
let testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Console colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Log test result
 */
function logTest(name, success, message = '') {
  if (success) {
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    if (message) console.log(`  ${colors.dim}${message}${colors.reset}`);
    testResults.passed.push(name);
  } else {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    if (message) console.log(`  ${colors.red}${message}${colors.reset}`);
    testResults.failed.push(name);
  }
}

/**
 * Log warning
 */
function logWarning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
  testResults.warnings.push(message);
}

/**
 * Test webhook connectivity
 */
async function testWebhookConnectivity() {
  console.log(`\n${colors.cyan}Testing webhook connectivity...${colors.reset}`);

  try {
    // Get webhook test info
    const response = await axios.get(`${BASE_URL}/api/test-webhook`);

    logTest('Webhook test endpoint accessible', true,
      `Test ID: ${response.data.testId}`);

    // Check webhook configuration
    const config = response.data.currentConfig;
    if (!config.webhookBaseUrl || config.webhookBaseUrl.includes('your-server')) {
      logWarning('Webhook base URL not configured properly in .env file');
      logWarning('Set WEBHOOK_BASE_URL to your public URL (use ngrok for local dev)');
    } else {
      logTest('Webhook URL configured', true,
        `Base URL: ${config.webhookBaseUrl}`);
    }

    // Test the webhook receiver
    const testWebhookUrl = `${BASE_URL}/webhook/test/manual-test`;
    const webhookResponse = await axios.post(testWebhookUrl, {
      test: true,
      timestamp: new Date().toISOString()
    });

    logTest('Webhook receiver working', webhookResponse.data.received === true);

  } catch (error) {
    logTest('Webhook connectivity test', false, error.message);
  }
}

/**
 * Test CSS stylesheet serving
 */
async function testCssStylesheet() {
  console.log(`\n${colors.cyan}Testing CSS stylesheet...${colors.reset}`);

  try {
    const response = await axios.get(`${BASE_URL}/api/stylesheet`);

    // Check content type
    const contentType = response.headers['content-type'];
    logTest('CSS content-type header', contentType.includes('text/css'),
      `Content-Type: ${contentType}`);

    // Check for essential CSS classes
    const css = response.data;
    const essentialClasses = [
      '.grammar-error',
      '.spelling-error',
      '.plagiarism-match',
      '.plagiarism-identical',
      '.plagiarism-minor',
      '.plagiarism-paraphrased'
    ];

    let allClassesFound = true;
    essentialClasses.forEach(className => {
      if (!css.includes(className)) {
        allClassesFound = false;
        logWarning(`Missing CSS class: ${className}`);
      }
    });

    logTest('All essential CSS classes present', allClassesFound);

    // Check for tooltip styles
    logTest('Tooltip styles present', css.includes('[data-message]:hover::after'));

  } catch (error) {
    logTest('CSS stylesheet test', false, error.message);
  }
}

/**
 * Test plagiarism scan submission with error handling
 */
async function testPlagiarismSubmission() {
  console.log(`\n${colors.cyan}Testing plagiarism scan submission...${colors.reset}`);

  const testText = `This is a test document to check the highlighting functionality.
  It contains multiple sentences that will be analyzed for grammar errors and plagiarism.
  We need to ensure that the text extraction, error handling, and HTML generation
  all work correctly after the fixes have been applied.`;

  try {
    // Submit for checking
    const checkResponse = await axios.post(`${BASE_URL}/api/check`, {
      text: testText,
      checkId: `test-${Date.now()}`,
      options: {
        sensitivityLevel: 3,
        includeHtml: true
      }
    });

    const { checkId, scanId } = checkResponse.data;

    logTest('Text submission successful', true,
      `Check ID: ${checkId}, Scan ID: ${scanId}`);

    // Check grammar results (should work immediately if API key has access)
    if (checkResponse.data.grammar) {
      if (checkResponse.data.grammar.error) {
        logWarning(`Grammar check unavailable: ${checkResponse.data.grammar.error}`);
      } else {
        logTest('Grammar check completed', true);
      }
    }

    // Check plagiarism submission
    if (checkResponse.data.plagiarism) {
      if (checkResponse.data.plagiarism.error) {
        logTest('Plagiarism scan submission', false,
          checkResponse.data.plagiarism.error);
      } else {
        logTest('Plagiarism scan initiated',
          checkResponse.data.plagiarism.status === 'pending');
      }
    }

    return { checkId, scanId };

  } catch (error) {
    // Test enhanced error handling
    if (error.response) {
      const errorMsg = error.response.data.error || error.message;

      // Check if error message is informative
      if (errorMsg.includes('Authentication') ||
          errorMsg.includes('credentials') ||
          errorMsg.includes('API key') ||
          errorMsg.includes('permission')) {
        logWarning(`API authentication issue: ${errorMsg}`);
        logTest('Error handling provides clear messages', true);
      } else {
        logTest('Plagiarism submission', false, errorMsg);
      }
    } else {
      logTest('Plagiarism submission', false, error.message);
    }

    return null;
  }
}

/**
 * Test highlighted text retrieval
 */
async function testHighlightRetrieval(checkId) {
  console.log(`\n${colors.cyan}Testing highlight retrieval...${colors.reset}`);

  if (!checkId) {
    logWarning('Skipping highlight retrieval test (no checkId available)');
    return;
  }

  try {
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to get highlighted results
    const response = await axios.get(`${BASE_URL}/api/results/${checkId}/highlighted`);

    if (response.data.success) {
      const { highlightedHTML, statistics, lineReport } = response.data;

      logTest('Highlighted HTML generated', !!highlightedHTML);
      logTest('Statistics generated', !!statistics);
      logTest('Line report generated', !!lineReport);

      // Check if HTML contains highlight spans
      if (highlightedHTML) {
        const hasHighlights = highlightedHTML.includes('<span class=');
        logTest('HTML contains highlight spans', hasHighlights);

        if (!hasHighlights && statistics.totalHighlights === 0) {
          logWarning('No highlights found (text may not have errors or matches)');
        }
      }
    } else {
      logTest('Highlight retrieval', false, 'Response not successful');
    }

  } catch (error) {
    if (error.response?.status === 404) {
      logWarning('Results not found (webhooks may not have been received yet)');
    } else if (error.response?.status === 400) {
      const details = error.response.data.details;
      if (details) {
        console.log(`  ${colors.dim}Debug info:${colors.reset}`);
        console.log(`    Has grammar data: ${details.hasGrammarData}`);
        console.log(`    Has exported data: ${details.hasExportedData}`);
        console.log(`    Has crawled version: ${details.hasCrawledVersion}`);

        if (details.hasCrawledVersion && !details.hasGrammarData) {
          logWarning('Text extraction issue - crawled data present but not extracted');
        }
      }
      logTest('Highlight retrieval', false, error.response.data.error);
    } else {
      logTest('Highlight retrieval', false, error.message);
    }
  }
}

/**
 * Test debug endpoint
 */
async function testDebugEndpoint(checkId) {
  console.log(`\n${colors.cyan}Testing debug endpoint...${colors.reset}`);

  if (!checkId) {
    logWarning('Skipping debug endpoint test (no checkId available)');
    return;
  }

  try {
    const response = await axios.get(`${BASE_URL}/api/debug/${checkId}`);
    const debug = response.data;

    logTest('Debug endpoint accessible', true);

    // Log debug information
    if (debug.grammarData) {
      console.log(`  Grammar data: ${debug.grammarData.hasText ? 'Text available' : 'No text'}`);
    }

    if (debug.exportedData) {
      console.log(`  Exported data: ${debug.exportedData.exists ? 'Present' : 'Missing'}`);
      if (debug.exportedData.hasCrawledVersion) {
        console.log(`    Crawled version: ${debug.exportedData.crawledVersionType}`);
        console.log(`    Text extraction paths checked:`);
        console.log(`      - text.value: ${debug.exportedData.crawledVersionTextValuePath}`);
        console.log(`      - text: ${debug.exportedData.crawledVersionTextPath}`);
      }
    }

  } catch (error) {
    logTest('Debug endpoint test', false, error.message);
  }
}

/**
 * Print test summary
 */
function printSummary() {
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}TEST SUMMARY${colors.reset}`);
  console.log(`${'='.repeat(60)}`);

  console.log(`${colors.green}Passed: ${testResults.passed.length}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed.length}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${testResults.warnings.length}${colors.reset}`);

  if (testResults.failed.length > 0) {
    console.log(`\n${colors.red}Failed tests:${colors.reset}`);
    testResults.failed.forEach(test => {
      console.log(`  - ${test}`);
    });
  }

  if (testResults.warnings.length > 0) {
    console.log(`\n${colors.yellow}Warnings:${colors.reset}`);
    testResults.warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
  }

  // Provide recommendations
  console.log(`\n${colors.cyan}Recommendations:${colors.reset}`);

  if (!process.env.WEBHOOK_BASE_URL || process.env.WEBHOOK_BASE_URL.includes('your-server')) {
    console.log(`1. Set up webhook URL for local development:`);
    console.log(`   - Install ngrok: npm install -g ngrok`);
    console.log(`   - Run: ngrok http ${process.env.PORT || 3000}`);
    console.log(`   - Update WEBHOOK_BASE_URL in .env with the ngrok URL`);
  }

  if (!API_KEY || !EMAIL) {
    console.log(`2. Configure Copyleaks API credentials in .env:`);
    console.log(`   - COPYLEAKS_EMAIL=your-email@example.com`);
    console.log(`   - COPYLEAKS_API_KEY=your-api-key`);
  }

  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}TEXT HIGHLIGHTING FEATURE TEST${colors.reset}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Server: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}`);

  try {
    // Test server health
    console.log(`\n${colors.cyan}Testing server health...${colors.reset}`);
    const health = await axios.get(`${BASE_URL}/health`);
    logTest('Server is running', health.data.status === 'ok');
    logTest('Authentication status', health.data.authenticated,
      health.data.authenticated ? 'Authenticated' : 'Not authenticated');

    // Run tests
    await testWebhookConnectivity();
    await testCssStylesheet();

    const submission = await testPlagiarismSubmission();
    if (submission) {
      await testHighlightRetrieval(submission.checkId);
      await testDebugEndpoint(submission.checkId);
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error(`${colors.red}ERROR: Cannot connect to server at ${BASE_URL}${colors.reset}`);
      console.error(`Make sure the server is running: npm start`);
    } else {
      console.error(`${colors.red}ERROR: ${error.message}${colors.reset}`);
    }
  }

  printSummary();
}

// Run tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});