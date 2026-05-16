import { DEV_BYPASS } from '@/config';
import { useUser } from '@/context/UserContext';

/**
 * Returns a function that resolves to the management key for the current user.
 * In dev bypass mode (VITE_DEV_BYPASS_AUTH=true), always resolves to null
 * so the backend accepts the request without authentication.
 */
export function useToken() {
  const { user } = useUser();

  return async (): Promise<string | null> => {
    if (DEV_BYPASS) return null;
    return user?.management_key ?? null;
  };
}
