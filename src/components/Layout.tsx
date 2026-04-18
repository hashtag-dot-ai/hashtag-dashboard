import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { LogOut } from 'lucide-react';
import Sidebar from './Sidebar';
import { useUser } from '@/context/UserContext';
import { DEV_BYPASS } from '@/config';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Layout() {
  const { user: appUser, clearAuth } = useUser();
  const { logout, user: auth0User } = useAuth0();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    if (DEV_BYPASS) {
      navigate('/login');
    } else {
      logout({ logoutParams: { returnTo: window.location.origin } });
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={auth0User?.picture} alt={displayName} />
                  <AvatarFallback className="bg-gray-200 text-gray-600 text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
