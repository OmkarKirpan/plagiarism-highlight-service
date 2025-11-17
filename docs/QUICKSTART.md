# Quick Start Guide

Get up and running with the Copyleaks Grammar & Plagiarism Checker in 5 minutes.

## Prerequisites

- Node.js 16+ installed
- Copyleaks account with API credentials
- (Optional) ngrok for local webhook testing

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Credentials

Edit the `.env` file and add your Copyleaks credentials:

```env
COPYLEAKS_EMAIL=your-email@example.com
COPYLEAKS_API_KEY=your-actual-api-key
WEBHOOK_BASE_URL=https://your-server.com
PORT=3000
```

**For local development with webhooks:**

```bash
# In a separate terminal, start ngrok
npx ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update WEBHOOK_BASE_URL in .env with this URL
```

### 3. Start the Server

```bash
npm start
```

You should see:
```
============================================================
🚀 Copyleaks Grammar & Plagiarism Checker Server
============================================================
   Port:         3000
   Webhook URL:  https://your-server.com
   Sandbox Mode: false
============================================================

✓ Successfully authenticated with Copyleaks
```

### 4. Test the API

#### Option A: Using the Example Script

```bash
# Run combined check example
node example-usage.js combined

# Run grammar-only example
node example-usage.js grammar

# Run plagiarism-only example
node example-usage.js plagiarism
```

#### Option B: Using cURL

```bash
# Check grammar and plagiarism
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This are a test sentance with grammer errors and possibly plagiarized content."
  }'

# Get results (after waiting 45 seconds for plagiarism scan)
curl http://localhost:3000/api/results/check-1234567890

# Get highlighted HTML
curl http://localhost:3000/api/results/check-1234567890/highlighted
```

#### Option C: Using JavaScript

```javascript
const axios = require('axios');

async function quickTest() {
  // Submit check
  const response = await axios.post('http://localhost:3000/api/check', {
    text: 'Your text here...'
  });

  console.log('Check ID:', response.data.checkId);
  console.log('Grammar errors:', response.data.grammar.statistics.totalErrors);

  // Wait for plagiarism scan (45 seconds)
  await new Promise(r => setTimeout(r, 45000));

  // Get results
  const results = await axios.get(
    `http://localhost:3000/api/results/${response.data.checkId}`
  );

  console.log('Plagiarism score:', results.data.plagiarism.score?.aggregatedScore);
}

quickTest();
```

## API Quick Reference

### Main Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/check` | POST | Combined grammar + plagiarism check |
| `/api/check/grammar` | POST | Grammar check only (instant) |
| `/api/check/plagiarism` | POST | Plagiarism check only (async) |
| `/api/results/:checkId` | GET | Get check results |
| `/api/results/:checkId/highlighted` | GET | Get highlighted HTML |
| `/health` | GET | Server health check |

### Typical Workflow

1. **Submit text** → `POST /api/check`
2. **Get grammar results** → Immediate in response
3. **Wait 30-60 seconds** → For plagiarism scan
4. **Export results** → `POST /api/results/:scanId/export`
5. **Wait 10 seconds** → For export to complete
6. **Get highlights** → `GET /api/results/:checkId/highlighted`

## Common Issues

### "Authentication failed"
- Check your `COPYLEAKS_EMAIL` and `COPYLEAKS_API_KEY` in `.env`
- Verify credentials at https://api.copyleaks.com/

### "Writing Assistant API may not be available"
- The Writing Assistant (grammar checking) is a separate feature
- Your plan might not include it
- Plagiarism detection will still work

### "Webhooks not received"
- Ensure `WEBHOOK_BASE_URL` is publicly accessible
- For local dev, use ngrok: `npx ngrok http 3000`
- Check firewall settings

### "ECONNREFUSED"
- Server is not running
- Start it with `npm start`

## Next Steps

1. **Read the full [README.md](./README.md)** for detailed API documentation
2. **Customize highlighting** - Edit `src/text-highlighter.js`
3. **Add authentication** - Secure your endpoints
4. **Use a database** - Replace in-memory storage
5. **Deploy to production** - Use PM2, Docker, or your preferred method

## Support

- **API Documentation:** https://docs.copyleaks.com/
- **npm Package:** https://www.npmjs.com/package/plagiarism-checker
- **Copyleaks Support:** https://copyleaks.com/support

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Your Client                    │
│             (Web App, Mobile, etc.)              │
└────────────────────┬────────────────────────────┘
                     │ HTTP/REST API
┌────────────────────▼────────────────────────────┐
│              Express Server (server.js)          │
├──────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────────────┐  │
│  │ Grammar      │  │ Plagiarism Scanner      │  │
│  │ Checker      │  │ (via npm package)       │  │
│  │ (HTTP API)   │  │                         │  │
│  └──────┬───────┘  └──────┬──────────────────┘  │
│         │                 │                      │
│         │                 │ Webhooks             │
│  ┌──────▼─────────────────▼──────────────────┐  │
│  │      Text Highlighter (Combined)          │  │
│  └───────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────┘
                   │ Authentication
┌──────────────────▼──────────────────────────────┐
│           Copyleaks API Services                 │
│  (Writing Assistant + Plagiarism Detection)      │
└──────────────────────────────────────────────────┘
```

Happy checking! 🚀
