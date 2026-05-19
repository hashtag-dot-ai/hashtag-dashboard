import { mgmtRequest } from './client';
import type { KeyOut, KeyCreate, KeyCreated } from '@/types/api';

export const listKeys = (projectId: string, userKey?: string | null) =>
  mgmtRequest<KeyOut[]>(`/mgmt/projects/${encodeURIComponent(projectId)}/keys`, {}, userKey);

export const createKey = (projectId: string, data: KeyCreate, userKey?: string | null) =>
  mgmtRequest<KeyCreated>(
    `/mgmt/projects/${encodeURIComponent(projectId)}/keys`,
    { method: 'POST', body: JSON.stringify(data) },
    userKey,
  );

export const revokeKey = (projectId: string, key_prefix: string, userKey?: string | null) =>
  mgmtRequest<void>(
    `/mgmt/projects/${encodeURIComponent(projectId)}/keys/${encodeURIComponent(key_prefix)}`,
    { method: 'DELETE' },
    userKey,
  );
