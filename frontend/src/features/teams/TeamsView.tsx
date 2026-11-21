import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Mail, CheckCircle2 } from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { TeamMember, UserRole } from '../../types';

export const TeamsView: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    SolianApiClient.getTeamMembers().then(setMembers);
  }, []);

  const roleBadges: Record<UserRole, string> = {
    owner: 'bg-gold-500/20 text-gold-400 border-gold-500/40',
    admin: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    manager: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    member: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    guest: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40',
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-gold-500" />
            <h2 className="text-xl font-bold text-white">Staff Directory & Access Governance</h2>
          </div>
          <p className="text-xs text-graphite-300">
            Manage organization members, assign role-based permissions (RBAC), and review departmental alignment.
          </p>
        </div>

        <button className="px-4 py-2 rounded-lg bg-gold-500 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-gold-400 transition">
          <UserPlus className="w-4 h-4" /> Invite Staff Member
        </button>
      </div>

      <div className="bg-solian-card rounded-xl border border-solian-border overflow-hidden shadow-card-elevation">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-solian-border text-[11px] font-bold uppercase tracking-wider text-graphite-400 bg-solian-surface">
              <th className="py-3 px-4">Staff Member</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Role Tier</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Active Projects</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-solian-border text-xs">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-solian-surface/50 transition">
                <td className="py-3 px-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-solian-surface border border-gold-500/30 text-gold-400 font-bold flex items-center justify-center">
                    {member.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">{member.name}</div>
                    <div className="text-[11px] text-graphite-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {member.email}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-300">{member.department}</td>
                <td className="py-3 px-4">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${roleBadges[member.role]}`}>
                    {member.role}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                    member.status === 'active' ? 'text-emerald-400' :
                    member.status === 'away' ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      member.status === 'active' ? 'bg-emerald-400' :
                      member.status === 'away' ? 'bg-amber-400' : 'bg-slate-400'
                    }`}></span>
                    {member.status}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-slate-300">{member.assignedProjects}</td>
                <td className="py-3 px-4 text-right">
                  <button className="text-gold-400 hover:text-gold-300 font-semibold text-[11px]">
                    Manage Access
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

