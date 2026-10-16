import { API_URL } from '@/config';
import type { SearchRequest, SearchResponse } from '@/types/api';

/** Non-2xx response from a knowledge-API call; keeps the status and parsed body for logging. */
export class KgApiError extends Error {
  constructor(message: string, readonly status: number, readonly body: unknown) {
    super(message);
    this.name = 'KgApiError';
  }
}

/** Call POST /{user_name}/{proj_slug}/search or /id/{proj_perma_id}/search. Stateless. */
export async function search(
  apiId: string,
  body: SearchRequest,
  apiKey: string,
): Promise<SearchResponse> {
  const res = await fetch(`${API_URL}/${apiId}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({ detail: res.statusText }));
  if (!res.ok) {
    const detail = typeof json?.detail === 'string' ? json.detail : `HTTP ${res.status}`;
    throw new KgApiError(detail, res.status, json);
  }
  return json as SearchResponse;
}
