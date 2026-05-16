import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useUser } from '@/context/UserContext';
import { me } from '@/api/auth';
import { acceptInvite } from '@/api/invites';
import { DEV_BYPASS } from '@/config';
import type { InviteAcceptResult } from '@/types/api';

type Status = 'loading' | 'accepting' | 'success' | 'already_member' | 'error';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');

  const { isAuthenticated, isLoading: auth0Loading, loginWithRedirect, getAccessTokenSilently } = useAuth0();
  const { user, setAuth } = useUser();

  const [status, setStatus] = useState<Status>('loading');
  const [result, setResult] = useState<InviteAcceptResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!inviteToken) {
      setStatus('error');
      setError('No invite token found in the URL.');
      return;
    }

    if (DEV_BYPASS) {
      if (status === 'loading') doAccept();
      return;
    }

    if (auth0Loading) return;

    if (!isAuthenticated) {
      loginWithRedirect({
        appState: { returnTo: `/accept-invite?token=${encodeURIComponent(inviteToken)}` },
      });
      return;
    }

    // Ensure we have a management key before accepting the invite.
    // If not yet in context (e.g. page reload), fetch it first.
    if (!user) {
      getAccessTokenSilently()
        .then((token) => me(token))
        .then((result) => {
          if (result.management_key) {
            setAuth(result);
          } else {
            setStatus('error');
            setError(result.warning ?? 'Could not get management key. Please try logging in again.');
          }
        })
        .catch(() => {
          setStatus('error');
          setError('Failed to authenticate. Please try again.');
        });
      return;
    }

    if (status === 'loading') doAccept();
  }, [inviteToken, auth0Loading, isAuthenticated, user, status]);

  async function doAccept() {
    setStatus('accepting');
    try {
      const authToken = DEV_BYPASS ? null : (user?.management_key ?? null);
      const res = await acceptInvite({ token: inviteToken! }, authToken);
      setResult(res);
      setStatus(res.already_member ? 'already_member' : 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
      setStatus('error');
    }
  }

  if (status === 'loading' || status === 'accepting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {status === 'accepting' ? 'Joining project…' : 'Loading…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center">
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">You're in!</h1>
            <p className="text-sm text-gray-500 mb-6">
              You've joined <strong>{result?.project_name}</strong>.
            </p>
            <Link
              to={`/projects/${result?.tenant_id}`}
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              Open project
            </Link>
          </>
        )}

        {status === 'already_member' && (
          <>
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Already a member</h1>
            <p className="text-sm text-gray-500 mb-6">
              You already have access to <strong>{result?.project_name}</strong>.
            </p>
            <Link
              to={`/projects/${result?.tenant_id}`}
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              Open project
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Invite not valid</h1>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <Link
              to="/dashboard"
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              Go to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
