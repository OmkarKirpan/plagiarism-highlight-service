# Postman Collection Usage Guide

## Overview

This guide explains how to use the Copyleaks Integration API Postman collection to test the grammar and plagiarism checking service.

## Setup

### 1. Import Collection and Environment

1. Open Postman
2. Click **Import** button
3. Import both files:
   - `Copyleaks Integration API.postman_collection.json`
   - `Copyleaks Integration.postman_environment.json`
4. Select the **"Copyleaks Integration - Local"** environment from the dropdown

### 2. Start the Server

```bash
npm start
```

The server should start on `http://localhost:3000`

### 3. Verify Setup

Run the **"Health Check"** request to verify:
- Server is running
- Authenticated with Copyleaks API

Expected response:
```json
{
  "status": "ok",
  "service": "Copyleaks Grammar & Plagiarism Checker",
  "authenticated": true
}
```

## Basic Workflows

### Workflow 1: Grammar Check Only

**Use Case:** Quick grammar, spelling, and style checking without plagiarism detection.

**Steps:**
1. Go to **Text Checking → Grammar Check Only**
2. Click **Send**
3. Review immediate results

**Response Example:**
```json
{
  "success": true,
  "checkId": "grammar-1234567890",
  "result": {
    "corrections": [
      {
        "text": "grammer",
        "suggestions": ["grammar"],
        "type": "spelling",
        "start": 35,
        "length": 7
      }
    ],
    "summary": {
      "totalIssues": 3,
      "byType": {
        "spelling": 2,
        "grammar": 1
      }
    }
  }
}
```

### Workflow 2: Plagiarism Check Only

**Use Case:** Detect if text has been copied from online sources.

**Steps:**
1. Go to **Text Checking → Plagiarism Check Only**
2. Click **Send**
3. Note the `scanId` from response
4. Wait 10-30 seconds for Copyleaks to process
5. Go to **Results → Get Check Results**
6. Replace `:checkId` with your scanId (remove the 'scan-' prefix)
7. Click **Send** repeatedly until `plagiarism.status` is `"completed"`

**Polling Response (Pending):**
```json
{
  "checkId": "1234567890",
  "scanId": "scan-1234567890",
  "grammar": { "status": "not_found" },
  "plagiarism": { "status": "pending" }
}
```

**Polling Response (Completed):**
```json
{
  "checkId": "1234567890",
  "scanId": "scan-1234567890",
  "grammar": { "status": "not_found" },
  "plagiarism": {
    "status": "completed",
    "completedAt": "2024-01-10T12:34:56Z",
    "results": [
      {
        "id": "abc123",
        "url": "http://example.com",
        "title": "Example Source",
        "matchPercentage": 15.5,
        "identicalWords": 10
      }
    ],
    "summary": {
      "totalResults": 1,
      "plagiarismPercentage": 15.5
    }
  }
}
```

### Workflow 3: Combined Check with Highlighted Text

**Use Case:** Full analysis with visual highlighting of both grammar errors and plagiarism.

**Steps:**

#### Step 1: Submit Combined Check
1. Go to **Text Checking → Combined Check (Grammar + Plagiarism)**
2. Click **Send**
3. Save the `checkId` and `scanId` from response

#### Step 2: Wait for Completion
1. Go to **Results → Get Check Results**
2. Replace `:checkId` with your checkId (without 'scan-' prefix)
3. Poll every 5-10 seconds until `plagiarism.status === "completed"`

#### Step 3: Export Results (if plagiarism found)
1. Go to **Results → Export Plagiarism Results**
2. Replace `:scanId` with your full scanId (including 'scan-')
3. Click **Send**
4. Wait 5-10 seconds for export webhooks to arrive

#### Step 4: Get Highlighted Text
1. Go to **Results → Get Highlighted Text**
2. Replace `:checkId` with your checkId
3. Click **Send**

**Highlighted Text Response:**
```json
{
  "success": true,
  "checkId": "test-check-1234567890",
  "scanId": "scan-test-check-1234567890",
  "html": "<span class='grammar-error-spelling' title='Suggestions: grammar'>grammer</span>...",
  "lineByLine": [
    {
      "lineNumber": 1,
      "text": "This is a test with errors.",
      "highlights": [
        {
          "start": 20,
          "length": 7,
          "type": "grammar",
          "class": "grammar-error-spelling"
        }
      ]
    }
  ],
  "statistics": {
    "grammarIssues": 3,
    "plagiarismMatches": 5
  }
}
```

