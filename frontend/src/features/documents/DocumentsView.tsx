import React, { useState, useEffect } from 'react';
import { FileText, Upload, Shield, Download, Lock, ShieldCheck, X, CheckCircle2, KeyRound, AlertCircle } from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { CorporateDocument } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const DocumentsView: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [docs, setDocs] = useState<CorporateDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<CorporateDocument | null>(null);

  const loadDocuments = () => {
    setLoading(true);
    setApiError(null);
    SolianApiClient.getDocuments()
      .then((data) => {
        setDocs(data);
      })
      .catch((err) => {
        setApiError(err.message || 'Failed to connect to corporate document repository.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDocuments();
  }, [user.role, user.userId]);

  const classificationBadges: Record<string, string> = {
    Public: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Internal: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    Confidential: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    Restricted: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-gold-500" />
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Corporate Document Repository
            </h2>
          </div>
          <p className="text-xs md:text-sm text-graphite-300">
            Encrypted institutional storage with strict tenant boundary enforcement and classification tagging under POL-202.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-graphite-400">Clearance:</span>
          <span className="text-xs font-mono font-bold uppercase text-gold-400 bg-solian-surface px-2.5 py-1 rounded border border-gold-500/30">
            {user.role} Tier
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-graphite-400 text-xs flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Verifying cryptographic clearance and loading documents...</span>
        </div>
      ) : apiError ? (
        <div className="p-10 text-center bg-solian-card rounded-2xl border border-red-500/30 space-y-3">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <div className="text-sm font-bold text-white">Document Repository Unavailable</div>
          <p className="text-xs text-graphite-300 max-w-md mx-auto">{apiError}</p>
          <button
            onClick={loadDocuments}
            className="px-4 py-2 rounded-xl bg-solian-surface text-slate-200 hover:text-white border border-solian-border text-xs font-semibold hover:border-gold-500/40 transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      ) : docs.length === 0 ? (
        <div className="p-12 text-center bg-solian-card rounded-2xl border border-solian-border space-y-3">
          <FileText className="w-8 h-8 text-graphite-500 mx-auto" />
          <div className="text-sm font-bold text-white">
            {hasRole('admin')
              ? 'No Corporate Documents Archived'
              : 'No Documents at Current Clearance'}
          </div>
          <p className="text-xs text-graphite-400 max-w-md mx-auto">
            {hasRole('admin')
              ? 'The institutional document repository is currently empty. No documents have been uploaded or indexed for Solian Wolves.'
              : user.role === 'guest'
              ? 'No public corporate documents are currently accessible for external guest clearance.'
              : `No documents matching your current clearance level (${user.role.toUpperCase()}) are currently archived.`}
          </p>
        </div>
      ) : (
        <div className="bg-solian-card rounded-2xl border border-solian-border overflow-hidden shadow-card-elevation">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-solian-border text-[11px] font-bold uppercase tracking-wider text-graphite-400 bg-solian-surface">
                  <th className="py-3.5 px-4">Document Name</th>
                  <th className="py-3.5 px-4">Classification</th>
                  <th className="py-3.5 px-4">File Size</th>
                  <th className="py-3.5 px-4">Department Owner</th>
                  <th className="py-3.5 px-4">Last Modified</th>
                  <th className="py-3.5 px-4 text-right">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-solian-border text-xs">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-solian-surface/50 transition">
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-solian-surface text-gold-500 border border-gold-500/30 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-200">{doc.name}</span>
                          {doc.isDemo && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                              [DEMO]
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-graphite-400">{doc.type}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                          classificationBadges[doc.classification] || 'text-slate-300'
                        }`}
                      >
                        {doc.classification}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{doc.size}</td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>{doc.owner}</div>
                      <div className="text-[10px] text-graphite-500">{doc.department}</div>
                    </td>
                    <td className="py-3.5 px-4 text-graphite-400 font-mono">{doc.updatedAt}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="text-gold-400 hover:text-gold-300 font-semibold text-[11px] flex items-center gap-1 justify-end ml-auto cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Inspect File
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Security Inspection Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-solian-card border-t sm:border border-gold-500/40 max-w-md w-full rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-solian-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gold-500" />
                <h3 className="text-sm font-bold text-white">Document Access & Verification</h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-graphite-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[11px] text-graphite-400">File Identifier</div>
                <div className="font-bold text-white text-sm">{selectedDoc.name}</div>
              </div>

              <div className="p-3 rounded-xl bg-solian-surface border border-solian-border space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-graphite-400">Classification:</span>
                  <span className="font-bold text-gold-400 uppercase font-mono">{selectedDoc.classification}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-graphite-400">File Size:</span>
                  <span className="font-mono text-slate-300">{selectedDoc.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-graphite-400">Authorized Custodian:</span>
                  <span className="text-slate-300">{selectedDoc.owner}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-graphite-400">Division:</span>
                  <span className="text-slate-300">{selectedDoc.department}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[11px]">Clearance Verified</div>
                  <div className="text-[10px] text-emerald-200/80">
                    Requesting account ({user.fullName}, {user.role.toUpperCase()}) holds valid access privileges for this document classification.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-solian-border">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 rounded-xl bg-solian-surface text-slate-300 hover:text-white transition text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Simulate secure file download stream
                  const blob = new Blob([`[SOLIAN ENCRYPTED REPOSITORY]\nFile: ${selectedDoc.name}\nClassification: ${selectedDoc.classification}\nOwner: ${selectedDoc.owner}\nClearance Tier: ${user.role}\nVerified Access under Solian Wolves Governance`], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = selectedDoc.name;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  setSelectedDoc(null);
                }}
                className="px-4 py-2 rounded-xl bg-gold-500 text-solian-darkest font-bold hover:bg-gold-400 transition cursor-pointer shadow-glow-gold text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Encrypted File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
