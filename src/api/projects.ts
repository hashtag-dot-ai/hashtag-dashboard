import { mgmtRequest } from './client';
import type { ProjectOut, ProjectCreate, ProjectUpdate, AvailabilityCheck } from '@/types/api';

export const listProjects = (userKey?: string | null) =>
  mgmtRequest<ProjectOut[]>('/mgmt/projects/', {}, userKey);

export const checkTenantId = (tenant_id: string, userKey?: string | null) =>
  mgmtRequest<AvailabilityCheck>(`/mgmt/projects/check/${encodeURIComponent(tenant_id)}`, {}, userKey);

export const createProject = (data: ProjectCreate, userKey?: string | null) =>
  mgmtRequest<ProjectOut>('/mgmt/projects/', { method: 'POST', body: JSON.stringify(data) }, userKey);

export const getProject = (tenant_id: string, userKey?: string | null) =>
  mgmtRequest<ProjectOut>(`/mgmt/projects/${encodeURIComponent(tenant_id)}`, {}, userKey);

export const updateProject = (tenant_id: string, data: ProjectUpdate, userKey?: string | null) =>
  mgmtRequest<ProjectOut>(
    `/mgmt/projects/${encodeURIComponent(tenant_id)}`,
    { method: 'PATCH', body: JSON.stringify(data) },
    userKey,
  );

export const deleteProject = (tenant_id: string, userKey?: string | null) =>
  mgmtRequest<void>(
    `/mgmt/projects/${encodeURIComponent(tenant_id)}`,
    { method: 'DELETE' },
    userKey,
  );
