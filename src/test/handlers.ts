import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:8000';

export const handlers = [
  // Auth
  http.post(`${BASE}/mgmt/auth/me`, () =>
    HttpResponse.json({
      user_id: 1,
      auth0_sub: 'dev|1',
      email: 'dev@example.com',
      plan: 'free',
      credits_remaining: 87,
    }),
  ),

  // Projects
  http.get(`${BASE}/mgmt/projects/`, () =>
    HttpResponse.json([
      { tenant_id: 'my-project', name: 'My Project', default_schema: null, default_prompt: null },
      { tenant_id: 'second-proj', name: 'Second Project', default_schema: null, default_prompt: null },
    ]),
  ),

  http.get(`${BASE}/mgmt/projects/check/:tenantId`, ({ params }) => {
    const taken = ['taken-id'];
    const available = !taken.includes(params.tenantId as string);
    return HttpResponse.json(
      available ? { available: true } : { available: false, reason: 'Already taken' },
    );
  }),

  http.post(`${BASE}/mgmt/projects/`, async ({ request }) => {
    const body = await request.json() as { name: string; tenant_id: string };
    return HttpResponse.json(
      { tenant_id: body.tenant_id, name: body.name, default_schema: null, default_prompt: null },
      { status: 201 },
    );
  }),

  http.get(`${BASE}/mgmt/projects/:tenantId`, ({ params }) =>
    HttpResponse.json({
      tenant_id: params.tenantId,
      name: 'My Project',
      default_schema: null,
      default_prompt: null,
    }),
  ),

  http.patch(`${BASE}/mgmt/projects/:tenantId`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      tenant_id: params.tenantId,
      name: body.name ?? 'My Project',
      default_schema: body.default_schema ?? null,
      default_prompt: body.default_prompt ?? null,
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
        raw_key: 'hk_new1234__supersecretkey',
      },
      { status: 201 },
    );
  }),

  http.delete(`${BASE}/mgmt/projects/:tenantId/keys/:prefix`, () =>
    new HttpResponse(null, { status: 204 }),
  ),

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

  // Teams
  http.get(`${BASE}/mgmt/teams/`, () =>
    HttpResponse.json([{ slug: 'acme-team', name: 'Acme Team' }]),
  ),

  http.get(`${BASE}/mgmt/teams/check/:slug`, ({ params }) => {
    const taken = ['taken-slug'];
    const available = !taken.includes(params.slug as string);
    return HttpResponse.json({ available });
  }),

  http.post(`${BASE}/mgmt/teams/`, async ({ request }) => {
    const body = await request.json() as { slug: string; name: string };
    return HttpResponse.json({ slug: body.slug, name: body.name }, { status: 201 });
  }),

  http.get(`${BASE}/mgmt/teams/:slug`, ({ params }) =>
    HttpResponse.json({ slug: params.slug, name: 'Acme Team' }),
  ),

  http.get(`${BASE}/mgmt/teams/:slug/members`, () =>
    HttpResponse.json([
      { team_slug: 'acme-team', user_id: 1, role: 'owner' },
      { team_slug: 'acme-team', user_id: 2, role: 'member' },
    ]),
  ),

  http.post(`${BASE}/mgmt/teams/:slug/members`, async ({ params, request }) => {
    const body = await request.json() as { user_id: number; role: string };
    return HttpResponse.json(
      { team_slug: params.slug, user_id: body.user_id, role: body.role ?? 'member' },
      { status: 201 },
    );
  }),

  http.delete(`${BASE}/mgmt/teams/:slug/members/:userId`, () =>
    new HttpResponse(null, { status: 204 }),
  ),
];
