<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# use official plagiarism-checker npm lib

and write js codebase

Now let me create comprehensive JavaScript code examples based on the official SDK and documentation.

## Complete JavaScript Implementation for Copyleaks Plagiarism Detection with Text Highlights

Here's a comprehensive JavaScript codebase using the official `plagiarism-checker` npm package to detect plagiarism and get text highlights showing which lines contain plagiarized content.

### **Installation**

```bash
npm install plagiarism-checker express
```


### **Complete Implementation**

**1. Main Plagiarism Scanner Module** (`plagiarism-scanner.js`)

```javascript
const { 
  Copyleaks, 
  CopyleaksFileSubmissionModel,
  CopyleaksFileOcrSubmissionModel 
} = require('plagiarism-checker');
const fs = require('fs');

class PlagiarismScanner {
  constructor(email, apiKey) {
    this.copyleaks = new Copyleaks();
    this.email = email;
    this.apiKey = apiKey;
    this.authToken = null;
  }

  /**
   * Login and get authentication token
   */
  async login() {
    try {
      this.authToken = await this.copyleaks.loginAsync(this.email, this.apiKey);
      console.log('✓ Successfully authenticated with Copyleaks');
      return this.authToken;
    } catch (error) {
      console.error('✗ Login failed:', error);
      throw error;
    }
  }

  /**
   * Submit text for plagiarism scanning
   * @param {string} scanId - Unique identifier for this scan
   * @param {string} text - Text content to scan
   * @param {string} webhookBaseUrl - Your server URL for receiving webhooks
   */
  async submitTextScan(scanId, text, webhookBaseUrl) {
    if (!this.authToken) {
      await this.login();
    }

    try {
      // Convert text to base64
      const base64Text = Buffer.from(text).toString('base64');

      // Create submission model
      const submissionModel = new CopyleaksFileSubmissionModel(
        base64Text,
        'document.txt',
        {
          webhooks: {
            status: `${webhookBaseUrl}/webhook/{STATUS}/${scanId}`,
            newResult: `${webhookBaseUrl}/webhook/new-result/${scanId}`
          },
          includeHtml: true,
          sandbox: false, // Set to true for testing
          expiration: 120, // Minutes until scan expires
          sensitivityLevel: 0, // 0 = MaximumCoverage, 1 = MaximumResults
          
          // Enable different detection types
          filters: {
            identical: true,
            minorChanges: true,
            relatedMeaning: true
          },
          
          // Scanning sources
          scanning: {
            internet: true,
            internalDatabase: true,
            repositories: []
          },
          
          // PDF report generation
          pdf: {
            create: true,
            title: `Plagiarism Report - ${scanId}`,
            largePdf: false,
            version: 'latest'
          }
        }
      );

      // Submit the scan
      await this.copyleaks.submitFileAsync(this.authToken, scanId, submissionModel);
      console.log(`✓ Scan submitted successfully: ${scanId}`);
      
      return {
        success: true,
        scanId: scanId,
        message: 'Scan submitted. Waiting for webhooks...'
      };
    } catch (error) {
      console.error('✗ Scan submission failed:', error);
      throw error;
    }
  }

  /**
   * Submit file for plagiarism scanning
   * @param {string} scanId - Unique identifier for this scan
   * @param {string} filePath - Path to file to scan
   * @param {string} webhookBaseUrl - Your server URL for receiving webhooks
   */
  async submitFileScan(scanId, filePath, webhookBaseUrl) {
    if (!this.authToken) {
      await this.login();
    }

    try {
      // Read file and convert to base64
      const fileContent = fs.readFileSync(filePath);
      const base64Content = fileContent.toString('base64');
      const fileName = filePath.split('/').pop();

      // Create submission model
      const submissionModel = new CopyleaksFileSubmissionModel(
        base64Content,
        fileName,
        {
          webhooks: {
            status: `${webhookBaseUrl}/webhook/{STATUS}/${scanId}`
          },
          includeHtml: true,
          filters: {
            identical: true,
            minorChanges: true,
            relatedMeaning: true
          }
        }
      );

      await this.copyleaks.submitFileAsync(this.authToken, scanId, submissionModel);
      console.log(`✓ File scan submitted: ${scanId}`);
      
      return { success: true, scanId };
    } catch (error) {
      console.error('✗ File scan failed:', error);
      throw error;
    }
  }

  /**
   * Export detailed results after scan completion
   * @param {string} scanId - The scan ID
   * @param {Array} resultIds - Array of result IDs from completed webhook
   * @param {string} exportBaseUrl - Your server URL for receiving export data
   */
  async exportResults(scanId, resultIds, exportBaseUrl) {
    if (!this.authToken) {
      await this.login();
    }

    const exportId = `export-${Date.now()}`;

    try {
      const exportConfig = {
        completionWebhook: `${exportBaseUrl}/export-completed/${scanId}`,
        
        // Export all plagiarism results
        results: resultIds.map(resultId => ({
          id: resultId,
          verb: 'POST',
          endpoint: `${exportBaseUrl}/result/${scanId}/${resultId}`
        })),
        
        // Export crawled version (processed document)
        crawledVersion: {
          verb: 'POST',
          endpoint: `${exportBaseUrl}/crawled/${scanId}`
        },
        
        // Export PDF report
        pdfReport: {
          verb: 'POST',
          endpoint: `${exportBaseUrl}/pdf/${scanId}`
        }
      };

      await this.copyleaks.exportAsync(this.authToken, scanId, exportId, exportConfig);
      console.log(`✓ Export initiated: ${exportId}`);
      
      return { success: true, exportId };
    } catch (error) {
      console.error('✗ Export failed:', error);
      throw error;
    }
  }
}

module.exports = PlagiarismScanner;
```

