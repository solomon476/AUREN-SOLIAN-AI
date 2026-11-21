import React from 'react';
import { BarChart3, TrendingUp, Zap, Cpu, Activity, Clock } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const metrics = [
    { title: 'Operations Velocity', value: '94.2%', change: '+3.8% MoM', desc: 'On-time milestone delivery rate' },
    { title: 'AI Assistant Query Volume', value: '1,420', change: '+24% this week', desc: 'Queries synthesized across company memory' },
    { title: 'SOP Retrieval Efficiency', value: '180ms', change: 'Sub-second response', desc: 'Average semantic index search latency' },
    { title: 'Staff Alignment Index', value: '98.5%', change: 'All teams active', desc: 'Departmental ticket resolution consistency' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-gold-500" />
          <h2 className="text-xl font-bold text-white">Operations & Intelligence Analytics</h2>
        </div>
        <p className="text-xs text-graphite-300">
          Executive performance indicators, AI query density, and organizational throughput.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.title} className="p-5 rounded-xl bg-solian-card border border-solian-border space-y-2 shadow-card-elevation">
            <span className="text-xs font-semibold text-graphite-400 uppercase tracking-wider">{m.title}</span>
            <div className="text-2xl font-black text-white">{m.value}</div>
            <div className="text-xs text-gold-400 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-gold-500" /> {m.change}
            </div>
            <p className="text-[11px] text-graphite-400 pt-1 border-t border-solian-border/50">{m.desc}</p>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-xl bg-solian-card border border-solian-border space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Institutional AI Utilization Breakdown</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Standard Operating Procedure (SOP) Inquiries</span>
              <span className="font-mono text-gold-400 font-bold">42%</span>
            </div>
            <div className="w-full bg-solian-surface h-2 rounded-full overflow-hidden border border-solian-border">
              <div className="bg-gold-500 h-full rounded-full" style={{ width: '42%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Executive Briefing & Task Proposals</span>
              <span className="font-mono text-gold-400 font-bold">31%</span>
            </div>
            <div className="w-full bg-solian-surface h-2 rounded-full overflow-hidden border border-solian-border">
              <div className="bg-gold-500 h-full rounded-full" style={{ width: '31%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Client Account & Contract Verification</span>
              <span className="font-mono text-gold-400 font-bold">27%</span>
            </div>
            <div className="w-full bg-solian-surface h-2 rounded-full overflow-hidden border border-solian-border">
              <div className="bg-gold-500 h-full rounded-full" style={{ width: '27%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
