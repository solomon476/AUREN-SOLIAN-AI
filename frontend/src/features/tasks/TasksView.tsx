import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronRight,
  ArrowRight,
  User,
  Filter,
  Search,
  Layers,
  ListTodo,
} from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { TaskItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../../components/common/UserAvatar';

export const TasksView: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [mobileStatusTab, setMobileStatusTab] = useState<TaskItem['status'] | 'all'>('all');

  // New task form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState(user.fullName);
  const [dueDate, setDueDate] = useState('Next Sprint');
  const [submitting, setSubmitting] = useState(false);

  const columns: { id: TaskItem['status']; label: string; next: TaskItem['status'] | null; nextLabel: string | null }[] = [
    { id: 'backlog', label: 'Operations Backlog', next: 'in_progress', nextLabel: 'Start Execution' },
    { id: 'in_progress', label: 'In Execution', next: 'review', nextLabel: 'Submit for Review' },
    { id: 'review', label: 'Executive Review', next: 'completed', nextLabel: 'Sign Off ✓' },
    { id: 'completed', label: 'Completed', next: null, nextLabel: null },
  ];

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await SolianApiClient.getTasks();
      setTasks(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleAdvanceStatus = async (taskId: string, nextStatus: TaskItem['status'], e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await SolianApiClient.updateTask(taskId, { status: nextStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
      );
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch (err: any) {
      alert(`Update failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await SolianApiClient.createTask({
        title,
        description,
        priority,
        assignee,
        due_date: dueDate,
        status: 'backlog',
        department: user.department,
      });
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      await loadTasks();
    } catch (err: any) {
      alert(`Creation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-5 h-5 text-gold-500" />
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Tasks & Operations Kanban
            </h2>
          </div>
          <p className="text-xs md:text-sm text-graphite-300">
            Sprint items, tactical operational requests, and autonomous AI task delegation across company teams.
          </p>
        </div>

        {hasRole('member') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-gold-400 transition cursor-pointer shadow-glow-gold shrink-0 min-h-[44px] self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Create Operation
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-solian-card p-2.5 sm:p-3 rounded-2xl border border-solian-border">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-graphite-400 absolute left-3 top-3 sm:top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter operations by title, assignee..."
            className="w-full bg-solian-surface border border-solian-border rounded-xl pl-9 pr-3 py-2 sm:py-1.5 text-xs text-white placeholder-graphite-400 focus:outline-none focus:border-gold-500/50 min-h-[40px] sm:min-h-0"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-graphite-400 shrink-0" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full sm:w-auto bg-solian-surface border border-solian-border rounded-xl px-2.5 py-2 sm:py-1.5 text-xs text-slate-300 focus:outline-none focus:border-gold-500/50 cursor-pointer min-h-[40px] sm:min-h-0"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Mobile Column Switcher (Prevents 2000px vertical scrolling on mobile phones) */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setMobileStatusTab('all')}
          className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition min-h-[40px] cursor-pointer ${
            mobileStatusTab === 'all'
              ? 'bg-gold-500 text-solian-darkest font-extrabold shadow-sm'
              : 'bg-solian-card text-slate-400 border border-solian-border'
          }`}
        >
          All Stages ({filteredTasks.length})
        </button>
        {columns.map((col) => {
          const count = filteredTasks.filter((t) => t.status === col.id).length;
          return (
            <button
              key={col.id}
              onClick={() => setMobileStatusTab(col.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition min-h-[40px] cursor-pointer flex items-center gap-1.5 ${
                mobileStatusTab === col.id
                  ? 'bg-gold-500 text-solian-darkest font-extrabold shadow-sm'
                  : 'bg-solian-card text-slate-400 border border-solian-border'
              }`}
            >
              <span>{col.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                mobileStatusTab === col.id ? 'bg-black/20 text-black' : 'bg-solian-surface text-gold-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Grid */}
      {loading ? (
        <div className="p-12 text-center text-graphite-400 text-xs flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Retrieving operational backlog...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((col) => {
            const isColumnVisibleOnMobile = mobileStatusTab === 'all' || mobileStatusTab === col.id;
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className={`${isColumnVisibleOnMobile ? 'flex' : 'hidden md:flex'} p-4 rounded-2xl bg-solian-card border border-solian-border space-y-3 flex-col min-h-[360px] md:min-h-[500px] shadow-card-elevation`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-solian-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {col.label}
                  </span>
                  <span className="text-xs font-mono font-bold text-gold-400 px-2 py-0.5 rounded bg-solian-surface border border-solian-border">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="p-6 text-center text-[11px] text-graphite-500 italic">
                      No operations in this stage.
                    </div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className="p-3.5 sm:p-4 rounded-xl bg-solian-surface border border-solian-border hover:border-gold-500/40 transition space-y-2.5 shadow-card-elevation cursor-pointer group min-h-[48px]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                            <span className="text-xs font-bold text-white leading-snug group-hover:text-gold-300 transition">
                              {t.title}
                            </span>
                            {t.isDemo && (
                              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                                [DEMO]
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                              t.priority === 'urgent'
                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                : t.priority === 'high'
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-solian-border text-slate-300 border-solian-border'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </div>

                        {t.description && (
                          <p className="text-[11px] text-graphite-400 line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                        )}

                        <div className="pt-2 border-t border-solian-border/50 flex items-center justify-between text-[10px] text-graphite-400">
                          <span className="truncate max-w-[140px] flex items-center gap-1.5">
                            <UserAvatar name={t.assignee} size="xs" />
                            <span className="text-slate-300 truncate">{t.assignee}</span>
                          </span>
                          <span className="font-mono text-gold-400/90 shrink-0">{t.dueDate}</span>
                        </div>

                        {col.next && hasRole('member') && (
                          <button
                            onClick={(e) => handleAdvanceStatus(t.id, col.next!, e)}
                            className="w-full mt-2 py-2 px-3 rounded-lg bg-solian-card hover:bg-gold-500 hover:text-solian-darkest text-slate-200 text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 border border-solian-border cursor-pointer min-h-[44px]"
                          >
                            <span>{col.nextLabel}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Detail Modal (Responsive Dialog / Sheet) */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-solian-card border-t sm:border border-gold-500/40 max-w-lg w-full rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 md:p-8 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-solian-border pb-3">
              <div>
                <span
                  className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border inline-block mb-1.5 ${
                    selectedTask.priority === 'urgent'
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : selectedTask.priority === 'high'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-solian-border text-slate-300 border-solian-border'
                  }`}
                >
                  {selectedTask.priority} Priority
                </span>
                <h3 className="text-base font-bold text-white">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-graphite-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
                aria-label="Close task details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-solian-surface border border-solian-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-graphite-400 block mb-1">
                  Description & Operational Specifications
                </span>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedTask.description || 'No detailed specifications recorded for this task.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-solian-surface border border-solian-border">
                  <div className="text-[10px] text-graphite-400 uppercase font-semibold">Assignee</div>
                  <div className="font-bold text-white mt-1">{selectedTask.assignee}</div>
                </div>
                <div className="p-3 rounded-xl bg-solian-surface border border-solian-border">
                  <div className="text-[10px] text-graphite-400 uppercase font-semibold">Target Due Date</div>
                  <div className="font-bold text-gold-400 mt-1 font-mono">{selectedTask.dueDate}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-solian-surface border border-solian-border space-y-2">
                <div className="text-[10px] text-graphite-400 uppercase font-semibold">Stage & Progression</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {columns.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => handleAdvanceStatus(selectedTask.id, col.id)}
                      className={`text-[10px] font-bold uppercase px-2 py-2.5 rounded-lg border transition cursor-pointer min-h-[44px] text-center ${
                        selectedTask.status === col.id
                          ? 'bg-gold-500 text-solian-darkest border-gold-500 font-extrabold'
                          : 'bg-solian-card text-slate-400 border-solian-border hover:border-gold-500/40'
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-solian-border">
              <button
                onClick={() => setSelectedTask(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-solian-surface hover:bg-solian-border text-slate-300 text-xs font-semibold transition cursor-pointer min-h-[44px]"
              >
                Close Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Operation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <form
            onSubmit={handleCreateTask}
            className="bg-solian-card border-t sm:border border-gold-500/40 max-w-lg w-full rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 md:p-8 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-solian-border pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-gold-500" />
                <h3 className="text-base font-bold text-white">Create Operational Task</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-graphite-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
                aria-label="Cancel task creation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Audit Multi-Tenant RBAC Security Matrix"
                  className="w-full bg-solian-surface border border-solian-border rounded-xl p-3 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Operational requirements, deliverable expectations, or checklist..."
                  className="w-full bg-solian-surface border border-solian-border rounded-xl p-3 text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-solian-surface border border-solian-border rounded-xl p-3 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px] cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Target Due Date</label>
                  <input
                    type="text"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    placeholder="e.g., 2026-11-28 or Next Sprint"
                    className="w-full bg-solian-surface border border-solian-border rounded-xl p-3 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Assignee</label>
                <input
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full bg-solian-surface border border-solian-border rounded-xl p-3 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-solian-border">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-solian-surface hover:bg-solian-border text-slate-300 text-xs font-semibold transition cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase hover:bg-gold-400 transition shadow-glow-gold cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {submitting ? 'Registering...' : 'Create Operation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
