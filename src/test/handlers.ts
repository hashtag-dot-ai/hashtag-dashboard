import { http, HttpResponse } from 'msw';
import type { AlgorithmOut } from '@/types/api';

const BASE = 'http://localhost:8000';

/** Mock algorithm catalog (GET /mgmt/projects/algorithms). */
export const MOCK_ALGORITHMS: AlgorithmOut[] = [
  { algorithm: 'alg2', display_name: 'Hashtag AI ver 2', supports_search: true, is_default: true },
  { algorithm: 'alg1', display_name: 'Hashtag AI ver 1', supports_search: false, is_default: false },
];

/** Project id whose version doesn't support /search. */
export const NO_SEARCH_PROJECT = 'no-search-project';

/** Algorithm of each mock project; unlisted projects get the default version. */
const PROJECT_ALGORITHMS: Record<string, string> = {
  'second-proj': 'alg1',
  [NO_SEARCH_PROJECT]: 'alg1',
};

/** The ProjectOut algorithm fields for a version, from the mock catalog. */
function algorithmFields(algorithm?: string) {
  const alg = MOCK_ALGORITHMS.find((a) => a.algorithm === algorithm)
    ?? MOCK_ALGORITHMS.find((a) => a.is_default)!;
  return { algorithm: alg.algorithm, algorithm_display_name: alg.display_name, supports_search: alg.supports_search };
}

const projectAlgorithmFields = (tenantId: string) => algorithmFields(PROJECT_ALGORITHMS[tenantId]);

