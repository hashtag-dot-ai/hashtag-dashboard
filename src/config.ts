// /config.js (written by the container at startup) can override the build-time value.
export const API_URL =
  (window as any).__APP_CONFIG__?.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const AUTH_CONFIG = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN ?? 'login.bahi.ai',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID ?? 'AjCQZSU8Q5n8Dc7PsMMe1z9hKVPxlwte',
  audience: import.meta.env.VITE_AUTH0_AUDIENCE ?? 'https://api.bahi.ai/api/external',
};

export const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
