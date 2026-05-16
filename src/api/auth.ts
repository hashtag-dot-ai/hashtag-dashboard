import { request } from './client';
import type { MeResponse } from '@/types/api';

export const me = (token?: string | null) =>
  request<MeResponse>('/auth/me', { method: 'POST' }, token);
