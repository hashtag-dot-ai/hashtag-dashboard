import { describe, it, expect, beforeEach } from 'vitest';
import {
  STORAGE_KEY,
  addCustomTenant,
  getCustomTenant,
  listCustomTenants,
  removeCustomTenant,
  renameCustomTenant,
  isValidTenantId,
  tenantApiId,
} from '@/lib/customTenants';

describe('customTenants store', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('starts empty', () => {
    expect(listCustomTenants()).toEqual([]);
  });

  it('adds a tenant and persists it to localStorage', () => {
    addCustomTenant('hipporag_eval_musique50_gemini3072_20260810', 'MuSiQue');
    expect(listCustomTenants()).toHaveLength(1);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored[0].tenantId).toBe('hipporag_eval_musique50_gemini3072_20260810');
    expect(stored[0].label).toBe('MuSiQue');
  });

  it('trims whitespace and treats an empty label as undefined', () => {
    const t = addCustomTenant('  atoresearch  ', '   ');
    expect(t.tenantId).toBe('atoresearch');
    expect(t.label).toBeUndefined();
  });

  it('rejects tenant IDs with characters the backend would 422', () => {
    expect(() => addCustomTenant('bad tenant')).toThrow();
    expect(() => addCustomTenant('bad/tenant')).toThrow();
    expect(() => addCustomTenant('')).toThrow();
    expect(listCustomTenants()).toEqual([]);
  });

  it('accepts hyphens and underscores', () => {
    expect(isValidTenantId('hipporag_eval_musique50_v1_ann_d768_c50_musique-exp1-d768-t092-20260816')).toBe(true);
    expect(isValidTenantId('a b')).toBe(false);
  });

  it('does not duplicate an existing tenant, but updates its label', () => {
    addCustomTenant('t1', 'first');
    addCustomTenant('t1', 'second');
    expect(listCustomTenants()).toHaveLength(1);
    expect(getCustomTenant('t1')?.label).toBe('second');
  });

  it('keeps the old label when re-adding without one', () => {
    addCustomTenant('t1', 'first');
    addCustomTenant('t1');
    expect(getCustomTenant('t1')?.label).toBe('first');
  });

  it('renames and removes', () => {
    addCustomTenant('t1');
    renameCustomTenant('t1', 'Renamed');
    expect(getCustomTenant('t1')?.label).toBe('Renamed');
    removeCustomTenant('t1');
    expect(getCustomTenant('t1')).toBeUndefined();
  });

  it('ignores malformed storage contents', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(listCustomTenants()).toEqual([]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ nope: true }, { tenantId: 'ok', addedAt: 'x' }]));
    expect(listCustomTenants().map((t) => t.tenantId)).toEqual(['ok']);
  });

  it('builds the /id/ API path segment', () => {
    expect(tenantApiId('my_tenant')).toBe('id/my_tenant');
  });
});
