import { describe, it, expect } from 'vitest';
import { me } from '@/api/auth';
import { listProjects, checkTenantId, createProject } from '@/api/projects';
import { listKeys, createKey, revokeKey } from '@/api/keys';
import { getBilling, setPlan } from '@/api/billing';
import { ApiError } from '@/api/client';

// MSW intercepts all fetch calls — handlers defined in src/test/handlers.ts

describe('auth API', () => {
  it('me() returns a user record with a management key', async () => {
    const user = await me(null);
    expect(user.user_id).toBe(1);
    expect(user.email).toBe('dev@example.com');
    expect(user.plan).toBe('free');
    expect(user.credits_remaining).toBe(87);
    expect(user.management_key).toBeTruthy();
  });
});

describe('projects API', () => {
  it('listProjects() returns an array of projects', async () => {
    const projects = await listProjects(null);
    expect(projects).toHaveLength(2);
    expect(projects[0].tenant_id).toBe('my-project');
    expect(projects[1].name).toBe('Second Project');
  });

  it('checkTenantId() returns available=true for unused slugs', async () => {
    const result = await checkTenantId('new-slug', null);
    expect(result.available).toBe(true);
  });

  it('checkTenantId() returns available=false for taken slugs', async () => {
    const result = await checkTenantId('taken-id', null);
    expect(result.available).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('createProject() posts the correct body and returns the project', async () => {
    const project = await createProject({ name: 'New Project', tenant_id: 'new-project' }, null);
    expect(project.tenant_id).toBe('new-project');
    expect(project.name).toBe('New Project');
    expect(project.default_schema).toBeNull();
  });
});

describe('keys API', () => {
  it('listKeys() returns existing keys', async () => {
    const keys = await listKeys('my-project', null);
    expect(keys).toHaveLength(1);
    expect(keys[0].key_prefix).toBe('hk_abc123');
    expect(keys[0].key_type).toBe('read_write');
    expect(keys[0].revoked).toBe(false);
  });

  it('createKey() returns KeyCreated with raw_key', async () => {
    const key = await createKey('my-project', { key_type: 'read_only', description: 'test' }, null);
    expect(key.raw_key).toBeTruthy();
    expect(key.key_prefix).toBeTruthy();
    expect(key.key_type).toBe('read_only');
    // raw_key must never be empty — it is shown once
    expect(key.raw_key.length).toBeGreaterThan(10);
  });

  it('revokeKey() resolves without error', async () => {
    await expect(revokeKey('my-project', 'hk_abc123', null)).resolves.toBeUndefined();
  });
});

describe('billing API', () => {
  it('getBilling() returns billing info', async () => {
    const billing = await getBilling(null);
    expect(billing.plan).toBe('free');
    expect(billing.credits_remaining).toBe(87);
    expect(billing.credits_limit).toBe(100);
    expect(billing.operation_costs.query).toBe(2);
    expect(billing.operation_costs.create_doc).toBe(10);
  });

  it('setPlan() returns updated billing', async () => {
    const billing = await setPlan({ plan: 'business' }, null);
    expect(billing.plan).toBe('business');
    expect(billing.credits_limit).toBe(1000);
  });

  it('setPlan("enterprise") returns credits_limit=-1', async () => {
    const billing = await setPlan({ plan: 'enterprise' }, null);
    expect(billing.credits_limit).toBe(-1);
  });
});

describe('ApiError', () => {
  it('is an instance of Error', () => {
    const err = new ApiError(404, 'Not found');
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.name).toBe('ApiError');
  });
});
