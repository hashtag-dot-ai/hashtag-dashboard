import { useAuth0 } from '@auth0/auth0-react';
import { me } from '@/api/auth';
import { useUser } from '@/context/UserContext';
import { DEV_BYPASS } from '@/config';
import { toast } from 'sonner';

export default function Login() {
  const { loginWithRedirect } = useAuth0();
  const { setAuth } = useUser();

  const handleDevLogin = async () => {
    try {
      const user = await me(null);
      setAuth(user);
    } catch (err) {
      toast.error('Failed to connect to backend. Is it running on localhost:8000?');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600 mb-1">Hashtag.ai</h1>
          <p className="text-gray-500 text-sm">Knowledge Graph Backend as a Service</p>
        </div>

        {DEV_BYPASS ? (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              Dev mode — auth bypassed. Backend must be running on localhost:8000.
            </div>
            <button
              onClick={handleDevLogin}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium transition-colors"
            >
              Dev Login (no auth)
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } })}
              className="w-full flex items-center justify-center gap-3 border border-gray-300 hover:bg-gray-50 py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
            <button
              onClick={() => loginWithRedirect()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
            >
              Sign up / Log in with Email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
