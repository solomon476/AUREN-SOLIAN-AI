import React, { useState, useEffect } from 'react';
import { GitFork, Plus, Play, Pause, Zap, X, AlertCircle, Lock } from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { WorkflowRule } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const WorkflowsView: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [trigger, setTrigger] = useState('');
  const [action, setAction] = useState('');
  const [department, setDepartment] = useState(user.department);
  const [status, setStatus] = useState<'active' | 'paused'>('active');

  const loadWorkflows = async () => {
    if (!hasRole('manager')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setApiError(null);
    try {
      const data = await SolianApiClient.getWorkflows();
      setWorkflows(data);
    } catch (err: any) {
      setApiError(err.message || 'Failed to connect to workflow automation service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, [user.role, user.userId]);

  const handleToggleStatus = (id: string) => {
    setWorkflows((prev) =>
      prev.map((wf) =>
        wf.id === id ? { ...wf, status: wf.status === 'active' ? 'paused' : 'active' } : wf
      )
    );
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !trigger.trim() || !action.trim()) {
      setErrorMsg('Please specify workflow title, trigger event, and automated action.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await SolianApiClient.createWorkflow({
        title: title.trim(),
        trigger: trigger.trim(),
        action: action.trim(),
        department: department.trim() || user.department,
        status,
      });
      setIsModalOpen(false);
      setTitle('');
      setTrigger('');
      setAction('');
      await loadWorkflows();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create workflow pipeline.');
    } finally {
      setSubmitting(false);
    }
  };

  // Genuine Permission-Denied State: Manager clearance required
  if (!hasRole('manager')) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GitFork className="w-5 h-5 text-gold-500" />
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Automated Workflows & Decision Triggers
              </h2>
            </div>
            <p className="text-xs md:text-sm text-graphite-300">
              Autonomous decision pipelines, incident escalation routines, and recurring executive briefings for Solian Wolves.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-graphite-400">Clearance:</span>
            <span className="text-xs font-mono font-bold uppercase text-gold-400 bg-solian-surface px-2.5 py-1 rounded border border-gold-500/30">
              {user.role} Tier
            </span>
          </div>
        </div>

        <div className="p-12 text-center bg-solian-card rounded-2xl border border-amber-500/30 space-y-3 mt-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <div className="text-base font-bold text-white">Access Restricted: Manager Clearance Required</div>
          <p className="text-xs text-graphite-300 max-w-md mx-auto leading-relaxed">
            Viewing and managing automated decision triggers requires <span className="font-bold text-gold-400">Manager</span> clearance or above. Your active session is authenticated as <span className="font-bold text-slate-200">{user.role.toUpperCase()}</span>.
          </p>
          <div className="pt-2">
            <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded bg-solian-surface border border-solian-border text-graphite-400">
              Current Role: {user.role.toUpperCase()} • Minimum Required: MANAGER
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitFork className="w-5 h-5 text-gold-500" />
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Automated Workflows & Decision Triggers
            </h2>
          </div>
          <p className="text-xs md:text-sm text-graphite-300">
            Autonomous decision pipelines, incident escalation routines, and recurring executive briefings for Solian Wolves.
          </p>
        </div>

        {hasRole('manager') && (
          <button
            onClick={() => {
              setErrorMsg('');
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gold-400 transition cursor-pointer shadow-glow-gold shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> New Automation Pipeline
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-graphite-400 text-xs flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading automation rules...</span>
        </div>
      ) : apiError ? (
        <div className="p-10 text-center bg-solian-card rounded-2xl border border-red-500/30 space-y-3">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <div className="text-sm font-bold text-white">Workflow Engine Connection Error</div>
          <p className="text-xs text-graphite-300 max-w-md mx-auto">{apiError}</p>
          <button
            onClick={loadWorkflows}
            className="px-4 py-2 rounded-xl bg-solian-surface text-slate-200 hover:text-white border border-solian-border text-xs font-semibold hover:border-gold-500/40 transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      ) : workflows.length === 0 ? (
        <div className="p-12 text-center bg-solian-card rounded-2xl border border-solian-border space-y-3">
          <GitFork className="w-8 h-8 text-graphite-500 mx-auto" />
          <div className="text-sm font-bold text-white">No Automation Pipelines Configured</div>
          <p className="text-xs text-graphite-400 max-w-md mx-auto">
            No autonomous decision pipelines, escalation protocols, or scheduled workflows are currently active for Solian Wolves.
          </p>
          <button
            onClick={() => {
              setErrorMsg('');
              setIsModalOpen(true);
            }}
            className="mt-2 px-4 py-2 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 hover:bg-gold-400 transition cursor-pointer shadow-glow-gold"
          >
            <Plus className="w-4 h-4" /> Create First Pipeline
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="p-5 md:p-6 rounded-2xl bg-solian-card border border-solian-border hover:border-gold-500/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-card-elevation"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      wf.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  ></span>
                  <h3 className="text-sm md:text-base font-bold text-white">{wf.title}</h3>
                  {wf.isDemo && (
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                      [DEMO]
                    </span>
                  )}
                </div>
                <div className="text-xs text-graphite-300">
                  <span className="text-gold-400 font-semibold">Trigger:</span> {wf.trigger}
                </div>
                <div className="text-xs text-graphite-300">
                  <span className="text-gold-400 font-semibold">Action:</span> {wf.action}
                </div>
                {wf.department && (
                  <div className="text-[10px] text-graphite-500">Division: {wf.department}</div>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <span className="text-xs font-mono text-graphite-400 bg-solian-surface px-2.5 py-1 rounded-lg border border-solian-border">
                  {wf.executionCount} executions
                </span>
                <button
                  onClick={() => handleToggleStatus(wf.id)}
                  title={wf.status === 'active' ? 'Pause Pipeline' : 'Resume Pipeline'}
                  className="p-2.5 rounded-xl bg-solian-surface border border-solian-border text-slate-300 hover:text-white hover:border-gold-500/40 transition cursor-pointer"
                >
                  {wf.status === 'active' ? (
                    <Pause className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Play className="w-4 h-4 text-emerald-400" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Pipeline Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-solian-card border border-gold-500/40 max-w-lg w-full rounded-2xl p-6 md:p-8 space-y-5 shadow-2xl animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-solian-border pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-gold-500" />
                <h3 className="text-base font-bold text-white">Configure Automation Pipeline</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-graphite-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateWorkflow} className="space-y-4 text-xs">
              <div>
                <label className="block text-graphite-300 font-semibold mb-1">Pipeline Name</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Critical Task Escalation Relay"
                  className="w-full bg-solian-surface border border-solian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div>
                <label className="block text-graphite-300 font-semibold mb-1">Trigger Event</label>
                <input
                  type="text"
                  required
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  placeholder="e.g. High-severity task unresolved for > 24 hours"
                  className="w-full bg-solian-surface border border-solian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div>
                <label className="block text-graphite-300 font-semibold mb-1">Automated Action</label>
                <input
                  type="text"
                  required
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="e.g. Escalate to Department Lead and generate Executive Briefing"
                  className="w-full bg-solian-surface border border-solian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-graphite-300 font-semibold mb-1">Division</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder={user.department}
                    className="w-full bg-solian-surface border border-solian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500/50"
                  />
                </div>
                <div>
                  <label className="block text-graphite-300 font-semibold mb-1">Initial Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-solian-surface border border-solian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500/50"
                  >
                    <option value="active">Active & Running</option>
                    <option value="paused">Paused / In Review</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-solian-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-solian-surface text-slate-300 hover:text-white hover:bg-solian-border transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gold-500 text-solian-darkest font-bold hover:bg-gold-400 transition cursor-pointer shadow-glow-gold disabled:opacity-50"
                >
                  {submitting ? 'Deploying...' : 'Deploy Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
