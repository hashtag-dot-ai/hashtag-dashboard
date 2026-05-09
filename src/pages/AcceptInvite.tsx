import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useUser } from '@/context/UserContext';
import { previewInvite, acceptInvite } from '@/api/invites';
import { DEV_BYPASS } from '@/config';
import type { InviteAcceptResult, InvitePreview } from '@/types/api';

type Status = 'loading' | 'confirming' | 'accepting' | 'success' | 'already_member' | 'error';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { isAuthenticated, isLoading: auth0Loading, loginWithRedirect, getAccessTokenSilently } = useAuth0();
  const { user } = useUser();

  const [status, setStatus] = useState<Status>('loading');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [result, setResult] = useState<InviteAcceptResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No invite token found in the URL.');
      return;
    }

    if (DEV_BYPASS) {
      if (status === 'loading') loadPreview();
      return;
    }

    if (auth0Loading) return;

    if (!isAuthenticated) {
      loginWithRedirect({
        appState: { returnTo: `/accept-invite?token=${encodeURIComponent(token)}` },
      });
      return;
    }

    if (!user) return;
    if (status === 'loading') loadPreview();
  }, [token, auth0Loading, isAuthenticated, user, status]);

  async function loadPreview() {
    try {
      const authToken = DEV_BYPASS ? null : await getAccessTokenSilently();
      const p = await previewInvite(token!, authToken);
      setPreview(p);
      setStatus('confirming');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired invite link');
      setStatus('error');
    }
  }

  async function doAccept() {
    setStatus('accepting');
    try {
      const authToken = DEV_BYPASS ? null : await getAccessTokenSilently();
      const res = await acceptInvite({ token: token! }, authToken);
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
            {status === 'accepting' ? 'Joining corpus…' : 'Loading…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center">
        {status === 'confirming' && preview && (
          <>
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Join corpus?</h1>
            <p className="text-sm text-gray-500 mb-6">
              You've been invited to join <strong>{preview.compound_name}</strong>.
            </p>
            <button
              onClick={doAccept}
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors mb-3"
            >
              Join corpus
            </button>
            <Link to="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
              Decline
            </Link>
          </>
        )}

        {(status === 'success' || status === 'already_member') && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {status === 'already_member' ? 'Already a member' : "You're in!"}
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              {status === 'already_member'
                ? <>You already have access to <strong>{result?.compound_name}</strong>.</>
                : <>You've joined <strong>{result?.compound_name}</strong>.</>}
            </p>
            <Link
              to={`/corpuses/${result?.corpus_id}`}
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              Open corpus
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
