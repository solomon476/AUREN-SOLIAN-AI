import React, { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  Plus,
  Tag,
  FileText,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Lock,
  X,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { KnowledgeItem } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const KnowledgeVaultView: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // New SOP Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('SOP');
  const [formClassification, setFormClassification] = useState('Internal');
  const [formDepartment, setFormDepartment] = useState(user.department);
  const [formSnippet, setFormSnippet] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('incident, governance');
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    'All',
    'SOP',
    'Policy',
    'Playbook',
    'Architecture',
    'Compliance',
  ];

  const classificationStyles: Record<string, string> = {
    Public: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Internal: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    Confidential: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    Restricted: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await SolianApiClient.getKnowledgeItems(search, selectedCategory);
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [search, selectedCategory]);

  const handleCreateIndexSOP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formSnippet.trim()) return;
    setSubmitting(true);
    try {
      const tagsList = formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await SolianApiClient.createKnowledgeItem({
        title: formTitle,
        category: formCategory,
        classification: formClassification,
        department: formDepartment,
        snippet: formSnippet,
        content: formContent || formSnippet,
        tags: tagsList,
      });

      setIsModalOpen(false);
      setFormTitle('');
      setFormSnippet('');
      setFormContent('');
      await loadItems();
    } catch (err: any) {
      alert(`Error indexing SOP: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-gold-500" />
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Institutional Knowledge Vault
            </h2>
          </div>
          <p className="text-xs md:text-sm text-graphite-300">
            Corporate memory, Standard Operating Procedures (SOPs), compliance rules, and verified operational playbooks.
          </p>
        </div>

        {hasRole('manager') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gold-400 transition cursor-pointer shadow-glow-gold shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Index New SOP
          </button>
        )}
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-gold-500 text-solian-darkest shadow-glow-gold'
                  : 'bg-solian-card text-slate-300 hover:bg-solian-surface hover:text-white border border-solian-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-graphite-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Semantic search across verified company SOPs, policies, playbooks, and architectures..."
            className="w-full bg-solian-card border border-solian-border rounded-xl pl-10 pr-4 py-3 text-xs md:text-sm text-slate-200 placeholder-graphite-400 focus:outline-none focus:border-gold-500/50 shadow-card-elevation"
          />
        </div>
      </div>

      {/* Knowledge Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-graphite-400 text-xs flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Retrieving authorized institutional records...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-solian-card rounded-2xl border border-solian-border space-y-2">
          <Brain className="w-8 h-8 text-graphite-500 mx-auto" />
          <div className="text-sm font-bold text-white">No Knowledge Entities Found</div>
          <p className="text-xs text-graphite-400 max-w-md mx-auto">
            No active documentation matched your search or tier clearance. Try a different query or category filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="p-5 rounded-xl bg-solian-card border border-solian-border hover:border-gold-500/40 transition cursor-pointer flex flex-col justify-between shadow-card-elevation group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gold-500/10 text-gold-400 border border-gold-500/20">
                      {item.category}
                    </span>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                        classificationStyles[item.classification] || 'text-slate-300'
                      }`}
                    >
                      {item.classification}
                    </span>
                    {item.isDemo && (
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                        [DEMO]
                      </span>
                    )}
                    {!item.isVerified && (
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 font-mono">
                        Unverified
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-graphite-400 font-mono">{item.updatedAt}</span>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-gold-400 transition line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-xs text-graphite-300 line-clamp-3 leading-relaxed">
                  {item.snippet}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-solian-border/60 flex items-center justify-between text-[11px] text-graphite-400">
                <span className="truncate max-w-[140px]">
                  Author: <span className="text-slate-300">{item.author}</span>
                </span>
                <span className="text-gold-400 font-semibold flex items-center gap-1 shrink-0">
                  Read Record <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-solian-card border-t sm:border border-gold-500/40 max-w-2xl w-full rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 md:p-8 space-y-4 sm:space-y-5 shadow-2xl animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-solian-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-gold-400 px-2.5 py-0.5 rounded bg-gold-500/10 border border-gold-500/20">
                  {selectedItem.category}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                    classificationStyles[selectedItem.classification]
                  }`}
                >
                  {selectedItem.classification}
                </span>
                <span className="text-xs font-mono text-graphite-400">v{selectedItem.version || '1.0'}</span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-graphite-400 hover:text-white p-1 rounded-lg text-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">{selectedItem.title}</h3>
              <div className="text-xs text-graphite-400 mt-1">
                Department: <span className="text-slate-300">{selectedItem.department || 'General Operations'}</span> • Author:{' '}
                <span className="text-slate-300">{selectedItem.author}</span> • Updated:{' '}
                <span className="text-slate-300 font-mono">{selectedItem.updatedAt}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-graphite-400">
                Operational Summary
              </div>
              <div className="text-xs md:text-sm text-slate-200 leading-relaxed bg-solian-surface p-4 rounded-xl border border-solian-border">
                {selectedItem.snippet}
              </div>

              {selectedItem.content && selectedItem.content !== selectedItem.snippet && (
                <>
                  <div className="text-xs font-bold uppercase tracking-wider text-graphite-400 pt-2">
                    Standard Procedure Specification
                  </div>
                  <div className="text-xs md:text-sm text-slate-300 leading-relaxed bg-solian-surface p-4 rounded-xl border border-solian-border whitespace-pre-wrap">
                    {selectedItem.content}
                  </div>
                </>
              )}
            </div>

            {selectedItem.tags && selectedItem.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {selectedItem.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-solian-surface text-slate-400 border border-solian-border"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-solian-border">
              {selectedItem.isVerified ? (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-semibold">
                    Verified Active Company Knowledge
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-amber-400 font-semibold">
                    {selectedItem.isDemo
                      ? 'Demonstration Fixture [DEMO] — Unverified'
                      : 'Unverified Knowledge Record'}
                  </span>
                </div>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl bg-solian-surface hover:bg-solian-border text-slate-200 text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Index New SOP Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <form
            onSubmit={handleCreateIndexSOP}
            className="bg-solian-card border-t sm:border border-gold-500/40 max-w-xl w-full rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 md:p-8 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-solian-border pb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-gold-500" />
                <h3 className="text-base font-bold text-white">Index New Standard Operating Procedure</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-graphite-400 hover:text-white text-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Cross-Departmental Incident Escalation Matrix (SOP-405)"
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                  >
                    <option value="SOP">SOP (Standard Operating Procedure)</option>
                    <option value="Policy">Corporate Policy</option>
                    <option value="Playbook">Tactical Playbook</option>
                    <option value="Architecture">Architecture Whitepaper</option>
                    <option value="Compliance">Compliance & Security</option>
                  </select>
                </div>

                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Classification</label>
                  <select
                    value={formClassification}
                    onChange={(e) => setFormClassification(e.target.value)}
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                  >
                    <option value="Internal">Internal (Members+)</option>
                    <option value="Public">Public (All)</option>
                    <option value="Confidential">Confidential (Managers+)</option>
                    <option value="Restricted">Restricted (Admin/Owner Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Department Owner</label>
                <input
                  type="text"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Operational Summary / Snippet</label>
                <textarea
                  required
                  rows={2}
                  value={formSnippet}
                  onChange={(e) => setFormSnippet(e.target.value)}
                  placeholder="Summary of operational guidelines and triggers..."
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Procedure Specification (Full Content)</label>
                <textarea
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Detailed specifications, escalation SLAs, and responsibilities..."
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="incident, escalation, engineering, sla"
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-solian-border">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-solian-surface hover:bg-solian-border text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase hover:bg-gold-400 transition shadow-glow-gold disabled:opacity-50"
              >
                {submitting ? 'Indexing...' : 'Index Knowledge Item'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
