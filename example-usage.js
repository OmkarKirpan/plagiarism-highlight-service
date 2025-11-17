const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:3000';

/**
 * Example: Combined Grammar & Plagiarism Check
 */
async function exampleCombinedCheck() {
  console.log('\n========================================');
  console.log('Example: Combined Check');
  console.log('========================================\n');

  try {
    // Sample text with intentional grammar errors and potentially plagiarized content
    const sampleText = `
      Artificial intelligence are transforming the way we live and work.
      Machine learning algorithms can now recognize patterns and make predictions
      with unprecedented accuracy. Natural language processing has enabled
      computers to understand and generate human language.
    `;

    // 1. Submit text for combined checking
    console.log('1. Submitting text for combined check...');
    const checkResponse = await axios.post(`${API_BASE}/api/check`, {
      text: sampleText.trim(),
      checkId: 'example-combined-1'
    });

    console.log('✓ Check submitted successfully');
    console.log('  Check ID:', checkResponse.data.checkId);
    console.log('  Scan ID:', checkResponse.data.scanId);

    // 2. Grammar results are available immediately
    console.log('\n2. Grammar check results:');
    const grammarResult = checkResponse.data.grammar;
    if (grammarResult.errors && grammarResult.errors.length > 0) {
      console.log(`  Found ${grammarResult.errors.length} grammar/spelling issues:`);
      grammarResult.errors.slice(0, 3).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.type}: ${error.message}`);
        console.log(`     Position: ${error.position.start}-${error.position.start + error.position.length}`);
        if (error.suggestion) {
          console.log(`     Suggestion: ${error.suggestion}`);
        }
      });
    } else {
      console.log('  No grammar issues found (or Writing Assistant API not available)');
    }

    // 3. Wait for plagiarism scan to complete
    console.log('\n3. Waiting for plagiarism scan to complete (45 seconds)...');
    await sleep(45000);

    // 4. Check status
    console.log('\n4. Checking scan status...');
    const statusResponse = await axios.get(
      `${API_BASE}/api/results/${checkResponse.data.checkId}`
    );

    console.log('  Plagiarism status:', statusResponse.data.plagiarism.status);

    if (statusResponse.data.plagiarism.status === 'completed') {
      console.log('  Plagiarism score:',
        statusResponse.data.plagiarism.score?.aggregatedScore + '%' || 'N/A'
      );
      console.log('  Results found:',
        statusResponse.data.plagiarism.summary?.totalResults || 0
      );

      // 5. Export detailed results
      console.log('\n5. Exporting detailed plagiarism results...');
      await axios.post(
        `${API_BASE}/api/results/${checkResponse.data.scanId}/export`
      );

      // 6. Wait for export to complete
      console.log('   Waiting for export (10 seconds)...');
      await sleep(10000);

      // 7. Get highlighted text
      console.log('\n6. Getting combined highlights...');
      const highlightResponse = await axios.get(
        `${API_BASE}/api/results/${checkResponse.data.checkId}/highlighted`
      );

      console.log('  Total highlights:', highlightResponse.data.statistics.totalHighlights);
      console.log('  Grammar errors:', highlightResponse.data.statistics.grammarErrors);
      console.log('  Plagiarism matches:', highlightResponse.data.statistics.plagiarismMatches);

      // Save HTML to file
      const fs = require('fs');
      const html = generateFullHTML(
        highlightResponse.data.highlightedHTML,
        highlightResponse.data.statistics
      );
      fs.writeFileSync('output-combined.html', html);
      console.log('\n✓ Highlighted text saved to: output-combined.html');
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Example: Grammar Check Only
 */
async function exampleGrammarOnly() {
  console.log('\n========================================');
  console.log('Example: Grammar Check Only');
  console.log('========================================\n');

  try {
    const sampleText = `
      This are a sentance with several grammer errors.
      Its important to check you're writing for mistakes.
    `;

    console.log('Checking grammar...');
    const response = await axios.post(`${API_BASE}/api/check/grammar`, {
      text: sampleText.trim()
    });

    const result = response.data.result;
    console.log('\n✓ Grammar check completed');
    console.log('  Total errors:', result.statistics.totalErrors);
    console.log('  Grammar errors:', result.statistics.grammarErrors);
    console.log('  Spelling errors:', result.statistics.spellingErrors);

    if (result.errors.length > 0) {
      console.log('\nErrors found:');
      result.errors.forEach((error, index) => {
        console.log(`\n${index + 1}. ${error.type.toUpperCase()}`);
        console.log(`   Message: ${error.message}`);
        console.log(`   Text: "${error.affectedText}"`);
        if (error.suggestion) {
          console.log(`   Suggestion: ${error.suggestion}`);
        }
      });
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Example: Plagiarism Check Only
 */
async function examplePlagiarismOnly() {
  console.log('\n========================================');
  console.log('Example: Plagiarism Check Only');
  console.log('========================================\n');

  try {
    const sampleText = `
      Machine learning is a subset of artificial intelligence that enables
      systems to learn and improve from experience without being explicitly programmed.
    `;

    // 1. Submit scan
    console.log('1. Submitting plagiarism scan...');
    const submitResponse = await axios.post(`${API_BASE}/api/check/plagiarism`, {
      text: sampleText.trim(),
      scanId: 'example-plag-1'
    });

    console.log('✓ Scan submitted:', submitResponse.data.scanId);

    // 2. Wait for completion
    console.log('\n2. Waiting for scan to complete (45 seconds)...');
    await sleep(45000);

    // 3. Check status
    const statusResponse = await axios.get(
      `${API_BASE}/api/results/${submitResponse.data.scanId}/status`
    );

    console.log('\n3. Scan completed');
    console.log('  Status:', statusResponse.data.plagiarism?.status || 'unknown');

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Generate full HTML page with highlights
 */
function generateFullHTML(highlightedContent, statistics) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Text Analysis Results</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      max-width: 900px;
      margin: 40px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #e5e5e5;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat {
      padding: 15px;
      background: #f9f9f9;
      border-radius: 6px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #333;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .content {
      line-height: 1.8;
      font-size: 16px;
      color: #333;
      white-space: pre-wrap;
    }
    .legend {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e5e5;
    }
    .legend-item {
      display: inline-block;
      margin-right: 20px;
      margin-bottom: 10px;
    }
    .legend-color {
      display: inline-block;
      width: 20px;
      height: 20px;
      vertical-align: middle;
      margin-right: 5px;
      border-radius: 3px;
    }

    /* Import highlight styles */
    .grammar-error {
      background-color: rgba(59, 130, 246, 0.2);
      border-bottom: 2px wavy #3b82f6;
      cursor: help;
    }
    .spelling-error {
      background-color: rgba(239, 68, 68, 0.2);
      border-bottom: 2px wavy #ef4444;
      cursor: help;
    }
    .plagiarism-identical {
      background-color: rgba(220, 38, 38, 0.3);
      border-left: 3px solid #dc2626;
      padding-left: 2px;
      cursor: pointer;
    }
    .plagiarism-minor {
      background-color: rgba(249, 115, 22, 0.3);
      border-left: 3px solid #f97316;
      padding-left: 2px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Text Analysis Results</h1>
      <p>Grammar and plagiarism check completed</p>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${statistics.totalHighlights}</div>
        <div class="stat-label">Total Issues</div>
      </div>
      <div class="stat">
        <div class="stat-value">${statistics.grammarErrors}</div>
        <div class="stat-label">Grammar/Spelling</div>
      </div>
      <div class="stat">
        <div class="stat-value">${statistics.plagiarismMatches}</div>
        <div class="stat-label">Plagiarism Matches</div>
      </div>
    </div>

    <div class="content">
${highlightedContent}
    </div>

    <div class="legend">
      <h3>Legend</h3>
      <div class="legend-item">
        <span class="legend-color" style="background: rgba(59, 130, 246, 0.2); border-bottom: 2px wavy #3b82f6;"></span>
        Grammar Error
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: rgba(239, 68, 68, 0.2); border-bottom: 2px wavy #ef4444;"></span>
        Spelling Error
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: rgba(220, 38, 38, 0.3); border-left: 3px solid #dc2626;"></span>
        Plagiarism (Identical)
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: rgba(249, 115, 22, 0.3); border-left: 3px solid #f97316;"></span>
        Plagiarism (Minor Changes)
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run examples
 */
async function main() {
  const args = process.argv.slice(2);
  const example = args[0] || 'combined';

  console.log('\n🚀 Copyleaks API Examples');
  console.log('Make sure the server is running on', API_BASE);

  try {
    switch (example) {
      case 'grammar':
        await exampleGrammarOnly();
        break;
      case 'plagiarism':
        await examplePlagiarismOnly();
        break;
      case 'combined':
      default:
        await exampleCombinedCheck();
        break;
    }

    console.log('\n✓ Example completed successfully\n');
  } catch (error) {
    console.error('\n✗ Example failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\nIs the server running? Start it with: npm start');
    }
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  exampleCombinedCheck,
  exampleGrammarOnly,
  examplePlagiarismOnly
};
