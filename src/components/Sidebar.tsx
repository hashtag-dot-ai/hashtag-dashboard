import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, CreditCard, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_URL } from '@/config';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban, also: ['/tenants'] },
  { to: '/billing', label: 'Billing', icon: CreditCard },
];

export default function Sidebar() {
  const { pathname } = useLocation();

  const isActive = (to: string, also: string[] = []) =>
    pathname === to ||
    (to !== '/dashboard' && pathname.startsWith(to)) ||
    also.some((prefix) => pathname.startsWith(prefix));

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200">
        <span className="text-lg font-bold text-indigo-600">Hashtag.ai</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon, also }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive(to, also)
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200 space-y-0.5">
        <a
          href={`${API_URL}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        >
          <ExternalLink size={16} />
          API Docs
        </a>
      </div>
    </aside>
  );
}
