export type UserRole = 'owner' | 'admin' | 'manager' | 'member' | 'guest';

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  title: string;
  role: UserRole;
  avatarUrl?: string;
  department: string;
  responsibilities?: string[];
  reportsTo?: string | null;
  authMode?: string;
  isDemoUser?: boolean;
  isDemo?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  tagline: string;
  mission?: string;
  vision?: string;
  operating_model?: string;
  headquarters?: string;
  founded_year?: number;
  primary_timezone?: string;
  fiscal_year?: string;
  tier: 'enterprise' | 'growth' | 'standard';
  logoUrl?: string;
  totalMembers: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  leadId?: string;
  leadName: string;
  memberCount: number;
  activeInitiatives: number;
  isDemo?: boolean;
}

export interface Team {
  id: string;
  departmentId: string;
  departmentName: string;
  name: string;
  leadName: string;
  description: string;
  focusArea: string;
  memberCount: number;
  isDemo?: boolean;
}

export interface OperatingPrinciple {
  id: string;
  title: string;
  description: string;
}

export interface OperatingCadence {
  id: string;
  name: string;
  cadence: string;
  audience: string;
  description: string;
  lead: string;
}

export interface EscalationSLA {
  severity: string;
  response_sla: string;
  resolution_sla: string;
  escalation: string;
}

export interface CompanyOperatingInfo {
  organization_id: string;
  principles: OperatingPrinciple[];
  cadences: OperatingCadence[];
  escalation_slas: EscalationSLA[];
  has_demo_data?: boolean;
}

export interface HierarchyNode {
  id: string;
  name: string;
  title: string;
  role: UserRole;
  department: string;
  team?: string;
  isDemo?: boolean;
  subordinates: HierarchyNode[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  contextSources?: string[];
  actionProposals?: ActionProposal[];
  isError?: boolean;
  attachments?: Array<{
    type: 'image' | 'document' | 'file';
    url: string;
    name?: string;
    size?: number;
  }>;
}

export interface ActionProposal {
  id: string;
  title: string;
  type: 'create_task' | 'complete_task' | 'index_sop' | 'draft_sop' | 'brief_team' | 'schedule_review';
  payload: Record<string, any>;
  status: 'pending' | 'accepted' | 'executed' | 'dismissed';
}

export interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  snippet: string;
  content: string;
  classification: 'Public' | 'Internal' | 'Confidential' | 'Restricted';
  isVerified: boolean;
  isDemo?: boolean;
  department?: string;
  version?: string;
  updatedAt: string;
  author: string;
  tags: string[];
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  departmentId?: string;
  department: string;
  teamId?: string;
  team?: string;
  responsibilities: string[];
  reportsToId?: string | null;
  reportsToName?: string | null;
  status: 'active' | 'away' | 'offline';
  assignedProjects: number;
  joinedDate?: string;
  isDemo?: boolean;
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
  department?: string;
  description?: string;
  isDemo?: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  projectId?: string;
  projectName?: string;
  status: 'backlog' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  dueDate: string;
  department?: string;
  createdAt?: string;
  isDemo?: boolean;
}

export interface ClientAccount {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  status: 'prospect' | 'active' | 'contract_pending' | 'retained';
  contractValue: string;
  leadAccountManager: string;
  notes?: string;
  isDemo?: boolean;
}

export interface CorporateDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  classification: 'Public' | 'Internal' | 'Confidential' | 'Restricted';
  updatedAt: string;
  owner: string;
  department?: string;
  isDemo?: boolean;
}

export interface WorkflowRule {
  id: string;
  title: string;
  trigger: string;
  action: string;
  status: 'active' | 'paused';
  executionCount: number;
  department?: string;
  isDemo?: boolean;
}

export interface CompanyActivityEvent {
  id: string;
  actorName: string;
  actionType: string;
  title: string;
  description: string;
  timestamp: string;
  module: string;
}

export interface OperationalInsight {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  metricSource: string;
  isDemoInsight?: boolean;
}

export interface DashboardStats {
  activeStaffCount: number;
  activeProjectsCount: number;
  openOperationsCount: number;
  knowledgeEntitiesCount: number;
  verifiedKnowledgeCount?: number;
  hasDemoData?: boolean;
  departmentsCount: number;
  operationsVelocity: string;
  urgentTasksCount: number;
  pendingReviewsCount: number;
  recentActivities: CompanyActivityEvent[];
  operationalInsights: OperationalInsight[];
}

export interface VerifiedLeader {
  name: string;
  title: string;
  source?: string;
}

export interface MeetingActionItem {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  taskId?: string;
}

export interface MeetingDecision {
  id: string;
  decision: string;
  impact: string;
  status: 'proposed' | 'approved' | 'archived';
  knowledgeItemId?: string;
}

export interface Meeting {
  id: string;
  organizationId: string;
  title: string;
  meetingType: 'board' | 'executive' | 'management' | 'department' | 'project' | 'client' | 'general';
  organizerName: string;
  organizerId?: string;
  date: string;
  time: string;
  durationMinutes: number;
  location?: string;
  virtualLink?: string;
  relatedProjectId?: string;
  relatedClientId?: string;
  agenda: string[];
  discussionNotes: string;
  decisions: MeetingDecision[];
  attendees: string[];
  actionItems: MeetingActionItem[];
  status: 'scheduled' | 'in_progress' | 'review' | 'approved' | 'archived';
  createdAt: string;
  isDemo?: boolean;
}

