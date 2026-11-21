import React from 'react';
import { Search, Bell, Shield, ShieldCheck, ChevronDown } from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export const Topbar: React.FC = () => {
  const { currentOrg, activeModule } = useOrganization();
  const { user, setRole } = useAuth();

  const roleOptions: UserRole[] = ['owner', 'admin', 'manager', 'member', 'guest'];

  const moduleTitles: Record<string, string> = {
    dashboard: 'Executive Dashboard & Operations Hub',
    chat: 'Company AI Assistant (Solian Intelligence)',
    projects: 'Enterprise Projects & Strategic Initiatives',
    tasks: 'Operational Backlog & Execution Kanban',
    workflows: 'Business Automation & Decision Triggers',
    knowledge: 'Institutional Knowledge Vault & SOPs',
    documents: 'Confidential Document Repository',
    analytics: 'Performance & Operations Analytics',
    teams: 'Staff Directory & Access Governance',
    clients: 'Client Accounts & CRM Engagements',
    settings: 'Organization Configuration & RBAC',
  };

  return (
    <header className="h-16 bg-solian-obsidian/90 backdrop-blur border-b border-solian-border px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Organization context & current module */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-solian-surface border border-gold-500/25">
          <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse"></span>
          <span className="text-xs font-bold tracking-wide text-gold-400 uppercase">
            {currentOrg.name}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 bg-gold-500/20 text-gold-300 rounded font-mono">
            {currentOrg.code}
          </span>
        </div>

        <div className="h-4 w-px bg-solian-border"></div>

        <h1 className="text-sm font-semibold text-slate-200">
          {moduleTitles[activeModule] || 'Enterprise Hub'}
        </h1>
      </div>

      {/* Right: Quick actions, role switcher demo & user status */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-graphite-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search company knowledge, SOPs, tasks (⌘K)..."
            className="w-80 bg-solian-surface border border-solian-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-graphite-400 focus:outline-none focus:border-gold-500/50"
          />
        </div>

        {/* Role Switcher Demo for RBAC testing */}
        <div className="flex items-center gap-1.5 bg-solian-surface px-2 py-1 rounded border border-solian-border">
          <ShieldCheck className="w-3.5 h-3.5 text-gold-500" />
          <span className="text-[11px] text-graphite-400">Role:</span>
          <select
            value={user.role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="bg-transparent text-xs font-semibold text-gold-400 uppercase focus:outline-none cursor-pointer"
          >
            {roleOptions.map((r) => (
              <option key={r} value={r} className="bg-solian-card text-white">
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Notifications */}
        <button
          title="Notifications"
          className="relative p-2 rounded-lg bg-solian-surface text-slate-400 hover:text-white border border-solian-border"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gold-500"></span>
        </button>
      </div>
    </header>
  );
};
