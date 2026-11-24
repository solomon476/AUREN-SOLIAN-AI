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
  X,
  CalendarClock,
  Calendar,
  MessageSquare,
  Landmark,
  Mail,
  Smartphone,
  Download,
} from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext';
import { useAuth } from '../../context/AuthContext';
import { usePWAInstall } from '../common/PWAInstallBanner';
import { BrandLogo } from './BrandLogo';
import { UserAvatar } from '../common/UserAvatar';

export const Sidebar: React.FC = () => {
  const { activeModule, setActiveModule, isMobileNavOpen, closeMobileNav } = useOrganization();
  const { user } = useAuth();
  const { isStandalone, triggerInstall } = usePWAInstall();

  const navSections = [
    {
      title: 'COMMAND & STRATEGY',
      items: [
        { id: 'dashboard', label: 'Company Command Center', icon: LayoutDashboard },
        { id: 'chat', label: 'Company AI Assistant', icon: Bot, badge: 'Live' },
        { id: 'finance', label: 'Finance & Company Records', icon: Landmark, badge: 'KES' },
        { id: 'calendar', label: 'Operational Calendar', icon: Calendar },
      ],
    },
    {
      title: 'OPERATIONS & DELIVERY',
      items: [
        { id: 'projects', label: 'Projects & Initiatives', icon: Briefcase },
        { id: 'tasks', label: 'Tasks & Operations', icon: CheckSquare },
        { id: 'meetings', label: 'Meetings & Minutes', icon: CalendarClock },
        { id: 'workflows', label: 'Workflows & Automation', icon: GitFork },
        { id: 'email', label: 'Email & Communications', icon: Mail },
      ],
    },
    {
      title: 'INSTITUTIONAL INTELLIGENCE',
      items: [
        { id: 'knowledge', label: 'Knowledge Vault', icon: Brain },
        { id: 'documents', label: 'Corporate Documents', icon: FileText },
        { id: 'discussions', label: 'Internal Discussions', icon: MessageSquare },
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

  const handleSelectModule = (id: string) => {
    setActiveModule(id);
    closeMobileNav();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileNavOpen && (
        <div
          onClick={closeMobileNav}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 md:hidden animate-fadeIn"
          aria-label="Close navigation drawer backdrop"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-[82vw] max-w-xs md:w-64 lg:w-72 bg-solian-obsidian border-r border-solian-border flex flex-col h-screen h-[100dvh] shrink-0 select-none transition-transform duration-300 ease-in-out ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-solian-border/80 flex items-center justify-between">
          <BrandLogo size="md" />
          <button
            onClick={closeMobileNav}
            className="md:hidden text-graphite-400 hover:text-white p-2 rounded-lg cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close mobile menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-widest text-graphite-400 uppercase">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectModule(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer min-h-[44px] ${
                      isActive
                        ? 'bg-solian-card text-gold-400 border border-gold-500/40 shadow-glow-subtle'
                        : 'text-slate-300 hover:bg-solian-surface hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-gold-500' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gold-500/10 text-gold-400 border border-gold-500/20 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Install Mobile App Button */}
        {!isStandalone && (
          <div className="px-3 pb-2 pt-1">
            <button
              onClick={() => {
                triggerInstall();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 text-gold-400 transition-all cursor-pointer min-h-[40px] text-xs font-semibold"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-gold-400" />
                <span>Install Mobile App</span>
              </div>
              <Download className="w-3.5 h-3.5 text-gold-400" />
            </button>
          </div>
        )}

        {/* User / RBAC Badge Footer */}
        <div
          className="p-3 border-t border-solian-border bg-solian-darkest/60"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
        >
          {user.role === 'guest' ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-solian-surface/80 border border-solian-border/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-solian-card border border-solian-border flex items-center justify-center text-xs font-bold text-graphite-300 shrink-0">
                  V
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate">Public Visitor</div>
                  <div className="text-[10px] text-graphite-400 truncate">Visitor Access</div>
                </div>
              </div>
              <button
                onClick={() => {
                  closeMobileNav();
                  window.dispatchEvent(new CustomEvent('open-auth-modal'));
                }}
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-gold-500 text-solian-darkest hover:bg-gold-400 transition cursor-pointer shrink-0 ml-1"
              >
                Sign In
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-lg bg-solian-surface/80 border border-solian-border/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar
                  name={user.fullName}
                  avatarUrl={user.avatarUrl}
                  role={user.role}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate">{user.fullName}</div>
                  <div className="text-[10px] text-graphite-400 truncate">{user.title}</div>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gold-500/15 text-gold-400 border border-gold-500/30 shrink-0 ml-1">
                {user.role}
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