**2. Webhook Handler \& Result Processor** (`webhook-handler.js`)

```javascript
const express = require('express');
const router = express.Router();

// Store for scan results (use database in production)
const scanResults = new Map();
const exportedData = new Map();

/**
 * Status webhook handler - receives completion/error notifications
 */
router.post('/webhook/:status/:scanId', (req, res) => {
  const { status, scanId } = req.params;
  const webhookData = req.body;

  console.log(`\n📥 Received ${status} webhook for scan: ${scanId}`);

  if (status === 'completed') {
    handleCompletedScan(scanId, webhookData);
  } else if (status === 'error') {
    handleErrorScan(scanId, webhookData);
  } else if (status === 'creditsChecked') {
    handleCreditsCheck(scanId, webhookData);
  }

  res.status(200).send('OK');
});

/**
 * New result webhook - receives results as they're found
 */
router.post('/webhook/new-result/:scanId', (req, res) => {
  const { scanId } = req.params;
  const resultData = req.body;

  console.log(`📥 New result found for scan: ${scanId}`);
  
  if (!scanResults.has(scanId)) {
    scanResults.set(scanId, { results: [] });
  }
  
  scanResults.get(scanId).results.push(resultData);
  res.status(200).send('OK');
});

/**
 * Handle completed scan webhook
 */
function handleCompletedScan(scanId, data) {
  scanResults.set(scanId, {
    status: 'completed',
    completedAt: new Date(),
    statistics: data.scannedDocument?.totalWords || 0,
    totalResults: data.results?.internet?.length || 0,
    results: data.results?.internet || [],
    summary: {
      totalWords: data.scannedDocument?.totalWords || 0,
      identicalWords: data.results?.score?.identicalWords || 0,
      minorChangedWords: data.results?.score?.minorChangedWords || 0,
      relatedMeaningWords: data.results?.score?.relatedMeaningWords || 0,
      aggregatedScore: data.results?.score?.aggregatedScore || 0
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
    error: data.error
  });
}

/**
 * Handle credits check webhook
 */
function handleCreditsCheck(scanId, data) {
  console.log(`💰 Credits check for ${scanId}: ${data.credits} credits required`);
}

/**
 * Receive exported result data with text comparison
 */
router.post('/result/:scanId/:resultId', (req, res) => {
  const { scanId, resultId } = req.params;
  const resultData = req.body;

  console.log(`📥 Received result export: ${scanId}/${resultId}`);

  if (!exportedData.has(scanId)) {
    exportedData.set(scanId, { results: {} });
  }

  // Store the detailed result with text positions
  exportedData.get(scanId).results[resultId] = resultData;

  res.status(200).send('OK');
});

/**
 * Receive crawled version (processed document)
 */
router.post('/crawled/:scanId', (req, res) => {
  const { scanId } = req.params;
  const crawledData = req.body;

  console.log(`📥 Received crawled version: ${scanId}`);

  if (!exportedData.has(scanId)) {
    exportedData.set(scanId, {});
  }

  exportedData.get(scanId).crawledVersion = crawledData;
  res.status(200).send('OK');
});

/**
 * Receive PDF report
 */
router.post('/pdf/:scanId', (req, res) => {
  const { scanId } = req.params;
  const pdfData = req.body;

  console.log(`📥 Received PDF report: ${scanId}`);

  if (!exportedData.has(scanId)) {
    exportedData.set(scanId, {});
  }

  exportedData.get(scanId).pdfReport = pdfData;
  res.status(200).send('OK');
});

/**
 * Export completion webhook
 */
router.post('/export-completed/:scanId', (req, res) => {
  const { scanId } = req.params;
  const exportStatus = req.body;

  console.log(`✓ Export completed for: ${scanId}`);
  console.log(`  - Tasks completed: ${exportStatus.tasks?.length || 0}`);
  
  // Verify all tasks completed successfully
  const allHealthy = exportStatus.tasks?.every(task => task.isHealthy) ?? false;
  
  if (allHealthy && exportStatus.completed) {
    console.log('✓ All export tasks completed successfully');
  } else {
    console.error('✗ Some export tasks failed');
  }

  res.status(200).send('OK');
});

// Helper functions to retrieve stored data
const getResults = () => scanResults;
const getExportedData = () => exportedData;

module.exports = {
  router,
  getResults,
  getExportedData
};
```

