export type UserRole = 'owner' | 'admin' | 'manager' | 'member' | 'guest';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  title: string;
  role: UserRole;
  avatarUrl?: string;
  department: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  tagline: string;
  tier: 'enterprise' | 'growth' | 'standard';
  logoUrl?: string;
  totalMembers: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  contextSources?: string[];
  actionProposals?: ActionProposal[];
}

export interface ActionProposal {
  id: string;
  title: string;
  type: 'create_task' | 'draft_sop' | 'brief_team' | 'schedule_review';
  payload: Record<string, any>;
  status: 'pending' | 'accepted' | 'dismissed';
}

export interface KnowledgeItem {
  id: string;
  title: string;
  category: 'SOP' | 'Policy' | 'Playbook' | 'Architecture' | 'Compliance';
  snippet: string;
  content: string;
  updatedAt: string;
  author: string;
  tags: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: 'active' | 'away' | 'offline';
  assignedProjects: number;
}

export interface Project {
  id: string;
  name: string;
  client?: string;
  status: 'planning' | 'in_progress' | 'review' | 'delivered';
  progress: number;
  lead: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  projectId?: string;
  status: 'backlog' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  dueDate: string;
}

export interface ClientAccount {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  status: 'prospect' | 'active' | 'contract_pending' | 'retained';
  contractValue: string;
  leadAccountManager: string;
}

export interface CorporateDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  classification: 'Public' | 'Internal' | 'Confidential' | 'Restricted';
  updatedAt: string;
  owner: string;
}

export interface WorkflowRule {
  id: string;
  title: string;
  trigger: string;
  action: string;
  status: 'active' | 'paused';
  executionCount: number;
}

export interface DashboardStats {
  activeStaffCount: number;
  activeProjectsCount: number;
  openOperationsCount: number;
  knowledgeEntitiesCount: number;
  aiQueriesThisMonth: number;
  operationsVelocity: string;
}

