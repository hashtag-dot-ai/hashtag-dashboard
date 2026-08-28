import { API_URL } from '@/config';
import type {
  GraphResponse,
  GraphInclude,
  DocumentListResponse,
  DocumentChunksResponse,
} from '@/types/api';

export interface GraphQueryParams {
  include?: GraphInclude;
  doc_names?: string[];
  limit?: number;
}

/** GET a knowledge-API endpoint (x-api-key auth, not the mgmt API). */
async function kgGet<T>(
  path: string,
  params: Record<string, string | string[] | undefined>,
  apiKey: string,
): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) url.searchParams.append(key, v);
    } else {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { 'x-api-key': apiKey },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Call GET /{user_name}/{proj_slug}/graph or /id/{proj_perma_id}/graph. */
export async function fetchGraph(
  tenantId: string,
  params: GraphQueryParams = {},
  apiKey: string,
): Promise<GraphResponse> {
  return kgGet<GraphResponse>(`/${tenantId}/graph`, {
    include: params.include,
    limit: params.limit != null ? String(params.limit) : undefined,
    doc_names: params.doc_names,
  }, apiKey);
}

/** List documents ingested into the project's knowledge graph. */
export async function fetchDocuments(
  tenantId: string,
  apiKey: string,
): Promise<DocumentListResponse> {
  return kgGet<DocumentListResponse>(`/${tenantId}/documents`, {}, apiKey);
}

/** All chunks of one document, ordered by position (includes chunk text). */
export async function fetchDocumentChunks(
  tenantId: string,
  docId: string,
  apiKey: string,
): Promise<DocumentChunksResponse> {
  return kgGet<DocumentChunksResponse>(
    `/${tenantId}/documents/${encodeURIComponent(docId)}/chunks`, {}, apiKey,
  );
}

/** Subgraph around one chunk: chunk + document + entities + entity rels. */
export async function fetchChunkGraph(
  tenantId: string,
  chunkId: string,
  apiKey: string,
): Promise<GraphResponse> {
  return kgGet<GraphResponse>(`/${tenantId}/chunk_graph`, { chunk_id: chunkId }, apiKey);
}

/** Subgraph around one concept: neighbours + mentioning chunks + their documents. */
export async function fetchConceptGraph(
  tenantId: string,
  elementId: string,
  apiKey: string,
): Promise<GraphResponse> {
  return kgGet<GraphResponse>(`/${tenantId}/concept_graph`, { element_id: elementId }, apiKey);
}
