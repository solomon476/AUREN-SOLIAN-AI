import React from 'react';
import { Settings, Shield, Key, Database, Building2 } from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext';
import { useAuth } from '../../context/AuthContext';

export const OrganizationSettingsView: React.FC = () => {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-gold-500" />
          <h2 className="text-xl font-bold text-white">Organization Configuration & Governance</h2>
        </div>
        <p className="text-xs text-graphite-300">
          Enterprise identity parameters, tenant boundary isolation, and security controls.
        </p>
      </div>

      <div className="p-6 rounded-xl bg-solian-card border border-solian-border space-y-4 shadow-card-elevation">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gold-500" /> Enterprise Profile
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-graphite-400 block mb-1">Organization Legal Name</label>
            <input
              type="text"
              readOnly
              value={currentOrg.name}
              className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white"
            />
          </div>
          <div>
            <label className="text-graphite-400 block mb-1">Organization Code / Subdomain</label>
            <input
              type="text"
              readOnly
              value={currentOrg.code}
              className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white font-mono"
            />
          </div>
        </div>
      </div>

      <div className="p-6 rounded-xl bg-solian-card border border-solian-border space-y-4 shadow-card-elevation">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-gold-500" /> Role-Based Access Control (RBAC)
        </h3>
        <p className="text-xs text-graphite-300">
          Strict organizational separation: Owner, Admin, Manager, Member, and Guest tiers.
        </p>
        <div className="space-y-2 text-xs">
          <div className="p-3 rounded-lg bg-solian-surface border border-solian-border flex justify-between items-center">
            <div>
              <span className="font-bold text-white uppercase text-[11px]">Owner / Director</span>
              <p className="text-graphite-400 text-[11px]">Full architectural control, billing, API key provisioning, user management.</p>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">Enforced</span>
          </div>
          <div className="p-3 rounded-lg bg-solian-surface border border-solian-border flex justify-between items-center">
            <div>
              <span className="font-bold text-white uppercase text-[11px]">Manager</span>
              <p className="text-graphite-400 text-[11px]">Project and task delegation, SOP indexing, client oversight.</p>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">Enforced</span>
          </div>
          <div className="p-3 rounded-lg bg-solian-surface border border-solian-border flex justify-between items-center">
            <div>
              <span className="font-bold text-white uppercase text-[11px]">Member / Staff</span>
              <p className="text-graphite-400 text-[11px]">Task execution, knowledge vault search, Company AI consultation.</p>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">Enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
};
