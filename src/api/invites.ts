import { request } from './client';
import type { InviteOut, InviteCreated, InviteAccept, InviteAcceptResult, ProjectMemberOut } from '@/types/api';

export const createInvite = (tenantId: string, token?: string | null) =>
  request<InviteCreated>(
    `/mgmt/projects/${encodeURIComponent(tenantId)}/invites`,
    { method: 'POST' },
    token,
  );

export const listInvites = (tenantId: string, token?: string | null) =>
  request<InviteOut[]>(`/mgmt/projects/${encodeURIComponent(tenantId)}/invites`, {}, token);

export const listMembers = (tenantId: string, token?: string | null) =>
  request<ProjectMemberOut[]>(`/mgmt/projects/${encodeURIComponent(tenantId)}/members`, {}, token);

export const acceptInvite = (body: InviteAccept, token?: string | null) =>
  request<InviteAcceptResult>(
    '/mgmt/projects/invites/accept',
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
