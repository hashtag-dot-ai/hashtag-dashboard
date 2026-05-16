import { mgmtRequest } from './client';
import type { InviteOut, InviteCreated, InviteAccept, InviteAcceptResult, ProjectMemberOut } from '@/types/api';

export const createInvite = (tenantId: string, userKey?: string | null) =>
  mgmtRequest<InviteCreated>(
    `/mgmt/projects/${encodeURIComponent(tenantId)}/invites`,
    { method: 'POST' },
    userKey,
  );

export const listInvites = (tenantId: string, userKey?: string | null) =>
  mgmtRequest<InviteOut[]>(`/mgmt/projects/${encodeURIComponent(tenantId)}/invites`, {}, userKey);

export const listMembers = (tenantId: string, userKey?: string | null) =>
  mgmtRequest<ProjectMemberOut[]>(`/mgmt/projects/${encodeURIComponent(tenantId)}/members`, {}, userKey);

export const acceptInvite = (body: InviteAccept, userKey?: string | null) =>
  mgmtRequest<InviteAcceptResult>(
    '/mgmt/projects/invites/accept',
    { method: 'POST', body: JSON.stringify(body) },
    userKey,
  );
