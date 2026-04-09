# KG_frontend Session Notes — 2026-04-09

## Task
Add Dockerfile for Google Cloud deployment, reusing invoice-extractor-ui pattern.

## Key findings
- `VITE_` vars are baked in at build time — using Docker build args
- Auth0 values already have fallbacks in config.ts (same domain as .env.local)
- Production API: https://kg-api.hashtag.ai
- nginx.conf from invoice-extractor-ui is reusable as-is

## Files created
- `Dockerfile` — multi-stage build with nginx, uses build args for VITE_ vars
- `nginx.conf` — same as invoice-extractor-ui
- `.env.example` — documents production env vars for the build
