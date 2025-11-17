require('dotenv').config();
const express = require('express');

// Import modules
const CopyleaksClient = require('./copyleaks-client');
const GrammarChecker = require('./grammar-checker');
const PlagiarismScanner = require('./plagiarism-scanner');
const TextHighlighter = require('./text-highlighter');
const {
  router: webhookRouter,
  storeGrammarResult,
  getScanResult,
  getExportedResult,
  getGrammarResult,
  deleteScanResult
} = require('./webhook-handler');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuration
const CONFIG = {
  COPYLEAKS_EMAIL: process.env.COPYLEAKS_EMAIL,
  COPYLEAKS_API_KEY: process.env.COPYLEAKS_API_KEY,
  COPYLEAKS_BASE_URL: process.env.COPYLEAKS_BASE_URL || 'https://api.copyleaks.com',
  WEBHOOK_BASE_URL: process.env.WEBHOOK_BASE_URL,
  PRODUCT_ENDPOINT: process.env.PRODUCT_ENDPOINT || 'scans',
  PORT: process.env.PORT || 3000,
  SANDBOX_MODE: process.env.SANDBOX_MODE === 'true'
};

// Validate configuration
if (!CONFIG.COPYLEAKS_EMAIL || !CONFIG.COPYLEAKS_API_KEY) {
  console.error('❌ Missing required environment variables: COPYLEAKS_EMAIL, COPYLEAKS_API_KEY');
  process.exit(1);
}

if (!CONFIG.WEBHOOK_BASE_URL) {
  console.warn('⚠️  WEBHOOK_BASE_URL not set. Plagiarism webhooks will not work.');
}

// Initialize services
const copyleaksClient = new CopyleaksClient(CONFIG.COPYLEAKS_EMAIL, CONFIG.COPYLEAKS_API_KEY);
const grammarChecker = new GrammarChecker(copyleaksClient);
const plagiarismScanner = new PlagiarismScanner(
  copyleaksClient,
  CONFIG.WEBHOOK_BASE_URL,
  CONFIG.PRODUCT_ENDPOINT,
  CONFIG.COPYLEAKS_BASE_URL
);
const textHighlighter = new TextHighlighter();

// Webhook request logging middleware
app.use((req, res, next) => {
  if (req.path.includes('webhook')) {
    console.log('🎯 Webhook request:', req.method, req.path);
    console.log('   Headers:', req.headers['content-type']);
  }
  next();
});

// OVERRIDE: Direct crawled webhook handler with improved text extraction
app.post('/webhook/crawled/:scanId', (req, res) => {
  const { scanId } = req.params;
  const crawledData = req.body;

  console.log(`📥 Received crawled webhook for scan: ${scanId}`);

  // Extract text from various possible response formats
  let extractedText = null;

  // Try all possible paths for text extraction
  if (crawledData) {
    // Path 1: {text: {value: "..."}}
    if (crawledData.text && typeof crawledData.text === 'object' && crawledData.text.value) {
      extractedText = crawledData.text.value;
      console.log(`✓ Extracted text from crawledData.text.value (length: ${extractedText.length})`);
    }
    // Path 2: {text: "..."}
    else if (crawledData.text && typeof crawledData.text === 'string') {
      extractedText = crawledData.text;
      console.log(`✓ Extracted text from crawledData.text (length: ${extractedText.length})`);
    }
    // Path 3: {value: "..."}
    else if (crawledData.value && typeof crawledData.value === 'string') {
      extractedText = crawledData.value;
      console.log(`✓ Extracted text from crawledData.value (length: ${extractedText.length})`);
    }
    // Path 4: {content: "..."}
    else if (crawledData.content && typeof crawledData.content === 'string') {
      extractedText = crawledData.content;
      console.log(`✓ Extracted text from crawledData.content (length: ${extractedText.length})`);
    }
    // Path 5: {document: {text: "..."}}
    else if (crawledData.document && crawledData.document.text) {
      extractedText = crawledData.document.text;
      console.log(`✓ Extracted text from crawledData.document.text (length: ${extractedText.length})`);
    }
    // Path 6: Direct string response
    else if (typeof crawledData === 'string') {
      extractedText = crawledData;
      console.log(`✓ Extracted text from direct string response (length: ${extractedText.length})`);
    }
    // Path 7: {html: {text: "..."}}
    else if (crawledData.html && crawledData.html.text) {
      extractedText = crawledData.html.text;
      console.log(`✓ Extracted text from crawledData.html.text (length: ${extractedText.length})`);
    }
    // Path 8: {result: {text: "..."}}
    else if (crawledData.result && crawledData.result.text) {
      extractedText = crawledData.result.text;
      console.log(`✓ Extracted text from crawledData.result.text (length: ${extractedText.length})`);
    }
  }

  // Store the data directly here to bypass module cache
  const { getExportedData } = require('./webhook-handler');
  const exportedData = getExportedData();

  if (!exportedData.has(scanId)) {
    exportedData.set(scanId, {});
  }

  const stored = exportedData.get(scanId);
  stored.crawledVersion = crawledData;
  stored.extractedText = extractedText;

  // Log extraction status
  if (extractedText) {
    console.log(`✅ Successfully extracted text for ${scanId} (${extractedText.length} chars)`);
  } else {
    console.error(`⚠️ Could not extract text from crawled data for ${scanId}`);
    console.log(`🔍 DEBUG - Available keys in crawledData:`, crawledData ? Object.keys(crawledData) : 'no data');
    console.log(`🔍 DEBUG - Structure preview:`, JSON.stringify(crawledData, null, 2).substring(0, 500));
  }

  res.json({ received: true });
});

