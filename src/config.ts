export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const AUTH_CONFIG = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN ?? 'login.hashtag.ai',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID ?? 'placeholder',
  audience: import.meta.env.VITE_AUTH0_AUDIENCE ?? 'https://api.hashtag.ai/mgmt',
};

export const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
