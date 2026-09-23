import { useSyncExternalStore } from 'react';
import { useUser } from '@/context/UserContext';

const CHANGE_EVENT = 'kg-project-key-change';

function storageKey(apiId: string) {
  return `kg_graph_key_${apiId}`;
}

function readSessionKey(apiId: string): string {
  try {
    return sessionStorage.getItem(storageKey(apiId)) ?? '';
  } catch {
    return '';
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export interface UseProjectKeyOptions {
  /**
   * When true, a manually entered session key takes precedence over the
   * logged-in user's management key. Used for custom (unregistered) tenants,
   * where the management key may not be accepted by the backend and the user
   * wants to supply e.g. the backend's TEST_API_KEY instead.
   */
  preferSessionKey?: boolean;
}

/**
 * Resolve the API key used for knowledge-API calls on a project page.
 * The logged-in user's management_key auto-connects; otherwise a manually
 * entered key is kept in sessionStorage (shared across tabs of one project,
 * and across every component that calls this hook with the same apiId).
 */
export function useProjectKey(apiId: string, options: UseProjectKeyOptions = {}) {
  const { user } = useUser();
  const sessionKey = useSyncExternalStore(
    subscribe,
    () => readSessionKey(apiId),
    () => '',
  );

  const mgmtKey = user?.management_key || '';
  const effectiveKey = options.preferSessionKey
    ? sessionKey || mgmtKey
    : mgmtKey || sessionKey;
  const usingMgmtKey = !!mgmtKey && effectiveKey === mgmtKey;

  function connect(key: string) {
    try {
      sessionStorage.setItem(storageKey(apiId), key);
    } catch {
      // ignore — storage unavailable
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  function disconnect() {
    try {
      sessionStorage.removeItem(storageKey(apiId));
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return { effectiveKey, usingMgmtKey, sessionKey, connect, disconnect };
}
