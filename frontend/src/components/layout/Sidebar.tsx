import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Table, Database, User, Settings as SettingsIcon, ShieldCheck, Users, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../common/Logo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  
  const links = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Master Sheet', path: '/master-sheet', icon: Table },
    { name: 'Strap Data', path: '/strap-data', icon: Database },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const handleNavClick = (e: React.MouseEvent) => {
    if (localStorage.getItem('powershift_is_dirty') === 'true') {
      if (!window.confirm('You have unsaved changes. Discard them?')) {
        e.preventDefault();
        return;
      }
      localStorage.removeItem('powershift_is_dirty');
    }
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div
          onClick={handleNavClick}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        style={{ backgroundColor: 'var(--sidebar-bg)', color: 'var(--sidebar-text)' }}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 border-r theme-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:h-screen`}
      >
        <div className="flex items-center px-6 py-5 border-b theme-border">
          <Logo size="md" withText={true} />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                }`
              }
            >
              <link.icon className="h-4.5 w-4.5" />
              {link.name}
            </NavLink>
          ))}

          {/* Administration Section */}
          {user?.role === 'ADMIN' && (
            <div className="pt-4 mt-4 border-t theme-border">
              <h3 className="px-4 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-3">
                Administration
              </h3>
              <div className="space-y-1.5">
                <NavLink
                  to="/admin/access-requests"
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                    }`
                  }
                >
                  <ShieldCheck className="h-4.5 w-4.5" />
                  Access Requests
                </NavLink>
                <NavLink
                  to="/admin/users"
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                    }`
                  }
                >
                  <Users className="h-4.5 w-4.5" />
                  Active Users
                </NavLink>
              </div>
            </div>
          )}
        </nav>

        <div className="px-4 pb-4">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to sign out?')) {
                logout();
              }
            }}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide text-rose-500 hover:bg-rose-500/10 transition-all"
          >
            <SettingsIcon className="h-4.5 w-4.5 opacity-0 hidden" />
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Logout
          </button>
        </div>

        <div className="px-6 py-4 border-t theme-border text-[10px] text-slate-500">
          SYSTEM CLASSIFICATION: CONFIDENTIAL
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
