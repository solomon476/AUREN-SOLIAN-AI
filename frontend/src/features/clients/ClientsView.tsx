import React, { useState, useEffect } from 'react';
import { Building2, Plus, Mail, DollarSign, CheckCircle2 } from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { ClientAccount } from '../../types';

export const ClientsView: React.FC = () => {
  const [clients, setClients] = useState<ClientAccount[]>([]);

  useEffect(() => {
    SolianApiClient.getClients().then(setClients);
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-gold-500" />
            <h2 className="text-xl font-bold text-white">Client Accounts & CRM Engagements</h2>
          </div>
          <p className="text-xs text-graphite-300">
            Enterprise partner records, commercial value, key contacts, and executive account oversight.
          </p>
        </div>

        <button className="px-4 py-2 rounded-lg bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gold-400 transition">
          <Plus className="w-4 h-4" /> Add Enterprise Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {clients.map((c) => (
          <div
            key={c.id}
            className="p-6 rounded-xl bg-solian-card border border-solian-border hover:border-gold-500/40 transition space-y-4 shadow-card-elevation"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gold-500/10 text-gold-400 border border-gold-500/20">
                  {c.status.replace('_', ' ')}
                </span>
                <h3 className="text-base font-bold text-white mt-2">{c.companyName}</h3>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-solian-surface p-3.5 rounded-lg border border-solian-border">
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

            <div className="text-[11px] text-graphite-400 pt-2 flex items-center justify-between">
              <span>Account Lead: <span className="text-slate-300">{c.leadAccountManager}</span></span>
              <button className="text-gold-400 hover:text-gold-300 font-semibold">View Engagement</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
