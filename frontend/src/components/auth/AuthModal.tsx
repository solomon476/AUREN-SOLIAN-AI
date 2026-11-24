import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
        const res = await signIn(email.trim(), password);
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
        const res = await resetPassword(email.trim());
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

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto overscroll-contain animate-in fade-in duration-200 select-auto"
      style={{ minHeight: '100dvh' }}
    >
      {/* Backdrop click dismiss */}
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card - CRISP WHITE BACKGROUND for high-contrast visibility */}
      <div
        className="relative w-full max-w-md my-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 flex flex-col max-h-[calc(100dvh-2rem)] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer z-10"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Body Container */}
        <div className="overflow-y-auto p-5 sm:p-7 overscroll-contain flex-1 scrollbar-thin">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 mb-2.5 shadow-sm">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Solian Wolves Executive Access
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enterprise Identity & Cryptographic Authentication
            </p>
          </div>

          {/* Corporate Access Notice */}
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5 shadow-xs">
            <Shield className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="leading-relaxed">
              <span className="font-semibold block text-slate-900">Solian Wolves Corporate Access</span>
              Sign in with your official company email. Initial executive password:{' '}
              <code className="bg-white border border-amber-300 px-1.5 py-0.5 rounded text-amber-800 font-mono text-[11px] font-bold shadow-xs">
                Solian2026!
              </code>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-5 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all min-h-[38px] cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-white text-slate-950 font-bold shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('activate');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all min-h-[38px] cursor-pointer ${
                activeTab === 'activate'
                  ? 'bg-white text-slate-950 font-bold shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Activate Account
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('reset');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all min-h-[38px] cursor-pointer ${
                activeTab === 'reset'
                  ? 'bg-white text-slate-950 font-bold shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recovery
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'signin' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Corporate Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@solianwolves.co"
                      autoComplete="email"
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-3 text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 min-h-[46px] shadow-sm transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-3 text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 min-h-[46px] shadow-sm transition"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'activate' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Invitation / Bootstrap Token
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Key className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
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
                        className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-3 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 min-h-[46px] shadow-sm transition"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => verifyToken(token.trim())}
                      disabled={verifyingToken || !token.trim()}
                      className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs transition cursor-pointer disabled:opacity-50 shrink-0 min-h-[46px]"
                    >
                      {verifyingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                    </button>
                  </div>
                </div>

                {/* Verified Identity Card */}
                {verifiedInvitation && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-emerald-300 space-y-2 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Verified Personnel Record</span>
                      </div>
                      {verifiedInvitation.is_owner_bootstrap && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <Crown className="w-3 h-3" /> OWNER
                        </span>
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-200 space-y-1">
                      <div className="text-slate-950 font-bold text-sm">{verifiedInvitation.name}</div>
                      <div className="text-slate-600">
                        {verifiedInvitation.title} • <span className="text-slate-900 font-medium">{verifiedInvitation.department}</span>
                      </div>
                      {verifiedInvitation.email && (
                        <div className="text-slate-500 text-[11px] font-mono">{verifiedInvitation.email}</div>
                      )}
                    </div>
                  </div>
                )}

                {verifiedInvitation && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Create Your Corporate Password *
                      </label>
                      <div className="relative">
                        <Lock className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 min-h-[46px] shadow-sm transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Confirm Corporate Password *
                      </label>
                      <div className="relative">
                        <Lock className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
                          className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 min-h-[46px] shadow-sm transition"
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === 'reset' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Corporate Email
                </label>
                <div className="relative">
                  <Mail className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@solianwolves.co"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-3 text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15 min-h-[46px] shadow-sm transition"
                  />
                </div>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading || (activeTab === 'activate' && !verifiedInvitation)}
              className="w-full mt-4 py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/20 min-h-[48px] cursor-pointer touch-manipulation active:scale-[0.99]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <span>
                    {activeTab === 'signin' && 'Authenticate Session'}
                    {activeTab === 'activate' && 'Activate Account & Sign In'}
                    {activeTab === 'reset' && 'Send Recovery Link'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Onboarding Notice */}
          {activeTab === 'signin' && (
            <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <span className="font-semibold text-slate-900 block">Need an account?</span>
              <p>
                Corporate accounts are established by company administration. If you have received an invitation token, switch to the{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('activate');
                    setError(null);
                  }}
                  className="text-amber-600 hover:text-amber-700 underline font-semibold cursor-pointer"
                >
                  Activate Account
                </button>{' '}
                tab.
              </p>
            </div>
          )}

          {/* Security Notice */}
          <p className="text-[10px] text-center text-slate-400 mt-4 leading-relaxed">
            Access restricted to authorized Solian Wolves personnel. Sessions are cryptographically signed and logged.
          </p>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
export default AuthModal;