export interface MeetingCreate {
  title: string;
  meeting_type?: string;
  date: string;
  time: string;
  duration_minutes?: number;
  location?: string;
  virtual_link?: string;
  related_project_id?: string;
  related_client_id?: string;
  agenda?: string[];
  attendees?: string[];
}

export interface MeetingUpdate {
  title?: string;
  status?: string;
  discussion_notes?: string;
  agenda?: string[];
  attendees?: string[];
  decisions?: MeetingDecision[];
  action_items?: MeetingActionItem[];
}

export interface DiscussionMessage {
  id: string;
  organizationId: string;
  channelType: string;
  channelId: string;
  channelName: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  title?: string;
  content: string;
  parentId?: string;
  isPinned: boolean;
  createdAt: string;
  isDemo?: boolean;
}

export interface DiscussionMessageCreate {
  channel_type: string;
  channel_id: string;
  channel_name: string;
  title?: string;
  content: string;
  parent_id?: string;
  is_pinned?: boolean;
}

export interface DiscussionChannel {
  id: string;
  name: string;
  type: string;
  description: string;
  messageCount: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  linkModule?: string;
  linkId?: string;
  isRead: boolean;
  priority: 'normal' | 'high' | 'urgent';
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  type: 'meeting' | 'task' | 'project';
  title: string;
  date: string;
  time: string;
  duration_minutes: number;
  category: string;
  status: string;
  organizer: string;
  location: string;
  link_module: string;
  link_id: string;
}

export interface UnifiedSearchResults {
  query: string;
  total_matches: number;
  members: TeamMember[];
  projects: Project[];
  tasks: TaskItem[];
  clients: ClientAccount[];
  knowledge: KnowledgeItem[];
  documents: CorporateDocument[];
  meetings: Meeting[];
  invoices?: Invoice[];
  accounts?: FinancialAccount[];
  budgets?: FinancialBudget[];
}

export interface MemberInviteCreate {
  name: string;
  email: string;
  role: UserRole;
  title: string;
  department: string;
  team?: string;
  responsibilities?: string[];
}

// =============================================================================
// Phase 4: Financial Intelligence & Company Records
// =============================================================================
export interface FinancialAccount {
  id: string;
  organizationId: string;
  name: string;
  accountType: 'bank' | 'mobile_money' | 'cash' | 'other';
  accountNumber?: string;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  status: 'active' | 'frozen' | 'archived';
  description?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialTransaction {
  id: string;
  reference: string;
  organizationId: string;
  transactionType: 'income' | 'expense' | 'transfer';
  date: string;
  description: string;
  amount: number;
  currency: string;
  accountId: string;
  accountName?: string;
  destinationAccountId?: string;
  destinationAccountName?: string;
  category: string;
  projectId?: string;
  projectName?: string;
  clientId?: string;
  clientName?: string;
  invoiceId?: string;
  payableId?: string;
  paymentMethod: string;
  status: 'completed' | 'pending' | 'cancelled' | 'reversed';
  recordedById: string;
  recordedByName: string;
  supportingDocumentUrl?: string;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  projectId?: string;
  projectName?: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  terms?: string;
  createdBy: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountsPayable {
  id: string;
  organizationId: string;
  reference: string;
  supplierName: string;
  description: string;
  category: string;
  amountDue: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
  dueDate: string;
  projectId?: string;
  projectName?: string;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  supportingDocumentUrl?: string;
  notes?: string;
  createdBy: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialBudget {
  id: string;
  organizationId: string;
  name: string;
  period: 'monthly' | 'quarterly' | 'annual' | 'project_specific';
  startDate: string;
  endDate: string;
  category?: string;
  projectId?: string;
  projectName?: string;
  department?: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPercentage: number;
  currency: string;
  status: 'active' | 'closed' | 'draft';
  createdBy: string;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRequest {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  requestedById: string;
  requestedByName: string;
  projectId?: string;
  projectName?: string;
  department?: string;
  urgency: 'normal' | 'urgent' | 'critical';
  status: 'submitted' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  reviewedById?: string;
  reviewedByName?: string;
  reviewComments?: string;
  reviewedAt?: string;
  transactionId?: string;
  supportingDocumentUrl?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CashFlowTrendItem {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface ExpenseCategoryBreakdown {
  category: string;
  amount: number;
}

export interface FinancialOverviewStats {
  totalRecordedIncome: number;
  totalRecordedExpenses: number;
  netCashMovement: number;
  totalRecordedBalances: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  monthlyIncome: number;
  monthlyExpenditure: number;
  budgetTotalAllocated: number;
  budgetTotalSpent: number;
  budgetUtilizationPercentage: number;
  pendingApprovalsCount: number;
  overdueInvoicesCount: number;
  accounts: FinancialAccount[];
  recentTransactions: FinancialTransaction[];
  cashFlowTrend: CashFlowTrendItem[];
  expenseByCategory: ExpenseCategoryBreakdown[];
}

export interface ProjectFinancialSummary {
  projectId: string;
  projectName: string;
  allocatedBudget: number;
  actualExpenditure: number;
  remainingBudget: number;
  budgetUtilizationPercentage: number;
  billedRevenue: number;
  receivedRevenue: number;
  outstandingRevenue: number;
  transactions: FinancialTransaction[];
}
