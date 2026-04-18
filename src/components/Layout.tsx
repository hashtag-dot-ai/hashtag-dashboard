import { useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { LogOut } from 'lucide-react';
import Sidebar from './Sidebar';
import { useUser } from '@/context/UserContext';
import { DEV_BYPASS } from '@/config';
import { useEffect } from 'react';

export default function Layout() {
  const { user: appUser, clearAuth } = useUser();
  const { logout, user: auth0User } = useAuth0();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    clearAuth();
    if (DEV_BYPASS) {
      navigate('/login');
    } else {
      logout({ logoutParams: { returnTo: window.location.origin + '/login' } });
    }
  };

  const displayName = auth0User?.name ?? appUser?.email ?? appUser?.auth0_sub ?? '';
  const displayEmail = auth0User?.email ?? appUser?.email ?? '';
  const initials = (auth0User?.name ?? displayEmail).charAt(0).toUpperCase() || 'U';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 px-6 flex items-center justify-between border-b border-gray-200 bg-white shrink-0">
          <div />
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen(v => !v)}
              className="h-9 w-9 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            >
              {auth0User?.picture ? (
                <img src={auth0User.picture} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-600 text-sm font-medium">
                  {initials}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <LogOut size={14} />
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
