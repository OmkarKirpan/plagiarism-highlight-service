#!/usr/bin/env node

/**
 * Grammar-Only Test Script
 *
 * Quick grammar checking tests that don't use credits.
 * Ideal for rapid testing of grammar functionality.
 *
 * Usage: node test-grammar-only.js
 */

require('dotenv').config();
const axios = require('axios');

const CONFIG = {
  SERVER_URL: `http://localhost:${process.env.PORT || 3000}`
};

const TEST_SAMPLES = [
  {
    name: 'Heavy Grammar Errors',
    text: "This are a sentance with alot of grammer errors, and some mispellings to! Its very bad writen.",
    expectErrors: true
  },
  {
    name: 'Clean Text',
    text: "This is a perfectly written sentence with proper grammar, spelling, and punctuation.",
    expectErrors: false
  },
  {
    name: 'Mixed Errors',
    text: "The company's finacial reports shows that their making good progress, however there challenges remain.",
    expectErrors: true
  },
  {
    name: 'Punctuation Issues',
    text: "Hello world How are you doing today. Im fine thanks",
    expectErrors: true
  },
  {
    name: 'Style Issues',
    text: "The utilization of complex terminology and verbose expressions can potentially obfuscate the intended meaning.",
    expectErrors: null // May or may not have style suggestions
  },
  {
    name: 'Unicode and Emojis',
    text: "Testing émojis 😀 and spëcial çharacters with áccents in Français.",
    expectErrors: null
  }
];

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

async function testGrammar(sample) {
  const checkId = `grammar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const response = await axios.post(
      `${CONFIG.SERVER_URL}/api/check/grammar`,
      {
        text: sample.text,
        checkId,
        options: { language: 'en' }
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const data = response.data;

    if (!data.success || !data.result) {
      log(`  ✗ ${sample.name}: Unexpected response format`, 'red');
      return false;
    }

    const stats = data.result.statistics || {};
    const totalErrors = stats.totalErrors || 0;
    const categorized = data.result.categorized || {};

    // Check if expectations match
    let passed = true;
    if (sample.expectErrors === true && totalErrors === 0) {
      passed = false;
    } else if (sample.expectErrors === false && totalErrors > 0) {
      passed = false;
    }

    const status = passed ? '✓' : '✗';
    const statusColor = passed ? 'green' : 'red';

    log(`  ${status} ${sample.name}`, statusColor);
    log(`    Total Errors: ${totalErrors}`, 'blue');

    if (totalErrors > 0) {
      log(`    - Grammar: ${stats.grammarErrors || 0}`, 'blue');
      log(`    - Spelling: ${stats.spellingErrors || 0}`, 'blue');
      log(`    - Punctuation: ${stats.punctuationErrors || 0}`, 'blue');
      log(`    - Style: ${stats.styleIssues || 0}`, 'blue');
    }

    if (data.result.warning) {
      log(`    Warning: ${data.result.warning}`, 'yellow');
    }

    return passed;

  } catch (error) {
    log(`  ✗ ${sample.name}: ${error.message}`, 'red');
    if (error.response?.data) {
      log(`    ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

async function runTests() {
  log('\n╔═══════════════════════════════════════════════╗', 'cyan');
  log('║   GRAMMAR-ONLY TEST SUITE                  ║', 'cyan');
  log('╚═══════════════════════════════════════════════╝', 'cyan');
  log(`\nServer: ${CONFIG.SERVER_URL}\n`, 'blue');

  // Health check
  try {
    const health = await axios.get(`${CONFIG.SERVER_URL}/health`);
    if (health.data.status === 'ok' && health.data.authenticated) {
      log('✓ Server health check passed\n', 'green');
    } else {
      log('✗ Server not ready\n', 'red');
      process.exit(1);
    }
  } catch (error) {
    log('✗ Server not running\n', 'red');
    log('  Please start with: npm start\n', 'yellow');
    process.exit(1);
  }

  // Run tests
  log('Running Grammar Tests:', 'cyan');
  log('─'.repeat(50), 'cyan');

  let passed = 0;
  let failed = 0;

  for (const sample of TEST_SAMPLES) {
    const result = await testGrammar(sample);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  // Summary
  log('\n' + '═'.repeat(50), 'cyan');
  log('SUMMARY:', 'cyan');
  log('═'.repeat(50), 'cyan');
  log(`Total Tests: ${TEST_SAMPLES.length}`, 'blue');
  log(`Passed: ${passed}`, passed > 0 ? 'green' : 'reset');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Pass Rate: ${((passed / TEST_SAMPLES.length) * 100).toFixed(1)}%\n`,
      failed === 0 ? 'green' : 'yellow');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
