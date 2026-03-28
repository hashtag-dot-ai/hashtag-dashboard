import { request } from './client';
import type { KeyOut, KeyCreate, KeyCreated } from '@/types/api';

export const listKeys = (tenant_id: string, token?: string | null) =>
  request<KeyOut[]>(`/mgmt/projects/${encodeURIComponent(tenant_id)}/keys`, {}, token);

export const createKey = (tenant_id: string, data: KeyCreate, token?: string | null) =>
  request<KeyCreated>(
    `/mgmt/projects/${encodeURIComponent(tenant_id)}/keys`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );

export const revokeKey = (tenant_id: string, key_prefix: string, token?: string | null) =>
  request<void>(
    `/mgmt/projects/${encodeURIComponent(tenant_id)}/keys/${encodeURIComponent(key_prefix)}`,
    { method: 'DELETE' },
    token,
  );
