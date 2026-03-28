import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Toaster } from 'sonner';
import { UserProvider, useUser } from '@/context/UserContext';
import { me } from '@/api/auth';
import { DEV_BYPASS } from '@/config';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import Billing from '@/pages/Billing';
import Teams from '@/pages/Teams';
import TeamDetail from '@/pages/TeamDetail';

/**
 * Syncs Auth0 state → our UserContext after OAuth redirect.
 * When Auth0 finishes loading and says isAuthenticated=true but
 * we have no user record yet, exchange the token for a user via /mgmt/auth/me.
 */
function AuthSync() {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const { user, setAuth } = useUser();

  useEffect(() => {
    if (DEV_BYPASS || isLoading || user || !isAuthenticated) return;

    getAccessTokenSilently()
      .then((token) => me(token))
      .then(setAuth)
      .catch(console.error);
  }, [isAuthenticated, isLoading, user]);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading: auth0Loading, isAuthenticated } = useAuth0();
  const { user } = useUser();

  // While Auth0 is processing the redirect callback, show a spinner
  // rather than immediately bouncing to /login.
  if (!DEV_BYPASS && (auth0Loading || (isAuthenticated && !user))) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useUser();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:tenantId" element={<ProjectDetail />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/:slug" element={<TeamDetail />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <AuthSync />
        <AppRoutes />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </UserProvider>
  );
}
