import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Video, LayoutDashboard, Users, BarChart3, Bell, LogOut, Menu, X, Settings, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, Notification } from '@/lib/api';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/meetings', icon: Video, label: 'Meetings' },
  { to: '/teams', icon: Users, label: 'Teams' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/profile', icon: Settings, label: 'Profile' },
];

function AdminNavItem() {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== 'admin') return null;
  return (
    <NavLink
      to="/admin"
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        )
      }
    >
      <Shield className="h-5 w-5" />
      Admin
    </NavLink>
  );
}

export function Layout() {
  const { user, logout, accessToken } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<{ notifications: Notification[] }>('/api/notifications'),
    enabled: !!accessToken,
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.notifications.filter((n) => !n.read).length || 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavContent = () => (
    <>
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
          <Video className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">IntellMeet</h1>
          <p className="text-xs text-slate-500">AI Meeting Platform</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
        <AdminNavItem />
      </nav>

      <div className="mt-auto border-t border-slate-800 pt-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/30 text-sm font-semibold text-indigo-300">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <button onClick={() => navigate('/notifications')} className="relative rounded-lg p-2 hover:bg-slate-800">
            <Bell className="h-5 w-5 text-slate-400" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-950 p-4 lg:flex">
        <NavContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-slate-950 p-4">
            <button onClick={() => setMobileOpen(false)} className="mb-4 self-end rounded-lg p-2 hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>
            <NavContent />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-slate-800 px-4 py-3 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 hover:bg-slate-800">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-white">IntellMeet</span>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