**3. Text Highlighter Module** (`text-highlighter.js`)

```javascript
/**
 * Highlight plagiarized text based on character positions
 * @param {string} originalText - The original document text
 * @param {Array} charStarts - Array of starting character positions
 * @param {Array} charLengths - Array of lengths for each match
 * @param {string} className - CSS class name for highlighting
 */
function highlightPlagiarizedText(originalText, charStarts, charLengths, className = 'plagiarism') {
  if (!charStarts || !charLengths || charStarts.length === 0) {
    return originalText;
  }

  // Create array of highlight regions
  const regions = charStarts.map((start, index) => ({
    start: start,
    end: start + charLengths[index],
    length: charLengths[index]
  }));

  // Sort regions by start position
  regions.sort((a, b) => a.start - b.start);

  // Build highlighted text
  let result = '';
  let lastIndex = 0;

  regions.forEach(region => {
    // Add non-highlighted text before this region
    result += originalText.substring(lastIndex, region.start);
    
    // Add highlighted text
    result += `<span class="${className}">${originalText.substring(region.start, region.end)}</span>`;
    
    lastIndex = region.end;
  });

  // Add remaining text after last highlight
  result += originalText.substring(lastIndex);

  return result;
}

/**
 * Extract line numbers containing plagiarism
 * @param {string} text - The document text
 * @param {Array} charStarts - Array of starting character positions
 * @param {Array} charLengths - Array of lengths for each match
 */
function getPlagiarizedLines(text, charStarts, charLengths) {
  if (!charStarts || !charLengths) {
    return [];
  }

  const lines = text.split('\n');
  const plagiarizedLines = new Set();
  
  let currentPos = 0;
  
  lines.forEach((line, lineIndex) => {
    const lineStart = currentPos;
    const lineEnd = currentPos + line.length;
    
    // Check if any plagiarism region overlaps with this line
    charStarts.forEach((start, index) => {
      const end = start + charLengths[index];
      
      if ((start >= lineStart && start <= lineEnd) || 
          (end >= lineStart && end <= lineEnd) ||
          (start <= lineStart && end >= lineEnd)) {
        plagiarizedLines.add(lineIndex + 1); // Line numbers are 1-based
      }
    });
    
    currentPos = lineEnd + 1; // +1 for newline character
  });
  
  return Array.from(plagiarizedLines).sort((a, b) => a - b);
}

/**
 * Create detailed line-by-line plagiarism report
 * @param {string} text - The document text
 * @param {Object} comparisonData - Comparison data from Copyleaks result
 */
function generateLineReport(text, comparisonData) {
  const lines = text.split('\n');
  const report = [];
  
  const sourceChars = comparisonData?.source?.chars;
  const suspectedChars = comparisonData?.suspected?.chars;
  
  if (!sourceChars) {
    return report;
  }

  let currentPos = 0;
  
  lines.forEach((line, lineIndex) => {
    const lineStart = currentPos;
    const lineEnd = currentPos + line.length;
    const matches = [];
    
    // Find all matches in this line
    sourceChars.starts?.forEach((start, index) => {
      const end = start + sourceChars.lengths[index];
      
      if (start >= lineStart && start < lineEnd) {
        matches.push({
          start: start - lineStart,
          length: Math.min(sourceChars.lengths[index], lineEnd - start),
          text: line.substring(start - lineStart, Math.min(end - lineStart, line.length))
        });
      }
    });
    
    if (matches.length > 0) {
      report.push({
        lineNumber: lineIndex + 1,
        lineText: line,
        matches: matches,
        isPlagiarized: true
      });
    }
    
    currentPos = lineEnd + 1;
  });
  
  return report;
}

/**
 * Get plagiarism statistics
 * @param {Object} resultData - Result data from Copyleaks
 */
function getPlagiarismStats(resultData) {
  return {
    identicalWords: resultData.statistics?.identical || 0,
    minorChanges: resultData.statistics?.minorChanges || 0,
    relatedMeaning: resultData.statistics?.relatedMeaning || 0,
    totalMatchedWords: (resultData.statistics?.identical || 0) + 
                       (resultData.statistics?.minorChanges || 0) + 
                       (resultData.statistics?.relatedMeaning || 0),
    matchPercentage: resultData.matchPercentage || 0
  };
}

module.exports = {
  highlightPlagiarizedText,
  getPlagiarizedLines,
  generateLineReport,
  getPlagiarismStats
};
```

