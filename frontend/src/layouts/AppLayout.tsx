import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/common/Logo';
import { KeyRound, Lock, Loader2, LogOut, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();

  // Force Password Reset workflow state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleForceChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password cannot be identical to the temporary password.');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Your password has been changed successfully. Loading workspace...');
      setTimeout(() => {
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Password update failed. Verify your current temporary password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // If user must change their password, block layout navigation and force reset view
  if (user?.mustChangePassword) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#070b13] text-slate-100 relative overflow-hidden font-sans">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Decorative grids */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b08_1px,transparent_1px),linear-gradient(to_bottom,#1e293b08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <div className="w-full max-w-md p-8 bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-3xl relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <Logo 
            size="lg" 
            withText={true} 
            variant="login" 
            className="flex-col items-center mb-6" 
          />

          <div className="mb-6 text-center">
            <h2 className="text-base font-extrabold text-amber-500 flex items-center justify-center gap-2">
              <KeyRound className="w-4 h-4" /> Password Update Required
            </h2>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              As a corporate security policy, you must update your temporary password before accessing the planning dashboard.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 animate-bounce" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleForceChange} className="space-y-4">
            <div>
              <label className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Temporary Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-xs text-white transition-all placeholder-slate-700"
                placeholder="Enter temporary password"
              />
            </div>

            <div>
              <label className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">New Secure Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-xs text-white transition-all placeholder-slate-700"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label className="block text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-xs text-white transition-all placeholder-slate-700"
                placeholder="Re-enter new password"
              />
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/10 active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating credentials...</span>
                  </>
                ) : (
                  <span>Update & Access Console</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={submitting}
                className="w-full py-2.5 bg-slate-900/40 hover:bg-slate-800/60 text-slate-400 hover:text-slate-300 font-bold text-xs tracking-wide rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-800 hover:border-slate-700 active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cancel & Sign Out</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content display column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top header navigation */}
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Dynamic page outlet */}
        <main className="flex-1 overflow-y-auto theme-bg focus:outline-none relative">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 md:px-8">
            <Outlet />
          </div>
        </main>

        {/* Bottom footer bar */}
        <Footer />
      </div>
    </div>
  );
};

export default AppLayout;
