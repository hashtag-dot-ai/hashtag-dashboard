import React, { useEffect } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Auth0Context } from '@auth0/auth0-react';
import { UserProvider, useUser } from '@/context/UserContext';
import type { MeResponse } from '@/types/api';

// Minimal Auth0 context mock — enough for useAuth0() hooks to not throw.
const fakeAuth0 = {
  isAuthenticated: false,
  isLoading: false,
  user: undefined,
  loginWithRedirect: async () => {},
  logout: async () => {},
  getAccessTokenSilently: async () => 'fake-token',
  getIdTokenClaims: async () => undefined,
  loginWithPopup: async () => {},
  getAccessTokenWithPopup: async () => undefined,
  handleRedirectCallback: async () => ({ appState: undefined }),
  error: undefined,
};

interface RenderOptions_ extends Omit<RenderOptions, 'wrapper'> {
  /** Pre-populate UserContext (simulates logged-in state) */
  user?: MeResponse;
  /** Initial URL path */
  initialPath?: string;
  /** Route pattern for the component, e.g. '/projects/:tenantId' */
  routePath?: string;
}

// Must be rendered inside UserProvider
function UserInitializer({ user }: { user: MeResponse | null }) {
  const { setAuth } = useUser();
  useEffect(() => { if (user) setAuth(user); }, []);
  return null;
}

export function renderWithProviders(ui: React.ReactElement, options: RenderOptions_ = {}) {
  const { user, initialPath = '/', routePath = '/', ...renderOptions } = options;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const loggedInUser: MeResponse = user ?? {
    user_id: 1,
    auth0_sub: 'dev|1',
    email: 'dev@example.com',
    plan: 'free',
    credits_remaining: 87,
  };

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      // @ts-expect-error — we only need a partial mock
      <Auth0Context.Provider value={fakeAuth0}>
        <QueryClientProvider client={queryClient}>
          <UserProvider>
            <UserInitializer user={loggedInUser} />
            <MemoryRouter initialEntries={[initialPath]}>
              <Routes>
                <Route path={routePath} element={children} />
              </Routes>
            </MemoryRouter>
          </UserProvider>
        </QueryClientProvider>
      </Auth0Context.Provider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), queryClient };
}
