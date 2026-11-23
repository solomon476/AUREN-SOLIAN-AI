import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  X,
  ExternalLink,
  Layers,
  ArrowRight,
  TrendingUp,
  Building2,
} from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { Project, TaskItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { UserAvatar } from '../../components/common/UserAvatar';

export const ProjectsView: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { setActiveModule } = useOrganization();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // New Project Form
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [lead, setLead] = useState(user.fullName);
  const [dueDate, setDueDate] = useState('2026-12-31');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projData, taskData] = await Promise.all([
        SolianApiClient.getProjects(),
        SolianApiClient.getTasks(),
      ]);
      setProjects(projData);
      setTasks(taskData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await SolianApiClient.createProject({
        name,
        client: client || undefined,
        lead,
        due_date: dueDate,
        priority,
        status: 'planning',
        progress: 0,
        department: user.department,
        description,
      });
      setIsModalOpen(false);
      setName('');
      setClient('');
      setDescription('');
      await loadData();
    } catch (err: any) {
      alert(`Creation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProgress = async (projectId: string, newProgress: number) => {
    const newStatus: Project['status'] = newProgress >= 100 ? 'delivered' : newProgress > 0 ? 'in_progress' : 'planning';
    try {
      await SolianApiClient.updateProject(projectId, {
        progress: newProgress,
        status: newStatus,
      });
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                progress: newProgress,
                status: newStatus,
              }
            : p
        )
      );
      if (selectedProject?.id === projectId) {
        setSelectedProject((prev) =>
          prev
            ? {
                ...prev,
                progress: newProgress,
                status: newStatus,
              }
            : null
        );
      }
    } catch (err: any) {
      alert(`Update failed: ${err.message || 'Unknown error'}`);
    }
  };

  const getAssociatedTasks = (proj: Project) => {
    return tasks.filter(
      (t) =>
        t.projectId === proj.id ||
        (t.department && proj.department && t.department.toLowerCase() === proj.department.toLowerCase())
    );
  };

  return (
    <div className="p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-5 h-5 text-gold-500" />
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Enterprise Initiatives & Strategic Projects
            </h2>
          </div>
          <p className="text-xs md:text-sm text-graphite-300">
            Multi-stakeholder organizational roadmaps, milestone velocity, and client deliverable oversight.
          </p>
        </div>

        {hasRole('manager') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gold-400 transition cursor-pointer shadow-glow-gold shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> New Initiative
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-graphite-400 text-xs flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading strategic initiatives...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center bg-solian-card rounded-2xl border border-solian-border space-y-2">
          <Briefcase className="w-8 h-8 text-graphite-500 mx-auto" />
          <div className="text-sm font-bold text-white">No Initiatives Registered</div>
          <p className="text-xs text-graphite-400 max-w-md mx-auto">
            Click 'New Initiative' above to register a company initiative and track delivery milestones.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => {
            const linkedTasks = getAssociatedTasks(p);
            return (
              <div
                key={p.id}
                onClick={() => setSelectedProject(p)}
                className="p-6 rounded-2xl bg-solian-card border border-solian-border hover:border-gold-500/40 transition space-y-4 shadow-card-elevation cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase text-gold-400 font-bold bg-solian-surface px-2 py-0.5 rounded border border-solian-border">
                        {p.client ? `Client: ${p.client}` : 'Internal Strategic'}
                      </span>
                      {p.isDemo && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                          [DEMO]
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mt-1.5 group-hover:text-gold-300 transition">
                      {p.name}
                    </h3>
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border shrink-0 ${
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

                {p.description && (
                  <p className="text-xs text-graphite-300 leading-relaxed line-clamp-2">
                    {p.description}
                  </p>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-graphite-400">Milestone Velocity</span>
                    <span className="font-mono font-bold text-gold-400">{p.progress}%</span>
                  </div>
                  <div className="w-full bg-solian-surface h-2 rounded-full overflow-hidden border border-solian-border">
                    <div
                      className="bg-gold-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${p.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-3 border-t border-solian-border flex items-center justify-between text-xs text-graphite-400">
                  <div className="flex items-center gap-1.5">
                    <UserAvatar name={p.lead} size="xs" />
                    <span className="text-slate-200 font-semibold">{p.lead}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-graphite-400">
                      {linkedTasks.length} Ops Linked
                    </span>
                    <div className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Target: {p.dueDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Detail Modal / Drawer */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-solian-card border-t sm:border border-gold-500/40 max-w-2xl w-full rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 md:p-8 space-y-4 sm:space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-solian-border pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-mono uppercase text-gold-400 font-bold bg-solian-surface px-2 py-0.5 rounded border border-solian-border">
                    {selectedProject.client ? `Client: ${selectedProject.client}` : 'Internal Strategic Initiative'}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Status: {selectedProject.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{selectedProject.name}</h3>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-graphite-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope / Description */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-graphite-400">
                Scope & Deliverables
              </span>
              <p className="text-xs text-slate-300 leading-relaxed bg-solian-surface p-3.5 rounded-xl border border-solian-border">
                {selectedProject.description || 'No detailed scope recorded for this initiative.'}
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-solian-surface border border-solian-border">
                <div className="text-[10px] text-graphite-400 uppercase font-semibold">Lead Architect</div>
                <div className="font-bold text-white mt-1">{selectedProject.lead}</div>
              </div>
              <div className="p-3 rounded-xl bg-solian-surface border border-solian-border">
                <div className="text-[10px] text-graphite-400 uppercase font-semibold">Department</div>
                <div className="font-bold text-gold-400 mt-1">{selectedProject.department}</div>
              </div>
              <div className="p-3 rounded-xl bg-solian-surface border border-solian-border">
                <div className="text-[10px] text-graphite-400 uppercase font-semibold">Priority Tier</div>
                <div className="font-bold text-amber-400 mt-1 uppercase">{selectedProject.priority}</div>
              </div>
              <div className="p-3 rounded-xl bg-solian-surface border border-solian-border">
                <div className="text-[10px] text-graphite-400 uppercase font-semibold">Target Delivery</div>
                <div className="font-bold text-white mt-1 font-mono">{selectedProject.dueDate}</div>
              </div>
            </div>

            {/* Milestone Velocity Controls */}
            <div className="space-y-2 p-4 rounded-xl bg-solian-surface border border-solian-border">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white uppercase tracking-wider">Milestone Velocity</span>
                <span className="font-mono font-bold text-gold-400">{selectedProject.progress}%</span>
              </div>
              <div className="w-full bg-solian-darkest h-2.5 rounded-full overflow-hidden border border-solian-border">
                <div
                  className="bg-gold-500 h-full rounded-full transition-all"
                  style={{ width: `${selectedProject.progress}%` }}
                ></div>
              </div>

              {hasRole('manager') && (
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-[11px] text-graphite-400">Quick Update:</span>
                  {[25, 50, 75, 100].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleUpdateProgress(selectedProject.id, val)}
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border cursor-pointer transition ${
                        selectedProject.progress === val
                          ? 'bg-gold-500 text-solian-darkest border-gold-500'
                          : 'bg-solian-card text-slate-300 border-solian-border hover:border-gold-500/40'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Associated Operations / Tasks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-200">
                  Associated Operations & Workstreams ({getAssociatedTasks(selectedProject).length})
                </span>
                <button
                  onClick={() => {
                    setSelectedProject(null);
                    setActiveModule('tasks');
                  }}
                  className="text-gold-400 hover:text-gold-300 text-[11px] flex items-center gap-1"
                >
                  Go to Kanban <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                {getAssociatedTasks(selectedProject).length === 0 ? (
                  <div className="text-center py-4 text-xs text-graphite-400 bg-solian-surface rounded-xl border border-solian-border">
                    No tasks currently linked to this initiative.
                  </div>
                ) : (
                  getAssociatedTasks(selectedProject).map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-lg bg-solian-surface border border-solian-border flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{t.title}</div>
                        <div className="text-[10px] text-graphite-400">
                          Assignee: {t.assignee} • Due: {t.dueDate}
                        </div>
                      </div>
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-solian-card text-gold-400 border border-solian-border font-mono">
                        {t.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-solian-border">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-5 py-2 rounded-xl bg-solian-surface hover:bg-solian-border text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Close Oversight
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <form
            onSubmit={handleCreateProject}
            className="bg-solian-card border-t sm:border border-gold-500/40 max-w-lg w-full rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 md:p-8 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-solian-border pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gold-500" />
                <h3 className="text-base font-bold text-white">Register Strategic Initiative</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-graphite-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Initiative Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Solian Wolves Mesh v2.5 Architecture Rollout"
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Client / Stakeholder</label>
                  <input
                    type="text"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    placeholder="e.g., Meridian Logistics or Internal"
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                  />
                </div>

                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Lead Architect / Lead</label>
                  <input
                    type="text"
                    value={lead}
                    onChange={(e) => setLead(e.target.value)}
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                  />
                </div>

                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Target Delivery Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Description / Scope</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key milestones, operational requirements, and expected impact..."
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-solian-border">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-solian-surface hover:bg-solian-border text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase hover:bg-gold-400 transition shadow-glow-gold cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Registering...' : 'Register Initiative'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
