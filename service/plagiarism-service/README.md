# Plagiarism Highlight Microservice

A minimal, authentication-free REST microservice focused solely on Copyleaks plagiarism scanning with highlight-ready output. It reuses the production-tested client, scanner, and highlighter from the main application while exposing a clean `/plagiarism` API surface and webhook receivers. The service is implemented with Fastify + Pino and linted with Biome.

## Features

- Submit plain text for Copyleaks plagiarism scanning without additional auth layers
- Automatic webhook handling for status, results, crawled content, and exports
- Auto-triggers export flows when scans complete to fetch comparison data
- Converts Copyleaks comparison payloads into character-level highlights and HTML snippets
- Fastify HTTP stack with Pino logging and Biome formatting/linting
- Health checks, structured logging, input validation, and centralized error handling

## Directory Layout

```
service/plagiarism-service/
├── .env.example
├── README.md
├── biome.json
├── package.json
└── src
    ├── app.js                  # Fastify instance factory
    ├── config/index.js         # Environment + validation
    ├── controllers             # HTTP and webhook controllers
    ├── middlewares             # Not-found + error middleware
    ├── routes                  # Plagiarism + webhook routers
    ├── services                # Copyleaks + highlight helpers
    ├── storage/scanStore.js    # In-memory persistence
    ├── utils                   # Logger + async wrapper
    └── server.js               # Entry point
```

## Getting Started

1. **Install service dependencies**:
   ```bash
   cd service/plagiarism-service
   npm install
   ```

2. **Copy environment config** at repo root (shared with the primary app) and fill in Copyleaks credentials plus a public webhook URL:
   ```bash
   cp service/plagiarism-service/.env.example .env
   ```

   > Ensure `WEBHOOK_BASE_URL` is reachable by Copyleaks (use ngrok during local dev). The same `.env` can be shared with the main app.

3. **Run the microservice**:
   ```bash
   cd service/plagiarism-service
   npm start
   ```

   The service listens on `PLAGIARISM_SERVICE_PORT` (default `4000`).

## API

### `POST /plagiarism`
Submit text for checking.

```json
{
  "text": "Example paragraph...",
  "options": {
    "sensitivityLevel": 3,
    "includeHtml": true
  }
}
```

**Response** `202 Accepted`
```json
{
  "scanId": "scan-<uuid>",
  "status": "pending",
  "message": "Scan submitted successfully. Await webhook callbacks for completion."
}
```

### `GET /plagiarism`
Returns a pageless list of scans with summary metadata.

### `GET /plagiarism/:scanId`
Detailed status for a single scan (credits, summary, export progress).

### `GET /plagiarism/:scanId/highlight`
Delivers highlight metadata, HTML, and line-level report once export data is ready. Returns `409` if Copyleaks has not delivered the comparison payload yet.

### `DELETE /plagiarism/:scanId`
Deletes a stored scan and requests deletion from Copyleaks (best-effort).

### `GET /health`
Basic liveness check.

## Webhooks

The scanner automatically registers these endpoints via `WEBHOOK_BASE_URL`:

- `POST /webhook/{STATUS}/:scanId` – status, completion, and error events
- `POST /webhook/new-result/:scanId` – incremental matches
- `POST /webhook/result/:scanId/:resultId` – exported comparison payloads
- `POST /webhook/crawled/:scanId` – crawled/original text body
- `POST /webhook/pdf/:scanId` – PDF payload (stored for completeness)
- `POST /webhook/export-completed/:scanId` – export lifecycle hook

On completion, the service kicks off an export automatically so highlights are generated without additional API calls.

## Notes & Best Practices

- This service intentionally stores scan data in memory. For production usage, back the `scanStore` with Redis or a database.
- Run the service behind HTTPS and supply an HTTPS `WEBHOOK_BASE_URL` to meet Copyleaks requirements.
- No API authentication is enforced—restrict network access at the ingress layer if the service is exposed publicly.
- Observability hooks rely on Pino, which integrates cleanly with most log drains.
- Use `npm run lint` (Biome) before committing changes to keep formatting and linting consistent.
