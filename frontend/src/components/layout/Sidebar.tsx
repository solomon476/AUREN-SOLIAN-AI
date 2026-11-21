import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Brain,
  Users,
  Briefcase,
  CheckSquare,
  Building2,
  FileText,
  BarChart3,
  GitFork,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from './BrandLogo';

export const Sidebar: React.FC = () => {
  const { activeModule, setActiveModule } = useOrganization();
  const { user } = useAuth();

  const navSections = [
    {
      title: 'COMMAND & STRATEGY',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
        { id: 'chat', label: 'Company AI Assistant', icon: Bot, badge: 'Live' },
      ],
    },
    {
      title: 'OPERATIONS & DELIVERY',
      items: [
        { id: 'projects', label: 'Projects & Initiatives', icon: Briefcase },
        { id: 'tasks', label: 'Tasks & Operations', icon: CheckSquare },
        { id: 'workflows', label: 'Workflows & Automation', icon: GitFork },
      ],
    },
    {
      title: 'INSTITUTIONAL INTELLIGENCE',
      items: [
        { id: 'knowledge', label: 'Knowledge Vault', icon: Brain },
        { id: 'documents', label: 'Corporate Documents', icon: FileText },
        { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'ORGANIZATION',
      items: [
        { id: 'teams', label: 'Staff & Team Directory', icon: Users },
        { id: 'clients', label: 'Client Accounts (CRM)', icon: Building2 },
        { id: 'settings', label: 'Governance & Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-72 bg-solian-obsidian border-r border-solian-border flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-solian-border/80 flex items-center justify-between">
        <BrandLogo size="md" />
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-3 text-[10px] font-bold tracking-widest text-graphite-400/90 uppercase">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-solian-card text-gold-400 border border-gold-500/40 shadow-glow-subtle'
                      : 'text-slate-300 hover:bg-solian-surface hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-gold-500' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gold-500/10 text-gold-400 border border-gold-500/20">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* User / RBAC Badge Footer */}
      <div className="p-3 border-t border-solian-border bg-solian-darkest/60">
        <div className="flex items-center justify-between p-2 rounded-lg bg-solian-surface/80 border border-solian-border/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center font-bold text-xs border border-gold-500/30">
              {user.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">{user.fullName}</div>
              <div className="text-[10px] text-graphite-400 truncate">{user.title}</div>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gold-500/15 text-gold-400 border border-gold-500/30">
            {user.role}
          </span>
        </div>
      </div>
    </aside>
  );
};
