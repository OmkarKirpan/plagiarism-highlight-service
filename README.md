# Copyleaks Grammar & Plagiarism Checker

A production-ready Node.js application that combines **grammar checking** and **plagiarism detection** with text highlighting using the Copyleaks API.

## Features

- **Grammar Checking** via Copyleaks Writing Assistant API
- **Plagiarism Detection** using official `plagiarism-checker` npm package
- **Combined Text Highlighting** with different colors for different issue types
- **Character-level Position Tracking** for precise highlighting
- **Real-time Grammar Results** (synchronous)
- **Asynchronous Plagiarism Scanning** with webhooks
- **RESTful API** for easy integration
- **Line-by-line Reports** showing which lines have issues

## Project Structure

```
copyleaks-checker/
├── src/
│   ├── copyleaks-client.js       # Unified authentication & API client
│   ├── grammar-checker.js        # Grammar checking via Writing Assistant API
│   ├── plagiarism-scanner.js     # Plagiarism detection via npm lib
│   ├── text-highlighter.js       # Combined highlighting engine
│   ├── webhook-handler.js        # Webhook handlers for plagiarism results
│   └── server.js                 # Main Express server
├── package.json
├── .env                          # Configuration
└── README.md
```

## Additional Documentation

More focused guides live under `docs/`:

- [Quickstart](docs/QUICKSTART.md)
- [Postman Usage](docs/POSTMAN_USAGE.md)
- [Plagiarism Checker Guide](docs/Plagiarism%20Checker%20Guide.md)
- [Text Highlight Plagiarism Check](docs/Text%20Highlight%20Plagiarism%20Check.md)
- [Testing Results](docs/TESTING-RESULTS.md)

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create or update the `.env` file with your Copyleaks credentials:

```env
COPYLEAKS_EMAIL=your-email@example.com
COPYLEAKS_API_KEY=your-api-key-here
WEBHOOK_BASE_URL=https://your-server.com
PORT=3000
SANDBOX_MODE=false
```

