import { useSyncExternalStore } from 'react';

/**
 * Custom tenants — raw Neo4j tenant IDs the user wants to browse as if they
 * were projects they own (e.g. research corpora written directly to the graph
 * by offline scripts, which have no row in the management DB).
 *
 * Stored per browser in localStorage. Nothing is persisted server-side; the
 * backend just has to accept the caller's key for `/id/{tenant_id}/...`.
 */
export interface CustomTenant {
  /** Raw tenant ID exactly as used in Neo4j labels (Chunk_<tenantId>). */
  tenantId: string;
  /** Optional human-readable label; falls back to tenantId in the UI. */
  label?: string;
  /** ISO timestamp of when the tenant was added. */
  addedAt: string;
}

export const STORAGE_KEY = 'kg_custom_tenants';
const CHANGE_EVENT = 'kg-custom-tenants-change';

/** Same character set the backend accepts for `/id/{proj_perma_id}` path params. */
export const TENANT_ID_RE = /^[A-Za-z0-9_-]+$/;

export function isValidTenantId(id: string): boolean {
  return TENANT_ID_RE.test(id);
}

// Cache the last parsed snapshot so useSyncExternalStore gets a stable reference.
let cachedRaw: string | null | undefined;
let cachedList: CustomTenant[] = [];

function read(): CustomTenant[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedList;
  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    cachedList = Array.isArray(parsed)
      ? parsed.filter(
          (t): t is CustomTenant =>
            !!t && typeof t === 'object' && typeof (t as CustomTenant).tenantId === 'string',
        )
      : [];
  } catch {
    cachedList = [];
  }
  return cachedList;
}

function write(list: CustomTenant[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable (private mode etc.) — keep in-memory state only.
    cachedRaw = JSON.stringify(list);
    cachedList = list;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function listCustomTenants(): CustomTenant[] {
  return read();
}

export function getCustomTenant(tenantId: string): CustomTenant | undefined {
  return read().find((t) => t.tenantId === tenantId);
}

/** Add (or relabel, if it already exists) a custom tenant. */
export function addCustomTenant(tenantId: string, label?: string): CustomTenant {
  const id = tenantId.trim();
  if (!isValidTenantId(id)) {
    throw new Error('Tenant ID may only contain letters, numbers, hyphens and underscores.');
  }
  const existing = read();
  const trimmedLabel = label?.trim() || undefined;
  const found = existing.find((t) => t.tenantId === id);
  if (found) {
    const updated = { ...found, label: trimmedLabel ?? found.label };
    write(existing.map((t) => (t.tenantId === id ? updated : t)));
    return updated;
  }
  const entry: CustomTenant = { tenantId: id, label: trimmedLabel, addedAt: new Date().toISOString() };
  write([...existing, entry]);
  return entry;
}

export function renameCustomTenant(tenantId: string, label: string) {
  const trimmed = label.trim() || undefined;
  write(read().map((t) => (t.tenantId === tenantId ? { ...t, label: trimmed } : t)));
}

export function removeCustomTenant(tenantId: string) {
  write(read().filter((t) => t.tenantId !== tenantId));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

/** React hook: live list of custom tenants, updated on add/remove in any tab. */
export function useCustomTenants(): CustomTenant[] {
  return useSyncExternalStore(subscribe, read, read);
}

/** The path segment used in knowledge-API calls for a custom tenant. */
export function tenantApiId(tenantId: string): string {
  return `id/${tenantId}`;
}