// Mount webhook routes (other webhooks will still use the router)
app.use(webhookRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Copyleaks Grammar & Plagiarism Checker',
    authenticated: copyleaksClient.isAuthenticated()
  });
});

/**
 * Test webhook connectivity
 * GET /api/test-webhook
 */
app.get('/api/test-webhook', (req, res) => {
  const testId = `test-${Date.now()}`;
  const webhookUrl = `${CONFIG.WEBHOOK_BASE_URL}/webhook/test/${testId}`;

  res.json({
    success: true,
    message: 'Webhook test endpoint ready',
    testId: testId,
    webhookUrl: webhookUrl,
    instructions: [
      `1. Make sure your server is accessible from the internet (use ngrok for local dev)`,
      `2. Test with: curl -X POST ${webhookUrl} -H "Content-Type: application/json" -d '{"test": true}'`,
      `3. Check the server logs to see if webhook was received`,
      `4. For ngrok: ngrok http ${CONFIG.PORT}`
    ],
    currentConfig: {
      webhookBaseUrl: CONFIG.WEBHOOK_BASE_URL,
      port: CONFIG.PORT,
      sandboxMode: CONFIG.SANDBOX_MODE
    }
  });
});

/**
 * Test webhook receiver
 * POST /webhook/test/:testId
 */
app.post('/webhook/test/:testId', (req, res) => {
  const { testId } = req.params;
  const testData = req.body;

  console.log(`\n✅ TEST WEBHOOK RECEIVED!`);
  console.log(`   Test ID: ${testId}`);
  console.log(`   Data received:`, JSON.stringify(testData, null, 2));
  console.log(`   Headers:`, req.headers);

  res.json({
    received: true,
    testId: testId,
    message: 'Webhook test successful!'
  });
});

/**
 * Submit text for combined grammar and plagiarism checking
 * POST /api/check
 */
