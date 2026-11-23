import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Users,
  Briefcase,
  CheckSquare,
  Building2,
  Brain,
  FileText,
  CalendarClock,
  ArrowRight,
  Sparkles,
  Landmark,
} from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { UnifiedSearchResults } from '../../types';
import { useOrganization } from '../../context/OrganizationContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const { setActiveModule } = useOrganization();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  // Global shortcut listener: ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open trigger handled in parent or context
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await SolianApiClient.searchUnified(query.trim());
        setResults(data);
      } catch (err) {
        console.error('Unified search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (module: string) => {
    setActiveModule(module);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 pt-16 md:pt-24 z-50 animate-fadeIn">
      <div className="bg-solian-card border border-gold-500/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Box */}
        <div className="p-4 border-b border-solian-border flex items-center gap-3 bg-solian-surface">
          <Search className="w-5 h-5 text-gold-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company knowledge, SOPs, tasks, meetings, people (⌘K)..."
            className="w-full bg-transparent text-sm text-white placeholder-graphite-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-graphite-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-solian-darkest text-graphite-400 border border-solian-border">
            ESC
          </kbd>
        </div>

        {/* Results Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {loading ? (
            <div className="py-8 text-center text-xs text-graphite-400">
              Searching across Solian Wolves company intelligence...
            </div>
          ) : !query.trim() ? (
            <div className="py-8 text-center space-y-2">
              <Sparkles className="w-6 h-6 text-gold-400/60 mx-auto" />
              <p className="text-xs text-graphite-400">
                Type any query to search across members, initiatives, tasks, knowledge SOPs, and meetings.
              </p>
            </div>
          ) : results && results.total_matches === 0 ? (
            <div className="py-8 text-center text-xs text-graphite-400">
              No matching corporate records found for "{query}".
            </div>
          ) : results ? (
            <div className="space-y-4">
              {/* Members */}
              {results.members.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-gold-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Staff Directory ({results.members.length})</span>
                  </div>
                  {results.members.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleSelect('teams')}
                      className="p-2.5 rounded-xl bg-solian-surface/80 hover:bg-solian-surface border border-solian-border flex items-center justify-between cursor-pointer transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{m.name}</div>
                        <div className="text-[11px] text-graphite-400">{m.title} • {m.department}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  ))}
                </div>
              )}

              {/* Projects */}
              {results.projects.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Initiatives & Projects ({results.projects.length})</span>
                  </div>
                  {results.projects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelect('projects')}
                      className="p-2.5 rounded-xl bg-solian-surface/80 hover:bg-solian-surface border border-solian-border flex items-center justify-between cursor-pointer transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{p.name}</div>
                        <div className="text-[11px] text-graphite-400">Status: {p.status} • Lead: {p.lead}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  ))}
                </div>
              )}

              {/* Tasks */}
              {results.tasks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Operations & Tasks ({results.tasks.length})</span>
                  </div>
                  {results.tasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleSelect('tasks')}
                      className="p-2.5 rounded-xl bg-solian-surface/80 hover:bg-solian-surface border border-solian-border flex items-center justify-between cursor-pointer transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{t.title}</div>
                        <div className="text-[11px] text-graphite-400">Assignee: {t.assignee} • Priority: {t.priority}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  ))}
                </div>
              )}

              {/* Knowledge */}
              {results.knowledge.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" />
                    <span>Knowledge Vault & SOPs ({results.knowledge.length})</span>
                  </div>
                  {results.knowledge.map((k) => (
                    <div
                      key={k.id}
                      onClick={() => handleSelect('knowledge')}
                      className="p-2.5 rounded-xl bg-solian-surface/80 hover:bg-solian-surface border border-solian-border flex items-center justify-between cursor-pointer transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{k.title}</div>
                        <div className="text-[11px] text-graphite-400">{k.category} • {k.classification}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  ))}
                </div>
              )}

              {/* Meetings */}
              {results.meetings.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>Cadences & Meetings ({results.meetings.length})</span>
                  </div>
                  {results.meetings.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleSelect('meetings')}
                      className="p-2.5 rounded-xl bg-solian-surface/80 hover:bg-solian-surface border border-solian-border flex items-center justify-between cursor-pointer transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{m.title}</div>
                        <div className="text-[11px] text-graphite-400">{m.date} at {m.time} • {m.organizerName}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  ))}
                </div>
              )}

              {/* Clients */}
              {results.clients.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-gold-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Client Accounts ({results.clients.length})</span>
                  </div>
                  {results.clients.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelect('clients')}
                      className="p-2.5 rounded-xl bg-solian-surface/80 hover:bg-solian-surface border border-solian-border flex items-center justify-between cursor-pointer transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{c.companyName}</div>
                        <div className="text-[11px] text-graphite-400">Contact: {c.contactPerson} • {c.status}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  ))}
                </div>
              )}

              {/* Financial Invoices & Records */}
              {results.invoices && results.invoices.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Invoices & Receivables ({results.invoices.length})</span>
                  </div>
                  {results.invoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => handleSelect('finance')}
                      className="p-2.5 rounded-xl bg-solian-surface/80 hover:bg-solian-surface border border-solian-border flex items-center justify-between cursor-pointer transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{inv.invoiceNumber} — {inv.clientName}</div>
                        <div className="text-[11px] text-graphite-400">Total: KES {inv.totalAmount?.toLocaleString()} • Status: {inv.status}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-solian-border bg-solian-darkest flex items-center justify-between text-[11px] text-graphite-400">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-solian-surface border border-solian-border text-[10px]">
              Click to view
            </kbd>
          </div>
          <span>Solian Wolves Intelligence Mesh</span>
        </div>
      </div>
    </div>
  );
};

