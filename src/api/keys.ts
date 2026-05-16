import { mgmtRequest } from './client';
import type { KeyOut, KeyCreate, KeyCreated } from '@/types/api';

export const listKeys = (tenant_id: string, userKey?: string | null) =>
  mgmtRequest<KeyOut[]>(`/mgmt/projects/${encodeURIComponent(tenant_id)}/keys`, {}, userKey);

export const createKey = (tenant_id: string, data: KeyCreate, userKey?: string | null) =>
  mgmtRequest<KeyCreated>(
    `/mgmt/projects/${encodeURIComponent(tenant_id)}/keys`,
    { method: 'POST', body: JSON.stringify(data) },
    userKey,
  );

export const revokeKey = (tenant_id: string, key_prefix: string, userKey?: string | null) =>
  mgmtRequest<void>(
    `/mgmt/projects/${encodeURIComponent(tenant_id)}/keys/${encodeURIComponent(key_prefix)}`,
    { method: 'DELETE' },
    userKey,
  );
