#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Copyleaks Integration (Non-Sandbox Mode)
 *
 * This script performs thorough testing of all API endpoints with real Copyleaks credits.
 *
 * Usage: node test-comprehensive.js [--phase=<phase>] [--save-outputs]
 *
 * Phases:
 *   all - Run all tests (default)
 *   preflight - Health and account checks only
 *   grammar - Grammar-only tests
 *   plagiarism - Plagiarism detection tests
 *   combined - Combined grammar + plagiarism tests
 *   export - Export and highlighting tests
 *   edge - Edge cases and error handling
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  SERVER_URL: `http://localhost:${process.env.PORT || 3000}`,
  POLL_INTERVAL: 5000, // 5 seconds
  MAX_POLLS: 36, // 3 minutes total
  SAVE_OUTPUTS: process.argv.includes('--save-outputs'),
  OUTPUT_DIR: './test-outputs',
  PHASE: (() => {
    const phaseArg = process.argv.find(arg => arg.startsWith('--phase='));
    return phaseArg ? phaseArg.split('=')[1] : 'all';
  })()
};

// Test data samples
const TEST_SAMPLES = {
  grammarHeavy: "This are a sentance with alot of grammer errors, and some mispellings to! The companies finacial reports shows that their making good progress.",
  grammarClean: "This is a well-written sentence with proper grammar and punctuation.",
  grammarMixed: "The company's financial reports shows that their making good progress, however there challenges remain in supply chain management.",

  plagiarismKnown: "Plagiarism is the representation of another person's language, thoughts, ideas, or expressions as one's own original work. Although precise definitions vary depending on the institution, such representations are generally considered to violate journalistic ethics as well as academic integrity and could, in some cases, be considered plagiarism and copyright infringement.",

  plagiarismOriginal: "The newly developed quantum photonic processor demonstrates unprecedented computational capabilities in zerogravity environments during the 2024 experimental phase conducted at the international space facility using specialized titanium-based sensor arrays.",

  plagiarismMixed: "Introduction with original thoughts about technology advancement. Plagiarism is the representation of another person's language, thoughts, ideas, or expressions as one's own original work. Conclusion with original analysis of future implications.",

  combined: "The artifical intelligence is revolutionizing many industries. Artificial intelligence is intelligence demonstrated by machines, in contrast to the natural intelligence displayed by humans and animals.",

  unicode: "Testing émojis 😀 and spëcial çharacters with áccents.",
  veryShort: "Test text.",
  empty: ""
};

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Test results tracker
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
  startTime: Date.now(),
  creditsUsed: 0
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70));
}

function logTest(name, status, details = '') {
  const symbols = { pass: '✓', fail: '✗', skip: '⊘' };
  const colorMap = { pass: 'green', fail: 'red', skip: 'yellow' };
  log(`${symbols[status]} ${name}`, colorMap[status]);
  if (details) {
    log(`  ${details}`, 'blue');
  }
}

function recordTest(name, passed, details = '', error = null) {
  results.total++;
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }

  results.tests.push({
    name,
    passed,
    details,
    error: error ? error.message : null,
    timestamp: new Date().toISOString()
  });

  logTest(name, passed ? 'pass' : 'fail', details);
}

