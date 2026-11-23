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
} from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { TeamMember, Department, Team, HierarchyNode, UserRole, MemberInviteCreate } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../../components/common/UserAvatar';

const VERIFIED_LEADERSHIP = [
  {
    name: 'Ian Momanyi Nyakundi',
    title: 'Chief Executive Officer',
    role: 'owner',
    email: 'ian@solian.ai',
    department: 'Executive Office',
    focus: 'Corporate Vision, Strategic Partnerships, Capital Allocation & Solian Wolves Governance',
  },
  {
    name: 'Hillary Onchwati Isaiah',
    title: 'Chief Operating Officer',
    role: 'admin',
    email: 'hillary@solian.ai',
    department: 'Operations',
    focus: 'Operational Excellence, Cross-Division Execution, Program Delivery & Tactical Command',
  },
  {
    name: 'Alice Moraa Nyakundi',
    title: 'Chief Financial Officer',
    role: 'admin',
    email: 'alice@solian.ai',
    department: 'Finance',
    focus: 'Fiscal Strategy, Financial Controls, Treasury Management & Commercial Intelligence',
  },
  {
    name: 'Noella Maraka Kaatho',
    title: 'Executive Director / Finance & Administration',
    role: 'admin',
    email: 'noella@solian.ai',
    department: 'Administration',
    focus: 'Institutional Compliance, Strategic Administration, Human Capital & Resource Governance',
  },
  {
    name: 'Solomon Nyangweso Omwenga',
    title: 'Chief Technology Officer',
    role: 'admin',
    email: 'solomon@solian.ai',
    department: 'Technology',
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

  // Invite Member Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState('Technology');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');
  const [inviteTitle, setInviteTitle] = useState('');
  const [inviteResponsibilities, setInviteResponsibilities] = useState('');
  const [inviting, setInviting] = useState(false);

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
    deactivated: 'bg-red-500/20 text-red-400 border-red-500/30',
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

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const resp = await SolianApiClient.inviteMember({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        department: inviteDepartment,
        role: inviteRole,
        title: inviteTitle.trim() || 'Operational Specialist',
        responsibilities: inviteResponsibilities
          ? inviteResponsibilities.split(',').map((r) => r.trim()).filter(Boolean)
          : undefined,
      });
      alert(`Member ${resp.name} (${resp.email}) invited successfully`);
      setIsInviteOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInviteTitle('');
      setInviteResponsibilities('');
      await loadData();
    } catch (err: any) {
      alert(`Invitation error: ${err.message || 'Unknown error'}`);
    } finally {
      setInviting(false);
    }
  };

  const handleStatusChange = async (memberId: string, newStatus: TeamMember['status']) => {
    try {
      await SolianApiClient.updateMemberStatus(memberId, newStatus);
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, status: newStatus } : m))
      );
    } catch (err: any) {
      alert(`Status update error: ${err.message || 'Unknown error'}`);
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
              Organization Structure & Staff Directory
            </h2>
          </div>
          <p className="text-xs md:text-sm text-graphite-300">
            Operating units, departmental leadership, job responsibilities, and organizational hierarchy for Solian Wolves.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {hasRole('admin') && (
            <button
              onClick={() => setIsInviteOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gold-400 transition cursor-pointer shadow-glow-gold shrink-0"
            >
              <UserPlus className="w-4 h-4" /> Invite Staff Member
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
              className="px-4 py-2.5 rounded-xl bg-solian-surface hover:bg-solian-card text-gold-400 border border-gold-500/30 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shrink-0"
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
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            activeTab === 'members'
              ? 'bg-solian-card text-gold-400 border border-gold-500/40 shadow-glow-subtle'
              : 'text-graphite-400 hover:text-white'
          }`}
        >
          Staff & Member Directory ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            activeTab === 'departments'
              ? 'bg-solian-card text-gold-400 border border-gold-500/40 shadow-glow-subtle'
              : 'text-graphite-400 hover:text-white'
          }`}
        >
          Departments & Teams ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
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
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="border-b border-solian-border text-[11px] font-bold uppercase tracking-wider text-graphite-400 bg-solian-surface">
                  <th className="py-3.5 px-4">Member & Title</th>
                  <th className="py-3.5 px-4">Department & Team</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Role Clearance</th>
                  <th className="py-3.5 px-4">Reports To</th>
                  <th className="py-3.5 px-4">Responsibilities</th>
                  {hasRole('admin') && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-solian-border text-xs">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={hasRole('admin') ? 7 : 6} className="py-12 text-center text-graphite-400">
                      <Users className="w-8 h-8 text-graphite-500 mx-auto mb-2" />
                      <div className="text-sm font-bold text-white">No Members Registered</div>
                      <p className="text-xs text-graphite-400 max-w-sm mx-auto mt-1">
                        No team members are currently registered in the organization directory.
                      </p>
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
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
                            <div className="text-[10px] text-graphite-500 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-gold-500/70" /> {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{member.department}</div>
                        <div className="text-[11px] text-graphite-400">{member.team || 'Leadership Council'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={member.status || 'active'}
                          onChange={(e) => handleStatusChange(member.id, e.target.value as TeamMember['status'])}
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-transparent cursor-pointer focus:outline-none ${
                            statusColors[member.status || 'active'] || statusColors.active
                          }`}
                        >
                          <option value="active" className="bg-solian-card text-emerald-400">Active</option>
                          <option value="away" className="bg-solian-card text-amber-400">Away</option>
                          <option value="offline" className="bg-solian-card text-zinc-400">Offline</option>
                          <option value="deactivated" className="bg-solian-card text-red-400">Deactivated</option>
                        </select>
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
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {member.responsibilities && member.responsibilities.length > 0 ? (
                            member.responsibilities.map((resp, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-1.5 py-0.2 rounded bg-solian-surface text-slate-300 border border-solian-border"
                              >
                                {resp}
                              </span>
                            ))
                          ) : (
                            <span className="text-graphite-500 text-[10px]">General Execution</span>
                          )}
                        </div>
                      </td>
                      {hasRole('admin') && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedMember(member);
                              setNewRole(member.role);
                            }}
                            className="text-gold-400 hover:text-gold-300 font-semibold text-xs cursor-pointer"
                          >
                            Manage Role
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
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
                      <p className="text-xs text-graphite-300 mt-2 leading-relaxed">{dept.description}</p>
                    </div>
                  </div>

                  <div className="text-xs text-graphite-400 flex items-center justify-between pt-2 border-t border-solian-border">
                    <span>
                      Division Lead: <span className="text-slate-200 font-semibold">{dept.leadName}</span>
                    </span>
                    <span className="font-mono text-gold-400">
                      {dept.memberCount} Staff • {dept.activeInitiatives} Initiatives
                    </span>
                  </div>

                  {/* Child Teams */}
                  {deptTeams.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">
                        Operational Teams
                      </div>
                      <div className="space-y-1.5">
                        {deptTeams.map((team) => (
                          <div
                            key={team.id}
                            className="p-2.5 rounded-lg bg-solian-surface border border-solian-border/70 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-semibold text-slate-200">{team.name}</div>
                              <div className="text-[10px] text-graphite-400">
                                Focus: {team.focusArea} • Lead: {team.leadName}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-solian-card px-2 py-0.5 rounded">
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
        <div className="p-6 rounded-2xl bg-solian-card border border-solian-border space-y-4 shadow-card-elevation">
          <div className="flex items-center justify-between pb-3 border-b border-solian-border">
            <div className="flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-gold-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Organizational Chain of Command
              </h3>
            </div>
            <span className="text-xs text-graphite-400">Executive Reporting Structure</span>
          </div>

          <div className="space-y-3 pt-2">
            {hierarchy.map((root) => renderHierarchyNode(root))}
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleUpdateRole}
            className="bg-solian-card border border-gold-500/40 max-w-md w-full rounded-2xl p-6 md:p-8 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-solian-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-gold-500" />
                <h3 className="text-base font-bold text-white">Manage Member Clearance</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="text-graphite-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-solian-surface border border-solian-border">
                <div className="font-bold text-white">{selectedMember.name}</div>
                <div className="text-graphite-400">{selectedMember.title}</div>
                <div className="text-graphite-400">{selectedMember.department}</div>
                <div className="text-gold-400 font-mono mt-1">Current Tier: {selectedMember.role.toUpperCase()}</div>
              </div>

              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Assign Role Tier</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 uppercase font-semibold"
                >
                  <option value="owner" disabled={user.role !== 'owner'}>
                    Owner (Executive Authority)
                  </option>
                  <option value="admin">Admin (Engineering & Operations VP)</option>
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
                className="px-4 py-2 rounded-xl bg-solian-surface hover:bg-solian-border text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingRole}
                className="px-5 py-2 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase hover:bg-gold-400 transition shadow-glow-gold cursor-pointer disabled:opacity-50"
              >
                {updatingRole ? 'Updating...' : 'Save Role Clearance'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleInviteMember}
            className="bg-solian-card border border-gold-500/40 max-w-lg w-full rounded-2xl p-6 md:p-8 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-solian-border pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-gold-500" />
                <h3 className="text-base font-bold text-white">Invite Staff Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="text-graphite-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Full Name</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Victor Ndwiga"
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                  />
                </div>
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Corporate Email</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. victor@solian.ai"
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Department</label>
                  <select
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                  >
                    <option value="Executive Office">Executive Office</option>
                    <option value="Technology">Technology</option>
                    <option value="Operations">Operations</option>
                    <option value="Finance">Finance</option>
                    <option value="Administration">Administration</option>
                    <option value="Client Engagements">Client Engagements</option>
                  </select>
                </div>
                <div>
                  <label className="text-graphite-300 block mb-1 font-semibold">Role Tier</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50 uppercase font-semibold"
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                    <option value="admin" disabled={user.role !== 'owner' && user.role !== 'admin'}>Admin</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Job Title</label>
                <input
                  type="text"
                  value={inviteTitle}
                  onChange={(e) => setInviteTitle(e.target.value)}
                  placeholder="e.g. Senior Distributed Systems Engineer"
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>

              <div>
                <label className="text-graphite-300 block mb-1 font-semibold">Key Responsibilities (Comma separated)</label>
                <input
                  type="text"
                  value={inviteResponsibilities}
                  onChange={(e) => setInviteResponsibilities(e.target.value)}
                  placeholder="e.g. Backend API, PostgreSQL Migrations, Security Hardening"
                  className="w-full bg-solian-surface border border-solian-border rounded-lg p-2.5 text-white focus:outline-none focus:border-gold-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-solian-border">
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="px-4 py-2 rounded-xl bg-solian-surface hover:bg-solian-border text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviting}
                className="px-5 py-2 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase hover:bg-gold-400 transition shadow-glow-gold cursor-pointer disabled:opacity-50"
              >
                {inviting ? 'Inviting...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
