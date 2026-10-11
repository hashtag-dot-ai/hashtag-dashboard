#!/bin/sh
# Runs automatically before nginx starts (nginx image executes /docker-entrypoint.d/*.sh).
# If VITE_API_URL is set on the container, override the API URL baked into the bundle.
if [ -n "$VITE_API_URL" ]; then
  echo "window.__APP_CONFIG__ = { API_URL: \"$VITE_API_URL\" };" > /usr/share/nginx/html/config.js
fi
