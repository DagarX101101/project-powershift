import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemeType } from '../../contexts/ThemeContext';
import { Menu, Sun, Moon, Laptop, LogOut, ChevronDown, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  const handleSafeNavigate = (to: string) => {
    if (localStorage.getItem('powershift_is_dirty') === 'true') {
      if (!window.confirm('You have unsaved changes. Discard them?')) {
        return;
      }
      localStorage.removeItem('powershift_is_dirty');
    }
    navigate(to);
  };

  const handleLogout = async () => {
    if (localStorage.getItem('powershift_is_dirty') === 'true') {
      if (!window.confirm('You have unsaved changes. Discard them?')) {
        return;
      }
      localStorage.removeItem('powershift_is_dirty');
    }
    await logout();
    navigate('/login');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    return <Laptop className="h-4 w-4" />; // Corporate blue
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b theme-border theme-card backdrop-blur-md bg-opacity-80">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="p-1.5 rounded-lg border theme-border hover:bg-slate-800/40 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Planning Console
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl border theme-border bg-[var(--bg-app)]">
          {(['light', 'dark', 'corporate'] as ThemeType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`p-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                theme === t
                  ? 'theme-accent-btn font-bold'
                  : 'theme-text-secondary hover:text-[var(--accent-color)]'
              }`}
            >
              {t === 'corporate' ? 'Blue' : t}
            </button>
          ))}
        </div>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border theme-border hover:bg-[var(--bg-app)] transition-all"
          >
            <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-amber-500/10 text-amber-500 font-bold text-xs">
              {user?.name.charAt(0)}
            </div>
            <span className="text-xs font-bold theme-text-primary hidden sm:inline">{user?.name}</span>
            <ChevronDown className="h-3 w-3 theme-text-secondary" />
          </button>

          {profileOpen && (
            <>
              <div onClick={() => setProfileOpen(false)} className="fixed inset-0 z-40" />
              <div className="absolute right-0 mt-2 w-48 py-2 z-50 border theme-border theme-card rounded-2xl shadow-xl">
                <div className="px-4 py-2 border-b theme-border">
                  <p className="text-[10px] theme-text-muted font-bold uppercase">Role</p>
                  <p className="text-xs font-extrabold theme-accent-text">{user?.role}</p>
                </div>
                <button
                  onClick={() => { setProfileOpen(false); handleSafeNavigate('/profile'); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold theme-text-secondary hover:bg-[var(--bg-app)] flex items-center gap-2"
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  My Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 border-t theme-border"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