**4. Main Application Server** (`server.js`)

```javascript
const express = require('express');
const PlagiarismScanner = require('./plagiarism-scanner');
const { router: webhookRouter, getResults, getExportedData } = require('./webhook-handler');
const { 
  highlightPlagiarizedText, 
  getPlagiarizedLines, 
  generateLineReport,
  getPlagiarismStats 
} = require('./text-highlighter');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuration
const CONFIG = {
  COPYLEAKS_EMAIL: process.env.COPYLEAKS_EMAIL || 'your-email@example.com',
  COPYLEAKS_API_KEY: process.env.COPYLEAKS_API_KEY || 'your-api-key',
  WEBHOOK_BASE_URL: process.env.WEBHOOK_BASE_URL || 'https://your-server.com',
  PORT: process.env.PORT || 3000
};

// Initialize scanner
const scanner = new PlagiarismScanner(CONFIG.COPYLEAKS_EMAIL, CONFIG.COPYLEAKS_API_KEY);

// Mount webhook routes
app.use(webhookRouter);

/**
 * Submit text for plagiarism scan
 */
app.post('/api/scan/text', async (req, res) => {
  try {
    const { text, scanId } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const uniqueScanId = scanId || `scan-${Date.now()}`;
    
    const result = await scanner.submitTextScan(
      uniqueScanId,
      text,
      CONFIG.WEBHOOK_BASE_URL
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Submit file for plagiarism scan
 */
app.post('/api/scan/file', async (req, res) => {
  try {
    const { filePath, scanId } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const uniqueScanId = scanId || `scan-${Date.now()}`;
    
    const result = await scanner.submitFileScan(
      uniqueScanId,
      filePath,
      CONFIG.WEBHOOK_BASE_URL
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check scan status and results
 */
app.get('/api/scan/:scanId/status', (req, res) => {
  const { scanId } = req.params;
  const results = getResults();
  
  if (!results.has(scanId)) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  res.json(results.get(scanId));
});

/**
 * Export results after scan completion
 */
app.post('/api/scan/:scanId/export', async (req, res) => {
  try {
    const { scanId } = req.params;
    const results = getResults();
    
    if (!results.has(scanId)) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const scanData = results.get(scanId);
    
    if (scanData.status !== 'completed') {
      return res.status(400).json({ error: 'Scan not completed yet' });
    }

    const resultIds = scanData.results.map(r => r.id);
    
    const exportResult = await scanner.exportResults(
      scanId,
      resultIds,
      CONFIG.WEBHOOK_BASE_URL
    );

    res.json(exportResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get highlighted text with plagiarism marks
 */
app.get('/api/scan/:scanId/highlights', (req, res) => {
  const { scanId } = req.params;
  const exportedData = getExportedData();
  
  if (!exportedData.has(scanId)) {
    return res.status(404).json({ error: 'Exported data not found' });
  }

  const data = exportedData.get(scanId);
  const crawledText = data.crawledVersion?.text?.value;
  
  if (!crawledText) {
    return res.status(404).json({ error: 'Crawled text not available' });
  }

  // Process all results and create highlights
  const allHighlights = [];
  
  Object.values(data.results || {}).forEach(result => {
    const comparison = result.text?.comparison;
    
    if (comparison?.source?.chars) {
      const highlighted = highlightPlagiarizedText(
        crawledText,
        comparison.source.chars.starts,
        comparison.source.chars.lengths
      );
      
      const plagiarizedLines = getPlagiarizedLines(
        crawledText,
        comparison.source.chars.starts,
        comparison.source.chars.lengths
      );
      
      const lineReport = generateLineReport(crawledText, comparison);
      const stats = getPlagiarismStats(result);
      
      allHighlights.push({
        resultId: result.id,
        url: result.url,
        highlightedText: highlighted,
        plagiarizedLines: plagiarizedLines,
        lineReport: lineReport,
        statistics: stats
      });
    }
  });

  res.json({
    scanId,
    originalText: crawledText,
    highlights: allHighlights
  });
});

/**
 * Get line-by-line plagiarism report
 */
app.get('/api/scan/:scanId/line-report', (req, res) => {
  const { scanId } = req.params;
  const exportedData = getExportedData();
  
  if (!exportedData.has(scanId)) {
    return res.status(404).json({ error: 'Exported data not found' });
  }

  const data = exportedData.get(scanId);
  const crawledText = data.crawledVersion?.text?.value;
  
  if (!crawledText) {
    return res.status(404).json({ error: 'Crawled text not available' });
  }

  const reports = [];
  
  Object.values(data.results || {}).forEach(result => {
    const comparison = result.text?.comparison;
    
    if (comparison) {
      const lineReport = generateLineReport(crawledText, comparison);
      reports.push({
        source: result.url,
        lines: lineReport
      });
    }
  });

  res.json({
    scanId,
    totalSources: reports.length,
    reports
  });
});

// Start server
app.listen(CONFIG.PORT, () => {
  console.log(`\n🚀 Copyleaks Plagiarism Scanner Server`);
  console.log(`   Running on port ${CONFIG.PORT}`);
  console.log(`   Webhook URL: ${CONFIG.WEBHOOK_BASE_URL}\n`);
});
```

