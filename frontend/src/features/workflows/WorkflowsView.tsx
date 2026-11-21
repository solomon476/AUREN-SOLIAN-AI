import React, { useState, useEffect } from 'react';
import { GitFork, Plus, Play, Pause, Zap } from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { WorkflowRule } from '../../types';

export const WorkflowsView: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);

  useEffect(() => {
    SolianApiClient.getWorkflows().then(setWorkflows);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitFork className="w-5 h-5 text-gold-500" />
            <h2 className="text-xl font-bold text-white">Automated Workflows & Decision Triggers</h2>
          </div>
          <p className="text-xs text-graphite-300">
            Autonomous decision pipelines, incident escalation routines, and recurring executive briefings.
          </p>
        </div>

        <button className="px-4 py-2 rounded-lg bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gold-400 transition">
          <Plus className="w-4 h-4" /> New Automation Pipeline
        </button>
      </div>

      <div className="space-y-4">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className="p-5 rounded-xl bg-solian-card border border-solian-border hover:border-gold-500/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-card-elevation"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <h3 className="text-sm font-bold text-white">{wf.title}</h3>
              </div>
              <div className="text-xs text-graphite-400">
                <span className="text-gold-400 font-semibold">Trigger:</span> {wf.trigger}
              </div>
              <div className="text-xs text-graphite-400">
                <span className="text-gold-400 font-semibold">Action:</span> {wf.action}
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <span className="text-xs font-mono text-graphite-400 bg-solian-surface px-2.5 py-1 rounded border border-solian-border">
                {wf.executionCount} executions
              </span>
              <button className="p-2 rounded-lg bg-solian-surface border border-solian-border text-slate-300 hover:text-white">
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
