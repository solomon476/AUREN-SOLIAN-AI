import React, { useState, useEffect } from 'react';
import { Brain, Search, Plus, Tag, FileText, ExternalLink, ShieldCheck } from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { KnowledgeItem } from '../../types';

export const KnowledgeVaultView: React.FC = () => {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);

  useEffect(() => {
    SolianApiClient.getKnowledgeItems(search).then(setItems);
  }, [search]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-gold-500" />
            <h2 className="text-xl font-bold text-white">Institutional Knowledge Vault</h2>
          </div>
          <p className="text-xs text-graphite-300">
            Corporate memory, Standard Operating Procedures (SOPs), compliance rules, and tactical playbooks.
          </p>
        </div>

        <button className="px-4 py-2 rounded-lg bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gold-400 transition">
          <Plus className="w-4 h-4" /> Index New SOP
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-graphite-400 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Semantic search across company SOPs, policies, playbooks, and architectures..."
          className="w-full bg-solian-card border border-solian-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-graphite-400 focus:outline-none focus:border-gold-500/50"
        />
      </div>

      {/* Knowledge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="p-5 rounded-xl bg-solian-card border border-solian-border hover:border-gold-500/40 transition cursor-pointer flex flex-col justify-between shadow-card-elevation"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gold-500/10 text-gold-400 border border-gold-500/20">
                  {item.category}
                </span>
                <span className="text-[10px] text-graphite-400">{item.updatedAt}</span>
              </div>
              <h3 className="text-sm font-bold text-white line-clamp-2">{item.title}</h3>
              <p className="text-xs text-graphite-300 line-clamp-3 leading-relaxed">{item.snippet}</p>
            </div>

            <div className="pt-4 mt-4 border-t border-solian-border/60 flex items-center justify-between text-[11px] text-graphite-400">
              <span>Author: <span className="text-slate-300">{item.author}</span></span>
              <span className="text-gold-400 font-semibold flex items-center gap-1">
                Read Entity <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal if selected */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-solian-card border border-gold-500/40 max-w-2xl w-full rounded-2xl p-6 space-y-4 shadow-solian-elevation">
            <div className="flex items-center justify-between border-b border-solian-border pb-3">
              <span className="text-xs uppercase font-bold text-gold-400 px-2 py-0.5 rounded bg-gold-500/10">
                {selectedItem.category}
              </span>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-graphite-400 hover:text-white text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>
            <h3 className="text-lg font-bold text-white">{selectedItem.title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed bg-solian-surface p-4 rounded-xl border border-solian-border">
              {selectedItem.snippet}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Verified Active Company SOP</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

