import { useAuth0 } from '@auth0/auth0-react';
import { DEV_BYPASS } from '@/config';

/**
 * Returns a function that resolves to the current Auth0 access token.
 * In dev bypass mode (VITE_DEV_BYPASS_AUTH=true), always resolves to null
 * so the backend accepts the request without authentication.
 */
export function useToken() {
  const { getAccessTokenSilently } = useAuth0();

  return async (): Promise<string | null> => {
    if (DEV_BYPASS) return null;
    return getAccessTokenSilently();
  };
}
