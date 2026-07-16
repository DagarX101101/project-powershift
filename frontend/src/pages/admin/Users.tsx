import React, { useState, useEffect } from 'react';
import { usersService } from '../../services/users';
import type { User, Role } from '../../../../shared/types';
import { 
  Users as UsersIcon, Shield, Search, Loader2, Edit, CheckCircle2, 
  XCircle, Filter, AlertTriangle, KeyRound
} from 'lucide-react';

const MINE_OPTIONS = [
  'PEKB', 'PCB', 'Kente', 'GP II', 'GP III', 
  'Pelma', 'Dhirauli', 'Suliyari', 'Bijahan', 'Gondulpura', 'Jitpur'
];

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<Role>('VIEWER');
  const [editStatus, setEditStatus] = useState<'ACTIVE'|'SUSPENDED'|'DELETED'>('ACTIVE');
  const [editMines, setEditMines] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await usersService.getAllUsers();
      setUsers(data);
    } catch (err) {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditMines(user.mines?.map(m => m.name) || []);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      if (editRole !== editingUser.role) {
        await usersService.updateUserRole(editingUser.id, editRole);
      }
      if (editStatus !== editingUser.status) {
        await usersService.updateUserStatus(editingUser.id, editStatus);
      }
      
      const currentMines = editingUser.mines?.map(m => m.name) || [];
      if (JSON.stringify(editMines.sort()) !== JSON.stringify(currentMines.sort())) {
        await usersService.updateUserMines(editingUser.id, editMines.includes('all') ? ['all'] : editMines);
      }

      showToast('User updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      showToast('Failed to update user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!window.confirm('Are you sure you want to force this user to reset their password?')) return;
    try {
      const res = await usersService.resetPassword(id);
      setTempPassword((res as any).temporaryPassword);
      showToast('Password reset enforced for user');
      fetchUsers();
    } catch {
      showToast('Failed to reset password', 'error');
    }
  };

  const toggleMine = (mineName: string) => {
    if (mineName === 'all') {
      setEditMines(editMines.includes('all') ? [] : ['all']);
      return;
    }
    let newMines = editMines.filter(m => m !== 'all');
    if (newMines.includes(mineName)) {
      newMines = newMines.filter(m => m !== mineName);
    } else {
      newMines.push(mineName);
    }
    setEditMines(newMines);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                          u.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <UsersIcon className="w-7 h-7 text-emerald-500" />
            Active Users
          </h1>
        </div>
      </div>

      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl font-semibold text-sm transition-all ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[250px] relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 theme-text-secondary" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 theme-text-secondary" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DELETED">Deleted</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="theme-card border theme-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 theme-text-secondary text-sm">No users found matching the filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-[var(--bg-app)] border-b theme-border">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">User</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Role & Access</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold theme-text-primary">{u.name}</p>
                      <p className="text-xs theme-text-secondary">{u.email}</p>
                      {u.department && <p className="text-[10px] mt-1 theme-text-secondary">{u.department}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 ${
                        u.role === 'ADMIN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                        u.role === 'ENGINEER' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:theme-text-secondary'
                      }`}>
                        <Shield className="w-3 h-3 mr-1" /> {u.role}
                      </span>
                      <p className="text-[10px] text-slate-500 max-w-[200px] truncate">
                        {u.role === 'ADMIN' ? 'All Mines (Admin)' : (u.mines?.map(m => m.name).join(', ') || 'No mines assigned')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        u.status === 'SUSPENDED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' :
                        'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:theme-text-secondary'
                      }`}>
                        {u.status}
                      </span>
                      {u.mustChangePassword && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Password Reset Pending
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleResetPassword(u.id)}
                        title="Force Password Reset"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition-colors"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:theme-text-primary transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="theme-card border theme-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b theme-border flex items-center justify-between">
              <h3 className="text-lg font-bold theme-text-primary">Edit User: {editingUser.name}</h3>
              <button onClick={() => setEditingUser(null)} className="theme-text-secondary hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:theme-text-secondary mb-2">Role</label>
                <select 
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as Role)}
                  className="w-full px-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="ENGINEER">Engineer</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:theme-text-secondary mb-2">Account Status</label>
                <select 
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="DELETED">Deleted</option>
                </select>
              </div>

              {editRole !== 'ADMIN' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:theme-text-secondary mb-2">Mine Assignments</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-[var(--bg-app)] border border-transparent hover:border-[var(--border-color)]">
                      <input 
                        type="checkbox" 
                        checked={editMines.includes('all')}
                        onChange={() => toggleMine('all')}
                        className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">All Mines</span>
                    </label>
                    {!editMines.includes('all') && MINE_OPTIONS.map(mine => (
                      <label key={mine} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-[var(--bg-app)] border border-transparent hover:border-[var(--border-color)]">
                        <input 
                          type="checkbox" 
                          checked={editMines.includes(mine)}
                          onChange={() => toggleMine(mine)}
                          className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-slate-700 dark:theme-text-primary">{mine}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-[var(--bg-app)] border-t border-[var(--border-color)] flex justify-end gap-3">
              <button 
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 dark:theme-text-secondary hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {tempPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-[var(--border-color)] flex items-center gap-3 text-amber-500">
              <KeyRound className="w-6 h-6" />
              <h3 className="text-base font-extrabold theme-text-primary">Temporary Password Generated</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs theme-text-secondary leading-relaxed">
                The password for this user has been reset. To enable their access, copy this temporary password and deliver it securely. The user will be required to change it immediately upon their next sign-in.
              </p>
              
              <div className="flex items-center justify-between p-3.5 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl font-mono text-sm tracking-wide select-all text-white font-extrabold relative group">
                <span>{tempPassword}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tempPassword);
                    showToast('Copied to clipboard');
                  }}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold tracking-wider uppercase rounded-md transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="px-6 py-4 bg-[var(--bg-app)]/50 border-t border-[var(--border-color)] flex justify-end">
              <button
                onClick={() => setTempPassword(null)}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Users;
