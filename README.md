# Hashtag.ai Dashboard

The web dashboard for the [Hashtag.ai API](https://kg-api.hashtag.ai/docs) — a knowledge graph extraction and query service. Feed it documents (URLs, text, PDFs), and it builds a structured knowledge graph you can query in natural language.

The dashboard is hosted at **https://kg-platform.hashtag.ai/dashboard**.

> **Note:** This dashboard is vibe-coded (built primarily with [Claude Code](https://claude.ai/code)). This is a frontend only — the backend API is the core offering. See [Limitations](#limitations) before trying to run this yourself.

---

## Limitations

You can run this locally against the hosted backend by setting `VITE_API_URL=https://kg-api.hashtag.ai` in `.env.local` (see [Building from source](#building-from-source)). The Dockerfile uses the hosted backend by default.

What doesn't work yet: **hosting on a third-party domain**. The Auth0 login flow is currently locked to the official domain, so new users cannot sign up via a separately hosted instance. As a workaround you can bypass the login flow and hardcode an API key obtained from the hosted service — see [Hosting](#hosting).

A full self-hosting path (frontend + lightweight backend, with configurable auth) is planned for a future release.

---

## What the Hashtag.ai API does

You POST a document to the `/process` endpoint. The backend extracts entities and relationships, builds a structured knowledge graph, and makes it queryable. You then POST natural-language questions to `/query` and get answers grounded in the graph.

```bash
# Ingest a document
curl -X POST https://kg-api.hashtag.ai/my-corpus/process \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "url", "url": "https://example.com/article"}'

# Query the graph
curl -X POST https://kg-api.hashtag.ai/my-corpus/query \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the main topics covered?"}'
```

Full API documentation is at **https://kg-api.hashtag.ai/docs**.

---

## Dashboard features

- **Corpus management** — create, rename, and delete corpora; each gets a permanent UUID (perma-ID) and a human-readable compound name (`username/corpus-name`)
- **Graph visualisation** — interactive force-directed (D3) and layout-based (Cytoscape.js) views; three detail levels: entities only, entities + source documents, full graph
- **Ingest panel** — submit URLs, paste text, or upload PDFs directly from the browser
- **API key management** — create per-corpus keys with three permission tiers: `read_only`, `read_write`, and `manage`
- **Team collaboration** — invite members via shareable links; members share corpus access without exposing your account key
- **Billing & credits** — credit balance, per-operation cost table, plan overview (Free / Business / Enterprise)
- **API log** — live log of every `/process` and `/query` call made from the graph tab, useful for debugging integrations

---

## Tech stack

React 18 · TypeScript · Vite · React Query · React Router · Radix UI · Tailwind CSS · D3 · Cytoscape.js · Auth0

---

## Hosting

Hosting on a a third-party domain won't work for new user signups — the Auth0 login flow is locked to the official domain. It is possible to work around this by modifying the login flow to hardcode an API key (or JWT) obtained from the hosted service, giving a single-user instance with no login screen, but this requires code changes rather than just configuration.

---

## Building from source

```bash
cp .env.example .env.local
# Edit .env.local with your values

npm install
npm run dev
# → http://localhost:3000
```

You can point the frontend at the hosted backend by setting `VITE_API_URL=https://kg-api.hashtag.ai` — the Auth0 credentials are already pre-configured for the hosted service. The Auth0 login flow should then work from localhost provided `http://localhost:3000` is in the allowed callback URLs for the Auth0 application. Get in touch if you want to try this.

### Environment variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the KG backend API |
| `VITE_AUTH0_DOMAIN` | Your Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | Auth0 SPA application client ID |
| `VITE_AUTH0_AUDIENCE` | Auth0 API audience identifier |
| `VITE_DEV_BYPASS_AUTH` | Set `true` to skip Auth0 and call the API without a token (requires a local backend in dev mode) |

---

## Docker

The build bakes the `VITE_` variables into the JS bundle at build time, so pass them as build arguments:

```bash
docker build \
  --build-arg VITE_API_URL=https://kg-api.hashtag.ai \
  --build-arg VITE_AUTH0_DOMAIN=your-tenant.auth0.com \
  --build-arg VITE_AUTH0_CLIENT_ID=your-client-id \
  --build-arg VITE_AUTH0_AUDIENCE=https://your-api/external \
  -t kg-frontend .

docker run -p 8080:8080 kg-frontend
```

---

## Testing

```bash
npm test            # run once
npm run test:watch  # watch mode
npm run test:ui     # Vitest browser UI
```

Tests use [MSW](https://mswjs.io/) to mock the API layer.

---

## API quick reference

All endpoints use an API key in the `x-api-key` header. You can use your account (management) key for corpora you own, or a scoped corpus key for specific projects.

### Auth — get your account key

Sign in at [hashtag.ai](https://hashtag.ai) to get your account key, or exchange an Auth0 JWT directly:

```bash
curl -X POST https://kg-api.hashtag.ai/auth/me \
  -H "Authorization: Bearer <auth0_jwt>"
# → { "management_key": "hashtag-user-key-..." }

export UK="hashtag-user-key-..."
```

### Corpus management

```bash
# Create a corpus
curl -X POST https://kg-api.hashtag.ai/mgmt/projects/ \
  -H "x-api-key: $UK" \
  -H "Content-Type: application/json" \
  -d '{"proj_display_name": "My Research", "tenant_id": "my-research"}'

# List corpora
curl -H "x-api-key: $UK" https://kg-api.hashtag.ai/mgmt/projects/

# Create a scoped API key
curl -X POST https://kg-api.hashtag.ai/mgmt/projects/my-research/keys \
  -H "x-api-key: $UK" \
  -H "Content-Type: application/json" \
  -d '{"key_type": "read_write", "description": "production"}'
# → { "raw_key": "hashtag-project-key-..." }  — shown once only
```

Key types: `read_only` · `read_write` · `manage`

### Ingest and query

```bash
# Ingest a URL
curl -X POST https://kg-api.hashtag.ai/my-research/process \
  -H "x-api-key: $UK" \
  -H "Content-Type: application/json" \
  -d '{"type": "url", "url": "https://example.com/article"}'

# Ingest plain text
curl -X POST https://kg-api.hashtag.ai/my-research/process \
  -H "x-api-key: $UK" \
  -H "Content-Type: application/json" \
  -d '{"type": "text", "url": "Paste your text content here..."}'

# Natural language query
curl -X POST https://kg-api.hashtag.ai/my-research/query \
  -H "x-api-key: $UK" \
  -H "Content-Type: application/json" \
  -d '{"question": "What entities are mentioned?"}'

# Fetch the graph (entities only)
curl "https://kg-api.hashtag.ai/my-research/graph?include=entities" \
  -H "x-api-key: $UK"
```

Graph `include` modes: `entities` · `entities_docs` · `full`

---

## Architecture

The service has two layers visible from the outside:

- **Interface layer** — corpus CRUD, membership, invites, key management, billing; the surface this dashboard talks to
- **Backend** — document ingestion, entity and relationship extraction, graph storage, and query; not yet open source

API keys are scoped to individual corpora and never expose your account key.

---

## Roadmap

- Open source release of a self-hostable lightweight backend (the hosted service will continue to offer additional query modes and optimisations)
- Teams — shared corpus ownership across multiple users
- CLI and TUI clients
- Corpus transfer and rename
