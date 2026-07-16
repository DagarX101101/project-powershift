import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock } from 'lucide-react';

export const RequestAccessSuccess: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-10 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-xl relative z-10 shadow-2xl flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-4">Access Request Submitted</h1>
        
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          Your request has been sent to the Project Administrator. You will receive an email notification once your request has been reviewed.
        </p>

        <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Status</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
              <Clock className="w-3 h-3" />
              <span>Pending Approval</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-left">
            You can sign in only after your request is approved.
          </p>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide rounded-xl transition-all shadow-lg shadow-amber-500/10 active:scale-[0.98]"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default RequestAccessSuccess;
