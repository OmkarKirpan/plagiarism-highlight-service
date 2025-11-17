const express = require('express');
const router = express.Router();

// In-memory storage for scan results
// In production, use a database (Redis, MongoDB, PostgreSQL, etc.)
const scanResults = new Map();
const exportedData = new Map();
const grammarResults = new Map();

/**
 * Status webhook handler - receives completion/error notifications
 */
router.post('/webhook/:status/:scanId', (req, res) => {
  const { status, scanId } = req.params;
  const webhookData = req.body;

  console.log(`\n📥 Received ${status} webhook for scan: ${scanId}`);

  try {
    if (status === 'completed') {
      handleCompletedScan(scanId, webhookData);
    } else if (status === 'error') {
      handleErrorScan(scanId, webhookData);
    } else if (status === 'creditsChecked') {
      handleCreditsCheck(scanId, webhookData);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * New result webhook - receives results as they're found
 */
router.post('/webhook/new-result/:scanId', (req, res) => {
  const { scanId } = req.params;
  const resultData = req.body;

  console.log(`📥 New result found for scan: ${scanId}`);

  try {
    if (!scanResults.has(scanId)) {
      scanResults.set(scanId, {
        status: 'scanning',
        results: []
      });
    }

    const scan = scanResults.get(scanId);
    scan.results.push(resultData);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing new result:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Handle completed scan webhook
 */
function handleCompletedScan(scanId, data) {
  const scan = scanResults.get(scanId) || { results: [] };

  scanResults.set(scanId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    scannedDocument: {
      totalWords: data.scannedDocument?.totalWords || 0,
      totalExcluded: data.scannedDocument?.totalExcluded || 0,
      credits: data.scannedDocument?.credits || 0
    },
    results: data.results?.internet || scan.results || [],
    score: {
      identicalWords: data.results?.score?.identicalWords || 0,
      minorChangedWords: data.results?.score?.minorChangedWords || 0,
      relatedMeaningWords: data.results?.score?.relatedMeaningWords || 0,
      aggregatedScore: data.results?.score?.aggregatedScore || 0
    },
    summary: {
      totalResults: data.results?.internet?.length || 0,
      totalWords: data.scannedDocument?.totalWords || 0,
      plagiarismPercentage: data.results?.score?.aggregatedScore || 0
    }
  });

  console.log(`✓ Scan completed: ${scanId}`);
  console.log(`  - Total words: ${data.scannedDocument?.totalWords || 0}`);
  console.log(`  - Results found: ${data.results?.internet?.length || 0}`);
  console.log(`  - Plagiarism score: ${data.results?.score?.aggregatedScore || 0}%`);
}

/**
 * Handle error webhook
 */
function handleErrorScan(scanId, data) {
  console.error(`✗ Scan error for ${scanId}:`, data.error);

  scanResults.set(scanId, {
    status: 'error',
    error: data.error,
    errorAt: new Date().toISOString()
  });
}

/**
 * Handle credits check webhook
 */
function handleCreditsCheck(scanId, data) {
  console.log(`💰 Credits check for ${scanId}: ${data.credits} credits required`);

  const scan = scanResults.get(scanId) || {};
  scan.creditsRequired = data.credits;
  scanResults.set(scanId, scan);
}

/**
 * Receive exported result data with text comparison
 */
router.post('/webhook/result/:scanId/:resultId', (req, res) => {
  const { scanId, resultId } = req.params;
  const resultData = req.body;

  console.log(`📥 Received result export: ${scanId}/${resultId}`);

  try {
    if (!exportedData.has(scanId)) {
      exportedData.set(scanId, { results: {} });
    }

    // Store the detailed result with text positions
    exportedData.get(scanId).results[resultId] = resultData;

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error storing result:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Receive crawled version (processed document)
 * Handles multiple possible response formats from Copyleaks API
 */
router.post('/webhook/crawled/:scanId', (req, res) => {
  const { scanId } = req.params;
  const crawledData = req.body;

  try {
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

    // Store the crawled data
    if (!exportedData.has(scanId)) {
      exportedData.set(scanId, {});
    }

    const stored = exportedData.get(scanId);

    // Store both the raw data and extracted text for easier access
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

    res.status(200).json({ received: true });
  } catch (error) {
    console.error(`❌ Error processing crawled webhook for ${scanId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Receive PDF report
 */
router.post('/webhook/pdf/:scanId', (req, res) => {
  const { scanId } = req.params;
  const pdfData = req.body;

  console.log(`📥 Received PDF report: ${scanId}`);

  try {
    if (!exportedData.has(scanId)) {
      exportedData.set(scanId, {});
    }

    exportedData.get(scanId).pdfReport = pdfData;

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error storing PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export completion webhook
 */
router.post('/webhook/export-completed/:scanId', (req, res) => {
  const { scanId } = req.params;
  const exportStatus = req.body;

  console.log(`✓ Export completed for: ${scanId}`);
  console.log(`  - Tasks completed: ${exportStatus.tasks?.length || 0}`);

  try {
    // Verify all tasks completed successfully
    const allHealthy = exportStatus.tasks?.every(task => task.isHealthy) ?? false;

    if (allHealthy && exportStatus.completed) {
      console.log('✓ All export tasks completed successfully');

      // Mark scan as fully processed
      const scan = scanResults.get(scanId);
      if (scan) {
        scan.exportCompleted = true;
        scan.exportCompletedAt = new Date().toISOString();
        scanResults.set(scanId, scan);
      }
    } else {
      console.error('✗ Some export tasks failed');
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing export completion:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper functions to retrieve stored data
 */
function getScanResults() {
  return scanResults;
}

function getExportedData() {
  return exportedData;
}

function getGrammarResults() {
  return grammarResults;
}

function storeGrammarResult(checkId, result) {
  grammarResults.set(checkId, {
    result: result,
    checkedAt: new Date().toISOString()
  });
}

function getScanResult(scanId) {
  return scanResults.get(scanId);
}

function getExportedResult(scanId) {
  return exportedData.get(scanId);
}

function getGrammarResult(checkId) {
  return grammarResults.get(checkId);
}

function deleteScanResult(scanId) {
  scanResults.delete(scanId);
  exportedData.delete(scanId);
}

module.exports = {
  router,
  getScanResults,
  getExportedData,
  getGrammarResults,
  storeGrammarResult,
  getScanResult,
  getExportedResult,
  getGrammarResult,
  deleteScanResult
};
