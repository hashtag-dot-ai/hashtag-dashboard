import { request } from './client';
import type { ProjectOut, ProjectCreate, ProjectUpdate, AvailabilityCheck } from '@/types/api';

export const listProjects = (token?: string | null) =>
  request<ProjectOut[]>('/mgmt/projects/', {}, token);

export const checkTenantId = (tenant_id: string, token?: string | null) =>
  request<AvailabilityCheck>(`/mgmt/projects/check/${encodeURIComponent(tenant_id)}`, {}, token);

export const createProject = (data: ProjectCreate, token?: string | null) =>
  request<ProjectOut>('/mgmt/projects/', { method: 'POST', body: JSON.stringify(data) }, token);

export const getProject = (tenant_id: string, token?: string | null) =>
  request<ProjectOut>(`/mgmt/projects/${encodeURIComponent(tenant_id)}`, {}, token);

export const updateProject = (tenant_id: string, data: ProjectUpdate, token?: string | null) =>
  request<ProjectOut>(
    `/mgmt/projects/${encodeURIComponent(tenant_id)}`,
    { method: 'PATCH', body: JSON.stringify(data) },
    token,
  );

export const deleteProject = (tenant_id: string, token?: string | null) =>
  request<void>(
    `/mgmt/projects/${encodeURIComponent(tenant_id)}`,
    { method: 'DELETE' },
    token,
  );
