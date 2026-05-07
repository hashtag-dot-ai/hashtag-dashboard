import { request } from './client';
import type { MeResponse, ProfileUpdate, AccountKeyRotated, UsernameSuggestion } from '@/types/api';

export const me = (token?: string | null) =>
  request<MeResponse>('/mgmt/auth/me', { method: 'POST' }, token);

export const updateProfile = (body: ProfileUpdate, token?: string | null) =>
  request<MeResponse>('/mgmt/auth/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, token);

export const getUsernameSuggestion = (token?: string | null) =>
  request<UsernameSuggestion>('/mgmt/auth/username-suggestion', { method: 'GET' }, token);

export const rotateAccountKey = (token?: string | null) =>
  request<AccountKeyRotated>('/mgmt/auth/account-key/rotate', { method: 'POST' }, token);
