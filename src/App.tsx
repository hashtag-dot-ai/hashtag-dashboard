import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Toaster, toast } from 'sonner';
import { UserProvider, useUser } from '@/context/UserContext';
import { me } from '@/api/auth';
import { DEV_BYPASS } from '@/config';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import TenantDetail from '@/pages/TenantDetail';
import Billing from '@/pages/Billing';
import AcceptInvite from '@/pages/AcceptInvite';

/**
 * Syncs Auth0 state → UserContext after OAuth redirect.
 * Calls /auth/me to exchange the JWT for a user key.
 * Skipped if user is already restored from localStorage.
 */
function AuthSync() {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const { user, setAuth, clearAuth } = useUser();

  const fetchAndStoreKey = () => {
    getAccessTokenSilently()
      .then((token) => me(token))
      .then((result) => {
        if (result.warning) {
          toast.warning(result.warning, { duration: 10000 });
        }
        if (result.management_key) {
          setAuth(result);
        }
      })
      .catch(console.error);
  };

  // Initial auth: exchange Auth0 token for a management key if we don't have one.
  useEffect(() => {
    if (DEV_BYPASS || isLoading || user || !isAuthenticated) return;
    fetchAndStoreKey();
  }, [isAuthenticated, isLoading, user]);

  // When any mgmt request gets a 401, the stored key is stale (e.g. the user
  // explicitly rotated it). Clear it and silently fetch a fresh one.
  useEffect(() => {
    if (DEV_BYPASS) return;
    const handler = () => {
      clearAuth();
      if (isAuthenticated) fetchAndStoreKey();
    };
    window.addEventListener('mgmt-auth-error', handler);
    return () => window.removeEventListener('mgmt-auth-error', handler);
  }, [isAuthenticated]);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading: auth0Loading, isAuthenticated } = useAuth0();
  const { user } = useUser();

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
      <Route path="/accept-invite" element={<AcceptInvite />} />
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
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
        <Route path="/tenants/:tenantId" element={<TenantDetail />} />
        <Route path="/billing" element={<Billing />} />
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
