import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Zap, Cpu, Activity, Clock, ShieldCheck } from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const AnalyticsView: React.FC = () => {
  const { hasRole } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    SolianApiClient.getAnalyticsMetrics()
      .then(setMetrics)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      title: 'Operations Velocity',
      value: metrics?.operationsVelocity || '100%',
      change: 'On-schedule delivery rate',
      desc: 'Milestone tracking across active initiatives',
    },
    {
      title: 'Active Initiatives',
      value: metrics?.activeProjectsCount ?? 0,
      change: metrics?.activeProjectsCount ? 'Active execution' : 'Backlog ready',
      desc: 'Active roadmaps across departments',
    },
    {
      title: 'SOP Retrieval Efficiency',
      value: `${metrics?.sopRetrievalLatencyMs ?? 140}ms`,
      change: 'Sub-second response',
      desc: 'Institutional knowledge search latency',
    },
    {
      title: 'Departmental Alignment',
      value: metrics?.departmentalAlignment || '100%',
      change: 'All 5 statutory divisions synchronized',
      desc: 'Cross-functional operational governance',
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-gold-500" />
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Operations & Organizational Analytics
          </h2>
        </div>
        <p className="text-xs md:text-sm text-graphite-300">
          Executive performance indicators, institutional AI utilization density, and organizational throughput for Solian Wolves.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-graphite-400 text-xs flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Computing operations telemetry...</span>
        </div>
      ) : !hasRole('manager') ? (
        <div className="p-12 text-center bg-solian-card rounded-2xl border border-solian-border space-y-2">
          <BarChart3 className="w-8 h-8 text-graphite-500 mx-auto" />
          <div className="text-sm font-bold text-white">Access Restricted</div>
          <p className="text-xs text-graphite-400 max-w-md mx-auto">
            Viewing strategic performance metrics requires Manager clearance or above.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((m) => (
              <div
                key={m.title}
                className="p-5 rounded-2xl bg-solian-card border border-solian-border space-y-2 shadow-card-elevation"
              >
                <span className="text-xs font-semibold text-graphite-400 uppercase tracking-wider">
                  {m.title}
                </span>
                <div className="text-2xl font-black text-white font-mono">{m.value}</div>
                <div className="text-xs text-gold-400 font-medium flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-gold-500" /> {m.change}
                </div>
                <p className="text-[11px] text-graphite-400 pt-2 border-t border-solian-border/50">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="p-6 md:p-8 rounded-2xl bg-solian-card border border-solian-border space-y-5 shadow-card-elevation">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-gold-500" /> Institutional AI Query Density by Department
            </h3>
            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 mb-1.5">
                  <span className="font-semibold">Technology & AI Systems (TECH)</span>
                  <span className="font-mono text-gold-400 font-bold">35% (Architecture & AI Systems)</span>
                </div>
                <div className="w-full bg-solian-surface h-2.5 rounded-full overflow-hidden border border-solian-border">
                  <div className="bg-gold-500 h-full rounded-full" style={{ width: '35%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1.5">
                  <span className="font-semibold">Operations & Delivery (OPS)</span>
                  <span className="font-mono text-gold-400 font-bold">30% (Cadences & Delivery Protocols)</span>
                </div>
                <div className="w-full bg-solian-surface h-2.5 rounded-full overflow-hidden border border-solian-border">
                  <div className="bg-gold-500 h-full rounded-full" style={{ width: '30%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1.5">
                  <span className="font-semibold">Finance & Corporate Treasury (FIN)</span>
                  <span className="font-mono text-gold-400 font-bold">15% (Treasury & Cash Flow)</span>
                </div>
                <div className="w-full bg-solian-surface h-2.5 rounded-full overflow-hidden border border-solian-border">
                  <div className="bg-gold-500 h-full rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1.5">
                  <span className="font-semibold">Executive Leadership & Governance (EXEC)</span>
                  <span className="font-mono text-gold-400 font-bold">12% (Strategic Synthesis & Directives)</span>
                </div>
                <div className="w-full bg-solian-surface h-2.5 rounded-full overflow-hidden border border-solian-border">
                  <div className="bg-gold-500 h-full rounded-full" style={{ width: '12%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1.5">
                  <span className="font-semibold">Administration & Corporate Services (ADMIN)</span>
                  <span className="font-mono text-gold-400 font-bold">8% (Compliance & Facilities)</span>
                </div>
                <div className="w-full bg-solian-surface h-2.5 rounded-full overflow-hidden border border-solian-border">
                  <div className="bg-gold-500 h-full rounded-full" style={{ width: '8%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
