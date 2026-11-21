import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { TaskItem } from '../../types';

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    SolianApiClient.getTasks().then(setTasks);
  }, []);

  const columns = [
    { id: 'backlog', label: 'Operations Backlog' },
    { id: 'in_progress', label: 'In Execution' },
    { id: 'review', label: 'Executive Review' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-5 h-5 text-gold-500" />
            <h2 className="text-xl font-bold text-white">Tasks & Operations Kanban</h2>
          </div>
          <p className="text-xs text-graphite-300">
            Sprint items, tactical requests, and autonomous AI task delegation.
          </p>
        </div>

        <button className="px-4 py-2 rounded-lg bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gold-400 transition">
          <Plus className="w-4 h-4" /> Create Operation
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className="p-4 rounded-xl bg-solian-card border border-solian-border space-y-3 flex flex-col min-h-[500px]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-solian-border">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {col.label}
                </span>
                <span className="text-xs font-mono font-bold text-gold-400 px-1.5 py-0.5 rounded bg-solian-surface">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-lg bg-solian-surface border border-solian-border hover:border-gold-500/30 transition space-y-2 shadow-card-elevation"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-white leading-snug">{t.title}</span>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-gold-500/20 text-gold-400 shrink-0">
                        {t.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-graphite-400 line-clamp-2">{t.description}</p>
                    <div className="pt-2 border-t border-solian-border/50 flex items-center justify-between text-[10px] text-graphite-400">
                      <span>{t.assignee}</span>
                      <span className="font-mono text-gold-400/90">{t.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

