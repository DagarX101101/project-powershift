import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profile';
import type { ProfileData } from '../services/profile';
import { Camera, Save, Lock, Trash2, CheckCircle2, XCircle, Shield, User, MapPin, Key, Clock, Settings, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SERVER_URL = API_URL.replace('/api', ''); // http://localhost:5000

export const Profile: React.FC = () => {
  const { user: authUser, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit states
  const [editForm, setEditForm] = useState({ name: '', department: '', mobileNumber: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Password states
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await profileService.getProfile();
      setProfile(data);
      setEditForm({ 
        name: data.name, 
        department: data.department || '', 
        mobileNumber: data.mobileNumber || '' 
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setError('Name is required.');
      return;
    }
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const updated = await profileService.updateProfile({
        name: editForm.name,
        department: editForm.department || null,
        mobileNumber: editForm.mobileNumber || null
      });
      setProfile(updated);
      setIsEditing(false);
      setSuccess('Profile updated successfully.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (passwords.newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsChangingPassword(true);
    try {
      await profileService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      setSuccess('Password changed successfully. Your other active sessions have been invalidated.');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setError('Only JPG and PNG images are allowed.');
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const { profilePhoto } = await profileService.uploadPhoto(file);
      setProfile(prev => prev ? { ...prev, profilePhoto } : null);
      setSuccess('Profile photo updated successfully.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload photo.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!profile) return null;

  const photoUrl = profile.profilePhoto ? `${SERVER_URL}${profile.profilePhoto}` : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold theme-text-primary tracking-tight flex items-center gap-3">
          <User className="w-8 h-8 text-emerald-500" />
          My Profile
        </h1>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2 text-sm">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Photo & Details */}
        <div className="space-y-6">
          <div className="theme-card border theme-border rounded-2xl p-6 shadow-sm flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 w-full h-24 bg-gradient-to-r from-emerald-500 to-teal-600 opacity-20"></div>
            
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 z-10 mb-4 flex items-center justify-center">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 theme-text-secondary" />
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/jpeg, image/png, image/jpg" 
              onChange={handlePhotoUpload} 
            />

            <h2 className="text-xl font-bold theme-text-primary mb-1 z-10 text-center">{profile.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 z-10">{profile.role}</p>

            <div className="w-full space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Account Status</span>
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">{profile.status}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Joined</span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Last Login</span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'First Session'}</span>
              </div>
            </div>
          </div>

          <div className="theme-card border theme-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" /> My Permissions
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Dashboard</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Master Sheet</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Strap Data</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Administration</span>
                {profile.role === 'ADMIN' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-slate-300 dark:text-slate-600" />}
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="theme-card border theme-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-2">
                <Settings className="w-4 h-4" /> Personal Information
              </h3>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-emerald-600 dark:text-emerald-500 hover:underline">Edit Profile</button>
              ) : (
                <button onClick={() => setIsEditing(false)} className="text-xs font-bold text-slate-500 hover:underline">Cancel</button>
              )}
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={isEditing ? editForm.name : profile.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] disabled:opacity-70 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 mb-1">Email Address (Read-Only)</label>
                  <input 
                    type="email" 
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-muted)] cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 mb-1">Department</label>
                  <input 
                    type="text" 
                    value={isEditing ? editForm.department : (profile.department || '')}
                    onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                    disabled={!isEditing}
                    placeholder="e.g. Operations"
                    className="w-full px-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] disabled:opacity-70 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 mb-1">Mobile Number</label>
                  <input 
                    type="text" 
                    value={isEditing ? editForm.mobileNumber : (profile.mobileNumber || '')}
                    onChange={e => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                    disabled={!isEditing}
                    placeholder="+91..."
                    className="w-full px-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] disabled:opacity-70 transition-all"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end pt-4">
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="theme-card border theme-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4" /> My Assigned Mines (Read-Only)
            </h3>
            {profile.role === 'ADMIN' ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold text-center">
                All Mines Access
              </div>
            ) : profile.mines.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.mines.map(mine => (
                  <span key={mine.id} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700">
                    {mine.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 text-sm font-medium text-center">
                Read Only Access (No specific mines assigned)
              </div>
            )}
            
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-3">Approval Details</h4>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Approved By:</span> {profile.approvedBy || 'System Migration'}
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Date:</span> {profile.approvedAt ? new Date(profile.approvedAt).toLocaleDateString() : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-2 mb-4">
              <Key className="w-4 h-4" /> Change Password
            </h3>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 mb-1">Current Password</label>
                <input 
                  type="password" 
                  value={passwords.currentPassword}
                  onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 mb-1">New Password</label>
                <input 
                  type="password" 
                  value={passwords.newPassword}
                  onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
                <p className="text-[10px] text-slate-500 mt-1">Minimum 8 characters required.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 mb-1">Confirm New Password</label>
                <input 
                  type="password" 
                  value={passwords.confirmPassword}
                  onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>
              
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isChangingPassword || !passwords.currentPassword || !passwords.newPassword || passwords.newPassword !== passwords.confirmPassword}
                  className="px-6 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Update Password
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
