import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Users,
  Briefcase,
  CheckCircle2,
  Brain,
  Sparkles,
  ArrowUpRight,
  Clock,
  AlertCircle,
  ShieldCheck,
  Building2,
  Activity,
  Layers,
  ChevronRight,
  CalendarClock,
  CheckSquare,
  ArrowRight,
  Banknote,
  MessageSquare,
  Flame,
  ListTodo,
} from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { DashboardStats, Project, TaskItem, Department, Meeting, ExpenseRequest, DiscussionMessage } from '../../types';
import { useOrganization } from '../../context/OrganizationContext';
import { useAuth } from '../../context/AuthContext';

export const DashboardView: React.FC = () => {
  const { setActiveModule, currentOrg } = useOrganization();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ExpenseRequest[]>([]);
  const [recentDiscussions, setRecentDiscussions] = useState<DiscussionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState<'focus' | 'priority' | 'overview'>('focus');

  const isAdminOrOwner = user.role === 'owner' || user.role === 'admin';

  useEffect(() => {
    async function loadData() {
      try {
        const promises: Promise<any>[] = [
          SolianApiClient.getDashboardStats(),
          SolianApiClient.getProjects(),
          SolianApiClient.getTasks(),
          SolianApiClient.getDepartments(),
          SolianApiClient.getMeetings(),
          SolianApiClient.getDiscussionMessages('general').catch(() => []),
        ];

        if (isAdminOrOwner) {
          promises.push(SolianApiClient.getExpenseRequests({ status: 'submitted' }).catch(() => []));
        }

        const results = await Promise.all(promises);
        setStats(results[0]);
        setProjects(results[1]);
        setTasks(results[2]);
        setDepartments(results[3]);
        setMeetings(results[4]);
        setRecentDiscussions(results[5] || []);
        if (isAdminOrOwner && results[6]) {
          setPendingApprovals(results[6]);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isAdminOrOwner]);

  if (loading) {
    return (
      <div className="p-8 text-graphite-400 flex items-center justify-center min-h-[60vh] gap-3">
        <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-medium">Synchronizing Company Command Center...</span>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Active Staff',
      value: stats?.activeStaffCount ?? 0,
      detail: `${departments.length} Divisions`,
      icon: Users,
    },
    {
      label: 'Strategic Initiatives',
      value: stats?.activeProjectsCount ?? 0,
      detail: `${projects.filter((p) => p.status === 'in_progress').length} Active`,
      icon: Briefcase,
    },
    {
      label: 'Open Operations',
      value: stats?.openOperationsCount ?? 0,
      detail: `${stats?.urgentTasksCount ?? 0} High Priority`,
      icon: CheckCircle2,
    },
    {
      label: 'Institutional SOPs',
      value: stats?.knowledgeEntitiesCount ?? 0,
      detail: `${stats?.verifiedKnowledgeCount ?? 0} Verified`,
      icon: Brain,
    },
  ];

  const urgentTasks = tasks.filter((t) => t.status !== 'completed' && (t.priority === 'urgent' || t.priority === 'high'));
  const myTasks = tasks.filter((t) => {
    if (!user.fullName) return false;
    const namePart = user.fullName.split(' ')[0].toLowerCase();
    return t.assignee.toLowerCase().includes(namePart);
  });
  const upcomingMeetings = meetings
    .filter((m) => m.status === 'scheduled')
    .slice(0, 3);
  const recentActivities = stats?.recentActivities ?? [];
  const operationalInsights = stats?.operationalInsights ?? [];

  return (
    <div className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Executive Welcome Banner */}
      <div className="p-4 sm:p-6 md:p-8 rounded-2xl bg-gradient-to-r from-solian-card via-solian-surface to-solian-card border border-solian-border relative overflow-hidden shadow-card-elevation">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-radial from-gold-500/10 to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-gold-500/15 text-gold-400 border border-gold-500/30">
                {currentOrg.name} • Operations Brief
              </span>
              <span className="text-[11px] text-graphite-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gold-500" /> Real-Time Telemetry
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Company Command Center
            </h2>
            <p className="text-xs sm:text-sm text-graphite-300 max-w-2xl mt-1.5 leading-relaxed">
              Autonomous oversight and execution tracking for {currentOrg.name}. Welcome, <span className="text-white font-semibold">{user.fullName}</span> ({user.role.toUpperCase()}).
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => setActiveModule('chat')}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gold-400 transition shadow-glow-gold cursor-pointer min-h-[44px]"
            >
              <Sparkles className="w-4 h-4" /> Consult Company AI
            </button>
            <button
              onClick={() => setActiveModule('calendar')}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-solian-surface text-slate-200 font-semibold text-xs border border-solian-border hover:border-gold-500/40 transition cursor-pointer flex items-center gap-2 min-h-[44px]"
            >
              <CalendarClock className="w-4 h-4 text-gold-400" /> Operational Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Demonstration Fixture Warning / Verification Notice */}
      {stats?.hasDemoData && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/40 flex items-start gap-2.5 sm:gap-3 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 sm:space-y-1">
            <div className="font-bold text-amber-300 uppercase tracking-wide text-[10px] sm:text-[11px] flex items-center gap-2">
              <span>Development Demonstration Fixtures Active</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                [DEMO]
              </span>
            </div>
            <p className="text-amber-200/80 text-[10px] sm:text-[11px] leading-relaxed">
              Personnel, sample projects, and demonstration SOP templates are flagged as <span className="font-mono text-amber-300 font-bold">[DEMO]</span>. Company facts remain unconfigured until saved by an Owner or Admin.
            </p>
          </div>
        </div>
      )}

      {/* Mobile-Only Segmented Control (to avoid infinite vertical scroll on phones) */}
      <div className="md:hidden flex items-center gap-1.5 p-1 bg-solian-card rounded-xl border border-solian-border">
        <button
          onClick={() => setMobileTab('focus')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all min-h-[40px] flex items-center justify-center gap-1.5 ${
            mobileTab === 'focus'
              ? 'bg-gold-500 text-solian-darkest shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ListTodo className="w-3.5 h-3.5" />
          <span>My Focus</span>
        </button>
        <button
          onClick={() => setMobileTab('priority')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all min-h-[40px] flex items-center justify-center gap-1.5 ${
            mobileTab === 'priority'
              ? 'bg-gold-500 text-solian-darkest shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Priority {pendingApprovals.length > 0 && `(${pendingApprovals.length})`}</span>
        </button>
        <button
          onClick={() => setMobileTab('overview')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all min-h-[40px] flex items-center justify-center gap-1.5 ${
            mobileTab === 'overview'
              ? 'bg-gold-500 text-solian-darkest shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>
      </div>

      {/* KPI Grid (Visible on desktop OR in Mobile Overview tab) */}
      <div className={`${mobileTab === 'overview' ? 'block' : 'hidden md:block'}`}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="p-3.5 sm:p-5 rounded-xl bg-solian-card border border-solian-border hover:border-gold-500/40 transition shadow-card-elevation"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-semibold text-graphite-400 uppercase tracking-wider truncate">
                    {kpi.label}
                  </span>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-solian-surface border border-solian-border text-gold-400 shrink-0">
                    <Icon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white mt-2 sm:mt-3 font-mono">{kpi.value}</div>
                <div className="text-[10px] sm:text-xs text-gold-400/90 font-medium mt-1 flex items-center gap-1 truncate">
                  <TrendingUp className="w-3 h-3 text-gold-500 shrink-0" /> {kpi.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Requisitions / Approvals Banner (for Admin/Owner) */}
      {isAdminOrOwner && pendingApprovals.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Action Required: {pendingApprovals.length} Pending Procurement Approvals
              </div>
              <div className="text-xs text-amber-200/80 mt-0.5">
                Staff expense requisitions awaiting executive review and fund disbursement.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveModule('finance')}
            className="px-3.5 py-2 rounded-lg bg-amber-500 text-solian-darkest font-bold text-xs uppercase tracking-wider hover:bg-amber-400 transition cursor-pointer shrink-0 min-h-[40px] flex items-center justify-center gap-1.5 self-start sm:self-auto"
          >
            <span>Review Requisitions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Focus Area: My Tasks & Upcoming Meetings */}
      <div className={`${mobileTab === 'focus' ? 'block' : 'hidden md:block'} space-y-4 sm:space-y-6`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* My Tasks */}
          <div className="p-4 sm:p-6 rounded-xl bg-solian-card border border-solian-border space-y-3 sm:space-y-4 shadow-card-elevation">
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-solian-border">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-gold-500" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  My Assigned Workstreams
                </h3>
              </div>
              <button
                onClick={() => setActiveModule('tasks')}
                className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1 font-semibold min-h-[40px] min-w-[40px] justify-end"
              >
                Kanban <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {myTasks.length === 0 ? (
              <div className="p-5 text-center text-graphite-400 text-xs bg-solian-surface rounded-xl border border-solian-border">
                <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                No pending tasks explicitly assigned to your current session.
              </div>
            ) : (
              <div className="space-y-2">
                {myTasks.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setActiveModule('tasks')}
                    className="p-3 rounded-lg bg-solian-surface border border-solian-border hover:border-gold-500/40 transition cursor-pointer flex items-center justify-between gap-3 text-xs min-h-[48px]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white truncate">{t.title}</div>
                      <div className="text-[10px] text-graphite-400">Due: {t.dueDate}</div>
                    </div>
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-solian-card text-gold-400 border border-solian-border font-mono shrink-0">
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Meetings */}
          <div className="p-4 sm:p-6 rounded-xl bg-solian-card border border-solian-border space-y-3 sm:space-y-4 shadow-card-elevation">
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-solian-border">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  Upcoming Cadences & Meetings
                </h3>
              </div>
              <button
                onClick={() => setActiveModule('meetings')}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold min-h-[40px] min-w-[40px] justify-end"
              >
                All <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingMeetings.length === 0 ? (
              <div className="p-5 text-center text-graphite-400 text-xs bg-solian-surface rounded-xl border border-solian-border">
                No meetings scheduled for today.
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingMeetings.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setActiveModule('meetings')}
                    className="p-3 rounded-lg bg-solian-surface border border-solian-border hover:border-purple-500/40 transition cursor-pointer flex items-center justify-between gap-3 text-xs min-h-[48px]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white truncate">{m.title}</div>
                      <div className="text-[10px] text-graphite-400 truncate">
                        {m.date} at {m.time} ({m.durationMinutes}m) • {m.organizerName}
                      </div>
                    </div>
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono shrink-0">
                      {m.meetingType}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Discussions Highlights (Mobile Focus) */}
        {recentDiscussions.length > 0 && (
          <div className="p-4 sm:p-5 rounded-xl bg-solian-card border border-solian-border space-y-3 shadow-card-elevation">
            <div className="flex items-center justify-between pb-2 border-b border-solian-border">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gold-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Recent Discussions (#General Announcements)
                </h3>
              </div>
              <button
                onClick={() => setActiveModule('discussions')}
                className="text-xs text-gold-400 hover:text-gold-300 font-semibold min-h-[36px] flex items-center gap-1"
              >
                Discussions <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {recentDiscussions.slice(0, 3).map((disc) => (
                <div
                  key={disc.id}
                  onClick={() => setActiveModule('discussions')}
                  className="p-3 rounded-lg bg-solian-surface border border-solian-border hover:border-gold-500/30 transition cursor-pointer flex items-start justify-between gap-3 text-xs min-h-[44px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-200 line-clamp-1">
                      {disc.title || disc.content}
                    </div>
                    <div className="text-[10px] text-graphite-400 mt-0.5">
                      By <span className="text-gold-400">{disc.authorName}</span> • {new Date(disc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-solian-card text-gold-400 border border-solian-border shrink-0">
                    Thread
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Priority Area: Urgent Operations & Operational Insights */}
      <div className={`${mobileTab === 'priority' ? 'block' : 'hidden md:block'} space-y-4 sm:space-y-6`}>
        {/* Actionable Urgent Operations */}
        <div className="p-4 sm:p-6 rounded-xl bg-solian-card border border-solian-border space-y-3 sm:space-y-4 shadow-card-elevation">
          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-solian-border">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-gold-500" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                Urgent Operations ({urgentTasks.length})
              </h3>
            </div>
            <button
              onClick={() => setActiveModule('tasks')}
              className="text-xs text-gold-400 hover:text-gold-300 font-semibold min-h-[40px] flex items-center"
            >
              Task Board
            </button>
          </div>

          {urgentTasks.length === 0 ? (
            <div className="p-6 text-center text-graphite-400 text-xs bg-solian-surface rounded-xl border border-solian-border">
              <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              No urgent operational bottlenecks detected.
            </div>
          ) : (
            <div className="space-y-2.5">
              {urgentTasks.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  onClick={() => setActiveModule('tasks')}
                  className="p-3 sm:p-3.5 rounded-lg bg-solian-surface border border-solian-border space-y-1.5 cursor-pointer hover:border-gold-500/30 transition min-h-[48px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                      <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                        {t.title}
                      </span>
                      {t.isDemo && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                          [DEMO]
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-gold-500/20 text-gold-300 shrink-0">
                      {t.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-graphite-400 line-clamp-2">{t.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-graphite-400 pt-1 border-t border-solian-border/50">
                    <span>
                      Assignee: <span className="text-slate-300">{t.assignee}</span>
                    </span>
                    <span className="font-mono text-gold-400">{t.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Operational Insights Bar */}
        {operationalInsights.length > 0 && (
          <div className="p-4 sm:p-5 rounded-xl bg-solian-card border border-gold-500/30 space-y-3 shadow-card-elevation">
            <div className="flex items-center justify-between pb-2 border-b border-solian-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  AUREN SOLIAN — Operational Insights
                </h3>
              </div>
              <span className="text-[10px] text-graphite-400 uppercase font-mono">
                Ground Truth
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
              {operationalInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-3 sm:p-3.5 rounded-lg bg-solian-surface border border-solian-border space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-200 truncate">{insight.title}</span>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                        insight.severity === 'warning'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-gold-500/10 text-gold-400 border-gold-500/20'
                      }`}
                    >
                      {insight.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-graphite-300 leading-relaxed">{insight.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Overview Area: Projects, Activity Stream & Operating Divisions */}
      <div className={`${mobileTab === 'overview' ? 'block' : 'hidden md:block'} space-y-4 sm:space-y-6`}>
        {/* Active Projects */}
        <div className="p-4 sm:p-6 rounded-xl bg-solian-card border border-solian-border space-y-3 sm:space-y-4 shadow-card-elevation">
          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-solian-border">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gold-500" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                Active Strategic Initiatives
              </h3>
            </div>
            <button
              onClick={() => setActiveModule('projects')}
              className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1 font-semibold min-h-[40px] flex items-center"
            >
              All Projects <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="p-8 text-center text-graphite-400 text-xs">
              No initiatives currently registered in the company roadmap.
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {projects.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  onClick={() => setActiveModule('projects')}
                  className="p-3.5 sm:p-4 rounded-xl bg-solian-surface border border-solian-border hover:border-gold-500/30 transition flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer min-h-[52px]"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-white truncate">{p.name}</span>
                      <span
                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border shrink-0 ${
                          p.priority === 'critical'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : p.priority === 'high'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-solian-border text-slate-300 border-solian-border'
                        }`}
                      >
                        {p.priority}
                      </span>
                    </div>
                    <div className="text-[11px] text-graphite-400 truncate">
                      Client: <span className="text-slate-300">{p.client || 'Internal'}</span> • Lead:{' '}
                      <span className="text-slate-300">{p.lead}</span> • Target:{' '}
                      <span className="text-slate-300 font-mono">{p.dueDate}</span>
                    </div>
                  </div>

                  <div className="w-full md:w-36 flex flex-col items-end gap-1 shrink-0">
                    <div className="text-xs font-mono font-bold text-gold-400">{p.progress}%</div>
                    <div className="w-full bg-solian-obsidian h-2 rounded-full overflow-hidden border border-solian-border">
                      <div
                        className="bg-gold-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${p.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Grid: Company Activity Audit Stream & Operating Divisions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Company Activity Stream */}
          <div className="p-4 sm:p-6 rounded-xl bg-solian-card border border-solian-border space-y-3 sm:space-y-4 shadow-card-elevation">
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-solian-border">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gold-500" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  Recent Activity & Audit Log
                </h3>
              </div>
              <span className="text-xs text-graphite-400 font-mono">Live Feed</span>
            </div>

            <div className="space-y-2.5">
              {recentActivities.length === 0 ? (
                <div className="p-4 text-center text-graphite-400 text-xs">No recent activity logged.</div>
              ) : (
                recentActivities.slice(0, 5).map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-lg bg-solian-surface border border-solian-border flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="font-bold text-slate-200 truncate">{act.title}</div>
                      <div className="text-[11px] text-graphite-300 line-clamp-2">{act.description}</div>
                      <div className="text-[10px] text-graphite-400 pt-0.5">
                        Actor: <span className="text-gold-400">{act.actorName}</span> • Module:{' '}
                        <span className="text-slate-300 uppercase">{act.module}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-graphite-400 shrink-0">
                      {act.timestamp}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Operating Divisions */}
          <div className="p-4 sm:p-6 rounded-xl bg-solian-card border border-solian-border space-y-3 sm:space-y-4 shadow-card-elevation">
            <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-solian-border">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-gold-500" />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  Operating Divisions & Alignment
                </h3>
              </div>
              <button
                onClick={() => setActiveModule('teams')}
                className="text-xs text-gold-400 hover:text-gold-300 font-semibold min-h-[40px] flex items-center"
              >
                Staff Directory
              </button>
            </div>

            <div className="space-y-2">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-3 rounded-lg bg-solian-surface border border-solian-border flex items-center justify-between gap-3 hover:border-gold-500/30 transition text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gold-400 bg-solian-card px-1.5 py-0.2 rounded border border-solian-border text-[10px]">
                        {dept.code}
                      </span>
                      <span className="font-bold text-slate-200 truncate">{dept.name}</span>
                    </div>
                    <div className="text-[10px] text-graphite-400 mt-0.5 truncate">
                      Lead: <span className="text-slate-300">{dept.leadName}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-white text-xs">{dept.memberCount}</div>
                    <div className="text-[9px] text-graphite-400">Members</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
