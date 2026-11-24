import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Building2,
  Clock,
  Compass,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext';
import { useAuth } from '../../context/AuthContext';
import { SolianApiClient } from '../../api/client';
import { CompanyOperatingInfo } from '../../types';
import { ProfileSettingsSection } from './ProfileSettingsSection';

export const OrganizationSettingsView: React.FC = () => {
  const { currentOrg, refreshOrg } = useOrganization();
  const { user, hasRole } = useAuth();

  const [operatingInfo, setOperatingInfo] = useState<CompanyOperatingInfo | null>(null);
  const [name, setName] = useState(currentOrg.name);
  const [tagline, setTagline] = useState(currentOrg.tagline);
  const [mission, setMission] = useState(currentOrg.mission || '');
  const [headquarters, setHeadquarters] = useState(currentOrg.headquarters || '');
  const [timezone, setTimezone] = useState(currentOrg.primary_timezone || 'UTC');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setName(currentOrg.name);
    setTagline(currentOrg.tagline);
    setMission(currentOrg.mission || '');
    setHeadquarters(currentOrg.headquarters || '');
    setTimezone(currentOrg.primary_timezone || 'UTC');
  }, [currentOrg]);

  useEffect(() => {
    SolianApiClient.getOperatingInfo().then(setOperatingInfo).catch(() => {});
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasRole('admin')) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await SolianApiClient.updateOrganizationProfile({
        name,
        tagline,
        mission,
        headquarters,
        primary_timezone: timezone,
      });
      await refreshOrg();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      alert(`Update failed: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-gold-500" />
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Organization Identity & Governance
          </h2>
        </div>
        <p className="text-xs md:text-sm text-graphite-300">
          Enterprise configuration parameters, operating principles, operational cadences, and RBAC security gates.
        </p>
      </div>

      {/* Personal User Profile & Avatar Customization */}
      <ProfileSettingsSection />

      {/* Organization Profile Configuration */}
      <form
        onSubmit={handleSaveProfile}
        className="p-6 md:p-8 rounded-2xl bg-solian-card border border-solian-border space-y-5 shadow-card-elevation"
      >
        <div className="flex items-center justify-between pb-3 border-b border-solian-border">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gold-500" /> Enterprise Profile & Identity
          </h3>
          {hasRole('admin') ? (
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase flex items-center gap-1.5 hover:bg-gold-400 transition shadow-glow-gold cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          ) : (
            <span className="text-[10px] text-graphite-400 uppercase font-mono">Read-Only Clearance</span>
          )}
        </div>

        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Organization profile successfully updated and synchronized across all nodes.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-graphite-300 block mb-1 font-semibold">Organization Legal Name</label>
            <input
              type="text"
              disabled={!hasRole('admin')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-solian-surface border border-solian-border rounded-xl p-3 text-white focus:outline-none focus:border-gold-500/50 disabled:opacity-75"
            />
          </div>
          <div>
            <label className="text-graphite-300 block mb-1 font-semibold">Organization Code</label>
            <input
              type="text"
              readOnly
              value={currentOrg.code}
              className="w-full bg-solian-surface border border-solian-border rounded-xl p-3 text-gold-400 font-mono font-bold cursor-not-allowed opacity-80"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-graphite-300 block mb-1 font-semibold">Tagline & Purpose</label>
            <input
              type="text"
              disabled={!hasRole('admin')}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full bg-solian-surface border border-solian-border rounded-xl p-3 text-white focus:outline-none focus:border-gold-500/50 disabled:opacity-75"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-graphite-300 block mb-1 font-semibold">Mission Statement</label>
            <textarea
              rows={2}
              disabled={!hasRole('admin')}
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="Not configured — enter verified company mission"
              className="w-full bg-solian-surface border border-solian-border rounded-xl p-3 text-white placeholder-graphite-500 focus:outline-none focus:border-gold-500/50 disabled:opacity-75"
            />
          </div>

          <div>
            <label className="text-graphite-300 block mb-1 font-semibold">Operational Headquarters</label>
            <input
              type="text"
              disabled={!hasRole('admin')}
              value={headquarters}
              onChange={(e) => setHeadquarters(e.target.value)}
              placeholder="Not configured — enter verified headquarters"
              className="w-full bg-solian-surface border border-solian-border rounded-xl p-3 text-white placeholder-graphite-500 focus:outline-none focus:border-gold-500/50 disabled:opacity-75"
            />
          </div>

          <div>
            <label className="text-graphite-300 block mb-1 font-semibold">Primary Operating Timezone</label>
            <input
              type="text"
              disabled={!hasRole('admin')}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-solian-surface border border-solian-border rounded-xl p-3 text-white focus:outline-none focus:border-gold-500/50 disabled:opacity-75"
            />
          </div>
        </div>
      </form>

      {/* Company Operating Principles */}
      {operatingInfo && operatingInfo.principles && (
        <div className="p-6 md:p-8 rounded-2xl bg-solian-card border border-solian-border space-y-4 shadow-card-elevation">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-gold-500" /> Solian Wolves Operating Principles
            </h3>
            {operatingInfo.has_demo_data && (
              <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                [DEMO Template]
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {operatingInfo.principles.map((op) => (
              <div
                key={op.id}
                className="p-4 rounded-xl bg-solian-surface border border-solian-border space-y-1.5"
              >
                <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-500"></span>
                  {op.title}
                </div>
                <p className="text-xs text-graphite-300 leading-relaxed">{op.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operational Cadences & Escalation SLAs */}
      {operatingInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cadences */}
          <div className="p-6 rounded-2xl bg-solian-card border border-solian-border space-y-4 shadow-card-elevation">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold-500" /> Operational Cadences
              </h3>
              {operatingInfo.has_demo_data && (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  [DEMO]
                </span>
              )}
            </div>
            <div className="space-y-2.5">
              {operatingInfo.cadences.map((cad) => (
                <div
                  key={cad.id}
                  className="p-3.5 rounded-xl bg-solian-surface border border-solian-border space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{cad.name}</span>
                    <span className="text-[10px] font-mono text-gold-400 bg-solian-card px-2 py-0.5 rounded border border-solian-border">
                      {cad.cadence}
                    </span>
                  </div>
                  <p className="text-[11px] text-graphite-300">{cad.description}</p>
                  <div className="text-[10px] text-graphite-400 pt-1">
                    Lead: <span className="text-slate-300">{cad.lead}</span> • Audience:{' '}
                    <span className="text-slate-300">{cad.audience}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Incident SLAs */}
          <div className="p-6 rounded-2xl bg-solian-card border border-solian-border space-y-4 shadow-card-elevation">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-gold-500" /> Incident Escalation SLAs (SOP-401)
            </h3>
            <div className="space-y-2.5">
              {operatingInfo.escalation_slas.map((sla, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-solian-surface border border-solian-border space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{sla.severity}</span>
                    <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      SLA: {sla.response_sla}
                    </span>
                  </div>
                  <div className="text-[11px] text-graphite-300">
                    Resolution Target: <span className="text-slate-200">{sla.resolution_sla}</span>
                  </div>
                  <div className="text-[10px] text-graphite-400">
                    Protocol: <span className="text-gold-400/90">{sla.escalation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Role-Based Access Control (RBAC) Governance */}
      <div className="p-6 md:p-8 rounded-2xl bg-solian-card border border-solian-border space-y-4 shadow-card-elevation">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-600" /> Access Roles & Permissions
        </h3>
        <p className="text-xs text-slate-600">
          Organizational roles and operational authority across Solian Wolves.
        </p>

        <div className="space-y-2.5 text-xs">
          <div className="p-3.5 rounded-xl bg-solian-surface border border-amber-500/30 flex justify-between items-center">
            <div>
              <span className="font-bold text-amber-800 uppercase text-xs">OWNER</span>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Full company authority: organization settings, financial governance, personnel roles, and system oversight.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-solian-surface border border-solian-border flex justify-between items-center">
            <div>
              <span className="font-bold text-purple-700 uppercase text-xs">ADMIN</span>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Executive leadership: manages team onboarding and roles, reviews company records, updates organization profile.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-solian-surface border border-solian-border flex justify-between items-center">
            <div>
              <span className="font-bold text-blue-700 uppercase text-xs">MANAGER</span>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Departmental lead: manages projects, SOPs, client accounts, and operational workflows.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-solian-surface border border-solian-border flex justify-between items-center">
            <div>
              <span className="font-bold text-slate-700 uppercase text-xs">MEMBER</span>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Company staff: executes tasks, accesses internal knowledge, collaborates on projects, and consults Auren AI.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-solian-surface border border-solian-border flex justify-between items-center">
            <div>
              <span className="font-bold text-zinc-600 uppercase text-xs">GUEST</span>
              <p className="text-graphite-300 text-[11px] mt-0.5">
                External advisor: read-only visibility into public company policies. Internal SOPs and confidential documents restricted.
              </p>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 shrink-0">
              Enforced ✓
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
