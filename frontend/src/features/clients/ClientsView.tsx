import React, { useState, useEffect } from 'react';
import { Building2, Plus, Mail, DollarSign, CheckCircle2, User, X, AlertCircle } from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { ClientAccount } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const ClientsView: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'prospect' | 'active' | 'contract_pending' | 'retained'>('active');
  const [contractValue, setContractValue] = useState('$150,000 / yr');
  const [leadAccountManager, setLeadAccountManager] = useState(user.fullName);
  const [notes, setNotes] = useState('');

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await SolianApiClient.getClients();
      setClients(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactPerson.trim() || !email.trim()) {
      setErrorMsg('Please fill in company name, contact person, and email.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await SolianApiClient.createClient({
        company_name: companyName.trim(),
        contact_person: contactPerson.trim(),
        email: email.trim(),
        status,
        contract_value: contractValue.trim(),
        lead_account_manager: leadAccountManager.trim() || user.fullName,
        notes: notes.trim() || undefined,
      });
      setIsModalOpen(false);
      setCompanyName('');
      setContactPerson('');
      setEmail('');
      setNotes('');
      await loadClients();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register client account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-gold-500" />
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Client Accounts & Enterprise CRM
            </h2>
          </div>
          <p className="text-xs md:text-sm text-graphite-300">
            Enterprise partner records, commercial value, key contacts, and executive account oversight for Solian Wolves.
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
            <Plus className="w-4 h-4" /> Add Enterprise Account
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-graphite-400 text-xs flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading client portfolios...</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="p-12 text-center bg-solian-card rounded-2xl border border-solian-border space-y-2">
          <Building2 className="w-8 h-8 text-graphite-500 mx-auto" />
          <div className="text-sm font-bold text-white">No Client Accounts Found</div>
          <p className="text-xs text-graphite-400 max-w-md mx-auto">
            No enterprise accounts currently registered. Use 'Add Enterprise Account' to register new corporate client records.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div
              key={c.id}
              className="p-6 rounded-2xl bg-solian-card border border-solian-border hover:border-gold-500/40 transition space-y-4 shadow-card-elevation"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gold-500/10 text-gold-400 border border-gold-500/20">
                      {c.status.replace('_', ' ')}
                    </span>
                    {c.isDemo && (
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                        [DEMO]
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mt-2">{c.companyName}</h3>
                </div>
              </div>

              <div className="space-y-2 text-xs bg-solian-surface p-3.5 rounded-xl border border-solian-border">
                <div className="text-graphite-400">
                  Primary Contact: <span className="text-slate-200 font-semibold">{c.contactPerson}</span>
                </div>
                <div className="text-graphite-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-300">{c.email}</span>
                </div>
                <div className="text-graphite-400 flex items-center gap-1.5 pt-1 border-t border-solian-border/50">
                  <DollarSign className="w-3.5 h-3.5 text-gold-500" />
                  <span className="text-gold-400 font-bold font-mono">{c.contractValue}</span>
                </div>
              </div>

              {c.notes && (
                <p className="text-[11px] text-graphite-400 italic">{c.notes}</p>
              )}

              <div className="text-[11px] text-graphite-400 pt-2 flex items-center justify-between border-t border-solian-border/50">
                <span>
                  Account Lead: <span className="text-slate-200 font-semibold">{c.leadAccountManager}</span>
                </span>
                <span className="text-gold-400 font-semibold text-xs">Active Retainer</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-solian-card border-t sm:border border-gold-500/40 max-w-lg w-full rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 md:p-8 space-y-4 sm:space-y-5 shadow-2xl animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-solian-border pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gold-500" />
                <h3 className="text-base font-bold text-white">Register Enterprise Client</h3>
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

            <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
              <div>
                <label className="block text-graphite-300 font-semibold mb-1">Company / Organization Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Global Logistics"
                  className="w-full bg-solian-surface border border-solian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-graphite-300 font-semibold mb-1">Primary Contact</label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Claire Dupont"
                    className="w-full bg-solian-surface border border-solian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500/50"
                  />
                </div>
                <div>
                  <label className="block text-graphite-300 font-semibold mb-1">Contact Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. contact@apex.ch"
                    className="w-full bg-solian-surface border border-solian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-graphite-300 font-semibold mb-1">Contract Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-solian-surface border border-solian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500/50"
                  >
                    <option value="active">Active Retainer</option>
                    <option value="contract_pending">Contract Pending</option>
                    <option value="prospect">Prospect</option>
                    <option value="retained">Retained Long-Term</option>
                  </select>
                </div>
                <div>
                  <label className="block text-graphite-300 font-semibold mb-1">Commercial Value</label>
                  <input
                    type="text"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    placeholder="e.g. $180,000 / yr"
                    className="w-full bg-solian-surface border border-solian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-graphite-300 font-semibold mb-1">Lead Account Manager</label>
                <input
                  type="text"
                  value={leadAccountManager}
                  onChange={(e) => setLeadAccountManager(e.target.value)}
                  placeholder={user.fullName}
                  className="w-full bg-solian-surface border border-solian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div>
                <label className="block text-graphite-300 font-semibold mb-1">Operational Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key deliverables, NDA terms, SLA requirements..."
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-3 text-white focus:outline-none focus:border-gold-500/50"
                ></textarea>
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
                  {submitting ? 'Registering...' : 'Register Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
