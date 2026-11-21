import {
  UserProfile,
  Organization,
  ChatMessage,
  KnowledgeItem,
  TeamMember,
  Project,
  TaskItem,
  ClientAccount,
  CorporateDocument,
  WorkflowRule,
  DashboardStats,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export class SolianApiClient {
  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!res.ok) {
      throw new Error(`API Error [${res.status}]: ${res.statusText}`);
    }
    return res.json();
  }

  // Dashboard
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      return await this.request<DashboardStats>('/dashboard/stats');
    } catch {
      return {
        activeStaffCount: 28,
        activeProjectsCount: 14,
        openOperationsCount: 42,
        knowledgeEntitiesCount: 184,
        aiQueriesThisMonth: 1420,
        operationsVelocity: '+18.4%',
      };
    }
  }

  // Knowledge Vault
  static async getKnowledgeItems(query?: string): Promise<KnowledgeItem[]> {
    try {
      const q = query ? `?q=${encodeURIComponent(query)}` : '';
      return await this.request<KnowledgeItem[]>(`/knowledge/items${q}`);
    } catch {
      return [
        {
          id: 'sop-001',
          title: 'Enterprise Incident Escalation Framework (SOP-401)',
          category: 'SOP',
          snippet: 'Protocol for Severity-1 operational bottlenecks, client notification SLAs, and executive escalation trees.',
          content: 'Full operational standard operating procedure for Solian business incidents.',
          updatedAt: '2026-11-20',
          author: 'Operations Director',
          tags: ['incident', 'SLA', 'escalation', 'executive'],
        },
        {
          id: 'pol-002',
          title: 'Corporate Data Classification & Access Governance',
          category: 'Compliance',
          snippet: 'Mandatory controls for Confidential and Restricted business records, RBAC tiers, and AI boundary isolation.',
          content: 'Guidelines on ensuring strict tenant boundaries and preserving enterprise IP.',
          updatedAt: '2026-11-18',
          author: 'Chief Risk Officer',
          tags: ['security', 'compliance', 'RBAC', 'data-governance'],
        },
        {
          id: 'pb-003',
          title: 'High-Value Client Onboarding & Stakeholder Kickoff',
          category: 'Playbook',
          snippet: 'Step-by-step engagement ritual from contract signing to milestone-0 delivery review.',
          content: 'Client onboarding protocol for enterprise accounts.',
          updatedAt: '2026-11-15',
          author: 'Head of Client Services',
          tags: ['clients', 'onboarding', 'milestones'],
        },
      ];
    }
  }

  // Teams & Staff
  static async getTeamMembers(): Promise<TeamMember[]> {
    try {
      return await this.request<TeamMember[]>('/teams/members');
    } catch {
      return [
        { id: 'tm-1', name: 'Solomon K.', email: 'solomon@solian.ai', role: 'admin', department: 'Executive Leadership', status: 'active', assignedProjects: 5 },
        { id: 'tm-2', name: 'Sarah Chen', email: 's.chen@solian.ai', role: 'manager', department: 'Engineering & AI Ops', status: 'active', assignedProjects: 4 },
        { id: 'tm-3', name: 'Marcus Vance', email: 'm.vance@solian.ai', role: 'manager', department: 'Strategic Accounts', status: 'active', assignedProjects: 3 },
        { id: 'tm-4', name: 'Elena Rostova', email: 'e.rostova@solian.ai', role: 'member', department: 'Product Architecture', status: 'away', assignedProjects: 2 },
        { id: 'tm-5', name: 'David Ochieng', email: 'd.ochieng@solian.ai', role: 'member', department: 'Data Intelligence', status: 'active', assignedProjects: 3 },
        { id: 'tm-6', name: 'Aria Thorne', email: 'a.thorne@solian.ai', role: 'guest', department: 'External Advisory', status: 'offline', assignedProjects: 1 },
      ];
    }
  }

  // Projects
  static async getProjects(): Promise<Project[]> {
    try {
      return await this.request<Project[]>('/projects');
    } catch {
      return [
        { id: 'p-101', name: 'Project Apex: Autonomous Supply Sync', client: 'Meridian Logistics', status: 'in_progress', progress: 68, lead: 'Sarah Chen', dueDate: '2026-12-15', priority: 'critical' },
        { id: 'p-102', name: 'Solian Intelligence Mesh Rollout', client: 'Internal Enterprise', status: 'in_progress', progress: 85, lead: 'Solomon K.', dueDate: '2026-11-30', priority: 'high' },
        { id: 'p-103', name: 'Compliance Vault Migration & SOC2', client: 'Aether Capital', status: 'review', progress: 92, lead: 'Elena Rostova', dueDate: '2026-12-05', priority: 'high' },
        { id: 'p-104', name: 'Automated Operations Triage Engine', client: 'Vanguard Group', status: 'planning', progress: 25, lead: 'Marcus Vance', dueDate: '2027-01-10', priority: 'medium' },
      ];
    }
  }

  // Tasks
  static async getTasks(): Promise<TaskItem[]> {
    try {
      return await this.request<TaskItem[]>('/tasks');
    } catch {
      return [
        { id: 't-1', title: 'Synthesize Q4 Operations Review for Board', description: 'Compile departmental deliverables and AI cost efficiencies.', status: 'in_progress', priority: 'urgent', assignee: 'Solomon K.', dueDate: 'Today' },
        { id: 't-2', title: 'Audit Multi-Tenant RBAC Security Matrix', description: 'Verify boundary isolation between departments and guest credentials.', status: 'review', priority: 'high', assignee: 'Sarah Chen', dueDate: 'Tomorrow' },
        { id: 't-3', title: 'Update Client Escalation Playbook', description: 'Incorporate new automated SMS & email dispatch triggers.', status: 'backlog', priority: 'medium', assignee: 'Marcus Vance', dueDate: 'Nov 28' },
        { id: 't-4', title: 'Finalize Institutional Knowledge Ingestion', description: 'Index corporate handbooks into vector memory store.', status: 'completed', priority: 'high', assignee: 'David Ochieng', dueDate: 'Completed' },
      ];
    }
  }

  // Clients
  static async getClients(): Promise<ClientAccount[]> {
    try {
      return await this.request<ClientAccount[]>('/clients');
    } catch {
      return [
        { id: 'c-1', companyName: 'Meridian Global Logistics', contactPerson: 'Alister Sterling', email: 'a.sterling@meridian.com', status: 'active', contractValue: '$240,000 / yr', leadAccountManager: 'Marcus Vance' },
        { id: 'c-2', companyName: 'Aether Capital Partners', contactPerson: 'Beatrice Holt', email: 'b.holt@aethercap.com', status: 'retained', contractValue: '$360,000 / yr', leadAccountManager: 'Solomon K.' },
        { id: 'c-3', companyName: 'Vanguard Industrial Systems', contactPerson: 'Robert Drake', email: 'rdrake@vanguardind.com', status: 'contract_pending', contractValue: '$180,000 / yr', leadAccountManager: 'Marcus Vance' },
      ];
    }
  }

  // Documents
  static async getDocuments(): Promise<CorporateDocument[]> {
    try {
      return await this.request<CorporateDocument[]>('/documents');
    } catch {
      return [
        { id: 'doc-1', name: 'Solian Master Services Agreement (MSA) Template 2026.pdf', type: 'PDF Document', size: '2.4 MB', classification: 'Confidential', updatedAt: '2026-11-19', owner: 'Legal & Risk' },
        { id: 'doc-2', name: 'Enterprise Architecture & Data Security Whitepaper.pdf', type: 'PDF Document', size: '5.1 MB', classification: 'Internal', updatedAt: '2026-11-14', owner: 'Architecture' },
        { id: 'doc-3', name: 'Q3 Executive Operations & Financial Synthesis.xlsx', type: 'Spreadsheet', size: '1.2 MB', classification: 'Restricted', updatedAt: '2026-10-31', owner: 'Executive Board' },
      ];
    }
  }

  // Workflows
  static async getWorkflows(): Promise<WorkflowRule[]> {
    try {
      return await this.request<WorkflowRule[]>('/workflows');
    } catch {
      return [
        { id: 'wf-1', title: 'High-Priority Client Escalation Auto-Triage', trigger: 'Client urgency flag in support desk', action: 'Notify Director + Auto-create P1 Incident in Solian Tasks', status: 'active', executionCount: 124 },
        { id: 'wf-2', title: 'Weekly Executive Intelligence Digest', trigger: 'Every Friday at 17:00 UTC', action: 'Compile project velocities, unblockers & budget status', status: 'active', executionCount: 52 },
        { id: 'wf-3', title: 'Knowledge Drift & Stale Policy Audit', trigger: 'Document untouched for > 90 days', action: 'Assign verification ticket to department author', status: 'active', executionCount: 18 },
      ];
    }
  }
}
