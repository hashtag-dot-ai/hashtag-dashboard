import { useEffect, useState } from 'react';
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
import AcceptInvite from '@/pages/AcceptInvite';
import CopyButton from '@/components/CopyButton';

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

/** Modal shown once on first login when the API generates a new account key. */
function FirstLoginKeyModal() {
  const { firstLoginKey, dismissFirstLoginKey } = useUser();
  const [confirmed, setConfirmed] = useState(false);

  if (!firstLoginKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Your account key</h2>
        <p className="text-sm text-gray-600">
          This is your account key — it grants full programmatic access to all your projects.
          Copy it now and store it securely. <strong>It won't be shown again.</strong>
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
          <code className="flex-1 text-xs font-mono break-all text-gray-900">
            {firstLoginKey}
          </code>
          <CopyButton value={firstLoginKey} />
        </div>
        <p className="text-xs text-gray-500">
          Use this key in the <code className="font-mono">x-api-key</code> header when calling the API,
          or as a Bearer token for the management API.
          You can rotate it at any time from the Dashboard.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="confirm-saved"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
          />
          <label htmlFor="confirm-saved" className="text-sm text-gray-700 cursor-pointer">
            I've saved my account key
          </label>
        </div>
        <button
          onClick={dismissFirstLoginKey}
          disabled={!confirmed}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
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
        <FirstLoginKeyModal />
        <AppRoutes />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </UserProvider>
  );
}
