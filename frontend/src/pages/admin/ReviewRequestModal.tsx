import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { accessRequestsAdminService } from '../../services/admin/accessRequests';
import type { AccessRequestModel } from '../../services/admin/accessRequests';
import { fetchClustersAndMines } from '../../services/calculationEngine';

interface ReviewRequestModalProps {
  request: AccessRequestModel;
  onClose: () => void;
  onSuccess: () => void;
}

interface Cluster {
  id: string;
  name: string;
  mines: { id: string; name: string }[];
}

export const ReviewRequestModal: React.FC<ReviewRequestModalProps> = ({ request, onClose, onSuccess }) => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [role, setRole] = useState<'ADMIN' | 'ENGINEER' | 'VIEWER' | ''>('');
  const [selectedMines, setSelectedMines] = useState<Set<string>>(new Set());
  const [rejectionReason, setRejectionReason] = useState('');

  const [mode, setMode] = useState<'REVIEW' | 'REJECT'>('REVIEW');

  useEffect(() => {
    fetchClustersAndMines().then(data => {
      setClusters(data as any);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError('Failed to load mine hierarchy.');
      setLoading(false);
    });
  }, []);

  const handleToggleMine = (mineId: string) => {
    const newMines = new Set(selectedMines);
    if (newMines.has(mineId)) {
      newMines.delete(mineId);
    } else {
      newMines.add(mineId);
    }
    setSelectedMines(newMines);
  };

  const handleSelectAll = () => {
    const allIds = clusters.flatMap(c => c.mines.map(m => m.id));
    if (selectedMines.size === allIds.length) {
      setSelectedMines(new Set());
    } else {
      setSelectedMines(new Set(allIds));
    }
  };

  const handleApprove = async () => {
    if (!role) {
      setError('You must select a role before approving.');
      return;
    }
    if (role === 'ENGINEER' && selectedMines.size === 0) {
      setError('Engineers must have at least one assigned mine.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await accessRequestsAdminService.approveRequest(request.id, role, Array.from(selectedMines));
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve request.');
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await accessRequestsAdminService.rejectRequest(request.id, rejectionReason);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reject request.');
      setSubmitting(false);
    }
  };

  const isReadOnly = request.status !== 'PENDING';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="theme-card border theme-border rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b theme-border flex items-center justify-between bg-[var(--bg-app)]/50">
          <div>
            <h2 className="text-lg font-bold theme-text-primary">Review Access Request</h2>
            <p className="text-xs theme-text-secondary">Request ID: <span className="font-mono">{request.id.split('-')[0]}</span></p>
          </div>
          <button onClick={onClose} className="p-2 theme-text-secondary hover:theme-text-primary transition-colors bg-[var(--bg-app)] border theme-border rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 text-sm">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 font-semibold flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* User Information */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest font-black theme-text-muted mb-4">Applicant Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--bg-app)] p-4 rounded-xl border theme-border">
                <div className="text-[10px] uppercase font-bold theme-text-muted">Full Name</div>
                <div className="theme-text-primary font-semibold">{request.fullName}</div>
              </div>
              <div className="bg-[var(--bg-app)] p-4 rounded-xl border theme-border">
                <div className="text-[10px] uppercase font-bold theme-text-muted">Email</div>
                <div className="theme-text-primary font-semibold truncate" title={request.email}>{request.email}</div>
              </div>
              <div className="bg-[var(--bg-app)] p-4 rounded-xl border theme-border">
                <div className="text-[10px] uppercase font-bold theme-text-muted">Department</div>
                <div className="theme-text-primary font-semibold">{request.department || '—'}</div>
              </div>
              <div className="bg-[var(--bg-app)] p-4 rounded-xl border theme-border">
                <div className="text-[10px] uppercase font-bold theme-text-muted">Mobile Number</div>
                <div className="theme-text-primary font-semibold">{request.mobileNumber || '—'}</div>
              </div>
              <div className="bg-[var(--bg-app)] p-4 rounded-xl border theme-border col-span-2">
                <div className="text-[10px] uppercase font-bold theme-text-muted">Reason for Access</div>
                <div className="theme-text-primary font-semibold">{request.reason || 'No reason provided.'}</div>
              </div>
            </div>
          </div>

          {!isReadOnly && mode === 'REVIEW' && (
            <>
              {/* Role Assignment */}
              <div className="pt-6 border-t theme-border">
                <h3 className="text-[10px] uppercase tracking-widest font-black theme-text-muted mb-4">Role Assignment <span className="text-rose-500">*</span></h3>
                <div className="grid grid-cols-3 gap-4">
                  {['ADMIN', 'ENGINEER', 'VIEWER'].map(r => (
                    <button
                      key={r}
                      onClick={() => setRole(r as any)}
                      className={`p-4 rounded-xl border transition-all text-left ${role === r ? 'bg-[var(--accent-light)] border-[var(--accent-color)] text-[var(--accent-text)]' : 'bg-[var(--bg-app)] border-transparent hover:border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}
                    >
                      <div className="font-bold">{r}</div>
                      <div className="text-[9px] mt-1 opacity-70">
                        {r === 'ADMIN' ? 'Full system access' : r === 'ENGINEER' ? 'Requires assigned mines' : 'Read-only access'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mine Assignment */}
              <div className="pt-6 border-t theme-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] uppercase tracking-widest font-black theme-text-muted">Mine Assignment</h3>
                  <button onClick={handleSelectAll} className="text-xs font-bold theme-accent-text hover:underline">Toggle All Mines</button>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin theme-text-secondary" /></div>
                ) : (
                  <div className="space-y-4">
                    {clusters.map(cluster => (
                      <div key={cluster.id} className="bg-[var(--bg-app)] border theme-border rounded-xl overflow-hidden">
                        <div className="px-4 py-2 bg-[var(--bg-card)] border-b theme-border font-bold text-xs theme-text-secondary">
                          {cluster.name.toLowerCase().endsWith('cluster') ? cluster.name : `${cluster.name} Cluster`}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-[var(--border-color)]">
                          {cluster.mines.map(mine => (
                            <label key={mine.id} className="flex items-center gap-3 p-3 bg-[var(--bg-card)] hover:bg-[var(--bg-app)] cursor-pointer transition-colors">
                              <input 
                                type="checkbox"
                                checked={selectedMines.has(mine.id)}
                                onChange={() => handleToggleMine(mine.id)}
                                className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent-color)] focus:ring-[var(--accent-color)]/50 bg-[var(--bg-app)]"
                              />
                              <span className="text-sm font-semibold theme-text-primary">{mine.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!isReadOnly && mode === 'REJECT' && (
              <div className="pt-6 border-t theme-border">
                <h3 className="text-[10px] uppercase tracking-widest font-black theme-text-muted mb-4">Rejection Details</h3>
                <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">Reason for Rejection (Optional)</label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] text-sm theme-text-primary transition-all placeholder-slate-400 resize-none"
                  placeholder="e.g. Unauthorized User, Duplicate Request..."
                />
              </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t theme-border bg-[var(--bg-app)]/50 flex items-center justify-end gap-4">
          {isReadOnly ? (
            <button onClick={onClose} className="px-6 py-2.5 bg-[var(--bg-app)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] border border-[var(--border-color)] font-bold text-sm rounded-xl transition-all">Close</button>
          ) : (
            mode === 'REVIEW' ? (
              <>
                <button 
                  onClick={() => setMode('REJECT')} 
                  disabled={submitting}
                  className="px-6 py-2.5 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white font-bold text-sm rounded-xl transition-all border border-rose-500/20"
                >
                  Reject Request...
                </button>
                <button 
                  onClick={handleApprove} 
                  disabled={submitting || !role}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve Request
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setMode('REVIEW')} 
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[var(--bg-app)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-bold text-sm rounded-xl transition-all border border-[var(--border-color)]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReject} 
                  disabled={submitting}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-rose-500/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Confirm Rejection
                </button>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewRequestModal;
