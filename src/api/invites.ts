import { mgmtRequest } from './client';
import type { InviteOut, InviteCreated, InviteAccept, InviteAcceptResult, ProjectMemberOut } from '@/types/api';

export const createInvite = (projectId: string, userKey?: string | null) =>
  mgmtRequest<InviteCreated>(
    `/mgmt/projects/${encodeURIComponent(projectId)}/invites`,
    { method: 'POST' },
    userKey,
  );

export const listInvites = (projectId: string, userKey?: string | null) =>
  mgmtRequest<InviteOut[]>(`/mgmt/projects/${encodeURIComponent(projectId)}/invites`, {}, userKey);

export const listMembers = (projectId: string, userKey?: string | null) =>
  mgmtRequest<ProjectMemberOut[]>(`/mgmt/projects/${encodeURIComponent(projectId)}/members`, {}, userKey);

export const acceptInvite = (body: InviteAccept, userKey?: string | null) =>
  mgmtRequest<InviteAcceptResult>(
    '/mgmt/projects/invites/accept',
    { method: 'POST', body: JSON.stringify(body) },
    userKey,
  );