**Important Notes:**
- Get your API credentials from [Copyleaks Dashboard](https://api.copyleaks.com/)
- For local development, use [ngrok](https://ngrok.com/) or similar to expose your localhost for webhooks:
  ```bash
  ngrok http 3000
  # Use the provided URL as your WEBHOOK_BASE_URL
  ```

### 3. Start the Server

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

The server will start on the configured PORT (default: 3000).

## API Endpoints

### 1. Combined Grammar & Plagiarism Check

**Endpoint:** `POST /api/check`

Submit text for both grammar and plagiarism checking.

**Request:**
```json
{
  "text": "Your text to check...",
  "checkId": "optional-custom-id",
  "options": {
    "language": "en",
    "sensitivityLevel": 0
  }
}
```

**Response:**
```json
{
  "success": true,
  "checkId": "check-1234567890",
  "scanId": "scan-check-1234567890",
  "grammar": {
    "success": true,
    "errors": [...],
    "statistics": {...}
  },
  "plagiarism": {
    "success": true,
    "scanId": "scan-check-1234567890",
    "status": "pending"
  }
}
```

### 2. Grammar Check Only

**Endpoint:** `POST /api/check/grammar`

**Request:**
```json
{
  "text": "Your text to check...",
  "options": {
    "language": "en"
  }
}
```

**Response:**
```json
{
  "success": true,
  "checkId": "grammar-1234567890",
  "result": {
    "errors": [
      {
        "type": "grammar",
        "message": "Subject-verb agreement error",
        "suggestion": "Use 'is' instead of 'are'",
        "position": {
          "start": 15,
          "length": 3
        },
        "severity": "error"
      }
    ],
    "statistics": {
      "totalErrors": 5,
      "grammarErrors": 3,
      "spellingErrors": 2
    }
  }
}
```

### 3. Plagiarism Check Only

**Endpoint:** `POST /api/check/plagiarism`

**Request:**
```json
{
  "text": "Your text to check...",
  "scanId": "optional-custom-scan-id",
  "options": {
    "sensitivityLevel": 0
  }
}
```

**Response:**
```json
{
  "success": true,
  "scanId": "scan-1234567890",
  "result": {
    "status": "pending",
    "message": "Scan submitted. Waiting for webhooks..."
  }
}
```

### 4. Get Check Results

**Endpoint:** `GET /api/results/:checkId`

Get the current status and results for a check.

**Response:**
```json
{
  "checkId": "check-1234567890",
  "scanId": "scan-check-1234567890",
  "grammar": {
    "result": {...}
  },
  "plagiarism": {
    "status": "completed",
    "score": {
      "aggregatedScore": 15.5,
      "identicalWords": 50
    },
    "summary": {
      "totalResults": 3,
      "plagiarismPercentage": 15.5
    }
  }
}
```

### 5. Get Highlighted Text

**Endpoint:** `GET /api/results/:checkId/highlighted`

Get text with combined grammar and plagiarism highlights.

**Response:**
```json
{
  "success": true,
  "checkId": "check-1234567890",
  "originalText": "Your original text...",
  "highlightedHTML": "<span class=\"grammar-error\" data-message=\"...\">text</span>...",
  "highlights": [...],
  "lineReport": [
    {
      "lineNumber": 5,
      "lineText": "This line has issues",
      "hasIssues": true,
      "highlights": [...]
    }
  ],
  "statistics": {
    "totalHighlights": 10,
    "grammarErrors": 5,
    "plagiarismMatches": 5
  }
}
```

### 6. Export Plagiarism Results

**Endpoint:** `POST /api/results/:scanId/export`

Export detailed plagiarism results after scan completion.

**Response:**
```json
{
  "success": true,
  "exportId": "export-1234567890",
  "message": "Export initiated. Waiting for export webhooks..."
}
```

### 7. Get CSS Stylesheet

**Endpoint:** `GET /api/stylesheet`

Get CSS styles for text highlights.

**Response:** CSS text with classes for different highlight types.

### 8. Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "service": "Copyleaks Grammar & Plagiarism Checker",
  "authenticated": true
}
```

## Usage Example

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function checkText() {
  // 1. Submit text for checking
  const checkResponse = await axios.post(`${API_BASE}/api/check`, {
    text: 'Your text content here. This will be checked for both grammar errors and plagiarism.',
    checkId: 'my-check-1'
  });

  console.log('Check submitted:', checkResponse.data);
  const { checkId, scanId } = checkResponse.data;

  // 2. Grammar results are immediate
  console.log('Grammar results:', checkResponse.data.grammar);

  // 3. Wait for plagiarism scan to complete (30-60 seconds typically)
  await new Promise(resolve => setTimeout(resolve, 45000));

  // 4. Check status
  const statusResponse = await axios.get(`${API_BASE}/api/results/${checkId}`);
  console.log('Status:', statusResponse.data.plagiarism.status);

  // 5. If completed, export detailed results
  if (statusResponse.data.plagiarism.status === 'completed') {
    await axios.post(`${API_BASE}/api/results/${scanId}/export`);

    // 6. Wait for export to complete
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 7. Get highlighted text
    const highlightResponse = await axios.get(`${API_BASE}/api/results/${checkId}/highlighted`);
    console.log('Highlighted HTML:', highlightResponse.data.highlightedHTML);
  }
}

checkText();
```

## Webhook Flow

### Plagiarism Detection Webhooks

1. **Status Webhook** (`/webhook/{STATUS}/:scanId`)
   - `creditsChecked` - Credits verified
   - `completed` - Scan completed with results
   - `error` - Scan failed

2. **New Result Webhook** (`/webhook/new-result/:scanId`)
   - Called for each plagiarism match found

3. **Export Webhooks**
   - `/webhook/result/:scanId/:resultId` - Detailed result data
   - `/webhook/crawled/:scanId` - Processed document
   - `/webhook/pdf/:scanId` - PDF report
   - `/webhook/export-completed/:scanId` - Export completion

## Highlight Types & CSS Classes

### Grammar Highlights

- `.grammar-error` - Grammar errors (blue wavy underline)
- `.spelling-error` - Spelling errors (red wavy underline)
- `.punctuation-error` - Punctuation issues (orange wavy underline)
- `.style-issue` - Style suggestions (purple wavy underline)

### Plagiarism Highlights

- `.plagiarism-identical` - Identical matches (dark red background)
- `.plagiarism-minor` - Minor changes (orange background)
- `.plagiarism-paraphrased` - Paraphrased content (yellow background)
- `.plagiarism-match` - General plagiarism (red background)

## HTML Output Example

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="http://localhost:3000/api/stylesheet">
</head>
<body>
  <div class="content">
    This is normal text.
    <span class="grammar-error" data-message="Subject-verb agreement" data-suggestion="Use 'is'">
      This are wrong
    </span>.
    <span class="plagiarism-identical" data-source="example.com" data-match="95%">
      This text is plagiarized from another source
    </span>.
  </div>
</body>
</html>
```

## Important Notes

### Grammar Checking API

The **Writing Assistant API** is a separate feature from the plagiarism checker. If you receive warnings like:

```
⚠️  Writing Assistant API endpoint may not be available in your plan
```

This means:
1. Your Copyleaks subscription may not include the Writing Assistant feature
2. The API endpoint might be different
3. Contact Copyleaks support to enable this feature

The application will continue to work for plagiarism detection even if grammar checking is unavailable.

### Production Deployment

For production use:

1. **Use a Database** - Replace in-memory storage with Redis, MongoDB, or PostgreSQL
2. **Set up SSL** - Use HTTPS for webhook URLs
3. **Configure Reverse Proxy** - Use nginx or similar
4. **Add Authentication** - Secure your API endpoints
5. **Monitor Webhooks** - Set up logging and alerting
6. **Handle Rate Limits** - Implement request queuing

### Webhook Testing

For local development:

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok
ngrok http 3000

# Copy the HTTPS URL and update WEBHOOK_BASE_URL in .env
# Example: https://abc123.ngrok.io
```

## Troubleshooting

### Authentication Fails
- Verify credentials in `.env`
- Check if API key is active in Copyleaks dashboard

### Webhooks Not Received
- Ensure `WEBHOOK_BASE_URL` is publicly accessible
- Check firewall settings
- Verify webhook URLs in Copyleaks dashboard

### Grammar API Returns Empty Results
- Check if Writing Assistant is included in your plan
- Try the plagiarism-only endpoint instead

## API Documentation

- [Copyleaks Plagiarism API](https://docs.copyleaks.com/concepts/products/plagiarism-checker-api/)
- [Copyleaks Writing Assistant](https://docs.copyleaks.com/reference/data-types/writing/writing-assistant/)
- [plagiarism-checker npm package](https://www.npmjs.com/package/plagiarism-checker)

## License

MIT

## Support

For issues with this implementation, create an issue in the repository.

For Copyleaks API issues, contact [Copyleaks Support](https://copyleaks.com/support).
