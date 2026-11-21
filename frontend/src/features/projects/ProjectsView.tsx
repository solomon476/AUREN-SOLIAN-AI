import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Calendar, User, Clock, CheckCircle2 } from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { Project } from '../../types';

export const ProjectsView: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    SolianApiClient.getProjects().then(setProjects);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-5 h-5 text-gold-500" />
            <h2 className="text-xl font-bold text-white">Enterprise Initiatives & Projects</h2>
          </div>
          <p className="text-xs text-graphite-300">
            Track multi-stakeholder company roadmaps, milestone health, and operational velocity.
          </p>
        </div>

        <button className="px-4 py-2 rounded-lg bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gold-400 transition">
          <Plus className="w-4 h-4" /> New Initiative
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((p) => (
          <div
            key={p.id}
            className="p-6 rounded-xl bg-solian-card border border-solian-border hover:border-gold-500/40 transition space-y-4 shadow-card-elevation"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-gold-400">
                  {p.client ? `Client: ${p.client}` : 'Internal'}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{p.name}</h3>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                p.priority === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                p.priority === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-solian-border text-slate-300'
              }`}>
                {p.priority}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-graphite-400">Progress</span>
                <span className="font-mono font-bold text-gold-400">{p.progress}%</span>
              </div>
              <div className="w-full bg-solian-surface h-2 rounded-full overflow-hidden border border-solian-border">
                <div className="bg-gold-500 h-full rounded-full" style={{ width: `${p.progress}%` }}></div>
              </div>
            </div>

            <div className="pt-3 border-t border-solian-border flex items-center justify-between text-xs text-graphite-400">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-300">{p.lead}</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{p.dueDate}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
