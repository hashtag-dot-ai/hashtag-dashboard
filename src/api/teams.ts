import { request } from './client';
import type {
  TeamOut,
  TeamCreate,
  TeamUpdate,
  MemberOut,
  AvailabilityCheck,
  TeamInviteOut,
  TeamInviteCreated,
  TeamInvitePreview,
  TeamInviteAccept,
  TeamInviteAcceptResult,
  TeamKeyOut,
  TeamKeyCreated,
} from '@/types/api';

export const listTeams = (token?: string | null) =>
  request<TeamOut[]>('/mgmt/teams/', {}, token);

export const checkSlug = (slug: string, token?: string | null) =>
  request<AvailabilityCheck>(`/mgmt/teams/check/${encodeURIComponent(slug)}`, {}, token);

export const createTeam = (data: TeamCreate, token?: string | null) =>
  request<TeamOut>('/mgmt/teams/', { method: 'POST', body: JSON.stringify(data) }, token);

export const getTeam = (slug: string, token?: string | null) =>
  request<TeamOut>(`/mgmt/teams/${encodeURIComponent(slug)}`, {}, token);

export const updateTeam = (slug: string, data: TeamUpdate, token?: string | null) =>
  request<TeamOut>(
    `/mgmt/teams/${encodeURIComponent(slug)}`,
    { method: 'PATCH', body: JSON.stringify(data) },
    token,
  );

export const listMembers = (slug: string, token?: string | null) =>
  request<MemberOut[]>(`/mgmt/teams/${encodeURIComponent(slug)}/members`, {}, token);

export const removeMember = (slug: string, user_id: number, token?: string | null) =>
  request<void>(
    `/mgmt/teams/${encodeURIComponent(slug)}/members/${user_id}`,
    { method: 'DELETE' },
    token,
  );

export const createTeamInvite = (slug: string, token?: string | null) =>
  request<TeamInviteCreated>(
    `/mgmt/teams/${encodeURIComponent(slug)}/invites`,
    { method: 'POST' },
    token,
  );

export const listTeamInvites = (slug: string, token?: string | null) =>
  request<TeamInviteOut[]>(`/mgmt/teams/${encodeURIComponent(slug)}/invites`, {}, token);

export const revokeTeamInvite = (slug: string, tokenPrefix: string, token?: string | null) =>
  request<void>(
    `/mgmt/teams/${encodeURIComponent(slug)}/invites/${encodeURIComponent(tokenPrefix)}`,
    { method: 'DELETE' },
    token,
  );

export const previewTeamInvite = (inviteToken: string, authToken?: string | null) =>
  request<TeamInvitePreview>(
    `/mgmt/teams/invites/preview?token=${encodeURIComponent(inviteToken)}`,
    { method: 'GET' },
    authToken,
  );

export const acceptTeamInvite = (body: TeamInviteAccept, token?: string | null) =>
  request<TeamInviteAcceptResult>(
    '/mgmt/teams/invites/accept',
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );

export const createTeamKey = (slug: string, data: { description?: string }, token?: string | null) =>
  request<TeamKeyCreated>(
    `/mgmt/teams/${encodeURIComponent(slug)}/keys`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );

export const listTeamKeys = (slug: string, token?: string | null) =>
  request<TeamKeyOut[]>(`/mgmt/teams/${encodeURIComponent(slug)}/keys`, {}, token);

export const revokeTeamKey = (slug: string, keyPrefix: string, token?: string | null) =>
  request<void>(
    `/mgmt/teams/${encodeURIComponent(slug)}/keys/${encodeURIComponent(keyPrefix)}`,
    { method: 'DELETE' },
    token,
  );

export const listTeamCorpuses = (slug: string, token?: string | null) =>
  request<{ corpus_id: string; compound_name: string; name: string }[]>(
    `/mgmt/teams/${encodeURIComponent(slug)}/corpuses`,
    {},
    token,
  );

export const leaveTeam = (slug: string, userId: number, token?: string | null) =>
  request<void>(
    `/mgmt/teams/${encodeURIComponent(slug)}/members/${userId}`,
    { method: 'DELETE' },
    token,
  );
