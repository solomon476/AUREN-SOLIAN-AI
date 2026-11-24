import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  CheckCircle2,
  Building2,
  GitMerge,
  Layers,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  X,
  Crown,
  Sparkles,
  Award,
  Phone,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  AlertTriangle,
  Key,
  UserCheck,
  UserX,
} from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { TeamMember, Department, Team, HierarchyNode, UserRole, AccountActivationStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../../components/common/UserAvatar';

const VERIFIED_LEADERSHIP = [
  {
    name: 'Ian Momanyi Nyakundi',
    title: 'Chief Executive Officer',
    role: 'owner',
    email: 'ian.nyakundi@solianwolves.co',
    department: 'Executive Leadership & Governance',
    focus: 'Corporate Vision, Strategic Partnerships, Capital Allocation & Solian Wolves Governance',
  },
  {
    name: 'Hillary Onchwati Isaiah',
    title: 'Chief Operating Officer',
    role: 'admin',
    email: 'hillary.isaiah@solianwolves.co',
    department: 'Operations & Delivery',
    focus: 'Operational Excellence, Cross-Division Execution, Program Delivery & Tactical Command',
  },
  {
    name: 'Alice Moraa Nyakundi',
    title: 'Chief Financial Officer',
    role: 'admin',
    email: 'alice.moraa@solianwolves.co',
    department: 'Finance & Corporate Treasury',
    focus: 'Fiscal Strategy, Financial Controls, Treasury Management & Commercial Intelligence',
  },
  {
    name: 'Noella Maraka Kaatho',
    title: 'Executive Director / Finance & Administration',
    role: 'manager',
    email: 'noella.maraka@solianwolves.co',
    department: 'Administration & Corporate Services',
    focus: 'Institutional Compliance, Strategic Administration, Human Capital & Resource Governance',
  },
  {
    name: 'Solomon Nyangweso Omwenga',
    title: 'Chief Technology Officer',
    role: 'admin',
    email: 'solomon.omwenga@solianwolves.co',
    department: 'Technology & AI Systems',
    focus: 'Autonomous AI Architecture, Solian Wolves Mesh, Cloud Security & Engineering Standards',
  },
];

export const TeamsView: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'departments' | 'hierarchy'>('members');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
  const [loading, setLoading] = useState(true);

  // Manage Role Modal
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('member');
  const [updatingRole, setUpdatingRole] = useState(false);

  // Add / Provision Personnel Modal
  const [isAddPersonnelOpen, setIsAddPersonnelOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addDepartment, setAddDepartment] = useState('Technology & AI Systems');
  const [addRole, setAddRole] = useState<UserRole>('member');
  const [addTitle, setAddTitle] = useState('');
  const [addResponsibilities, setAddResponsibilities] = useState('');
  const [addingPersonnel, setAddingPersonnel] = useState(false);

  // Edit Personnel Modal
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editResponsibilities, setEditResponsibilities] = useState('');
  const [updatingPersonnel, setUpdatingPersonnel] = useState(false);

  // Invitation Modal
  const [invitationModalData, setInvitationModalData] = useState<{
    memberId: string;
    name: string;
    email?: string;
    role: string;
    token: string;
    url: string;
    expiresAt: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingInviteId, setGeneratingInviteId] = useState<string | null>(null);

  const roleBadges: Record<UserRole, string> = {
    owner: 'bg-gold-500/20 text-gold-400 border-gold-500/40',
    admin: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    manager: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    member: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    guest: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    away: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    offline: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    suspended: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    deactivated: 'bg-rose-500/20 text-rose-400 border-red-500/30',
  };

  const activationBadges: Record<string, { label: string; className: string }> = {
    created: { label: 'Created (Pending Setup)', className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
    invitation_pending: { label: 'Invite Pending', className: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
    invitation_sent: { label: 'Invite Sent', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    activated: { label: 'Activated', className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
    active: { label: 'Active Personnel', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    suspended: { label: 'Account Suspended', className: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, d, t, h] = await Promise.all([
        SolianApiClient.getTeamMembers(),
        SolianApiClient.getDepartments(),
        SolianApiClient.getTeams(),
        SolianApiClient.getHierarchy(),
      ]);
      setMembers(m);
      setDepartments(d);
      setTeams(t);
      setHierarchy(h);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setUpdatingRole(true);
    try {
      await SolianApiClient.updateMemberRole(selectedMember.id, newRole);
      setSelectedMember(null);
      await loadData();
    } catch (err: any) {
      alert(`Role update error: ${err.message || 'Unknown error'}`);
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleCreatePersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addTitle.trim()) {
      alert('Please provide the employee full name and job title.');
      return;
    }
    setAddingPersonnel(true);
    try {
      await SolianApiClient.createPersonnel({
        name: addName.trim(),
        email: addEmail.trim() ? addEmail.trim() : undefined,
        phone: addPhone.trim() ? addPhone.trim() : undefined,
        department: addDepartment,
        role: addRole,
        title: addTitle.trim(),
        responsibilities: addResponsibilities
          ? addResponsibilities.split(',').map((r) => r.trim()).filter(Boolean)
          : undefined,
      });
      setIsAddPersonnelOpen(false);
      setAddName('');
      setAddEmail('');
      setAddPhone('');
      setAddTitle('');
      setAddResponsibilities('');
      await loadData();
    } catch (err: any) {
      alert(`Personnel creation error: ${err.message || 'Unknown error'}`);
    } finally {
      setAddingPersonnel(false);
    }
  };

  const handleOpenEdit = (m: TeamMember) => {
    setEditMember(m);
    setEditName(m.name);
    setEditEmail(m.email || '');
    setEditPhone(m.phone || '');
    setEditTitle(m.title);
    setEditDepartment(m.department);
    setEditResponsibilities(m.responsibilities ? m.responsibilities.join(', ') : '');
  };

  const handleUpdatePersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMember) return;
    setUpdatingPersonnel(true);
    try {
      await SolianApiClient.updatePersonnel(editMember.id, {
        name: editName.trim(),
        email: editEmail.trim() ? editEmail.trim() : undefined,
        phone: editPhone.trim() ? editPhone.trim() : undefined,
        title: editTitle.trim(),
        department: editDepartment.trim(),
        responsibilities: editResponsibilities
          ? editResponsibilities.split(',').map((r) => r.trim()).filter(Boolean)
          : undefined,
      });
      setEditMember(null);
      await loadData();
    } catch (err: any) {
      alert(`Personnel update error: ${err.message || 'Unknown error'}`);
    } finally {
      setUpdatingPersonnel(false);
    }
  };

  const handleGenerateInvitation = async (m: TeamMember) => {
    setGeneratingInviteId(m.id);
    try {
      const resp = await SolianApiClient.generateInvitation(m.id);
      const origin = window.location.origin;
      const fullUrl = `${origin}${resp.activationUrl}`;
      setInvitationModalData({
        memberId: resp.memberId,
        name: resp.name,
        email: resp.email,
        role: resp.role,
        token: resp.invitationToken,
        url: fullUrl,
        expiresAt: resp.expiresAt,
      });
      await loadData();
    } catch (err: any) {
      alert(`Failed to generate invitation: ${err.message || 'Unknown error'}`);
    } finally {
      setGeneratingInviteId(null);
    }
  };

  const handleCopyLink = () => {
    if (!invitationModalData) return;
    navigator.clipboard.writeText(invitationModalData.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleToggleSuspend = async (m: TeamMember) => {
    const isSuspended = m.status === 'suspended' || m.activationStatus === 'suspended';
    const action = isSuspended ? 'restore' : 'suspend';
    if (!confirm(`Are you sure you want to ${action} access for ${m.name}?`)) return;

    try {
      if (isSuspended) {
        await SolianApiClient.unsuspendMember(m.id);
      } else {
        await SolianApiClient.suspendMember(m.id);
      }
      await loadData();
    } catch (err: any) {
      alert(`Operation error: ${err.message || 'Unknown error'}`);
    }
  };

  const renderHierarchyNode = (node: HierarchyNode, level: number = 0) => {
    return (
      <div key={node.id} className="space-y-2">
        <div
          className={`p-3.5 rounded-xl bg-solian-card border border-solian-border flex items-center justify-between gap-3 shadow-card-elevation ${
            level === 0 ? 'border-gold-500/40 bg-solian-surface' : ''
          }`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div className="flex items-center gap-3">
            <UserAvatar
              name={node.name}
              avatarUrl={(node as any).avatarUrl}
              role={node.role}
              size="sm"
            />
            <div>
              <div className="text-xs md:text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                {node.name}
                {node.isDemo && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    [DEMO]
                  </span>
                )}
                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${roleBadges[node.role]}`}>
                  {node.role}
                </span>
              </div>
              <div className="text-[11px] text-graphite-400">
                {node.title} • <span className="text-slate-300">{node.department}</span>
              </div>
            </div>
          </div>
        </div>

        {node.subordinates && node.subordinates.length > 0 && (
          <div className="space-y-2 relative border-l border-solian-border/50 ml-4 pl-2">
            {node.subordinates.map((sub) => renderHierarchyNode(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-gold-500" />
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Company Personnel & Staff Directory
            </h2>
          </div>
          <p className="text-xs md:text-sm text-graphite-300">
            Controlled personnel provisioning, verified identity onboarding, and departmental governance for Solian Wolves.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {hasRole('admin') && (
            <button
              onClick={() => setIsAddPersonnelOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gold-400 transition cursor-pointer shadow-glow-gold shrink-0 min-h-[44px]"
            >
              <UserPlus className="w-4 h-4" /> Add Employee
            </button>
          )}

          {hasRole('admin') && (
            <button
              onClick={() => {
                if (members.length > 0) {
                  setSelectedMember(members[0]);
                  setNewRole(members[0].role);
                }
              }}
              disabled={loading || members.length === 0}
              className="px-4 py-2.5 rounded-xl bg-solian-surface hover:bg-solian-card text-gold-400 border border-gold-500/30 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shrink-0 min-h-[44px]"
            >
              <ShieldCheck className="w-4 h-4" /> Manage Role Clearance
            </button>
          )}
        </div>
      </div>

      {/* Verified Leadership Council Showcase */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-solian-card via-solian-surface to-solian-card border border-gold-500/40 shadow-card-elevation space-y-4">
        <div className="flex items-center justify-between border-b border-solian-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gold-500/20 text-gold-400 border border-gold-500/30">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Verified Leadership Council
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono normal-case">
                  Executive Governance
                </span>
              </h3>
              <p className="text-[11px] text-graphite-400">
                Official statutory officers and operational leadership of Solian Wolves.
              </p>
            </div>
          </div>
          <Award className="w-5 h-5 text-gold-400 hidden sm:block" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {VERIFIED_LEADERSHIP.map((leader) => (
            <div
              key={leader.email}
              className="p-3.5 rounded-xl bg-solian-obsidian/70 border border-solian-border hover:border-gold-500/40 transition space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    {leader.name}
                  </div>
                  <div className="text-[11px] font-semibold text-gold-400">{leader.title}</div>
                </div>
                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${roleBadges[leader.role as UserRole]}`}>
                  {leader.role}
                </span>
              </div>
              <p className="text-[10px] text-graphite-300 line-clamp-2 leading-relaxed">
                {leader.focus}
              </p>
              <div className="pt-1.5 border-t border-solian-border/50 flex items-center justify-between text-[10px] text-graphite-400">
                <span className="text-slate-300 font-mono">{leader.email}</span>
                <span className="text-gold-400/90">{leader.department}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-solian-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[44px] ${
            activeTab === 'members'
              ? 'bg-solian-card text-gold-400 border border-gold-500/40 shadow-glow-subtle'
              : 'text-graphite-400 hover:text-white'
          }`}
        >
          Staff & Member Directory ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[44px] ${
            activeTab === 'departments'
              ? 'bg-solian-card text-gold-400 border border-gold-500/40 shadow-glow-subtle'
              : 'text-graphite-400 hover:text-white'
          }`}
        >
          Departments & Teams ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 min-h-[44px] ${
            activeTab === 'hierarchy'
              ? 'bg-solian-card text-gold-400 border border-gold-500/40 shadow-glow-subtle'
              : 'text-graphite-400 hover:text-white'
          }`}
        >
          Organizational Hierarchy Tree
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="p-12 text-center text-graphite-400 text-xs flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading organization foundation...</span>
        </div>
      ) : activeTab === 'members' ? (
        /* Members Table */
        <div className="bg-solian-card rounded-2xl border border-solian-border overflow-hidden shadow-card-elevation">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-solian-border text-[11px] font-bold uppercase tracking-wider text-graphite-400 bg-solian-surface">
                  <th className="py-3.5 px-4">Personnel & Contact</th>
                  <th className="py-3.5 px-4">Department & Unit</th>
                  <th className="py-3.5 px-4">Lifecycle State</th>
                  <th className="py-3.5 px-4">Role Clearance</th>
                  <th className="py-3.5 px-4">Reports To</th>
                  {hasRole('admin') && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-solian-border text-xs">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={hasRole('admin') ? 6 : 5} className="py-12 text-center text-graphite-400">
                      <Users className="w-8 h-8 text-graphite-500 mx-auto mb-2" />
                      <div className="text-sm font-bold text-white">No Personnel Registered</div>
                      <p className="text-xs text-graphite-400 max-w-sm mx-auto mt-1">
                        Use the "Add Employee" button above to establish the official staff directory.
                      </p>
                    </td>
                  </tr>
                ) : (
                  members.map((member) => {
                    const activation = activationBadges[member.activationStatus || 'created'] || activationBadges.created;
                    const isSuspended = member.status === 'suspended' || member.activationStatus === 'suspended';
                    return (
                      <tr key={member.id} className="hover:bg-solian-surface/50 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              name={member.name}
                              avatarUrl={member.avatarUrl}
                              role={member.role}
                              size="sm"
                            />
                            <div>
                              <div className="font-bold text-slate-100 flex items-center gap-2">
                                {member.name}
                                {member.isDemo && (
                                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                                    [DEMO]
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-graphite-400">{member.title}</div>
                              <div className="text-[10px] text-graphite-400 flex items-center gap-2 mt-0.5">
                                {member.email ? (
                                  <span className="flex items-center gap-1 font-mono text-slate-300">
                                    <Mail className="w-3 h-3 text-gold-500/70" /> {member.email}
                                  </span>
                                ) : (
                                  <span className="text-amber-400/90 italic">Email pending</span>
                                )}
                                {member.phone && (
                                  <span className="flex items-center gap-1 font-mono text-slate-400">
                                    <Phone className="w-3 h-3 text-slate-500" /> {member.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200">{member.department}</div>
                          <div className="text-[11px] text-graphite-400">{member.team || 'Executive Council'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${activation.className}`}>
                              {activation.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${roleBadges[member.role]}`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {member.reportsToName ? (
                            <span className="font-medium text-slate-200">{member.reportsToName}</span>
                          ) : (
                            <span className="text-graphite-500 italic">None (Executive Root)</span>
                          )}
                        </td>
                        {hasRole('admin') && (
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {member.activationStatus !== 'active' && (
                                <button
                                  onClick={() => handleGenerateInvitation(member)}
                                  disabled={generatingInviteId === member.id}
                                  className="px-2.5 py-1 rounded-lg bg-gold-500/15 hover:bg-gold-500/25 text-gold-400 border border-gold-500/30 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer min-h-[36px]"
                                  title="Generate cryptographic invitation link"
                                >
                                  <Key className="w-3 h-3" />
                                  {generatingInviteId === member.id ? 'Generating...' : 'Invite'}
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEdit(member)}
                                className="px-2.5 py-1 rounded-lg bg-solian-surface hover:bg-solian-border text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer min-h-[36px]"
                                title="Edit employee contact details"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedMember(member);
                                  setNewRole(member.role);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-solian-surface hover:bg-solian-border text-purple-400 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer min-h-[36px]"
                                title="Manage Role Clearance"
                              >
                                <Shield className="w-3 h-3" /> Role
                              </button>
                              {member.role !== 'owner' && (
                                <button
                                  onClick={() => handleToggleSuspend(member)}
                                  className={`p-1.5 rounded-lg border text-[11px] transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
                                    isSuspended
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                                  }`}
                                  title={isSuspended ? 'Restore account' : 'Suspend account'}
                                >
                                  {isSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'departments' ? (
        /* Departments & Teams View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map((dept) => {
              const deptTeams = teams.filter((t) => t.departmentId === dept.id);
              return (
                <div
                  key={dept.id}
                  className="p-6 rounded-2xl bg-solian-card border border-solian-border space-y-4 shadow-card-elevation"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-gold-400 bg-solian-surface px-2 py-0.5 rounded border border-solian-border">
                          {dept.code}
                        </span>
                        <h3 className="text-base font-bold text-white">{dept.name}</h3>
                        {dept.isDemo && (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                            [DEMO]
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-graphite-300 mt-1">{dept.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-solian-border">
                    <div className="p-3 rounded-xl bg-solian-surface border border-solian-border">
                      <div className="text-graphite-400 text-[10px] uppercase font-semibold">Department Head</div>
                      <div className="text-slate-200 font-bold mt-0.5">{dept.leadName}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-solian-surface border border-solian-border">
                      <div className="text-graphite-400 text-[10px] uppercase font-semibold">Active Members</div>
                      <div className="text-gold-400 font-bold mt-0.5">{dept.memberCount} Staff</div>
                    </div>
                  </div>

                  {deptTeams.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-graphite-400">
                        Operational Teams ({deptTeams.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {deptTeams.map((team) => (
                          <div
                            key={team.id}
                            className="p-3 rounded-xl bg-solian-obsidian/60 border border-solian-border flex items-center justify-between"
                          >
                            <div>
                              <div className="text-xs font-bold text-white">{team.name}</div>
                              <div className="text-[10px] text-graphite-400">Lead: {team.leadName}</div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-solian-card text-gold-400 border border-solian-border">
                              {team.memberCount} members
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Hierarchy Tree View */
        <div className="bg-solian-card rounded-2xl border border-solian-border p-6 shadow-card-elevation space-y-6">
          <div className="border-b border-solian-border pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-gold-500" />
              Organizational Command & Reporting Structure
            </h3>
            <p className="text-xs text-graphite-400 mt-0.5">
              Strict authority chains and supervisory alignments across Solian Wolves operating divisions.
            </p>
          </div>

          <div className="space-y-3">
            {hierarchy.map((rootNode) => renderHierarchyNode(rootNode, 0))}
          </div>
        </div>
      )}

      {/* Add / Provision Personnel Modal */}
      {isAddPersonnelOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreatePersonnel}
            className="bg-solian-card border border-gold-500/40 max-w-lg w-full rounded-2xl p-6 md:p-8 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-solian-border pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-gold-500" />
                <h3 className="text-base font-bold text-white">Add Company Personnel</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPersonnelOpen(false)}
                className="text-graphite-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-graphite-300">
              Establish a company personnel record in the staff directory. Contact info can be supplied now or updated later.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Victor Ndwiga"
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    placeholder="e.g. AI Systems Engineer"
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Corporate Email (Optional)</label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="e.g. victor@solianwolves.co"
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder="e.g. +254 700 000 000"
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Department</label>
                  <select
                    value={addDepartment}
                    onChange={(e) => setAddDepartment(e.target.value)}
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                  >
                    <option value="Executive Leadership & Governance">Executive Leadership & Governance</option>
                    <option value="Operations & Delivery">Operations & Delivery</option>
                    <option value="Finance & Corporate Treasury">Finance & Corporate Treasury</option>
                    <option value="Administration & Corporate Services">Administration & Corporate Services</option>
                    <option value="Technology & AI Systems">Technology & AI Systems</option>
                  </select>
                </div>
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">System Role</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as UserRole)}
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 uppercase font-semibold min-h-[44px]"
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                    <option value="admin" disabled={user.role !== 'owner' && user.role !== 'admin'}>Admin</option>
                    <option value="owner" disabled={user.role !== 'owner'}>Owner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Responsibilities (Comma separated)</label>
                <input
                  type="text"
                  value={addResponsibilities}
                  onChange={(e) => setAddResponsibilities(e.target.value)}
                  placeholder="e.g. Backend Architecture, Database Migrations, API Auditing"
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-solian-border">
              <button
                type="button"
                onClick={() => setIsAddPersonnelOpen(false)}
                className="px-4 py-2 rounded-xl bg-solian-surface hover:bg-solian-border text-slate-300 text-xs font-semibold transition cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingPersonnel}
                className="px-5 py-2 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase hover:bg-gold-400 transition shadow-glow-gold cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {addingPersonnel ? 'Creating...' : 'Create Personnel Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Personnel Modal */}
      {editMember && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleUpdatePersonnel}
            className="bg-solian-card border border-gold-500/40 max-w-lg w-full rounded-2xl p-6 md:p-8 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-solian-border pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-gold-500" />
                <h3 className="text-base font-bold text-white">Edit Personnel Record</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditMember(null)}
                className="text-graphite-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Official Corporate Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="e.g. employee@solianwolves.co"
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. +254 700 000 000"
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Department</label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Key Responsibilities</label>
                <input
                  type="text"
                  value={editResponsibilities}
                  onChange={(e) => setEditResponsibilities(e.target.value)}
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-solian-border">
              <button
                type="button"
                onClick={() => setEditMember(null)}
                className="px-4 py-2 rounded-xl bg-solian-surface hover:bg-solian-border text-slate-300 text-xs font-semibold transition cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingPersonnel}
                className="px-5 py-2 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase hover:bg-gold-400 transition shadow-glow-gold cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {updatingPersonnel ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Generated Invitation Link Modal */}
      {invitationModalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-solian-card border border-gold-500/50 max-w-lg w-full rounded-2xl p-6 md:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-solian-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gold-500/20 text-gold-400 border border-gold-500/30">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Employee Onboarding Invitation</h3>
                  <p className="text-xs text-graphite-400">Cryptographic one-time account activation link</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInvitationModalData(null)}
                className="text-graphite-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-solian-surface border border-solian-border space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-graphite-400">Personnel:</span>
                <span className="font-bold text-white">{invitationModalData.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-graphite-400">Assigned Clearance:</span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${roleBadges[invitationModalData.role as UserRole]}`}>
                  {invitationModalData.role}
                </span>
              </div>
              {invitationModalData.email && (
                <div className="flex justify-between items-center">
                  <span className="text-graphite-400">Corporate Email:</span>
                  <span className="font-mono text-slate-300">{invitationModalData.email}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-graphite-400">Expires:</span>
                <span className="text-amber-400 font-mono text-[11px]">{new Date(invitationModalData.expiresAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">One-Time Activation URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={invitationModalData.url}
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-xs text-slate-200 font-mono select-all focus:outline-none min-h-[44px]"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-gold-400 transition cursor-pointer shrink-0 min-h-[44px]"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-gold-500/10 border border-gold-500/20 text-xs text-graphite-300 space-y-1">
              <span className="font-semibold text-gold-400 block">Security Notice:</span>
              <p>
                Provide this link securely to {invitationModalData.name}. Upon opening, they will choose their password, activate their verified corporate clearance, and access AUREN SOLIAN.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-solian-border">
              <button
                type="button"
                onClick={() => setInvitationModalData(null)}
                className="px-5 py-2.5 rounded-xl bg-solian-surface hover:bg-solian-border text-white text-xs font-semibold transition cursor-pointer min-h-[44px]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleUpdateRole}
            className="bg-solian-card border border-solian-border max-w-md w-full rounded-2xl p-6 md:p-8 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-solian-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-gold-500" />
                <h3 className="text-base font-bold text-white">Adjust Clearance Role</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="text-graphite-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-solian-surface border border-solian-border">
                <div className="text-graphite-400 text-[10px] uppercase font-semibold">Staff Member</div>
                <div className="text-slate-100 font-bold text-sm mt-0.5">{selectedMember.name}</div>
                <div className="text-graphite-400 text-[11px]">{selectedMember.title} • {selectedMember.department}</div>
              </div>

              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">System Authority Clearance</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 uppercase font-semibold min-h-[44px]"
                >
                  <option value="owner" disabled={user.role !== 'owner'}>
                    Owner (Executive Governance Superuser)
                  </option>
                  <option value="admin" disabled={user.role !== 'owner' && user.role !== 'admin'}>
                    Admin (Engineering & Operations VP)
                  </option>
                  <option value="manager">Manager (Departmental Lead)</option>
                  <option value="member">Member (Core Staff)</option>
                  <option value="guest">Guest (External Advisor)</option>
                </select>
                <p className="text-[10px] text-graphite-400 mt-1">
                  Validated on backend: permissions strictly limit role assignment.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-solian-border">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 rounded-xl bg-solian-surface hover:bg-solian-border text-slate-300 text-xs font-semibold transition cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingRole}
                className="px-5 py-2 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase hover:bg-gold-400 transition shadow-glow-gold cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {updatingRole ? 'Updating...' : 'Save Role Clearance'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