#### Step 5: View in Browser
1. Copy the `html` value from response
2. Create an HTML file:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Highlighted Text</title>
  <style>
    /* Get stylesheet from /api/stylesheet endpoint */
    .grammar-error-spelling { background: #ffcccc; }
    .plagiarism-identical { background: #ff6666; }
    /* ... */
  </style>
</head>
<body>
  <!-- Paste the HTML here -->
</body>
</html>
```

## Advanced Features

### Using Environment Variables

The collection includes environment variables you can reference:

- `{{base_url}}` - Server URL (default: http://localhost:3000)
- `{{sample_text_short}}` - Short text with grammar errors
- `{{sample_text_plagiarism}}` - Text likely to trigger plagiarism detection
- `{{sample_text_combined}}` - Text with both grammar errors and plagiarism
- `{{last_check_id}}` - Stores last check ID (manual update needed)
- `{{last_scan_id}}` - Stores last scan ID (manual update needed)

### Dynamic Variables

Postman provides built-in variables:

- `{{$timestamp}}` - Current Unix timestamp
- `{{$randomInt}}` - Random integer
- `{{$guid}}` - Random GUID

Example usage in request body:
```json
{
  "checkId": "test-{{$timestamp}}",
  "text": "{{sample_text_combined}}"
}
```

### Testing with Scripts

Add this to the **Tests** tab of any request to auto-save IDs:

```javascript
// Save checkId to environment
if (pm.response.json().checkId) {
  pm.environment.set("last_check_id", pm.response.json().checkId);
}

// Save scanId to environment
if (pm.response.json().scanId) {
  pm.environment.set("last_scan_id", pm.response.json().scanId);
}

// Test for successful response
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});
```

## Common Issues

### 1. Server Not Running
**Error:** `ECONNREFUSED`

**Solution:**
```bash
npm start
```

### 2. Not Authenticated
**Error:** Authentication failed in health check

**Solution:**
- Check `.env` file has valid `COPYLEAKS_EMAIL` and `COPYLEAKS_API_KEY`
- Restart the server

### 3. Insufficient Credits
**Error:** "You don't have enough credits"

**Solution:**
- Set `SANDBOX_MODE=true` in `.env` file for testing
- Or add credits to your Copyleaks account

### 4. Export Not Available
**Error:** "No text available for highlighting"

**Solution:**
- Ensure scan is completed first (check status)
- Call `/api/results/:scanId/export` endpoint
- Wait 5-10 seconds for webhooks
- Then try getting highlighted text again

### 5. Webhooks Not Working
**Error:** Results stay in "pending" status

**Solution:**
- Check `WEBHOOK_BASE_URL` in `.env` is correct
- If testing locally, use ngrok:
  ```bash
  ngrok http 3000
  ```
- Update `WEBHOOK_BASE_URL` with ngrok URL
- Restart server

## Webhook Configuration

For local development with ngrok:

1. **Start ngrok:**
   ```bash
   ngrok http 3000
   ```

2. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

3. **Update .env:**
   ```
   WEBHOOK_BASE_URL=https://abc123.ngrok-free.app
   ```

4. **Restart server:**
   ```bash
   npm start
   ```

Now Copyleaks can send webhooks to your local server!

## Collection Structure

```
📁 Copyleaks Integration API
├── 📁 Health & Account
│   ├── Health Check
│   ├── Get Account Info
│   └── Get Stylesheet
├── 📁 Text Checking
│   ├── Combined Check (Grammar + Plagiarism)
│   ├── Grammar Check Only
│   └── Plagiarism Check Only
├── 📁 Results
│   ├── Get Check Results
│   ├── Get Highlighted Text
│   ├── Export Plagiarism Results
│   └── Delete Check
└── 📁 Webhooks (Internal)
    ├── Status Webhook
    ├── Result Export Webhook
    ├── Crawled Version Webhook
    ├── PDF Report Webhook
    └── Export Completed Webhook
```

## Tips & Tricks

### 1. Chain Requests with Tests
Add to **Tests** tab to automatically run next request:
```javascript
if (pm.response.json().status === "completed") {
  postman.setNextRequest("Export Plagiarism Results");
} else {
  // Wait and retry
  setTimeout(() => {
    postman.setNextRequest(pm.info.requestName);
  }, 5000);
}
```

### 2. Pre-request Scripts
Auto-generate unique IDs:
```javascript
pm.environment.set("check_id", "test-" + Date.now());
```

### 3. Visualize Results
Add to **Tests** tab for better visualization:
```javascript
var template = `
  <h3>Check Results</h3>
  <p>Status: {{response.plagiarism.status}}</p>
  <p>Plagiarism: {{response.plagiarism.summary.plagiarismPercentage}}%</p>
`;

pm.visualizer.set(template, {
  response: pm.response.json()
});
```

## Next Steps

- Review the [README.md](README.md) for server setup details
- Check [test-plagiarism.js](test-plagiarism.js) for automated testing
- Explore the [Copyleaks API documentation](https://api.copyleaks.com/documentation)

## Support

For issues or questions:
- Check server logs for detailed error messages
- Review webhook handler logs for webhook processing
- Verify ngrok is running for local development