function skipTest(name, reason) {
  results.total++;
  results.skipped++;
  results.tests.push({
    name,
    skipped: true,
    reason,
    timestamp: new Date().toISOString()
  });
  logTest(name, 'skip', reason);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function saveOutput(filename, data) {
  if (!CONFIG.SAVE_OUTPUTS) return;

  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }

  const filepath = path.join(CONFIG.OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  log(`  Saved: ${filepath}`, 'blue');
}

async function pollForCompletion(checkId, scanId, testName) {
  let pollCount = 0;

  while (pollCount < CONFIG.MAX_POLLS) {
    pollCount++;

    try {
      const response = await axios.get(
        `${CONFIG.SERVER_URL}/api/results/${checkId}`
      );

      const plagiarismResult = response.data.plagiarism;

      if (plagiarismResult.status === 'completed') {
        return plagiarismResult;
      } else if (plagiarismResult.status === 'error') {
        throw new Error(`Scan error: ${JSON.stringify(plagiarismResult.error)}`);
      }

      if (pollCount % 3 === 0) {
        log(`  Polling ${testName}... (${pollCount}/${CONFIG.MAX_POLLS})`, 'yellow');
      }

    } catch (error) {
      if (error.response?.status !== 404 && pollCount > 2) {
        throw error;
      }
    }

    await sleep(CONFIG.POLL_INTERVAL);
  }

  throw new Error('Timeout waiting for scan completion');
}

// =============================================================================
// PHASE 1: PRE-FLIGHT CHECKS
// =============================================================================

async function testHealth() {
  try {
    const response = await axios.get(`${CONFIG.SERVER_URL}/health`);
    const data = response.data;

    if (data.status === 'ok' && data.authenticated) {
      recordTest('Health Check', true, `Server: ${data.service}, Auth: ${data.authenticated}`);
      return true;
    } else {
      recordTest('Health Check', false, `Status: ${data.status}, Auth: ${data.authenticated}`);
      return false;
    }
  } catch (error) {
    recordTest('Health Check', false, 'Server not responding', error);
    return false;
  }
}

async function testAccountCredits() {
  try {
    const response = await axios.get(`${CONFIG.SERVER_URL}/api/account`);
    const data = response.data;

    saveOutput('account-info.json', data);

    const credits = data.credits || data.balance || 'unknown';
    recordTest('Account Credits Check', true, `Credits available: ${JSON.stringify(credits)}`);
    return true;
  } catch (error) {
    recordTest('Account Credits Check', false, 'Failed to get account info', error);
    return false;
  }
}

async function testStylesheet() {
  try {
    const response = await axios.get(`${CONFIG.SERVER_URL}/api/stylesheet`);
    const css = response.data;

    const hasGrammarStyles = css.includes('grammar-error');
    const hasPlagiarismStyles = css.includes('plagiarism-');

    if (hasGrammarStyles && hasPlagiarismStyles) {
      recordTest('Stylesheet Retrieval', true, `CSS length: ${css.length} chars`);
      return true;
    } else {
      recordTest('Stylesheet Retrieval', false, 'Missing required CSS classes');
      return false;
    }
  } catch (error) {
    recordTest('Stylesheet Retrieval', false, 'Failed to get stylesheet', error);
    return false;
  }
}

async function runPreflightTests() {
  logSection('PHASE 1: PRE-FLIGHT CHECKS');

  const healthOk = await testHealth();
  if (!healthOk) {
    log('\n❌ Server is not running or not authenticated. Aborting tests.', 'red');
    return false;
  }

  await testAccountCredits();
  await testStylesheet();

  return true;
}

// =============================================================================
// PHASE 2: GRAMMAR-ONLY TESTS
// =============================================================================

async function testGrammarCheck(testName, text, expectedErrors = null) {
  try {
    const response = await axios.post(
      `${CONFIG.SERVER_URL}/api/check/grammar`,
      {
        text,
        checkId: `grammar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const data = response.data;
    saveOutput(`grammar-${testName}.json`, data);

    if (data.success && data.result) {
      const totalErrors = data.result.statistics?.totalErrors || 0;
      let details = `${totalErrors} errors found`;

      if (expectedErrors !== null) {
        const passed = expectedErrors === 'any' ? totalErrors > 0 : totalErrors === expectedErrors;
        recordTest(testName, passed, details);
        return passed;
      } else {
        recordTest(testName, true, details);
        return true;
      }
    } else {
      recordTest(testName, false, 'Unexpected response format');
      return false;
    }
  } catch (error) {
    recordTest(testName, false, 'Request failed', error);
    return false;
  }
}

async function runGrammarTests() {
  logSection('PHASE 2: GRAMMAR-ONLY TESTS');

  await testGrammarCheck('Grammar: Heavy Errors', TEST_SAMPLES.grammarHeavy, 'any');
  await testGrammarCheck('Grammar: Clean Text', TEST_SAMPLES.grammarClean, 0);
  await testGrammarCheck('Grammar: Mixed Errors', TEST_SAMPLES.grammarMixed, 'any');
  await testGrammarCheck('Grammar: Unicode Text', TEST_SAMPLES.unicode);
}

// =============================================================================
// PHASE 3: PLAGIARISM-ONLY TESTS
// =============================================================================

async function testPlagiarismCheck(testName, text, options = {}, expectedMatch = null) {
  const checkId = `plag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const scanId = `scan-${checkId}`;

  try {
    // Submit scan
    const response = await axios.post(
      `${CONFIG.SERVER_URL}/api/check/plagiarism`,
      {
        text,
        scanId,
        options: {
          sensitivityLevel: options.sensitivityLevel || 3
        }
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.data.success) {
      recordTest(testName, false, 'Submission failed');
      return false;
    }

    log(`  Submitted: ${scanId}`, 'blue');
    results.creditsUsed++;

    // Poll for completion
    const result = await pollForCompletion(checkId, scanId, testName);

    saveOutput(`plagiarism-${testName}.json`, result);

    const matchPercentage = result.summary?.plagiarismPercentage || 0;
    const resultCount = result.results?.length || 0;

    let details = `${matchPercentage}% plagiarism, ${resultCount} sources`;

    if (expectedMatch !== null) {
      let passed = false;
      if (expectedMatch === 'high') {
        passed = matchPercentage > 10;
      } else if (expectedMatch === 'low') {
        passed = matchPercentage < 10;
      } else if (expectedMatch === 'none') {
        passed = resultCount === 0;
      }
      recordTest(testName, passed, details);
      return passed;
    } else {
      recordTest(testName, true, details);
      return true;
    }

  } catch (error) {
    recordTest(testName, false, 'Test failed', error);
    return false;
  }
}

async function runPlagiarismTests() {
  logSection('PHASE 3: PLAGIARISM-ONLY TESTS');

  await testPlagiarismCheck(
    'Plagiarism: Known Source',
    TEST_SAMPLES.plagiarismKnown,
    { sensitivityLevel: 3 },
    'high'
  );

  await testPlagiarismCheck(
    'Plagiarism: Original Content',
    TEST_SAMPLES.plagiarismOriginal,
    { sensitivityLevel: 3 },
    'low'
  );

  await testPlagiarismCheck(
    'Plagiarism: Mixed Content',
    TEST_SAMPLES.plagiarismMixed,
    { sensitivityLevel: 3 }
  );

  log('\n  Testing different sensitivity levels...', 'yellow');

  await testPlagiarismCheck(
    'Plagiarism: Sensitivity Level 1',
    TEST_SAMPLES.plagiarismKnown,
    { sensitivityLevel: 1 }
  );

  await testPlagiarismCheck(
    'Plagiarism: Sensitivity Level 5',
    TEST_SAMPLES.plagiarismKnown,
    { sensitivityLevel: 5 }
  );
}

// =============================================================================
// PHASE 4: COMBINED TESTS
// =============================================================================

async function testCombinedCheck(testName, text) {
  const checkId = `combined-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const scanId = `scan-${checkId}`;

  try {
    // Submit combined check
    const response = await axios.post(
      `${CONFIG.SERVER_URL}/api/check`,
      {
        text,
        checkId,
        options: {
          sensitivityLevel: 3,
          language: 'en'
        }
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.data.success) {
      recordTest(testName, false, 'Submission failed');
      return false;
    }

    const hasGrammar = response.data.grammar && response.data.grammar.result;
    const hasPlagiarism = response.data.plagiarism && response.data.plagiarism.status === 'pending';

    if (!hasGrammar || !hasPlagiarism) {
      recordTest(testName, false, 'Missing grammar or plagiarism response');
      return false;
    }

    log(`  Submitted: ${checkId}`, 'blue');
    results.creditsUsed++;

    // Poll for plagiarism completion
    const result = await pollForCompletion(checkId, scanId, testName);

    saveOutput(`combined-${testName}.json`, {
      grammar: response.data.grammar,
      plagiarism: result
    });

    const grammarErrors = response.data.grammar.result.statistics?.totalErrors || 0;
    const plagiarismPercent = result.summary?.plagiarismPercentage || 0;

    recordTest(testName, true, `${grammarErrors} grammar errors, ${plagiarismPercent}% plagiarism`);
    return { checkId, scanId, grammarErrors, plagiarismPercent };

  } catch (error) {
    recordTest(testName, false, 'Test failed', error);
    return false;
  }
}

async function runCombinedTests() {
  logSection('PHASE 4: COMBINED TESTS');

  await testCombinedCheck('Combined: Grammar + Plagiarism', TEST_SAMPLES.combined);
}

// =============================================================================
// PHASE 5: EXPORT AND HIGHLIGHTING TESTS
// =============================================================================

async function testExportAndHighlighting() {
  logSection('PHASE 5: EXPORT AND HIGHLIGHTING TESTS');

  // Test export with results
  log('\n  Submitting scan for export test...', 'yellow');
  const checkId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const scanId = `scan-${checkId}`;

  try {
    // Submit plagiarism check
    const submitResponse = await axios.post(
      `${CONFIG.SERVER_URL}/api/check/plagiarism`,
      {
        text: TEST_SAMPLES.plagiarismKnown,
        scanId,
        options: { sensitivityLevel: 3 }
      }
    );

    results.creditsUsed++;

    // Wait for completion
    const result = await pollForCompletion(checkId, scanId, 'Export preparation');

    if (result.results && result.results.length > 0) {
      // Test export
      try {
        const exportResponse = await axios.post(
          `${CONFIG.SERVER_URL}/api/results/${scanId}/export`
        );

        if (exportResponse.data.success) {
          recordTest('Export: With Results', true, `Export ID: ${exportResponse.data.exportId}`);

          // Wait for export webhooks
          log('  Waiting for export webhooks...', 'yellow');
          await sleep(10000); // 10 seconds

          // Test highlighted text
          try {
            const highlightResponse = await axios.get(
              `${CONFIG.SERVER_URL}/api/results/${checkId}/highlighted`
            );

            if (highlightResponse.data.success && highlightResponse.data.html) {
              saveOutput('highlighted-output.json', highlightResponse.data);
              recordTest('Highlighted Text: Retrieval', true, `HTML length: ${highlightResponse.data.html.length}`);
            } else {
              recordTest('Highlighted Text: Retrieval', false, 'No HTML in response');
            }
          } catch (error) {
            recordTest('Highlighted Text: Retrieval', false, 'Failed to get highlighted text', error);
          }
        } else {
          recordTest('Export: With Results', false, 'Export failed');
        }
      } catch (error) {
        recordTest('Export: With Results', false, 'Export request failed', error);
      }
    } else {
      recordTest('Export: With Results', false, 'No plagiarism results to export');
    }

  } catch (error) {
    recordTest('Export: With Results', false, 'Test setup failed', error);
  }

  // Test export without results
  try {
    const response = await axios.post(
      `${CONFIG.SERVER_URL}/api/results/scan-nonexistent/export`
    );
    recordTest('Export: Without Results', false, 'Should have returned error');
  } catch (error) {
    if (error.response?.status === 404) {
      recordTest('Export: Without Results', true, 'Correctly returned 404');
    } else if (error.response?.status === 400) {
      recordTest('Export: Without Results', true, 'Correctly returned 400');
    } else {
      recordTest('Export: Without Results', false, 'Unexpected error', error);
    }
  }
}

// =============================================================================
// PHASE 6: EDGE CASES
// =============================================================================

async function runEdgeCaseTests() {
  logSection('PHASE 6: EDGE CASES');

  // Empty text
  try {
    await axios.post(`${CONFIG.SERVER_URL}/api/check`, {
      text: TEST_SAMPLES.empty
    });
    recordTest('Edge: Empty Text', false, 'Should have returned error');
  } catch (error) {
    if (error.response?.status === 400) {
      recordTest('Edge: Empty Text', true, 'Correctly rejected empty text');
    } else {
      recordTest('Edge: Empty Text', false, 'Unexpected error', error);
    }
  }

  // Very short text
  await testPlagiarismCheck('Edge: Very Short Text', TEST_SAMPLES.veryShort);

  // Non-existent check ID
  try {
    await axios.get(`${CONFIG.SERVER_URL}/api/results/nonexistent-check-id`);
    recordTest('Edge: Non-existent Check ID', false, 'Should have returned 404');
  } catch (error) {
    if (error.response?.status === 404) {
      recordTest('Edge: Non-existent Check ID', true, 'Correctly returned 404');
    } else {
      recordTest('Edge: Non-existent Check ID', false, 'Unexpected error', error);
    }
  }

  // Delete check
  const deleteCheckId = `delete-test-${Date.now()}`;
  try {
    // First create a check
    await axios.post(`${CONFIG.SERVER_URL}/api/check/grammar`, {
      text: TEST_SAMPLES.grammarClean,
      checkId: deleteCheckId
    });

    // Then delete it
    await axios.delete(`${CONFIG.SERVER_URL}/api/results/${deleteCheckId}`);

    // Try to retrieve it
    try {
      await axios.get(`${CONFIG.SERVER_URL}/api/results/${deleteCheckId}`);
      recordTest('Edge: Delete Check', false, 'Check still exists after deletion');
    } catch (error) {
      if (error.response?.status === 404) {
        recordTest('Edge: Delete Check', true, 'Check successfully deleted');
      } else {
        recordTest('Edge: Delete Check', false, 'Unexpected error', error);
      }
    }
  } catch (error) {
    recordTest('Edge: Delete Check', false, 'Failed to test deletion', error);
  }
}

// =============================================================================
// MAIN TEST EXECUTION
// =============================================================================

async function generateReport() {
  logSection('TEST SUMMARY');

  const duration = ((Date.now() - results.startTime) / 1000).toFixed(1);
  const passRate = ((results.passed / results.total) * 100).toFixed(1);

  log(`\nTotal Tests: ${results.total}`, 'bright');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Skipped: ${results.skipped}`, 'yellow');
  log(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : 'red');
  log(`Duration: ${duration}s`, 'blue');
  log(`Credits Used: ~${results.creditsUsed}`, 'magenta');

  if (results.failed > 0) {
    log('\nFailed Tests:', 'red');
    results.tests
      .filter(t => !t.passed && !t.skipped)
      .forEach(t => {
        log(`  - ${t.name}: ${t.error || 'See details above'}`, 'red');
      });
  }

  // Save full report
  if (CONFIG.SAVE_OUTPUTS) {
    const report = {
      summary: {
        total: results.total,
        passed: results.passed,
        failed: results.failed,
        skipped: results.skipped,
        passRate: `${passRate}%`,
        duration: `${duration}s`,
        creditsUsed: results.creditsUsed,
        timestamp: new Date().toISOString()
      },
      tests: results.tests
    };

    saveOutput('test-report.json', report);
  }

  log('\n');
}

async function runAllTests() {
  log('\n', 'reset');
  log('╔═══════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║      COPYLEAKS INTEGRATION - COMPREHENSIVE TEST SUITE           ║', 'cyan');
  log('║                  (Non-Sandbox Mode)                              ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════════════╝', 'cyan');

  log(`\nServer: ${CONFIG.SERVER_URL}`, 'blue');
  log(`Phase: ${CONFIG.PHASE}`, 'blue');
  log(`Save Outputs: ${CONFIG.SAVE_OUTPUTS}`, 'blue');
  log(`\n`, 'reset');

  try {
    // Phase 1: Pre-flight
    if (['all', 'preflight'].includes(CONFIG.PHASE)) {
      const preflightOk = await runPreflightTests();
      if (!preflightOk) {
        log('\n❌ Pre-flight checks failed. Aborting.', 'red');
        process.exit(1);
      }
    }

    // Phase 2: Grammar
    if (['all', 'grammar'].includes(CONFIG.PHASE)) {
      await runGrammarTests();
    }

    // Phase 3: Plagiarism
    if (['all', 'plagiarism'].includes(CONFIG.PHASE)) {
      await runPlagiarismTests();
    }

    // Phase 4: Combined
    if (['all', 'combined'].includes(CONFIG.PHASE)) {
      await runCombinedTests();
    }

    // Phase 5: Export
    if (['all', 'export'].includes(CONFIG.PHASE)) {
      await testExportAndHighlighting();
    }

    // Phase 6: Edge cases
    if (['all', 'edge'].includes(CONFIG.PHASE)) {
      await runEdgeCaseTests();
    }

    // Generate report
    await generateReport();

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);

  } catch (error) {
    log('\n❌ Fatal error during test execution:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
