import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Plus,
  Calendar,
  Clock,
  Users,
  Video,
  MapPin,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  X,
  FileCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { Meeting, MeetingActionItem, MeetingDecision } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../../components/common/UserAvatar';

export const MeetingsView: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [mobileMode, setMobileMode] = useState<'list' | 'detail'>('list');

  // New Meeting Form
  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState('department');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [location, setLocation] = useState('Executive Boardroom');
  const [virtualLink, setVirtualLink] = useState('https://meet.solian.ai/sync');
  const [agendaInput, setAgendaInput] = useState('');
  const [attendeesInput, setAttendeesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const data = await SolianApiClient.getMeetings();
      setMeetings(data);
      if (data.length > 0 && !selectedMeeting) {
        setSelectedMeeting(data[0]);
      } else if (selectedMeeting) {
        const refreshed = data.find((m) => m.id === selectedMeeting.id);
        if (refreshed) setSelectedMeeting(refreshed);
      }
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const agenda = agendaInput
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const attendees = attendeesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await SolianApiClient.createMeeting({
        title,
        meeting_type: meetingType,
        date,
        time,
        duration_minutes: durationMinutes,
        location: location || undefined,
        virtual_link: virtualLink || undefined,
        agenda: agenda.length > 0 ? agenda : ['Strategic Alignment', 'Operational Review'],
        attendees: attendees.length > 0 ? attendees : [user.fullName],
      });

      setIsModalOpen(false);
      resetForm();
      await loadMeetings();
      setActionNotice(`Meeting "${title}" scheduled successfully.`);
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err) {
      console.error('Failed to create meeting:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setMeetingType('department');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('10:00');
    setDurationMinutes(60);
    setLocation('Executive Boardroom');
    setVirtualLink('https://meet.solian.ai/sync');
    setAgendaInput('');
    setAttendeesInput('');
  };

  const handleConvertToTask = async (meetingId: string, actionItem: MeetingActionItem) => {
    try {
      const res = await SolianApiClient.convertMeetingActionToTask(meetingId, actionItem.id);
      setActionNotice(`Action item converted into Task: "${actionItem.title}" (${res.taskId})`);
      setTimeout(() => setActionNotice(null), 5000);
      await loadMeetings();
    } catch (err) {
      console.error('Failed to convert action item to task:', err);
    }
  };

  const handlePublishDecision = async (meetingId: string, decision: MeetingDecision) => {
    try {
      const res = await SolianApiClient.publishMeetingDecisionToKnowledge(meetingId, decision.id);
      setActionNotice(`Decision ratified into Knowledge Vault: "${res.title}" (${res.knowledgeItemId})`);
      setTimeout(() => setActionNotice(null), 5000);
      await loadMeetings();
    } catch (err) {
      console.error('Failed to publish decision to knowledge:', err);
    }
  };

  const handleStatusChange = async (meetingId: string, newStatus: string) => {
    try {
      await SolianApiClient.updateMeeting(meetingId, { status: newStatus });
      await loadMeetings();
    } catch (err) {
      console.error('Failed to update meeting status:', err);
    }
  };

  const filteredMeetings = meetings.filter((m) => {
    if (activeFilter === 'all') return true;
    return m.meetingType === activeFilter;
  });

  return (
    <div className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Actions Notice */}
      {actionNotice && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-gold-500/15 border border-gold-500/40 text-gold-300 flex items-center justify-between text-xs font-semibold animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-gold-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-400 mb-1">
            <CalendarClock className="w-4 h-4" />
            <span>Governance & Cadences</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Meetings & Minutes
          </h2>
          <p className="text-xs md:text-sm text-graphite-400 mt-0.5">
            Formal company sessions, ratified decisions, and direct action items converted to operations.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-solian-obsidian font-bold text-xs uppercase tracking-wider transition-all shadow-glow-subtle cursor-pointer shrink-0 min-h-[44px] self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Meeting</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-xl bg-solian-card border border-solian-border">
          <div className="text-[10px] sm:text-[11px] font-bold text-graphite-400 uppercase tracking-wider">Total Cadences</div>
          <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">{meetings.length}</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Archived & Active</div>
        </div>
        <div className="p-3.5 sm:p-4 rounded-xl bg-solian-card border border-solian-border">
          <div className="text-[10px] sm:text-[11px] font-bold text-graphite-400 uppercase tracking-wider">Scheduled</div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-400 mt-1">
            {meetings.filter((m) => m.status === 'scheduled').length}
          </div>
          <div className="text-[10px] text-graphite-400 mt-0.5">Upcoming Pipeline</div>
        </div>
        <div className="p-3.5 sm:p-4 rounded-xl bg-solian-card border border-solian-border">
          <div className="text-[10px] sm:text-[11px] font-bold text-graphite-400 uppercase tracking-wider">Decisions Ratified</div>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-400 mt-1">
            {meetings.reduce((acc, m) => acc + (m.decisions?.length || 0), 0)}
          </div>
          <div className="text-[10px] text-purple-300 mt-0.5">Institutional Memory</div>
        </div>
        <div className="p-3.5 sm:p-4 rounded-xl bg-solian-card border border-solian-border">
          <div className="text-[10px] sm:text-[11px] font-bold text-graphite-400 uppercase tracking-wider">Action Items</div>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-400 mt-1">
            {meetings.reduce((acc, m) => acc + (m.actionItems?.length || 0), 0)}
          </div>
          <div className="text-[10px] text-blue-300 mt-0.5">Converted to Tasks</div>
        </div>
      </div>

      {/* Cadence Filters (Horizontal Scroll on Mobile) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin text-xs">
        {[
          { id: 'all', label: 'All Cadences' },
          { id: 'executive', label: 'Executive Board' },
          { id: 'department', label: 'Department' },
          { id: 'client', label: 'Client SLA' },
          { id: 'general', label: 'General Assembly' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveFilter(tab.id);
              setMobileMode('list');
            }}
            className={`px-3 py-2 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer min-h-[40px] ${
              activeFilter === tab.id
                ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-sm'
                : 'bg-solian-surface text-slate-400 hover:text-white border border-solian-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Workspace Grid: Master List (Left) + Detail & Minutes Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column: Meetings List (Hidden on mobile if in 'detail' mode) */}
        <div className={`${mobileMode === 'detail' ? 'hidden lg:block' : 'block'} lg:col-span-5 space-y-3`}>
          {loading ? (
            <div className="p-8 text-center text-graphite-400 bg-solian-card rounded-xl border border-solian-border text-xs">
              Loading sessions and minutes...
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="p-8 text-center text-graphite-400 bg-solian-card rounded-xl border border-solian-border text-xs">
              No meetings found under this filter.
            </div>
          ) : (
            filteredMeetings.map((m) => {
              const isSelected = selectedMeeting?.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedMeeting(m);
                    setMobileMode('detail');
                  }}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer min-h-[52px] ${
                    isSelected
                      ? 'bg-solian-surface border-gold-500/50 shadow-glow-subtle'
                      : 'bg-solian-card border-solian-border hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gold-500/10 text-gold-400 border border-gold-500/20">
                      {m.meetingType}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                        m.status === 'scheduled'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : m.status === 'in_progress'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-2 leading-snug">{m.title}</h3>

                  <div className="flex items-center gap-3 text-xs text-graphite-400 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{m.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{m.time} ({m.durationMinutes}m)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2.5 pt-2 border-t border-solian-border/50">
                    <span className="text-[11px] truncate max-w-[150px] flex items-center gap-1.5">
                      <UserAvatar name={m.organizerName} size="xs" />
                      <span className="truncate">{m.organizerName}</span>
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-graphite-400">
                      <span>{m.decisions?.length || 0} decisions</span>
                      <span>•</span>
                      <span>{m.actionItems?.length || 0} actions</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Detailed Minutes & Action Workbench (Hidden on mobile if in 'list' mode) */}
        <div className={`${mobileMode === 'list' ? 'hidden lg:block' : 'block'} lg:col-span-7`}>
          {selectedMeeting ? (
            <div className="p-4 sm:p-6 rounded-2xl bg-solian-card border border-solian-border space-y-4 sm:space-y-6">
              {/* Mobile Back Button to Return to List */}
              <div className="lg:hidden pb-1 border-b border-solian-border">
                <button
                  onClick={() => setMobileMode('list')}
                  className="flex items-center gap-2 py-2 px-3 rounded-xl bg-solian-surface text-gold-400 font-bold text-xs border border-solian-border hover:bg-solian-border cursor-pointer min-h-[44px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← Back to Cadences List</span>
                </button>
              </div>

              {/* Session Overview Header */}
              <div className="border-b border-solian-border pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded bg-gold-500/15 text-gold-400 border border-gold-500/30">
                    {selectedMeeting.meetingType.toUpperCase()} SESSION
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-graphite-400 uppercase">Status:</label>
                    <select
                      value={selectedMeeting.status}
                      onChange={(e) => handleStatusChange(selectedMeeting.id, e.target.value)}
                      className="bg-solian-surface border border-solian-border text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gold-500/50 min-h-[36px]"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="approved">Approved</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <h3 className="text-base sm:text-xl font-bold text-white mt-2">
                  {selectedMeeting.title}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300 mt-3 bg-solian-surface/80 p-3 rounded-xl border border-solian-border">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gold-400 shrink-0" />
                    <span>{selectedMeeting.date} at {selectedMeeting.time} ({selectedMeeting.durationMinutes} mins)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gold-400 shrink-0" />
                    <span>{selectedMeeting.location || 'Virtual Conference Room'}</span>
                  </div>
                  {selectedMeeting.virtualLink && (
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Video className="w-4 h-4 text-gold-400 shrink-0" />
                      <a
                        href={selectedMeeting.virtualLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gold-400 hover:underline truncate"
                      >
                        {selectedMeeting.virtualLink}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Agenda Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-gold-400" />
                  <span>Agenda & Discussion Items</span>
                </h4>
                <div className="space-y-1.5 pl-1">
                  {selectedMeeting.agenda?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-solian-surface border border-solian-border flex items-center justify-center font-bold text-[10px] text-gold-400 shrink-0">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discussion Notes / Executive Summary */}
              {selectedMeeting.discussionNotes && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Executive Notes & Synthesis
                  </h4>
                  <div className="p-3.5 rounded-xl bg-solian-surface border border-solian-border text-xs text-slate-300 leading-relaxed">
                    {selectedMeeting.discussionNotes}
                  </div>
                </div>
              )}

              {/* Formal Ratified Decisions (With Publish to Knowledge) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <span>Formal Ratified Decisions ({selectedMeeting.decisions?.length || 0})</span>
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {selectedMeeting.decisions?.length === 0 ? (
                    <div className="p-3 rounded-xl bg-solian-surface/50 border border-solian-border text-xs text-graphite-400">
                      No decisions formally ratified during this session yet.
                    </div>
                  ) : (
                    selectedMeeting.decisions.map((dec) => (
                      <div
                        key={dec.id}
                        className="p-3.5 rounded-xl bg-solian-surface border border-purple-500/30 space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                          <div className="space-y-1 flex-1">
                            <div className="text-xs font-bold text-white">{dec.decision}</div>
                            <div className="text-[11px] text-graphite-400">
                              <span className="font-semibold text-purple-300">Impact: </span>
                              {dec.impact}
                            </div>
                          </div>

                          {dec.knowledgeItemId ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0 flex items-center gap-1 self-start">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>In Knowledge Vault</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePublishDecision(selectedMeeting.id, dec)}
                              className="text-[10px] font-bold px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 transition shrink-0 flex items-center gap-1.5 cursor-pointer min-h-[40px] self-start"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Publish to Vault</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Items (With Convert to Task) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span>Meeting Action Items ({selectedMeeting.actionItems?.length || 0})</span>
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {selectedMeeting.actionItems?.length === 0 ? (
                    <div className="p-3 rounded-xl bg-solian-surface/50 border border-solian-border text-xs text-graphite-400">
                      No operational action items generated from this meeting.
                    </div>
                  ) : (
                    selectedMeeting.actionItems.map((act) => (
                      <div
                        key={act.id}
                        className="p-3.5 rounded-xl bg-solian-surface border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-h-[48px]"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">{act.title}</div>
                          <div className="flex items-center gap-3 text-[11px] text-graphite-400">
                            <span>Assignee: <strong className="text-slate-300">{act.assignee}</strong></span>
                            <span>•</span>
                            <span>Due: <strong className="text-slate-300">{act.dueDate}</strong></span>
                          </div>
                        </div>

                        {act.taskId ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0 flex items-center gap-1 self-start sm:self-auto">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Linked to Task</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConvertToTask(selectedMeeting.id, act)}
                            className="text-[10px] font-bold px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 transition shrink-0 flex items-center gap-1.5 cursor-pointer min-h-[40px] self-start sm:self-auto"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>Convert to Task</span>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Attendees Footer */}
              <div className="pt-3 border-t border-solian-border flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-graphite-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Attendees:
                </span>
                {selectedMeeting.attendees?.map((att, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 rounded bg-solian-surface border border-solian-border text-slate-300 flex items-center gap-1.5"
                  >
                    <UserAvatar name={att} size="xs" />
                    <span>{att}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 sm:p-12 text-center text-graphite-400 bg-solian-card rounded-2xl border border-solian-border text-xs sm:text-sm">
              Select a meeting session from the list to view minutes, decisions, and action items.
            </div>
          )}
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-solian-card border-t sm:border border-gold-500/40 rounded-t-3xl sm:rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-graphite-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"
              aria-label="Cancel scheduling"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-400 mb-1">
              <CalendarClock className="w-4 h-4" />
              <span>Schedule Session</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">Create New Company Meeting</h3>

            <form onSubmit={handleCreateMeeting} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q4 Executive Operations & SLA Review"
                  className="w-full bg-solian-surface border border-solian-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Meeting Tier</label>
                  <select
                    value={meetingType}
                    onChange={(e) => setMeetingType(e.target.value)}
                    className="w-full bg-solian-surface border border-solian-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500/50 min-h-[44px] cursor-pointer"
                  >
                    <option value="executive">Executive Board</option>
                    <option value="department">Department Sync</option>
                    <option value="client">Client SLA Review</option>
                    <option value="general">General Assembly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-solian-surface border border-solian-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-solian-surface border border-solian-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                    className="w-full bg-solian-surface border border-solian-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Physical Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Executive Boardroom"
                    className="w-full bg-solian-surface border border-solian-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Virtual Conference URL</label>
                  <input
                    type="url"
                    value={virtualLink}
                    onChange={(e) => setVirtualLink(e.target.value)}
                    placeholder="https://meet.solian.ai/..."
                    className="w-full bg-solian-surface border border-solian-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Agenda Items (One per line)</label>
                <textarea
                  rows={3}
                  value={agendaInput}
                  onChange={(e) => setAgendaInput(e.target.value)}
                  placeholder="Review Sprint Velocity&#10;Verify RLS Security Gates&#10;Approve Q1 Roadmap"
                  className="w-full bg-solian-surface border border-solian-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Attendees (Comma separated)</label>
                <input
                  type="text"
                  value={attendeesInput}
                  onChange={(e) => setAttendeesInput(e.target.value)}
                  placeholder="Ian Momanyi Nyakundi, Hillary Onchwati, Solomon Nyangweso"
                  className="w-full bg-solian-surface border border-solian-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-solian-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-solian-obsidian font-bold text-xs uppercase tracking-wider transition cursor-pointer min-h-[44px]"
                >
                  {submitting ? 'Scheduling...' : 'Schedule Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
