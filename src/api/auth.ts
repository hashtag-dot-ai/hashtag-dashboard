import { request, mgmtRequest } from './client';
import type { MeResponse } from '@/types/api';

export const me = (token?: string | null) =>
  request<MeResponse>('/auth/me', { method: 'POST' }, token);

export const rotateKey = (apiKey: string) =>
  mgmtRequest<MeResponse>('/auth/rotate-key', { method: 'POST' }, apiKey);

export const updateUsername = (user_name: string, apiKey: string) =>
  mgmtRequest<{ user_name: string }>(
    '/auth/username',
    { method: 'PATCH', body: JSON.stringify({ user_name }) },
    apiKey,
  );
