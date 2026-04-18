import { API_URL } from '@/config';
import type { GraphResponse, GraphInclude } from '@/types/api';

export interface GraphQueryParams {
  include?: GraphInclude;
  doc_names?: string[];
  limit?: number;
}

/** Call GET /{tenant_id}/graph using an x-api-key (knowledge API, not mgmt API). */
export async function fetchGraph(
  tenantId: string,
  params: GraphQueryParams = {},
  apiKey: string,
): Promise<GraphResponse> {
  const url = new URL(`${API_URL}/${tenantId}/graph`);
  if (params.include) url.searchParams.set('include', params.include);
  if (params.limit != null) url.searchParams.set('limit', String(params.limit));
  for (const name of params.doc_names ?? []) {
    url.searchParams.append('doc_names', name);
  }

  const res = await fetch(url.toString(), {
    headers: { 'x-api-key': apiKey },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<GraphResponse>;
}