**5. Usage Example** (`example-usage.js`)

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function exampleUsage() {
  try {
    // 1. Submit text for scanning
    console.log('1. Submitting text for plagiarism scan...');
    
    const scanResponse = await axios.post(`${API_BASE}/api/scan/text`, {
      text: 'Your text content here. This will be checked for plagiarism across billions of sources.',
      scanId: 'my-scan-123'
    });
    
    console.log('Scan submitted:', scanResponse.data);
    
    // 2. Wait for scan to complete (webhooks will be called)
    console.log('\n2. Waiting for scan completion...');
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
    
    // 3. Check scan status
    console.log('\n3. Checking scan status...');
    const statusResponse = await axios.get(`${API_BASE}/api/scan/my-scan-123/status`);
    console.log('Scan status:', statusResponse.data);
    
    // 4. Export detailed results
    if (statusResponse.data.status === 'completed') {
      console.log('\n4. Exporting detailed results...');
      const exportResponse = await axios.post(`${API_BASE}/api/scan/my-scan-123/export`);
      console.log('Export initiated:', exportResponse.data);
      
      // 5. Wait for export to complete
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      // 6. Get highlighted text
      console.log('\n5. Getting highlighted text...');
      const highlightsResponse = await axios.get(`${API_BASE}/api/scan/my-scan-123/highlights`);
      console.log('\nPlagiarism highlights:', JSON.stringify(highlightsResponse.data, null, 2));
      
      // 7. Get line-by-line report
      console.log('\n6. Getting line-by-line report...');
      const lineReportResponse = await axios.get(`${API_BASE}/api/scan/my-scan-123/line-report`);
      console.log('\nLine report:');
      
      lineReportResponse.data.reports.forEach(report => {
        console.log(`\n  Source: ${report.source}`);
        report.lines.forEach(line => {
          console.log(`  Line ${line.lineNumber}: ${line.lineText}`);
          line.matches.forEach(match => {
            console.log(`    → Plagiarized: "${match.text}"`);
          });
        });
      });
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run example
exampleUsage();
```

**6. Environment Configuration** (`.env`)

```bash
COPYLEAKS_EMAIL=your-email@example.com
COPYLEAKS_API_KEY=your-api-key-here
WEBHOOK_BASE_URL=https://your-server.com
PORT=3000
```


### **Key Features**

**Text Highlighting:**

- Character-level position tracking for precise highlighting[^1][^2]
- Line-by-line plagiarism detection[^3]
- HTML output with CSS class names for styling[^4]

**Detection Types:**

- Identical matches (word-for-word copying)[^5][^6]
- Minor changes (slight variations)[^6]
- Paraphrased content (rewritten with same meaning)[^6]

**Export Capabilities:**

- Detailed plagiarism results with text positions[^7][^8]
- Crawled version showing processed text[^9]
- PDF reports with visual highlights[^10]

**Webhook Integration:**

- Real-time status updates[^11]
- Progressive result streaming[^11]
- Export completion notifications[^12]


### **How It Works**

1. **Submit Scan**: Text is converted to base64 and submitted with webhook URLs[^13][^1][^3]
2. **Receive Webhooks**: Completion webhook provides result IDs and summary[^14][^15]
3. **Export Results**: Use result IDs to export detailed comparison data[^8][^7]
4. **Process Positions**: Character/word position arrays identify plagiarized segments[^16][^17]
5. **Generate Highlights**: Create HTML with highlighted plagiarized text[^18]
6. **Display Line Numbers**: Map character positions to line numbers[^3]

This complete implementation provides everything needed to detect plagiarism and display which specific lines contain copied content using the official Copyleaks npm SDK.[^19][^2][^20][^1][^3]
<span style="display:none">[^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^31][^32][^33][^34][^35][^36][^37][^38][^39][^40][^41][^42][^43][^44][^45][^46][^47][^48][^49][^50]</span>

<div align="center">⁂</div>

[^1]: https://www.npmjs.com/package/plagiarism-checker?activeTab=readme

[^2]: https://github.com/Copyleaks/NodeJS-Plagiarism-Checker

[^3]: https://docs.copyleaks.com/resources/sdks/javascript/

[^4]: https://netus.ai/blog/integrating-a-plagiarism-detector-api-with-your-website

[^5]: https://docs.copyleaks.com/concepts/features/identical-matches/

[^6]: https://docs.copyleaks.com/concepts/features/detection-levels/

[^7]: https://docs.copyleaks.com/reference/actions/downloads/export/

[^8]: https://docs.copyleaks.com/concepts/features/how-to-display/

[^9]: https://docs.copyleaks.com/reference/data-types/authenticity/results/crawled-version/

[^10]: https://docs.copyleaks.com/concepts/features/export-pdf-report/

[^11]: https://docs.copyleaks.com/reference/data-types/authenticity/webhooks/overview/

[^12]: https://docs.copyleaks.com/reference/data-types/authenticity/webhooks/export-completed/

[^13]: https://stackoverflow.com/questions/76622704/api-endpoint-to-submit-free-text-to-the-copyleaks-plagiarism-api

[^14]: https://docs.copyleaks.com/guides/authenticity/detect-plagiarism-text/

[^15]: https://docs.copyleaks.com/reference/data-types/authenticity/webhooks/scan-completed/

[^16]: https://docs.copyleaks.com/reference/data-types/authenticity/results/ai-detection/

[^17]: https://docs.copyleaks.com/reference/data-types/ai-detector/ai-text-detector-response/

[^18]: https://app.copyleaks.com/text-compare

[^19]: https://docs.copyleaks.com/resources/sdks/overview/

[^20]: https://docs.copyleaks.com/resources/updates/release-notes/

[^21]: https://www.semanticscholar.org/paper/b4ead98b6923acf78f00135dc821c49e0de716e0

[^22]: https://arxiv.org/pdf/2202.13953.pdf

[^23]: http://arxiv.org/pdf/2403.08334.pdf

[^24]: http://arxiv.org/pdf/2504.04537.pdf

[^25]: https://arxiv.org/html/2402.06035v1

[^26]: https://dl.acm.org/doi/pdf/10.1145/3656394

[^27]: http://arxiv.org/pdf/2402.10853.pdf

[^28]: https://arxiv.org/abs/2310.09571

[^29]: https://arxiv.org/html/2410.20862v1

[^30]: https://docs.copyleaks.com/get-started/quickstart/

[^31]: https://docs.copyleaks.com/concepts/products/plagiarism-checker-api/

[^32]: https://copyleaks.com/codeleaks/code-plagiarism-checker

[^33]: https://arxiv.org/pdf/2207.11171.pdf

[^34]: https://zenodo.org/record/5500461/files/NodeXP__NOde_js_server_side_JavaScript_injection_vulnerability_DEtection_and_eXPloitation%20(1).pdf

[^35]: http://arxiv.org/pdf/2409.09356.pdf

[^36]: https://arxiv.org/pdf/2402.07444.pdf

[^37]: https://arxiv.org/pdf/2301.05097v1.pdf

[^38]: https://arxiv.org/pdf/1902.09217.pdf

[^39]: http://arxiv.org/pdf/2411.14829.pdf

[^40]: https://arxiv.org/pdf/2312.09370.pdf

[^41]: https://docs.copyleaks.com/reference/data-types/authenticity/results/new-plagiarism-result/

[^42]: http://arxiv.org/pdf/2309.01116.pdf

[^43]: http://arxiv.org/pdf/2407.10812.pdf

[^44]: https://arxiv.org/abs/1806.07659

[^45]: https://arxiv.org/pdf/2112.15230.pdf

[^46]: https://arxiv.org/pdf/1903.02613.pdf

[^47]: https://arxiv.org/pdf/1802.02938.pdf

[^48]: https://copyleaks.com/api

[^49]: https://docs.copyleaks.com/guides/authenticity/detect-ai-generated-content/

[^50]: https://docs.copyleaks.com/reference/actions/authenticity/submit-file/

