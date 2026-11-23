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
      value: metrics?.operationsVelocity || '+18.4%',
      change: 'On-schedule delivery rate',
      desc: 'Milestone tracking across active initiatives',
    },
    {
      title: 'Active Initiatives',
      value: metrics?.activeProjectsCount ?? 4,
      change: '100% SLA adherence',
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
      value: metrics?.departmentalAlignment || '98.5%',
      change: 'All 5 divisions synchronized',
      desc: 'Cross-functional ticket resolution',
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
                  <span className="font-semibold">Engineering & AI Operations</span>
                  <span className="font-mono text-gold-400 font-bold">42% (SOP-401 & System Mesh)</span>
                </div>
                <div className="w-full bg-solian-surface h-2.5 rounded-full overflow-hidden border border-solian-border">
                  <div className="bg-gold-500 h-full rounded-full" style={{ width: '42%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1.5">
                  <span className="font-semibold">Strategic Advisory & Client Accounts</span>
                  <span className="font-mono text-gold-400 font-bold">29% (PB-105 & Contract SLAs)</span>
                </div>
                <div className="w-full bg-solian-surface h-2.5 rounded-full overflow-hidden border border-solian-border">
                  <div className="bg-gold-500 h-full rounded-full" style={{ width: '29%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1.5">
                  <span className="font-semibold">Product Architecture & Governance</span>
                  <span className="font-mono text-gold-400 font-bold">18% (POL-202 & RBAC Matrices)</span>
                </div>
                <div className="w-full bg-solian-surface h-2.5 rounded-full overflow-hidden border border-solian-border">
                  <div className="bg-gold-500 h-full rounded-full" style={{ width: '18%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1.5">
                  <span className="font-semibold">Executive Leadership</span>
                  <span className="font-mono text-gold-400 font-bold">11% (Strategic Synthesis & Directives)</span>
                </div>
                <div className="w-full bg-solian-surface h-2.5 rounded-full overflow-hidden border border-solian-border">
                  <div className="bg-gold-500 h-full rounded-full" style={{ width: '11%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