app.post('/api/check', async (req, res) => {
  try {
    const { text, checkId, options = {} } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required and must be a string' });
    }

    const uniqueCheckId = checkId || `check-${Date.now()}`;
    const scanId = `scan-${uniqueCheckId}`;

    console.log(`\n🚀 Starting combined check: ${uniqueCheckId}`);

    // Start grammar check (synchronous)
    let grammarResult = null;
    try {
      grammarResult = await grammarChecker.checkText(text, {
        language: options.language || 'en',
        sandbox: CONFIG.SANDBOX_MODE
      });
      storeGrammarResult(uniqueCheckId, grammarResult);
    } catch (error) {
      console.error('Grammar check failed:', error.message);
      grammarResult = { error: error.message };
    }

    // Start plagiarism scan (asynchronous)
    let plagiarismResult = null;
    try {
      plagiarismResult = await plagiarismScanner.submitTextScan(scanId, text, {
        sandbox: CONFIG.SANDBOX_MODE,
        sensitivityLevel: options.sensitivityLevel || 3,
        includeHtml: true
      });
    } catch (error) {
      console.error('Plagiarism scan failed:', error.message);
      plagiarismResult = { error: error.message };
    }

    res.json({
      success: true,
      checkId: uniqueCheckId,
      scanId: scanId,
      grammar: grammarResult,
      plagiarism: plagiarismResult,
      message: 'Grammar check completed. Plagiarism scan in progress. Use /api/results/:checkId to get combined results.'
    });

  } catch (error) {
    console.error('Check submission failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check grammar only
 * POST /api/check/grammar
 */
app.post('/api/check/grammar', async (req, res) => {
  try {
    const { text, checkId, options = {} } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const uniqueCheckId = checkId || `grammar-${Date.now()}`;

    const result = await grammarChecker.checkText(text, {
      language: options.language || 'en',
      sandbox: CONFIG.SANDBOX_MODE
    });

    storeGrammarResult(uniqueCheckId, result);

    res.json({
      success: true,
      checkId: uniqueCheckId,
      result: result
    });

  } catch (error) {
    console.error('Grammar check failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check plagiarism only
 * POST /api/check/plagiarism
 */
app.post('/api/check/plagiarism', async (req, res) => {
  try {
    const { text, scanId, options = {} } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const uniqueScanId = scanId || `scan-${Date.now()}`;

    const result = await plagiarismScanner.submitTextScan(uniqueScanId, text, {
      sandbox: CONFIG.SANDBOX_MODE,
      sensitivityLevel: options.sensitivityLevel || 3
    });

    res.json({
      success: true,
      scanId: uniqueScanId,
      result: result
    });

  } catch (error) {
    console.error('Plagiarism scan failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get check status and results
 * GET /api/results/:checkId
 */
app.get('/api/results/:checkId', (req, res) => {
  const { checkId } = req.params;
  const scanId = `scan-${checkId}`;

  const grammarResult = getGrammarResult(checkId);
  const scanResult = getScanResult(scanId);

  if (!grammarResult && !scanResult) {
    return res.status(404).json({ error: 'Check not found' });
  }

  res.json({
    checkId: checkId,
    scanId: scanId,
    grammar: grammarResult || { status: 'not_found' },
    plagiarism: scanResult || { status: 'not_found' }
  });
});

/**
 * Get combined highlighted text
 * GET /api/results/:checkId/highlighted
 */
app.get('/api/results/:checkId/highlighted', (req, res) => {
  const { checkId } = req.params;
  const scanId = `scan-${checkId}`;

  const grammarData = getGrammarResult(checkId);
  const exportedData = getExportedResult(scanId);

  if (!grammarData && !exportedData) {
    return res.status(404).json({ error: 'Results not found' });
  }

  const grammarResult = grammarData?.result;

  // Use the pre-extracted text or try crawled version paths
  let text = '';

  // First try the pre-extracted text (added by improved webhook handler)
  if (exportedData?.extractedText) {
    text = exportedData.extractedText;
    console.log(`✓ Using pre-extracted text (${text.length} chars)`);
  }
  // Fallback to crawled text extraction
  else if (exportedData?.crawledVersion) {
    // Try different possible paths
    const crawledText = exportedData.crawledVersion.text?.value ||  // Expected path: {text: {value: "..."}}
                        exportedData.crawledVersion.text ||          // Alternative: {text: "..."}
                        exportedData.crawledVersion.value ||         // Alternative: {value: "..."}
                        exportedData.crawledVersion.content ||       // Alternative: {content: "..."}
                        exportedData.crawledVersion.document?.text || // Alternative: {document: {text: "..."}}
                        exportedData.crawledVersion.html?.text ||    // Alternative: {html: {text: "..."}}
                        exportedData.crawledVersion.result?.text ||  // Alternative: {result: {text: "..."}}
                        (typeof exportedData.crawledVersion === 'string' ? exportedData.crawledVersion : null); // Direct string

    if (crawledText) {
      text = typeof crawledText === 'string' ? crawledText : (crawledText.value || '');
      console.log(`✓ Extracted text from crawledVersion (${text.length} chars)`);
    }
  }
  // Final fallback to grammar result text
  else if (grammarResult?.text) {
    text = grammarResult.text;
    console.log(`✓ Using text from grammar result (${text.length} chars)`);
  }

  // Enhanced error response with debugging info
  if (!text || text.length === 0) {
    return res.status(400).json({
      error: 'No text available for highlighting',
      details: {
        hasGrammarData: !!grammarData,
        hasGrammarResult: !!grammarResult,
        hasGrammarText: !!(grammarResult?.text),
        grammarTextLength: grammarResult?.text?.length || 0,
        hasExportedData: !!exportedData,
        hasCrawledVersion: !!(exportedData?.crawledVersion),
        crawledVersionType: exportedData?.crawledVersion ? typeof exportedData.crawledVersion : 'N/A',
        crawledVersionKeys: exportedData?.crawledVersion && typeof exportedData.crawledVersion === 'object'
          ? Object.keys(exportedData.crawledVersion).slice(0, 10) // First 10 keys
          : [],
        debugInfo: 'Check crawledVersionKeys to see actual data structure'
      }
    });
  }

  // Extract plagiarism matches
  const plagiarismMatches = [];

  // Debug: Log export data structure
  if (exportedData) {
    const dataStr = JSON.stringify(exportedData, null, 2);
    console.log('🔍 Debug - exportedData structure:', dataStr.substring(0, Math.min(500, dataStr.length)));
  } else {
    console.log('🔍 Debug - No exportedData available');
  }

  if (exportedData?.results) {
    Object.values(exportedData.results).forEach(result => {
      const comparison = result.text?.comparison;

      // Process all match types: identical, minorChanges, relatedMeaning
      const matchTypes = ['identical', 'minorChanges', 'relatedMeaning'];

      matchTypes.forEach(matchType => {
        const matchData = comparison?.[matchType];
        if (matchData?.source?.chars) {
          const { starts, lengths } = matchData.source.chars;
          if (starts && lengths) {
            for (let i = 0; i < starts.length; i++) {
              plagiarismMatches.push({
                start: starts[i],
                length: lengths[i],
                source: 'Plagiarism detected',
                matchType: matchType
              });
            }
          }
        }
      });
    });
  }

  // Combine highlights
  const combined = textHighlighter.combineHighlights(text, grammarResult, plagiarismMatches);

  res.json({
    success: true,
    checkId: checkId,
    scanId: scanId,
    ...combined
  });
});

/**
 * Debug endpoint to inspect stored data structure
 * GET /api/debug/:checkId
 */
app.get('/api/debug/:checkId', (req, res) => {
  const { checkId } = req.params;
  const scanId = `scan-${checkId}`;

  const grammarData = getGrammarResult(checkId);
  const exportedData = getExportedResult(scanId);

  res.json({
    checkId,
    scanId,
    grammarData: grammarData ? {
      exists: true,
      hasResult: !!grammarData.result,
      hasText: !!(grammarData.result?.text),
      textLength: grammarData.result?.text?.length || 0,
      textPreview: grammarData.result?.text?.substring(0, 100) || '',
      keys: grammarData.result ? Object.keys(grammarData.result) : []
    } : null,
    exportedData: exportedData ? {
      exists: true,
      hasCrawledVersion: !!exportedData.crawledVersion,
      crawledVersionType: typeof exportedData.crawledVersion,
      crawledVersionKeys: exportedData.crawledVersion && typeof exportedData.crawledVersion === 'object'
        ? Object.keys(exportedData.crawledVersion)
        : [],
      crawledVersionTextPath: exportedData.crawledVersion?.text ? 'exists' : 'missing',
      crawledVersionTextType: typeof exportedData.crawledVersion?.text,
      crawledVersionTextValuePath: exportedData.crawledVersion?.text?.value ? 'exists' : 'missing',
      crawledVersionTextValueType: typeof exportedData.crawledVersion?.text?.value,
      crawledVersionTextValueLength: exportedData.crawledVersion?.text?.value?.length || 0,
      hasResults: !!exportedData.results,
      resultCount: exportedData.results ? Object.keys(exportedData.results).length : 0,
      hasPdf: !!exportedData.pdf,
      exportCompleted: !!exportedData.exportCompleted
    } : null
  });
});

/**
 * Export plagiarism results after scan completion
 * POST /api/results/:scanId/export
 */
app.post('/api/results/:scanId/export', async (req, res) => {
  try {
    const { scanId } = req.params;

    const scanResult = getScanResult(scanId);

    if (!scanResult) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    if (scanResult.status !== 'completed') {
      return res.status(400).json({
        error: 'Scan not completed yet',
        status: scanResult.status
      });
    }

    if (!scanResult.results || scanResult.results.length === 0) {
      return res.status(400).json({
        error: 'No results available to export',
        details: 'Scan completed but no plagiarism matches were found'
      });
    }

    const resultIds = scanResult.results.map(r => r.id);

    const exportResult = await plagiarismScanner.exportResults(scanId, resultIds);

    res.json(exportResult);

  } catch (error) {
    console.error('Export failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get CSS stylesheet for highlights
 * GET /api/stylesheet
 */
app.get('/api/stylesheet', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.send(textHighlighter.getStylesheet());
});

/**
 * Delete a check and all associated data
 * DELETE /api/results/:checkId
 */
app.delete('/api/results/:checkId', (req, res) => {
  const { checkId } = req.params;
  const scanId = `scan-${checkId}`;

  deleteScanResult(scanId);

  res.json({
    success: true,
    message: 'Check deleted successfully'
  });
});

/**
 * Get account information
 * GET /api/account
 */
app.get('/api/account', async (req, res) => {
  try {
    const accountInfo = await copyleaksClient.getAccountInfo();
    res.json(accountInfo);
  } catch (error) {
    console.error('Failed to get account info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(CONFIG.PORT, async () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Copyleaks Grammar & Plagiarism Checker Server`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   Port:         ${CONFIG.PORT}`);
  console.log(`   Webhook URL:  ${CONFIG.WEBHOOK_BASE_URL}`);
  console.log(`   Sandbox Mode: ${CONFIG.SANDBOX_MODE}`);
  console.log(`${'='.repeat(60)}\n`);

  // Test authentication
  try {
    await copyleaksClient.login();
    console.log('✓ Successfully authenticated with Copyleaks\n');
  } catch (error) {
    console.error('✗ Authentication failed:', error.message);
    console.error('Please check your credentials in .env file\n');
  }
});

module.exports = app;
