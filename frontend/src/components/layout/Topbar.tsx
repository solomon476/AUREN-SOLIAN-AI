import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ShieldCheck, LogOut, LogIn, KeyRound, X, User, Download, Smartphone } from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext';
import { useAuth } from '../../context/AuthContext';
import { usePWAInstall } from '../common/PWAInstallBanner';
import { UserRole } from '../../types';
import { AuthModal } from '../auth/AuthModal';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { CommandPalette } from '../search/CommandPalette';
import { UserAvatar } from '../common/UserAvatar';

export const Topbar: React.FC = () => {
  const { currentOrg, activeModule } = useOrganization();
  const { user, availableUsers, switchUser, authMode, isDevSimulation, signOut } = useAuth();
  const { isStandalone, triggerInstall } = usePWAInstall();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);

  // Global shortcut listener: ⌘K or Ctrl+K & AuthModal listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const params = new URLSearchParams(window.location.search);
    if (params.get('token') || params.get('bootstrap_token') || window.location.pathname.startsWith('/activate')) {
      setIsAuthModalOpen(true);
    }
    const handleOpenAuth = () => setIsAuthModalOpen(true);
    window.addEventListener('open-auth-modal', handleOpenAuth);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-auth-modal', handleOpenAuth);
    };
  }, []);

  const roleColors: Record<UserRole, string> = {
    owner: 'bg-amber-500/15 text-amber-900 border-amber-500/30',
    admin: 'bg-purple-500/15 text-purple-900 border-purple-500/30',
    manager: 'bg-blue-500/15 text-blue-900 border-blue-500/30',
    member: 'bg-slate-100 text-slate-700 border-slate-300',
    guest: 'bg-zinc-100 text-zinc-700 border-zinc-300',
  };

  const moduleTitles: Record<string, string> = {
    dashboard: 'Company Command Center',
    chat: 'Company AI Assistant (Solian Intelligence)',
    finance: 'Financial Intelligence & Company Records (Treasury & Cash Flow)',
    projects: 'Strategic Initiatives & Enterprise Projects',
    tasks: 'Operational Backlog & Execution Kanban',
    workflows: 'Business Automation & Decision Triggers',
    knowledge: 'Institutional Knowledge Vault & SOPs',
    documents: 'Confidential Corporate Document Repository',
    analytics: 'Performance & Operations Analytics',
    teams: 'Organization Structure & Staff Directory',
    clients: 'Client Accounts & CRM Engagements',
    settings: 'Organization Configuration & Governance',
    meetings: 'Company Cadences, Meetings & Minutes',
    discussions: 'Executive Discussions & Async Comms',
    calendar: 'Operational Timeline & Strategic Calendar',
  };

  const mobileModuleTitles: Record<string, string> = {
    dashboard: 'Command',
    chat: 'Auren AI',
    finance: 'Finance',
    projects: 'Projects',
    tasks: 'Tasks',
    workflows: 'Workflows',
    knowledge: 'Knowledge',
    documents: 'Documents',
    analytics: 'Analytics',
    teams: 'Teams',
    clients: 'Clients',
    settings: 'Settings',
    meetings: 'Cadences',
    discussions: 'Discussions',
    calendar: 'Calendar',
  };

  const getInitials = (name: string): string => {
    if (!name) return 'SW';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header className="min-h-[3.5rem] md:min-h-[4rem] h-[calc(3.5rem+env(safe-area-inset-top,0px))] md:h-16 pt-[env(safe-area-inset-top,0px)] bg-solian-obsidian/95 backdrop-blur-md border-b border-solian-border px-2.5 sm:px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 select-none overflow-x-hidden">
      {/* Left: Brand Wolf Emblem + Org context & module title */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3.5 min-w-0 flex-1 mr-2">
        {/* Solian Wolves Emblem */}
        <div
          className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/30 flex items-center justify-center p-1 shrink-0"
          title="Solian Wolves Company Operating System"
        >
          <img src="/favicon.svg" alt="Solian Wolves Emblem" className="w-full h-full object-contain" />
        </div>

        {/* Organization identity badge */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 rounded bg-slate-50 border border-amber-500/30 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="text-xs font-bold tracking-wide text-amber-800 uppercase hidden sm:inline">
            {currentOrg.name}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-900 rounded font-mono font-bold">
            {currentOrg.code}
          </span>
        </div>

        <div className="h-3.5 w-px bg-slate-200 shrink-0 hidden xs:block"></div>

        {/* Page / Workspace title */}
        <h1 className="text-xs sm:text-sm font-semibold text-slate-800 truncate min-w-0">
          <span className="hidden md:inline">{moduleTitles[activeModule] || 'Enterprise Hub'}</span>
          <span className="md:hidden">{mobileModuleTitles[activeModule] || 'Command'}</span>
        </h1>
      </div>

      {/* Right: Search, verified account switcher & notifications */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
        {/* Mobile Search Button (touch target >= 38px) */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 lg:hidden flex items-center justify-center shrink-0 cursor-pointer transition min-h-[38px] min-w-[38px] active:scale-95"
          aria-label="Search company intelligence"
          title="Search (⌘K)"
        >
          <Search className="w-4 h-4 text-amber-700" />
        </button>

        {/* Mobile Quick Install App Button (visible on mobile browsers when not yet installed) */}
        {!isStandalone && (
          <button
            onClick={triggerInstall}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 text-xs font-bold cursor-pointer transition min-h-[36px] active:scale-95"
            title="Install AUREN SOLIAN on your device"
            aria-label="Install App"
          >
            <Download className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="hidden xs:inline">Install</span>
          </button>
        )}

        {/* Desktop Search trigger button styled as input */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="relative hidden lg:flex items-center w-60 xl:w-72 bg-solian-surface border border-solian-border hover:border-gold-500/50 rounded-lg pl-9 pr-3 py-1.5 text-xs text-graphite-400 cursor-pointer transition text-left"
        >
          <Search className="w-4 h-4 text-graphite-400 absolute left-3 top-2" />
          <span className="truncate">Search company intelligence (⌘K)...</span>
          <kbd className="ml-auto font-mono text-[10px] uppercase px-1.5 py-0.2 rounded bg-solian-darkest text-graphite-400 border border-solian-border">
            ⌘K
          </kbd>
        </button>

        {/* Desktop Identity & Session Controls (Hidden on mobile < md) */}
        <div className="hidden md:flex items-center gap-2">
          {authMode === 'SUPABASE_JWT' && user.id !== 'guest' ? (
            <div className="flex items-center gap-2 bg-solian-surface px-2.5 py-1 rounded-lg border border-emerald-500/40 min-h-[36px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold leading-tight">
                  Supabase Auth
                </span>
                <span className="text-xs font-bold text-white truncate max-w-[140px]">
                  {user.fullName}
                </span>
              </div>
              <span
                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ml-1 ${
                  roleColors[user.role]
                }`}
              >
                {user.role}
              </span>
              <button
                onClick={() => signOut()}
                title="Sign Out of Corporate Session"
                className="ml-1 p-1 rounded hover:bg-white/10 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : isDevSimulation ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-solian-surface px-2.5 py-1 rounded-lg border border-amber-500/30 min-h-[36px]">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase tracking-wider text-amber-400/90 font-bold leading-tight">
                      Dev Identity
                    </span>
                    <span
                      className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      title="DEVELOPMENT-ONLY: Identity resolved via X-User-Id header for role testing."
                    >
                      DEV SIMULATION
                    </span>
                  </div>
                  <select
                    value={user.userId || user.id}
                    onChange={(e) => {
                      const target = availableUsers.find(
                        (u) => u.userId === e.target.value || u.id === e.target.value
                      );
                      if (target) switchUser(target);
                    }}
                    title="Switch user identity for RBAC testing"
                    className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer pr-1 truncate max-w-[160px]"
                  >
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.userId || u.id} className="bg-solian-card text-white">
                        {u.isDemo ? '[DEMO] ' : ''}{u.fullName} ({u.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ml-0.5 ${
                    roleColors[user.role]
                  }`}
                >
                  {user.role}
                </span>
              </div>

              <button
                onClick={() => setIsAuthModalOpen(true)}
                title="Open Supabase Corporate Sign-In"
                className="flex p-1.5 rounded-lg bg-solian-surface hover:bg-gold-500/10 text-slate-300 hover:text-gold-400 border border-solian-border transition items-center gap-1 cursor-pointer shrink-0 min-h-[36px]"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold">Auth</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 border border-gold-500/40 text-xs font-bold transition shadow-sm cursor-pointer min-h-[36px]"
            >
              <LogIn className="w-3.5 h-3.5 text-gold-400" />
              <span>Sign In</span>
            </button>
          )}
        </div>

        {/* Mobile User Profile Trigger / Visitor Sign In (Visible on < md) */}
        {user.role === 'guest' ? (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gold-500 text-solian-darkest font-bold text-xs uppercase hover:bg-gold-400 transition cursor-pointer min-h-[36px]"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        ) : (
          <button
            onClick={() => setIsMobileProfileOpen(true)}
            className="md:hidden flex items-center justify-center p-0.5 rounded-full transition active:scale-95 cursor-pointer shrink-0"
            aria-label={`User profile: ${user.fullName} (${user.role})`}
            title={`${user.fullName} (${user.role.toUpperCase()})`}
          >
            <UserAvatar
              name={user.fullName}
              avatarUrl={user.avatarUrl}
              role={user.role}
              size="sm"
              showRoleBadge
            />
          </button>
        )}

        {/* Live Notification Center */}
        <NotificationCenter />
      </div>

      {/* Mobile Profile & Identity Sheet (Mounted to document.body to avoid backdrop-filter containing block issues) */}
      {isMobileProfileOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 md:hidden animate-fadeIn"
            onClick={() => setIsMobileProfileOpen(false)}
          />
          <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 rounded-t-2xl p-5 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] z-50 md:hidden max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl animate-slideUp text-slate-900">
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center p-0.5">
                  <img src="/favicon.svg" alt="Solian Emblem" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {user.role === 'guest' ? 'Visitor Access' : 'Executive Identity & Clearance'}
                </span>
              </div>
              <button
                onClick={() => setIsMobileProfileOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Close profile drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Information Card */}
            {user.role === 'guest' ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white border border-slate-300 flex items-center justify-center text-sm font-bold text-slate-600">
                    V
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Public Visitor</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Visitor Session (Public Access)</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  Access to institutional memory, strategic project matrices, financial records, and operational execution requires an authorized corporate account.
                </p>
                <button
                  onClick={() => {
                    setIsMobileProfileOpen(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-lg bg-gold-500 text-slate-950 font-bold text-xs uppercase hover:bg-gold-400 transition cursor-pointer min-h-[40px] flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In to Corporate Account</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={user.fullName}
                      avatarUrl={user.avatarUrl}
                      role={user.role}
                      size="lg"
                      className="shrink-0"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {user.fullName}
                      </h3>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {user.title}
                      </p>
                      <p className="text-[10px] text-amber-700 font-mono mt-0.5">
                        {user.email || 'No institutional email'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border shrink-0 ${
                      roleColors[user.role]
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Department</span>
                  <span className="text-slate-800 font-medium text-right truncate max-w-[200px]">
                    {user.department}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Auth Mode</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      authMode === 'SUPABASE_JWT'
                        ? 'bg-emerald-500/15 text-emerald-800 border-emerald-500/40'
                        : 'bg-amber-500/15 text-amber-800 border-amber-500/40'
                    }`}
                  >
                    {authMode === 'SUPABASE_JWT' ? 'SUPABASE JWT' : 'DEV SIMULATION'}
                  </span>
                </div>
              </div>
            )}

            {/* Dev Persona Switcher (Only in Dev Simulation Mode) */}
            {isDevSimulation && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>Switch Test Identity</span>
                  </span>
                  <span className="text-[9px] font-mono text-amber-700">RBAC SIMULATION</span>
                </div>
                <select
                  value={user.userId || user.id}
                  onChange={(e) => {
                    const target = availableUsers.find(
                      (u) => u.userId === e.target.value || u.id === e.target.value
                    );
                    if (target) {
                      switchUser(target);
                      setIsMobileProfileOpen(false);
                    }
                  }}
                  aria-label="Switch development user"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 transition cursor-pointer"
                >
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.userId || u.id} className="bg-white text-slate-900">
                      {u.isDemo ? '[DEMO] ' : ''}{u.fullName} — {u.title} ({u.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setIsMobileProfileOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-800 hover:text-amber-800 border border-slate-300 hover:border-amber-400 text-xs font-bold transition min-h-[44px] cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-amber-700" />
                <span>Corporate Sign In (Supabase Auth)</span>
              </button>

              {authMode === 'SUPABASE_JWT' && user.id !== 'guest' && (
                <button
                  onClick={async () => {
                    await signOut();
                    setIsMobileProfileOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition min-h-[44px] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Corporate Session</span>
                </button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Supabase Corporate Authentication Dialog */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </header>
  );
};
