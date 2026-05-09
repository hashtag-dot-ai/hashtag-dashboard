import { request } from './client';
import type {
  InviteOut,
  InviteCreated,
  InviteAccept,
  InviteAcceptResult,
  InvitePreview,
  CorpusMemberOut,
} from '@/types/api';

export const createInvite = (corpusId: string, token?: string | null) =>
  request<InviteCreated>(
    `/mgmt/corpuses/${encodeURIComponent(corpusId)}/invites`,
    { method: 'POST' },
    token,
  );

export const listInvites = (corpusId: string, token?: string | null) =>
  request<InviteOut[]>(`/mgmt/corpuses/${encodeURIComponent(corpusId)}/invites`, {}, token);

export const revokeInvite = (corpusId: string, tokenPrefix: string, token?: string | null) =>
  request<void>(
    `/mgmt/corpuses/${encodeURIComponent(corpusId)}/invites/${encodeURIComponent(tokenPrefix)}`,
    { method: 'DELETE' },
    token,
  );

export const listMembers = (corpusId: string, token?: string | null) =>
  request<CorpusMemberOut[]>(`/mgmt/corpuses/${encodeURIComponent(corpusId)}/members`, {}, token);

export const previewInvite = (token: string, authToken?: string | null) =>
  request<InvitePreview>(
    `/mgmt/corpuses/invites/preview?token=${encodeURIComponent(token)}`,
    { method: 'GET' },
    authToken,
  );

export const acceptInvite = (body: InviteAccept, token?: string | null) =>
  request<InviteAcceptResult>(
    '/mgmt/corpuses/invites/accept',
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
