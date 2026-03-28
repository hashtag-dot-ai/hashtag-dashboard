import { request } from './client';
import type {
  TeamOut,
  TeamCreate,
  TeamUpdate,
  MemberOut,
  MemberAdd,
  AvailabilityCheck,
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

export const addMember = (slug: string, data: MemberAdd, token?: string | null) =>
  request<MemberOut>(
    `/mgmt/teams/${encodeURIComponent(slug)}/members`,
    { method: 'POST', body: JSON.stringify(data) },
    token,
  );

export const removeMember = (slug: string, user_id: number, token?: string | null) =>
  request<void>(
    `/mgmt/teams/${encodeURIComponent(slug)}/members/${user_id}`,
    { method: 'DELETE' },
    token,
  );
