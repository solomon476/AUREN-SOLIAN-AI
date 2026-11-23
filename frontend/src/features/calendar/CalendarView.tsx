import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Briefcase,
  CheckSquare,
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { CalendarEvent } from '../../types';
import { useOrganization } from '../../context/OrganizationContext';

export const CalendarView: React.FC = () => {
  const { setActiveModule } = useOrganization();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'timeline' | 'upcoming'>('timeline');

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await SolianApiClient.getCalendarEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load operational calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (typeFilter === 'all') return true;
    return e.type === typeFilter;
  });

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'meeting':
        return { label: 'Meeting', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: Users };
      case 'task':
        return { label: 'Task Due', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: CheckSquare };
      case 'project':
        return { label: 'Milestone', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Briefcase };
      default:
        return { label: 'Event', bg: 'bg-gold-500/15 text-gold-400 border-gold-500/30', icon: CalendarIcon };
    }
  };

  const handleNavigate = (module: string) => {
    if (module) {
      setActiveModule(module);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-400 mb-1">
            <CalendarIcon className="w-4 h-4" />
            <span>Operational Schedule</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Consolidated Operational Calendar
          </h2>
          <p className="text-xs md:text-sm text-graphite-400 mt-1">
            Aggregated timeline uniting governance cadences, task due dates, and major enterprise milestones.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-solian-surface p-1 rounded-xl border border-solian-border shrink-0 text-xs font-semibold">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              viewMode === 'timeline'
                ? 'bg-solian-card text-gold-400 shadow-sm border border-gold-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Chronological Timeline
          </button>
          <button
            onClick={() => setViewMode('upcoming')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              viewMode === 'upcoming'
                ? 'bg-solian-card text-gold-400 shadow-sm border border-gold-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Upcoming Horizon
          </button>
        </div>
      </div>

      {/* Filter Tabs & Quick Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-solian-border">
        <div className="flex items-center gap-2 text-xs">
          {[
            { id: 'all', label: `All Events (${events.length})` },
            { id: 'meeting', label: `Meetings (${events.filter((e) => e.type === 'meeting').length})` },
            { id: 'task', label: `Task Deadlines (${events.filter((e) => e.type === 'task').length})` },
            { id: 'project', label: `Milestones (${events.filter((e) => e.type === 'project').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                typeFilter === tab.id
                  ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40'
                  : 'bg-solian-card text-slate-400 hover:text-white border border-solian-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-graphite-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gold-400" />
          <span>Synchronized with Central Repository</span>
        </div>
      </div>

      {/* Events Timeline Stream */}
      {loading ? (
        <div className="p-12 text-center text-graphite-400 bg-solian-card rounded-2xl border border-solian-border text-xs">
          Loading operational calendar items...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 text-center text-graphite-400 bg-solian-card rounded-2xl border border-solian-border text-xs">
          No scheduled calendar events found for the active filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((evt) => {
            const badge = getEventBadge(evt.type);
            const Icon = badge.icon;

            return (
              <div
                key={`${evt.type}-${evt.id}`}
                className="p-4 md:p-5 rounded-2xl bg-solian-card border border-solian-border hover:border-gold-500/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${badge.bg}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {evt.category}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px] text-slate-400">
                        Status: <strong className="text-slate-200 capitalize">{evt.status}</strong>
                      </span>
                    </div>

                    <h3 className="text-sm md:text-base font-bold text-white truncate">{evt.title}</h3>

                    <div className="flex items-center gap-4 text-xs text-graphite-400 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-gold-400" />
                        <span className="text-slate-300 font-semibold">{evt.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{evt.time} ({evt.duration_minutes}m)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>Lead: <strong className="text-slate-300">{evt.organizer}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct Action Link */}
                <button
                  onClick={() => handleNavigate(evt.link_module)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-solian-surface hover:bg-gold-500/10 text-slate-300 hover:text-gold-400 border border-solian-border transition text-xs font-semibold shrink-0 cursor-pointer"
                >
                  <span>Open in {evt.link_module}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

