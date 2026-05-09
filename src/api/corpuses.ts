import { request } from './client';
import type { CorpusOut, CorpusCreate, CorpusUpdate, AvailabilityCheck } from '@/types/api';

export const listCorpuses = (token?: string | null) =>
  request<CorpusOut[]>('/mgmt/corpuses/', {}, token);

export const checkCorpusId = (corpus_id: string, token?: string | null) =>
  request<AvailabilityCheck>(`/mgmt/corpuses/check/${encodeURIComponent(corpus_id)}`, {}, token);

export const createCorpus = (data: CorpusCreate, token?: string | null) =>
  request<CorpusOut>('/mgmt/corpuses/', { method: 'POST', body: JSON.stringify(data) }, token);

export const getCorpus = (corpus_id: string, token?: string | null) =>
  request<CorpusOut>(`/mgmt/corpuses/${encodeURIComponent(corpus_id)}`, {}, token);

export const updateCorpus = (corpus_id: string, data: CorpusUpdate, token?: string | null) =>
  request<CorpusOut>(
    `/mgmt/corpuses/${encodeURIComponent(corpus_id)}`,
    { method: 'PATCH', body: JSON.stringify(data) },
    token,
  );

export const deleteCorpus = (corpus_id: string, token?: string | null) =>
  request<void>(
    `/mgmt/corpuses/${encodeURIComponent(corpus_id)}`,
    { method: 'DELETE' },
    token,
  );

export const transferCorpus = (corpus_id: string, new_owner: string, token?: string | null) =>
  request<CorpusOut>(
    `/mgmt/corpuses/${encodeURIComponent(corpus_id)}/transfer`,
    { method: 'POST', body: JSON.stringify({ new_owner }) },
    token,
  );
