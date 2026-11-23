import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'signin' | 'register' | 'reset';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp, resetPassword, isSupabaseConfigured } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Executive Leadership & Strategy');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (activeTab === 'signin') {
        const res = await signIn(email, password);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMessage('Authentication successful. Initializing corporate session...');
          setTimeout(() => {
            onClose();
          }, 800);
        }
      } else if (activeTab === 'register') {
        const res = await signUp(email, password, fullName);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMessage('Registration submitted. Please check your corporate email for verification.');
        }
      } else if (activeTab === 'reset') {
        const res = await resetPassword(email);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMessage('Password recovery instructions sent to your corporate email.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-solian-surface border border-gold-500/30 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-400 mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white">
            Solian Wolves Executive Access
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise Identity & Cryptographic Authentication
          </p>
        </div>

        {/* Configuration Notice if Supabase not linked */}
        {!isSupabaseConfigured && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Supabase Staging / Production Notice:</span>
              Remote Supabase credentials (VITE_SUPABASE_URL) are not set. Authenticated sessions operate through verified cryptographic token simulation.
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-lg bg-solian-obsidian p-1 mb-6 border border-solian-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab('signin'); setError(null); setSuccessMessage(null); }}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              activeTab === 'signin'
                ? 'bg-gold-500 text-solian-obsidian font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(null); setSuccessMessage(null); }}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              activeTab === 'register'
                ? 'bg-gold-500 text-solian-obsidian font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('reset'); setError(null); setSuccessMessage(null); }}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              activeTab === 'reset'
                ? 'bg-gold-500 text-solian-obsidian font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Recovery
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="w-full bg-solian-obsidian border border-solian-border rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Corporate Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@solian.ai"
                className="w-full bg-solian-obsidian border border-solian-border rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          {activeTab !== 'reset' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-solian-obsidian border border-solian-border rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-solian-obsidian border border-solian-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500"
              >
                <option value="Executive Leadership & Strategy">Executive Leadership & Strategy</option>
                <option value="Engineering & AI Operations">Engineering & AI Operations</option>
                <option value="Strategic Advisory & Client Accounts">Strategic Advisory & Client Accounts</option>
                <option value="Product Architecture & Governance">Product Architecture & Governance</option>
                <option value="Data Intelligence & Knowledge Systems">Data Intelligence & Knowledge Systems</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-gold-500 hover:bg-gold-400 text-solian-obsidian font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold-500/10"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>
                  {activeTab === 'signin' && 'Authenticate Session'}
                  {activeTab === 'register' && 'Submit Access Request'}
                  {activeTab === 'reset' && 'Send Recovery Link'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <p className="text-[10px] text-center text-slate-500 mt-6">
          Access restricted to authorized Solian Wolves personnel. Sessions are cryptographically signed and logged.
        </p>
      </div>
    </div>
  );
};

