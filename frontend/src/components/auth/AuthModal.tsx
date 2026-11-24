import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Shield,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Key,
  ShieldCheck,
  Crown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SolianApiClient } from '../../api/client';
import { InvitationCheckResponse, UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'signin' | 'activate' | 'reset';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, resetPassword, isSupabaseConfigured, setCorporateSession } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('signin');

  // Sign In fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Activation fields
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifiedInvitation, setVerifiedInvitation] = useState<InvitationCheckResponse | null>(null);
  const [verifyingToken, setVerifyingToken] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check URL parameters on mount or open
  useEffect(() => {
    if (!isOpen) return;
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token') || params.get('bootstrap_token');
    if (tokenParam) {
      setActiveTab('activate');
      setToken(tokenParam);
      verifyToken(tokenParam);
    }
  }, [isOpen]);

  const verifyToken = async (tokenToVerify: string) => {
    if (!tokenToVerify.trim() || tokenToVerify.trim().length < 8) return;
    setVerifyingToken(true);
    setError(null);
    try {
      const check = await SolianApiClient.checkInvitation(tokenToVerify.trim());
      if (check.valid) {
        setVerifiedInvitation(check);
      } else {
        setVerifiedInvitation(null);
        setError(check.error || 'Invalid or expired invitation token.');
      }
    } catch (err: any) {
      setVerifiedInvitation(null);
      setError(err.message || 'Failed to verify invitation token.');
    } finally {
      setVerifyingToken(false);
    }
  };

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
      } else if (activeTab === 'activate') {
        if (!token.trim()) {
          throw new Error('Please enter your invitation or bootstrap token.');
        }
        if (!verifiedInvitation) {
          throw new Error('Please verify your invitation token first.');
        }
        if (newPassword.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('Passwords do not match. Please re-enter.');
        }

        let res;
        if (verifiedInvitation.is_owner_bootstrap) {
          res = await SolianApiClient.bootstrapOwner({
            bootstrap_token: token.trim(),
            password: newPassword,
          });
        } else {
          res = await SolianApiClient.activateAccount({
            token: token.trim(),
            password: newPassword,
          });
        }

        if (res?.accessToken) {
          await setCorporateSession(res.accessToken);
          setSuccessMessage(
            `Account successfully activated! Welcome, ${res.user?.fullName || 'Personnel'}.`
          );
          setTimeout(() => {
            onClose();
          }, 1000);
        } else {
          throw new Error(res?.message || 'Failed to activate account.');
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
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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

        {/* Remote Supabase Notice if not configured */}
        {!isSupabaseConfigured && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Supabase Notice:</span>
              Remote Supabase credentials (VITE_SUPABASE_URL) are not set. Operating in verified cryptographic token mode.
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-lg bg-solian-obsidian p-1 mb-5 border border-solian-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab('signin'); setError(null); setSuccessMessage(null); }}
            className={`flex-1 py-2 rounded-md transition-all min-h-[38px] ${
              activeTab === 'signin'
                ? 'bg-gold-500 text-solian-obsidian font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('activate'); setError(null); setSuccessMessage(null); }}
            className={`flex-1 py-2 rounded-md transition-all min-h-[38px] ${
              activeTab === 'activate'
                ? 'bg-gold-500 text-solian-obsidian font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Activate Account
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('reset'); setError(null); setSuccessMessage(null); }}
            className={`flex-1 py-2 rounded-md transition-all min-h-[38px] ${
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
          {activeTab === 'signin' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Corporate Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@solianwolves.co"
                    className="w-full bg-solian-obsidian border border-solian-border rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-solian-obsidian border border-solian-border rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 min-h-[44px]"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'activate' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Invitation / Bootstrap Token
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={token}
                      onChange={(e) => {
                        setToken(e.target.value);
                        setVerifiedInvitation(null);
                      }}
                      onBlur={() => {
                        if (token.trim() && !verifiedInvitation) {
                          verifyToken(token.trim());
                        }
                      }}
                      placeholder="Paste your activation token"
                      className="w-full bg-solian-obsidian border border-solian-border rounded-lg pl-9 pr-3 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-gold-500 min-h-[44px]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => verifyToken(token.trim())}
                    disabled={verifyingToken || !token.trim()}
                    className="px-3.5 py-2.5 rounded-lg bg-solian-card border border-gold-500/40 text-gold-400 font-bold text-xs hover:bg-solian-border transition cursor-pointer disabled:opacity-50 shrink-0 min-h-[44px]"
                  >
                    {verifyingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                  </button>
                </div>
              </div>

              {/* Verified Identity Card */}
              {verifiedInvitation && (
                <div className="p-3.5 rounded-xl bg-solian-obsidian border border-emerald-500/40 space-y-2 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verified Personnel Record</span>
                    </div>
                    {verifiedInvitation.is_owner_bootstrap && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gold-500/20 text-gold-400 border border-gold-500/30 flex items-center gap-1">
                        <Crown className="w-3 h-3" /> OWNER
                      </span>
                    )}
                  </div>
                  <div className="pt-1 border-t border-solian-border/50 space-y-1">
                    <div className="text-white font-bold text-sm">{verifiedInvitation.name}</div>
                    <div className="text-graphite-300">
                      {verifiedInvitation.title} • <span className="text-slate-200">{verifiedInvitation.department}</span>
                    </div>
                    {verifiedInvitation.email && (
                      <div className="text-graphite-400 text-[11px] font-mono">{verifiedInvitation.email}</div>
                    )}
                  </div>
                </div>
              )}

              {verifiedInvitation && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Create Your Corporate Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full bg-solian-obsidian border border-solian-border rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Confirm Corporate Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full bg-solian-obsidian border border-solian-border rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 min-h-[44px]"
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'reset' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Corporate Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@solianwolves.co"
                  className="w-full bg-solian-obsidian border border-solian-border rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 min-h-[44px]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (activeTab === 'activate' && !verifiedInvitation)}
            className="w-full mt-3 py-2.5 px-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-solian-obsidian font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold-500/10 min-h-[44px] cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>
                  {activeTab === 'signin' && 'Authenticate Session'}
                  {activeTab === 'activate' && 'Activate Account & Sign In'}
                  {activeTab === 'reset' && 'Send Recovery Link'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Onboarding Notice */}
        {activeTab === 'signin' && (
          <div className="mt-5 p-3 rounded-xl bg-solian-obsidian/70 border border-solian-border text-[11px] text-graphite-400 space-y-1">
            <span className="font-semibold text-slate-300 block">Need an account?</span>
            <p>
              Corporate accounts are established by company administration. If you have received an invitation token, switch to the{' '}
              <button
                type="button"
                onClick={() => { setActiveTab('activate'); setError(null); }}
                className="text-gold-400 hover:underline font-semibold"
              >
                Activate Account
              </button>{' '}
              tab.
            </p>
          </div>
        )}

        {/* Security Notice */}
        <p className="text-[10px] text-center text-slate-500 mt-5">
          Access restricted to authorized Solian Wolves personnel. Sessions are cryptographically signed and logged.
        </p>
      </div>
    </div>
  );
};
