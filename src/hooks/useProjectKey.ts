import { useState } from 'react';
import { useUser } from '@/context/UserContext';

/**
 * Resolve the API key used for knowledge-API calls on a project page.
 * The logged-in user's management_key auto-connects; otherwise a manually
 * entered key is kept in sessionStorage (shared across tabs of one project).
 */
export function useProjectKey(apiId: string) {
  const SESSION_KEY = `kg_graph_key_${apiId}`;
  const { user } = useUser();

  const [sessionKey, setSessionKey] = useState<string>(() => sessionStorage.getItem(SESSION_KEY) ?? '');
  const effectiveKey = user?.management_key || sessionKey;
  const usingMgmtKey = !!user?.management_key;

  function connect(key: string) {
    sessionStorage.setItem(SESSION_KEY, key);
    setSessionKey(key);
  }
  function disconnect() {
    sessionStorage.removeItem(SESSION_KEY);
    setSessionKey('');
  }

  return { effectiveKey, usingMgmtKey, connect, disconnect };
}
