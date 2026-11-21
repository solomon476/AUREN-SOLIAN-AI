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
  FileText,
} from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { DashboardStats, Project, TaskItem } from '../../types';
import { useOrganization } from '../../context/OrganizationContext';

export const DashboardView: React.FC = () => {
  const { setActiveModule } = useOrganization();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [s, p, t] = await Promise.all([
          SolianApiClient.getDashboardStats(),
          SolianApiClient.getProjects(),
          SolianApiClient.getTasks(),
        ]);
        setStats(s);
        setProjects(p);
        setTasks(t);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-graphite-400 flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading Executive Operations Hub...</span>
      </div>
    );
  }

  const kpis = [
    { label: 'Active Enterprise Staff', value: stats?.activeStaffCount ?? 28, change: '+4 this quarter', icon: Users },
    { label: 'Active Strategic Initiatives', value: stats?.activeProjectsCount ?? 14, change: '100% on schedule', icon: Briefcase },
    { label: 'Open Operations & Tickets', value: stats?.openOperationsCount ?? 42, change: stats?.operationsVelocity ?? '+18.4%', icon: CheckCircle2 },
    { label: 'Indexed Knowledge Entities', value: stats?.knowledgeEntitiesCount ?? 184, change: '12 added this week', icon: Brain },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Executive Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-solian-card via-solian-surface to-solian-card border border-solian-border relative overflow-hidden shadow-card-elevation">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-gold-500/10 to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-gold-500/15 text-gold-400 border border-gold-500/30">
                Solian Operations Brief
              </span>
              <span className="text-xs text-graphite-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> High-Trust Corporate AI
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-white">
              Executive Command & Operations
            </h2>
            <p className="text-sm text-graphite-300 max-w-2xl mt-1">
              Autonomous oversight of company initiatives, institutional knowledge synthesis, and multi-team execution tracking.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => setActiveModule('chat')}
              className="px-4 py-2 rounded-lg bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gold-400 transition shadow-glow-gold"
            >
              <Sparkles className="w-4 h-4" /> Consult Company AI
            </button>
            <button
              onClick={() => setActiveModule('projects')}
              className="px-4 py-2 rounded-lg bg-solian-surface text-slate-200 font-semibold text-xs border border-solian-border hover:border-gold-500/40 transition"
            >
              View Initiatives
            </button>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="p-5 rounded-xl bg-solian-card border border-solian-border hover:border-gold-500/30 transition shadow-card-elevation"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-graphite-400 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className="p-2 rounded-lg bg-solian-surface border border-solian-border text-gold-400">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white mt-3">{kpi.value}</div>
              <div className="text-xs text-gold-400/90 font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-gold-500" /> {kpi.change}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Projects & Urgent Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-solian-card border border-solian-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-solian-border">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gold-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Active Strategic Initiatives
              </h3>
            </div>
            <button
              onClick={() => setActiveModule('projects')}
              className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1 font-medium"
            >
              All Projects <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {projects.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-lg bg-solian-surface border border-solian-border hover:border-gold-500/30 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{p.name}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      p.priority === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      p.priority === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-solian-border text-slate-300'
                    }`}>
                      {p.priority}
                    </span>
                  </div>
                  <div className="text-xs text-graphite-400 mt-1">
                    Client: <span className="text-slate-300">{p.client}</span> • Lead: <span className="text-slate-300">{p.lead}</span> • Target: <span className="text-slate-300">{p.dueDate}</span>
                  </div>
                </div>

                <div className="w-full md:w-36 flex flex-col items-end gap-1">
                  <div className="text-xs font-mono font-bold text-gold-400">{p.progress}%</div>
                  <div className="w-full bg-solian-obsidian h-1.5 rounded-full overflow-hidden border border-solian-border">
                    <div
                      className="bg-gold-500 h-full rounded-full"
                      style={{ width: `${p.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Urgent Operations & Backlog (1 col) */}
        <div className="p-6 rounded-xl bg-solian-card border border-solian-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-solian-border">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-gold-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Urgent Operations
              </h3>
            </div>
            <button
              onClick={() => setActiveModule('tasks')}
              className="text-xs text-gold-400 hover:text-gold-300 font-medium"
            >
              Task Board
            </button>
          </div>

          <div className="space-y-3">
            {tasks.slice(0, 4).map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-lg bg-solian-surface border border-solian-border space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200 line-clamp-1">{t.title}</span>
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-gold-500/20 text-gold-300 shrink-0">
                    {t.priority}
                  </span>
                </div>
                <p className="text-[11px] text-graphite-400 line-clamp-2">{t.description}</p>
                <div className="flex items-center justify-between text-[10px] text-graphite-400 pt-1 border-t border-solian-border/50">
                  <span>Assignee: <span className="text-slate-300">{t.assignee}</span></span>
                  <span className="font-mono text-gold-400">{t.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

