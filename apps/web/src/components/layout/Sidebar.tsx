import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Mail,
  Users,
  FileText,
  Link2,
  ShieldCheck,
  User,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Campaigns', href: '/campaigns', icon: Mail },
    { name: 'Contacts', href: '/contacts', icon: Users },
    { name: 'Templates', href: '/templates', icon: FileText },
  ];

  const settingsNavigation = [
    { name: 'Gmail Integration', href: '/settings/integrations', icon: Link2 },
    { name: 'Privacy & Retention', href: '/settings/privacy', icon: ShieldCheck },
    { name: 'Account Settings', href: '/settings/account', icon: User },
  ];

  return (
    <div className="flex flex-col h-full w-64 bg-white border-r border-slate-200">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
        <img
          src="/logo.png"
          alt="Bizletix"
          className="w-9 h-9 rounded-lg object-contain shadow-sm border border-slate-100"
        />
        <div>
          <span className="font-bold text-slate-900 tracking-tight text-lg">Bizletix</span>
          <span className="block text-[10px] text-slate-500 font-medium tracking-wider uppercase">
            Mail Merge & Analytics
          </span>
        </div>
      </div>

      {/* Main Nav */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Campaigns & Lists
          </p>
          <nav className="space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>

        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Preferences
          </p>
          <nav className="space-y-1">
            {settingsNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="min-w-0 pr-2">
          <p className="text-xs font-semibold text-slate-900 truncate">{user?.name || 'Authorized User'}</p>
          <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
