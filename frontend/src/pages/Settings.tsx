import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { settingsService } from '../services/settings';
import type { SettingsData } from '../services/settings';
import { Settings as SettingsIcon, Palette, Monitor, Info, LifeBuoy, Server, Database, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load settings data.');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'corporate') => {
    setTheme(newTheme); // Apply immediately
    setIsSavingTheme(true);
    try {
      await settingsService.updateTheme(newTheme);
      setSettings(prev => prev ? { ...prev, themePreference: newTheme } : null);
    } catch (err) {
      console.error(err);
      // Optional: revert theme on failure or just show error
    } finally {
      setIsSavingTheme(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight theme-text-primary flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-emerald-500" />
          Settings
        </h1>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2 text-sm">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Appearance Settings */}
        <div className="theme-card border theme-border rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Palette className="w-5 h-5 text-emerald-500" /> Appearance
          </h3>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              Theme Preference
              {isSavingTheme && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => handleThemeChange('light')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'light' ? 'border-[var(--accent-color)] bg-[var(--accent-light)]' : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-color)]'}`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300"></div>
                <span className={`text-sm font-bold ${theme === 'light' ? 'text-[var(--accent-text)]' : 'theme-text-secondary'}`}>Light</span>
              </button>
              
              <button
                onClick={() => handleThemeChange('dark')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'dark' ? 'border-[var(--accent-color)] bg-[var(--accent-light)]' : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-color)]'}`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700"></div>
                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-[var(--accent-text)]' : 'theme-text-secondary'}`}>Dark</span>
              </button>

              <button
                onClick={() => handleThemeChange('corporate')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'corporate' ? 'border-[var(--accent-color)] bg-[var(--accent-light)]' : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-color)]'}`}
              >
                <div className="w-8 h-8 rounded-full bg-blue-900 border border-blue-700"></div>
                <span className={`text-sm font-bold ${theme === 'corporate' ? 'text-[var(--accent-text)]' : 'theme-text-secondary'}`}>Corporate Blue</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-4">Your theme preference is saved automatically and synced across devices.</p>
          </div>
        </div>

        {/* Application Information */}
        <div className="theme-card border theme-border rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Monitor className="w-5 h-5 text-emerald-500" /> Application Information
          </h3>

          {settings?.applicationInfo && (
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Application Name</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{settings.applicationInfo.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Version</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{settings.applicationInfo.version}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Environment</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 text-xs font-bold uppercase tracking-wider">{settings.applicationInfo.environment}</span>
              </div>
              
              <div className="pt-2">
                <h4 className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-3">System Status</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[var(--bg-app)] rounded-xl border border-[var(--border-color)] flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold"><Server className="w-3 h-3" /> Backend</div>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> {settings.applicationInfo.backendStatus}
                    </div>
                  </div>
                  <div className="p-3 bg-[var(--bg-app)] rounded-xl border border-[var(--border-color)] flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold"><Database className="w-3 h-3" /> Database</div>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> {settings.applicationInfo.databaseStatus}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Support & Contact */}
        <div className="theme-card border theme-border rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <LifeBuoy className="w-5 h-5 text-emerald-500" /> Support
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-600 dark:text-slate-400">Support Email</span>
              <a href="mailto:rmdagar2006@gmail.com" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">rmdagar2006@gmail.com</a>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-600 dark:text-slate-400">Support Contact</span>
              <span className="font-semibold text-slate-900 dark:text-white"></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-600 dark:text-slate-400">Project Owner</span>
              <span className="font-semibold text-slate-900 dark:text-white">Rohit Dagar</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-600 dark:text-slate-400">Documentation Version</span>
              <span className="font-semibold text-slate-900 dark:text-white">v2.4 (Latest)</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="theme-card border theme-border rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Info className="w-5 h-5 text-emerald-500" /> About
          </h3>
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              <strong className="text-slate-900 dark:text-white">Project PowerShift</strong> is an enterprise application developed exclusively for EV Deployment Planning.
            </p>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs">Current Version: {settings?.applicationInfo.version || '1.0.0'}</p>
              <p className="text-xs mt-1">&copy; {new Date().getFullYear()} Project PowerShift. All rights reserved.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