export const handlers = [
  // Auth
  http.post(`${BASE}/auth/me`, () =>
    HttpResponse.json({
      user_id: 1,
      email: 'dev@example.com',
      plan: 'free',
      credits_remaining: 87,
      management_key: 'hashtag-user-key-testkey1',
    }),
  ),

  // Projects
  http.get(`${BASE}/mgmt/projects/`, () =>
    HttpResponse.json([
      { tenant_id: 'my-project', name: 'My Project', proj_display_name: 'My Project', default_schema: null, default_prompt: null, is_owner: true, ...projectAlgorithmFields('my-project') },
      { tenant_id: 'second-proj', name: 'Second Project', proj_display_name: 'Second Project', default_schema: null, default_prompt: null, is_owner: false, ...projectAlgorithmFields('second-proj') },
    ]),
  ),

  http.get(`${BASE}/mgmt/projects/algorithms`, () => HttpResponse.json(MOCK_ALGORITHMS)),

  http.get(`${BASE}/mgmt/projects/check/:tenantId`, ({ params }) => {
    const taken = ['taken-id'];
    const available = !taken.includes(params.tenantId as string);
    return HttpResponse.json(
      available ? { available: true } : { available: false, reason: 'Already taken' },
    );
  }),

  http.post(`${BASE}/mgmt/projects/`, async ({ request }) => {
    const body = await request.json() as { name?: string; proj_display_name?: string; tenant_id: string; algorithm?: string };
    return HttpResponse.json(
      { tenant_id: body.tenant_id, name: body.name ?? body.proj_display_name, proj_display_name: body.proj_display_name ?? body.name, default_schema: null, default_prompt: null, is_owner: true, ...algorithmFields(body.algorithm) },
      { status: 201 },
    );
  }),

  http.get(`${BASE}/mgmt/projects/:tenantId`, ({ params }) =>
    HttpResponse.json({
      tenant_id: params.tenantId,
      proj_display_name: 'My Project',
      default_schema: null,
      default_prompt: null,
      is_owner: true,
      ...projectAlgorithmFields(params.tenantId as string),
    }),
  ),

  http.patch(`${BASE}/mgmt/projects/:tenantId`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      tenant_id: params.tenantId,
      proj_display_name: body.proj_display_name ?? 'My Project',
      default_schema: body.default_schema ?? null,
      default_prompt: body.default_prompt ?? null,
      is_owner: true,
      ...projectAlgorithmFields(params.tenantId as string),
    });
  }),

  http.delete(`${BASE}/mgmt/projects/:tenantId`, () => new HttpResponse(null, { status: 204 })),

  // Keys
  http.get(`${BASE}/mgmt/projects/:tenantId/keys`, () =>
    HttpResponse.json([
      { key_prefix: 'hk_abc123', key_type: 'read_write', description: 'prod key', rate_limit: null, revoked: false },
    ]),
  ),

  http.post(`${BASE}/mgmt/projects/:tenantId/keys`, async ({ request }) => {
    const body = await request.json() as { key_type: string; description?: string };
    return HttpResponse.json(
      {
        key_prefix: 'hk_new1234',
        key_type: body.key_type ?? 'read_write',
        description: body.description ?? null,
        rate_limit: null,
        revoked: false,
        raw_key: 'hk_new1234__supersecretkeyvalue',
      },
      { status: 201 },
    );
  }),

  http.delete(`${BASE}/mgmt/projects/:tenantId/keys/:prefix`, () =>
    new HttpResponse(null, { status: 204 }),
  ),

  // Invites & members
  http.get(`${BASE}/mgmt/projects/:tenantId/invites`, () => HttpResponse.json([])),

  http.post(`${BASE}/mgmt/projects/:tenantId/invites`, () =>
    HttpResponse.json(
      { key_prefix: 'hk_inv123', created_at: new Date().toISOString(), raw_token: 'hk_inv123__token' },
      { status: 201 },
    ),
  ),

  http.get(`${BASE}/mgmt/projects/:tenantId/members`, () =>
    HttpResponse.json([
      { user_id: 1, email: 'dev@example.com', role: 'owner', joined_at: null },
    ]),
  ),

  http.post(`${BASE}/mgmt/projects/invites/accept`, async ({ request }) => {
    const body = await request.json() as { token: string };
    return HttpResponse.json({
      tenant_id: 'my-project',
      project_name: 'My Project',
      already_member: body.token === 'existing-token',
    });
  }),

  // Knowledge API — search (ranked passages, no LLM answer)
  http.post(`${BASE}/:owner/:slug/search`, async ({ request }) => {
    const body = await request.json() as { question: string; top_k?: number; include_graph?: boolean };
    const topK = body.top_k ?? 20;
    const results = [
      { doc_id: 'doc-alpha.pdf', text: 'Alpha passage about the question.', score: 0.9123, page_number: 3, chunk_id: 'c1' },
      { doc_id: 'doc-beta', text: 'Beta passage, less relevant.', score: 0.5, chunk_id: 'c2' },
      { doc_id: null, text: 'Orphan passage.', score: 0.1234, chunk_id: 'c3' },
    ].slice(0, topK);
    if (!body.include_graph) {
      return HttpResponse.json({
        results: results.map(({ chunk_id: _, ...r }) => r),
        info: { top_k: topK, retrieval_time: 0.234 },
      });
    }
    return HttpResponse.json({
      results,
      info: { top_k: topK, retrieval_time: 0.234 },
      graph: {
        nodes: [
          { id: 'c1', type: 'chunk', doc_id: 'doc-alpha.pdf', seed_score: 0.9123 },
          { id: 'k1', type: 'concept', name: 'Alpha' },
          { id: 'k2', type: 'concept', name: 'Beta' },
          { id: 'k3', type: 'concept', name: 'Gamma' },
        ],
        relationships: [
          { source: 'c1', target: 'k1', type: 'MENTIONS' },
          { source: 'k2', target: 'k3', type: 'PART_OF' },
          { source: 'k1', target: 'k2', type: 'DEPENDS_ON', matched_question: true },
        ],
      },
    });
  }),

  // Billing
  http.get(`${BASE}/mgmt/billing/`, () =>
    HttpResponse.json({
      plan: 'free',
      credits_remaining: 87,
      credits_limit: 100,
      operation_costs: { query: 2, create_doc: 10, deep_query: 3, fast_query: 1 },
    }),
  ),

  http.post(`${BASE}/mgmt/billing/plan`, async ({ request }) => {
    const body = await request.json() as { plan: string };
    return HttpResponse.json({
      plan: body.plan,
      credits_remaining: 87,
      credits_limit: body.plan === 'enterprise' ? -1 : body.plan === 'business' ? 1000 : 100,
      operation_costs: { query: 2, create_doc: 10, deep_query: 3, fast_query: 1 },
    });
  }),
];
