import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div className="w-full max-w-md p-8 bg-slate-900/60 border border-slate-800 rounded-3xl text-center shadow-2xl">
        <h2 className="text-xl font-bold text-rose-400 mb-4">Access Denied</h2>
        <p className="text-sm text-slate-400 mb-6">
          You do not have the required permissions to view this resource.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 font-semibold text-xs tracking-wider rounded-xl transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
