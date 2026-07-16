import React, { useEffect, useState } from 'react';
import { accessRequestsAdminService } from '../../services/admin/accessRequests';
import type { AccessRequestModel } from '../../services/admin/accessRequests';
import { ShieldCheck, Clock, CheckCircle, XCircle, Search, FileText } from 'lucide-react';
import ReviewRequestModal from './ReviewRequestModal';

export const AccessRequests: React.FC = () => {
  const [requests, setRequests] = useState<AccessRequestModel[]>([]);
  const [history, setHistory] = useState<AccessRequestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedRequest, setSelectedRequest] = useState<AccessRequestModel | null>(null);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pending, hist] = await Promise.all([
        accessRequestsAdminService.getPendingRequests(),
        accessRequestsAdminService.getRequestHistory()
      ]);
      setRequests(pending);
      setHistory(hist);
    } catch (err) {
      console.error(err);
      setError('Failed to load access requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const allData = [...requests, ...history].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  const filteredData = allData.filter(r => {
    const q = searchQuery.toLowerCase();
    return r.fullName.toLowerCase().includes(q) || 
           r.email.toLowerCase().includes(q) || 
           (r.department && r.department.toLowerCase().includes(q)) || 
           r.status.toLowerCase().includes(q);
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const approvedToday = history.filter(r => r.status === 'APPROVED' && r.reviewedAt?.startsWith(todayStr)).length;
  const rejectedToday = history.filter(r => r.status === 'REJECTED' && r.reviewedAt?.startsWith(todayStr)).length;
  const totalPending = requests.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold theme-text-primary tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-emerald-500" />
          Access Requests
        </h1>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 font-semibold flex items-center gap-2 text-sm">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="theme-card border theme-border rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Clock className="w-16 h-16" /></div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Total Pending</h3>
          <div className="text-3xl font-black text-amber-500">{loading ? '-' : totalPending}</div>
        </div>
        <div className="theme-card border theme-border rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Clock className="w-16 h-16" /></div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Pending Requests</h3>
          <div className="text-3xl font-black theme-text-primary">{loading ? '-' : totalPending}</div>
        </div>
        <div className="theme-card border theme-border rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle className="w-16 h-16" /></div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Approved Today</h3>
          <div className="text-3xl font-black text-emerald-500">{loading ? '-' : approvedToday}</div>
        </div>
        <div className="theme-card border theme-border rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><XCircle className="w-16 h-16" /></div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Rejected Today</h3>
          <div className="text-3xl font-black text-rose-500">{loading ? '-' : rejectedToday}</div>
        </div>
      </div>

      <div className="theme-card border theme-border rounded-2xl shadow-xl flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b theme-border flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name, email, department, or status..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all placeholder-slate-400"
            />
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Sort: Newest First
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[var(--bg-app)] text-[10px] uppercase font-black tracking-widest text-slate-500">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Mobile Number</th>
                <th className="px-6 py-4">Requested Date</th>
                <th className="px-6 py-4">Requested Time</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      Loading Requests...
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center text-slate-500">
                      <FileText className="w-12 h-12 mb-3 opacity-20" />
                      <div className="font-semibold text-white">No requests found</div>
                      <div className="text-xs mt-1">Try adjusting your search criteria.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map(req => {
                  const reqDate = new Date(req.requestedAt);
                  return (
                    <tr key={req.id} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                      <td className="px-6 py-4">
                        {req.status === 'PENDING' && <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">Pending</span>}
                        {req.status === 'APPROVED' && <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">Approved</span>}
                        {req.status === 'REJECTED' && <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider">Rejected</span>}
                      </td>
                      <td className="px-6 py-4 font-semibold theme-text-primary">{req.fullName}</td>
                      <td className="px-6 py-4 theme-text-secondary">{req.email}</td>
                      <td className="px-6 py-4 theme-text-secondary">{req.department || '—'}</td>
                      <td className="px-6 py-4 theme-text-secondary">{req.mobileNumber || '—'}</td>
                      <td className="px-6 py-4 theme-text-secondary">{reqDate.toLocaleDateString()}</td>
                      <td className="px-6 py-4 theme-text-secondary">{reqDate.toLocaleTimeString()}</td>
                      <td className="px-6 py-4">
                        {req.status === 'PENDING' ? (
                          <button 
                            onClick={() => setSelectedRequest(req)}
                            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-lg shadow-emerald-500/10"
                          >
                            Review
                          </button>
                        ) : (
                          <button 
                            onClick={() => setSelectedRequest(req)}
                            className="px-4 py-1.5 bg-[var(--bg-app)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-bold text-xs rounded-lg transition-all border border-[var(--border-color)]"
                          >
                            View Details
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <ReviewRequestModal 
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSuccess={() => {
            setSelectedRequest(null);
            fetchAllData();
          }}
        />
      )}
    </div>
  );
};

export default AccessRequests;
