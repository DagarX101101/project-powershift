import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { accessRequestService } from '../services/accessRequest';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

export const RequestAccess: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    department: '',
    mobileNumber: '',
    reason: '',
    password: '',
    confirmPassword: '',
  });
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validatePassword = (password: string) => {
    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return hasMinLength && hasNumber && hasSpecial;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password) {
      setError('Full Name, Email, and Password are required.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!validatePassword(formData.password)) {
      setError('Password must be at least 8 characters long and contain at least one number and one special character.');
      return;
    }

    setLoading(true);

    try {
      await accessRequestService.createAccessRequest({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        department: formData.department,
        mobileNumber: formData.mobileNumber,
        reason: formData.reason,
      });

      // Navigate to success page
      navigate('/access-request-success');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'An error occurred during submission.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const passwordValid = validatePassword(formData.password);
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden font-sans py-12">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl p-8 bg-slate-900/60 border border-slate-800 rounded-3xl backdrop-blur-xl relative z-10 shadow-2xl overflow-y-auto max-h-[90vh]">
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider theme-text-secondary hover:text-amber-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Request Access</h1>
          <p className="text-sm theme-text-secondary">Project PowerShift requires administrator approval for all new accounts. Please fill out the form below to submit your access request.</p>
        </div>

        {error && (
          <div className="mb-8 p-4 text-sm font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
            <XCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">Full Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm text-white transition-all placeholder-slate-600"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">Email Address <span className="text-rose-500">*</span></label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm text-white transition-all placeholder-slate-600"
                placeholder="rmdagar2006@gmail.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">Department (Optional)</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm text-white transition-all placeholder-slate-600"
                placeholder="Engineering"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">Mobile Number (Optional)</label>
              <input
                type="tel"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm text-white transition-all placeholder-slate-600"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">Reason for Access (Optional)</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm text-white transition-all placeholder-slate-600 resize-none"
              placeholder="Briefly describe why you need access to this system..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">Password <span className="text-rose-500">*</span></label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm text-white transition-all"
                placeholder="••••••••"
              />
              <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1.5">
                {formData.password.length > 0 && (
                  passwordValid ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-rose-500" />
                )}
                <span>Min 8 chars, 1 number, 1 special char</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">Confirm Password <span className="text-rose-500">*</span></label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm text-white transition-all"
                placeholder="••••••••"
              />
              <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1.5">
                {formData.confirmPassword.length > 0 && (
                  passwordsMatch ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-rose-500" />
                )}
                <span>Passwords must match</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading || !passwordValid || !passwordsMatch}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/10 active:scale-[0.98] flex justify-center items-center gap-2"
            >
              {loading ? 'Submitting Request...' : 'Submit Access Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestAccess;
