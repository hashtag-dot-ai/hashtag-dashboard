import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { LogOut } from 'lucide-react';
import Sidebar from './Sidebar';
import { useUser } from '@/context/UserContext';
import { DEV_BYPASS } from '@/config';

export default function Layout() {
  const { user, clearAuth } = useUser();
  const { logout } = useAuth0();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    if (DEV_BYPASS) {
      navigate('/login');
    } else {
      logout({ logoutParams: { returnTo: window.location.origin + '/login' } });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 px-6 flex items-center justify-between border-b border-gray-200 bg-white shrink-0">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.email ?? user?.auth0_sub}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
