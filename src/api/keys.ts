import { request } from './client';
import type { KeyOut, KeyCreate, KeyCreated } from '@/types/api';

export const listKeys = (corpus_id: string, token?: string | null) =>
  request<KeyOut[]>(`/mgmt/corpuses/${encodeURIComponent(corpus_id)}/keys`, {}, token);

export const createKey = (corpus_id: string, data: KeyCreate, token?: string | null) =>
  request<KeyCreated>(
    `/mgmt/corpuses/${encodeURIComponent(corpus_id)}/keys`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );

export const revokeKey = (corpus_id: string, key_prefix: string, token?: string | null) =>
  request<void>(
    `/mgmt/corpuses/${encodeURIComponent(corpus_id)}/keys/${encodeURIComponent(key_prefix)}`,
    { method: 'DELETE' },
    token,
  );
