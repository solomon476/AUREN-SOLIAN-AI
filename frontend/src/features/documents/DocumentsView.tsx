import React, { useState, useEffect } from 'react';
import { FileText, Upload, Shield, Download, Lock } from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { CorporateDocument } from '../../types';

export const DocumentsView: React.FC = () => {
  const [docs, setDocs] = useState<CorporateDocument[]>([]);

  useEffect(() => {
    SolianApiClient.getDocuments().then(setDocs);
  }, []);

  const classificationBadges: Record<string, string> = {
    Public: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Internal: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    Confidential: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    Restricted: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-gold-500" />
            <h2 className="text-xl font-bold text-white">Confidential Corporate Document Repository</h2>
          </div>
          <p className="text-xs text-graphite-300">
            Encrypted institutional storage with strict tenant boundary enforcement and classification tagging.
          </p>
        </div>

        <button className="px-4 py-2 rounded-lg bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gold-400 transition">
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      <div className="bg-solian-card rounded-xl border border-solian-border overflow-hidden shadow-card-elevation">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-solian-border text-[11px] font-bold uppercase tracking-wider text-graphite-400 bg-solian-surface">
              <th className="py-3 px-4">Document Name</th>
              <th className="py-3 px-4">Classification</th>
              <th className="py-3 px-4">File Size</th>
              <th className="py-3 px-4">Department Owner</th>
              <th className="py-3 px-4">Last Modified</th>
              <th className="py-3 px-4 text-right">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-solian-border text-xs">
            {docs.map((doc) => (
              <tr key={doc.id} className="hover:bg-solian-surface/50 transition">
                <td className="py-3 px-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-solian-surface text-gold-500 border border-gold-500/30">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">{doc.name}</div>
                    <div className="text-[11px] text-graphite-400">{doc.type}</div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${classificationBadges[doc.classification]}`}>
                    {doc.classification}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-slate-400">{doc.size}</td>
                <td className="py-3 px-4 text-slate-300">{doc.owner}</td>
                <td className="py-3 px-4 text-graphite-400 font-mono">{doc.updatedAt}</td>
                <td className="py-3 px-4 text-right">
                  <button className="text-gold-400 hover:text-gold-300 font-semibold text-[11px] flex items-center gap-1 justify-end ml-auto">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

